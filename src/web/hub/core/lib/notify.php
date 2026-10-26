<?php
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && @realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) { http_response_code(404); exit; }   // an include file: never run on its own, even where .htaccess is ignored
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/**
 * Reminders on Telegram (Settings > Telegram). Not opened from a browser: used by api.php and cron.php.
 *
 * Settings live in site-data/core/notify.php (guarded: answers 404 in a browser). The bot token never goes back to the browser.
 * What is sent, in the site's time zone (Settings > General):
 *   - a daily digest at the hour you choose: overdue, due today, and coming up (each task's "Remind me" window)
 *   - "due now" when a task with a time reaches that time (once per date); Snooze buttons under it, and /snooze in the bot, hold a task's reminders back
 *   - the backup reminder, once a day while a backup is due
 *   - login alerts: every login, logins paused after wrong passwords, password and two-step changes, restores
 *   - a full backup file of the site every N days (counts as your backup, so the reminder resets)
 * It runs from a cron job (cron.php), and also on its own every 10 minutes while someone has the site open.
 */
require_once __DIR__ . '/boot.php';

function nt_file(): string { return hub_dir('core') . '/notify.json'; }   // stored as notify.php (guarded)
function nt_load(): array {
    $d = hub_jread(nt_file()) ?? [];
    $d += ['on' => false, 'token' => '', 'chat' => '', 'chatName' => '', 'hour' => 9, 'tasks' => true, 'timed' => true, 'backup' => true,
           'login' => true, 'bkEvery' => 0, 'bkLast' => 0, 'bkError' => '', 'bkEnc' => true,
           'hook' => false, 'hookKey' => '', 'hookPath' => '', 'offset' => 0, 'lastPoll' => 0,
           'key' => '', 'url' => '', 'sent' => [], 'snooze' => [], 'lastRun' => 0, 'lastError' => '', 'lastSent' => 0];
    if (!preg_match('/^[a-f0-9]{32}$/', (string)$d['key'])) { $d['key'] = bin2hex(random_bytes(16)); nt_save($d); }
    return $d;
}
function nt_save(array $d): bool {
    $ok = hub_jput(nt_file(), json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    @chmod(hub_jpath(nt_file()), 0600);
    return $ok;
}
/**
 * Changes the Telegram file safely: under a lock, from the file as it is now. Jobs that run for a while (reminders, the
 * backup file, the bot) and your own changes in Settings never undo each other, and the bot never handles a message
 * twice. $fn(&$d) changes $d. Returns the saved data.
 */
function nt_update(callable $fn): array {
    $lk = @fopen(hub_dir('core') . '/notify-data.lock', 'c'); if ($lk) flock($lk, LOCK_EX);
    try { $d = nt_load(); $fn($d); nt_save($d); return $d; }
    finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
}
/** What Settings > Telegram changes (everything else is kept by the jobs themselves). */
const NT_USER_KEYS = ['on', 'token', 'chat', 'chatName', 'hour', 'tasks', 'timed', 'backup', 'login', 'bkEvery', 'bkEnc', 'hook', 'hookKey', 'hookPath', 'url'];
/** Saves only these fields of $d into the file as it is now. */
function nt_save_keys(array $d, array $keys): array {
    return nt_update(function (&$cur) use ($d, $keys) { foreach ($keys as $k) if (array_key_exists($k, $d)) $cur[$k] = $d[$k]; });
}
function nt_token_ok(string $t): bool { return (bool)preg_match('/^\d{5,15}:[A-Za-z0-9_-]{30,60}$/', $t); }
/** "123456789:AA…xY" so you can see which bot is saved without showing the token */
function nt_token_hint(string $t): string { return $t === '' ? '' : substr($t, 0, strpos($t, ':') ?: 6) . ':…' . substr($t, -4); }

/** One Telegram Bot API call. */
function nt_tg(string $token, string $method, array $params = []): array {
    if (!nt_token_ok($token)) return ['ok' => false, 'description' => 'The bot token is missing or not valid.'];
    $url = (defined('NT_TEST_API') ? NT_TEST_API : 'https://api.telegram.org') . '/bot' . $token . '/' . $method;   // NT_TEST_API: only tests define it
    $body = json_encode($params, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    $raw = false; $err = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => 1, CURLOPT_POSTFIELDS => $body, CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => 1, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => 15]);
        $raw = curl_exec($ch); if ($raw === false) $err = curl_error($ch); curl_close($ch);
    } else {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $body, 'timeout' => 15, 'ignore_errors' => true]]));
        if ($raw === false) $err = 'no connection';
    }
    if ($raw === false) return ['ok' => false, 'description' => 'Could not reach Telegram (' . $err . '). Settings > Server check shows whether your hosting can reach other websites.'];
    $j = json_decode((string)$raw, true);
    return is_array($j) ? $j : ['ok' => false, 'description' => 'Telegram gave an answer that could not be read.'];
}
/** Sends a file (multipart upload; bots may send up to 50 MB). */
function nt_tg_file(string $token, string $chat, string $path, string $name, string $caption): array {
    if (!nt_token_ok($token)) return ['ok' => false, 'description' => 'The bot token is missing or not valid.'];
    $url = (defined('NT_TEST_API') ? NT_TEST_API : 'https://api.telegram.org') . '/bot' . $token . '/sendDocument';   // the same test stand-in as nt_tg()
    $fields = ['chat_id' => $chat, 'caption' => mb_substr($caption, 0, 1000), 'parse_mode' => 'HTML'];
    $raw = false; $err = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => 1, CURLOPT_POSTFIELDS => $fields + ['document' => new CURLFile($path, 'application/octet-stream', $name)],
            CURLOPT_RETURNTRANSFER => 1, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 180]);
        $raw = curl_exec($ch); if ($raw === false) $err = curl_error($ch); curl_close($ch);
    } else {
        $b = '----hub' . bin2hex(random_bytes(8)); $body = '';
        foreach ($fields as $k => $v) $body .= "--$b\r\nContent-Disposition: form-data; name=\"$k\"\r\n\r\n$v\r\n";
        $body .= "--$b\r\nContent-Disposition: form-data; name=\"document\"; filename=\"$name\"\r\nContent-Type: application/octet-stream\r\n\r\n" . file_get_contents($path) . "\r\n--$b--\r\n";
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: multipart/form-data; boundary=$b\r\n", 'content' => $body, 'timeout' => 180, 'ignore_errors' => true]]));
        if ($raw === false) $err = 'no connection';
    }
    if ($raw === false) return ['ok' => false, 'description' => 'Could not reach Telegram (' . $err . ').'];
    $j = json_decode((string)$raw, true);
    return is_array($j) ? $j : ['ok' => false, 'description' => 'Telegram gave an answer that could not be read.'];
}
function nt_send(array $d, string $html, ?array $markup = null): array {
    if (mb_strlen($html) > 4000) $html = mb_substr($html, 0, 3990) . "\n…";
    $p = ['chat_id' => (string)$d['chat'], 'text' => $html, 'parse_mode' => 'HTML', 'disable_web_page_preview' => true];
    if ($markup) $p['reply_markup'] = $markup;
    return nt_tg((string)$d['token'], 'sendMessage', $p);
}
function nt_h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** 1234567.5 -> ₹12,34,567.50 (Indian grouping for rupees), $1,234,567.50 ... */
function nt_money(?float $v, string $cur): string {
    if ($v === null) return '';
    $dec = abs($v - round($v)) > 0.001 ? 2 : 0;
    if ($cur === 'INR') {
        $s = number_format(floor(abs($v)), 0, '', '');
        $last = substr($s, -3); $rest = substr($s, 0, -3);
        $n = ($rest !== '' ? preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest) . ',' : '') . $last;
        if ($dec) $n .= '.' . substr(number_format(abs($v) - floor(abs($v)), 2), 2);
        return ($v < 0 ? '-' : '') . '₹' . $n;
    }
    $sym = ['USD' => '$', 'EUR' => '€', 'GBP' => '£', 'JPY' => '¥', 'AUD' => 'A$', 'CAD' => 'C$', 'SGD' => 'S$', 'AED' => 'AED '][$cur] ?? ($cur !== '' ? $cur . ' ' : '');
    return $sym . number_format($v, $dec);
}
function nt_time(string $hm): string { return $hm === '' ? '' : date('g:i A', strtotime('2000-01-01 ' . $hm)); }
function nt_day(string $ymd): string { return date('D, j M', strtotime($ymd)); }

/** The site's address (for links in messages), remembered from the browser that saves the settings. */
function nt_site_url(): string {
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    if ($host === '' || !preg_match('/^[A-Za-z0-9.:\[\]-]+$/', $host)) return '';
    $path = rtrim(preg_replace('#/web/(?:hub/)?[^/]+/[^/]*$#', '', str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? '/web/hub/core/api.php'))), '/');   // the site's folder, whichever page is asking
    return (hub_https() ? 'https' : 'http') . '://' . $host . $path . '/';
}

/** What is due, in the site's time zone. */
function nt_due_lists(): array {
    static $memo = [];   // the reminder run asks up to three times: work it out once per minute and tasks file
    $file = HUB_WEB . '/tasks/lib.php';
    if (!is_file($file)) return [[], [], [], []];
    require_once $file;
    clearstatcache(true, hub_jpath(tasks_file()));
    $mk = date('Y-m-d H:i') . '|' . (int)@filemtime(hub_jpath(tasks_file())) . '|' . (int)@filesize(hub_jpath(tasks_file()));
    if (isset($memo[$mk])) return $memo[$mk];
    $memo = [];
    return $memo[$mk] = nt_due_lists_now();
}
function nt_due_lists_now(): array {
    $data = tasks_read();
    $soonDef = (int)($data['settings']['soon'] ?? 7); $defCur = (string)($data['settings']['currency'] ?? 'INR');
    $today = date('Y-m-d'); $now = date('H:i');
    $late = $todayL = $soon = $timed = [];
    foreach ($data['tasks'] as $t) {
        if ($t['status'] !== 'active') continue;
        $t['curx'] = ($t['cur'] ?? '') !== '' ? $t['cur'] : $defCur;
        $days = (int)round((strtotime($t['due']) - strtotime($today)) / 86400);
        $lead = $t['remind'] >= 0 ? $t['remind'] : $soonDef;
        if ($days < 0 || ($days === 0 && $t['time'] !== '' && $t['time'] <= $now)) { $t['days'] = $days; $late[] = $t; }
        elseif ($days === 0) $todayL[] = $t;
        elseif ($days <= $lead) { $t['days'] = $days; $soon[] = $t; }
        if ($days === 0 && $t['time'] !== '' && $t['time'] <= $now) $timed[] = $t;
    }
    $by = function ($a, $b) { return strcmp($a['due'] . $a['time'], $b['due'] . $b['time']); };
    usort($late, $by); usort($todayL, $by); usort($soon, $by);
    return [$late, $todayL, $soon, $timed];
}
/** "Car Insurance  ₹18,500" and under it: "Sat, 10 Oct · 5 Days Overdue · Yearly · Insurance · Offline" */
function nt_line(array $t, string $when): string {
    $p = nt_money($t['price'], $t['curx']);
    $info = array_filter([nt_day($t['due']) . ($t['time'] !== '' ? ', ' . nt_time($t['time']) : ''), $when, tasks_repeat_label($t['repeat']), $t['cat'],
                          $t['mode'] === 'online' ? 'Online' : ($t['mode'] === 'offline' ? 'Offline' : '')]);
    return '• <b>' . nt_h($t['name']) . '</b>' . ($p !== '' ? '  ' . nt_h($p) : '') . "\n    <i>" . nt_h(implode(' · ', $info)) . '</i>';
}
/** {INR: 1200, USD: 30} -> "₹1,200 + $30" */
function nt_sums(array $list): string {
    $m = [];
    foreach ($list as $t) if ($t['price'] !== null) $m[$t['curx']] = ($m[$t['curx']] ?? 0) + $t['price'];
    $out = []; foreach ($m as $c => $v) $out[] = nt_money($v, $c);
    return implode(' + ', $out);
}
/** The full card for one task (the "Due Now" message). */
function nt_card(array $t, string $url): string {
    $p = nt_money($t['price'], $t['curx']);
    $m = '⏰ <b>Due Now</b>' . "\n\n" . '<b>' . nt_h($t['name']) . '</b>' . "\n";
    $m .= "\n📅 " . nt_h(date('l, j M Y', strtotime($t['due'])) . ($t['time'] !== '' ? ', ' . nt_time($t['time']) : ''));
    if ($p !== '') $m .= "\n💰 <b>" . nt_h($p) . '</b>';
    if ($t['repeat']['unit'] !== 'none') $m .= "\n🔁 " . nt_h(tasks_repeat_label($t['repeat'])) . ', next date ' . nt_h(date('D, j M Y', strtotime(tasks_next_date($t))));
    else $m .= "\n🔁 One-Time";
    if ($t['cat'] !== '') $m .= "\n🏷 " . nt_h($t['cat']);
    if ($t['mode'] !== '') $m .= "\n" . ($t['mode'] === 'online' ? '🌐 Online' : '🏪 Offline');
    if ($t['notes'] !== '') $m .= "\n\n📝 " . nt_h(mb_strlen($t['notes']) > 600 ? mb_substr($t['notes'], 0, 600) . '…' : $t['notes']);
    if ($t['url'] !== '') $m .= "\n🔗 " . '<a href="' . nt_h($t['url']) . '">' . nt_h(preg_replace('~^https?://(www\.)?~i', '', rtrim($t['url'], '/'))) . '</a>';
    if ($url !== '') $m .= "\n\n" . '👉 <a href="' . nt_h($url . 'web/tasks/#task=' . $t['id']) . '">Open in Tasks</a>';
    return $m;
}
function nt_digest(array $d, bool $force): ?string {
    [$late, $today, $soon] = array_map(function ($l) use ($d) { return nt_unsnoozed($d, $l); }, array_slice(nt_due_lists(), 0, 3));
    if (!$late && !$today && !$soon && !$force) return null;
    $site = (string)(hub_settings()['siteName'] ?? 'Homebase Hub');
    $m = '📋 <b>' . nt_h($site) . ' Tasks</b>' . "\n" . nt_h(date('l, j M Y'));
    $cut = function (array $a) { return array_slice($a, 0, 20); };
    $head = function (string $icon, string $title, array $a) { $s = nt_sums($a); return "\n\n" . $icon . ' <b>' . $title . ' (' . count($a) . ')</b>' . ($s !== '' ? '  ' . nt_h($s) : ''); };
    if ($late) {
        $m .= $head('🔴', 'Overdue', $late);
        foreach ($cut($late) as $t) $m .= "\n" . nt_line($t, $t['days'] === 0 ? 'Overdue Since ' . nt_time($t['time']) : -$t['days'] . (-$t['days'] === 1 ? ' Day' : ' Days') . ' Overdue');
    }
    if ($today) {
        $m .= $head('🟡', 'Due Today', $today);
        foreach ($cut($today) as $t) $m .= "\n" . nt_line($t, 'Today');
    }
    if ($soon) {
        $m .= $head('🔵', 'Coming Up', $soon);
        foreach ($cut($soon) as $t) $m .= "\n" . nt_line($t, $t['days'] === 1 ? 'Tomorrow' : 'In ' . $t['days'] . ' Days');
    }
    if (!$late && !$today && !$soon) $m .= "\n\nNothing is due right now. 👍";
    elseif (($all = nt_sums(array_merge($late, $today, $soon))) !== '') $m .= "\n\n💰 <b>Total: " . nt_h($all) . '</b>';
    if ($d['url'] !== '') $m .= "\n\n" . '👉 <a href="' . nt_h($d['url'] . 'web/tasks/') . '">Open Tasks</a>';
    return $m;
}

/**
 * Sends whatever is due now. $force: "Send now" in Settings (digest even before the hour, even when nothing is due).
 * Returns ['ok', 'note'].
 */
function nt_run(bool $force = false): array {
    $lk = @fopen(hub_dir('core') . '/notify.lock', 'c');
    if (!$lk || !flock($lk, LOCK_EX | LOCK_NB)) return ['ok' => true, 'note' => 'Already running.'];
    try { nt_hook_follow(); } catch (Throwable $e) { }
    $d = nt_load();
    $d['lastRun'] = time();
    if ((!$d['on'] && !$force) || $d['token'] === '' || $d['chat'] === '') { nt_save_keys($d, ['lastRun']); flock($lk, LOCK_UN); fclose($lk); return ['ok' => true, 'note' => 'Reminders are off or not set up.']; }
    $today = date('Y-m-d'); $sent = 0; $errs = [];
    $hourReached = (int)date('G') >= (int)$d['hour'];
    $try = function (string $msg) use (&$d, &$sent, &$errs) {
        $r = nt_send($d, $msg);
        if (!empty($r['ok'])) { $sent++; return true; }
        $errs[] = (string)($r['description'] ?? 'Telegram refused the message.');
        return false;
    };
    // 1. daily digest
    if ($d['tasks'] && ($force || ($hourReached && ($d['sent']['digest'] ?? '') !== $today))) {
        $m = nt_digest($d, $force);
        if ($m === null) $d['sent']['digest'] = $today;
        else {
            [$late, $todayL] = array_map(function ($l) use ($d) { return nt_unsnoozed($d, $l); }, array_slice(nt_due_lists(), 0, 2)); $kb = [];
            foreach (array_slice(array_merge($late, $todayL), 0, 8) as $t) $kb[] = [['text' => '✓ ' . mb_substr($t['name'], 0, 28), 'callback_data' => 'td:' . $t['id'] . ':' . $t['due']]];
            $r = nt_send($d, $m, $kb ? ['inline_keyboard' => $kb] : null);
            if (!empty($r['ok'])) { $sent++; $d['sent']['digest'] = $today; } else $errs[] = (string)($r['description'] ?? 'Telegram refused the message.');
        }
    }
    // 2. "due now" for tasks with a time
    if ($d['timed'] && !$force) {
        foreach (nt_due_lists()[3] as $t) {
            $k = 't|' . $t['id'] . '|' . $t['due'] . '|' . $t['time'];
            $sn = $d['snooze'][$t['id']] ?? null;
            if (nt_snoozed($d, $t['id'])) continue;   // snoozed: wait for the time it chose
            $again = is_array($sn) && ($sn['due'] ?? '') === $t['due'] && isset($d['sent'][$k]);   // a snooze that has run out: ask again once
            if (isset($d['sent'][$k]) && !$again) continue;
            $r = nt_send($d, nt_card($t, (string)$d['url']), nt_task_buttons($t));
            if (!empty($r['ok'])) {
                $sent++; $d['sent'][$k] = time();
                if ($again) { $tid = $t['id']; nt_update(function (&$x) use ($tid) { unset($x['snooze'][$tid]); }); unset($d['snooze'][$tid]); }
            } else $errs[] = (string)($r['description'] ?? 'Telegram refused the message.');
        }
    }
    // 3. backup reminder, once a day while a backup is due
    $s = hub_settings();
    if ($d['backup'] && (int)$s['backupEvery'] > 0 && ($force || ($hourReached && ($d['sent']['backup'] ?? '') !== $today))) {
        $last = (int)($s['backupLast'] ?? 0); $days = $last ? (int)floor((time() - $last) / 86400) : -1;
        if ($days < 0 || $days >= (int)$s['backupEvery']) {
            $msg = '💾 <b>Backup Reminder</b>' . "\n\n" . ($days < 0 ? 'There is no full backup of ' . nt_h($s['siteName']) . ' yet.' : 'The last full backup of ' . nt_h($s['siteName']) . ' was <b>' . $days . ($days === 1 ? ' day' : ' days') . ' ago</b> (' . nt_h(date('j M Y', (int)$s['backupLast'])) . ').') .
                   "\nOpen the site, click the red Backup icon and choose Back Up. Keep the file off the server." . ($d['url'] !== '' ? "\n\n" . '👉 <a href="' . nt_h($d['url']) . '">Open the site</a>' : '');
            if ($try($msg)) $d['sent']['backup'] = $today;
        } elseif (!$force) $d['sent']['backup'] = $today;
    }
    // 4. the backup file, every bkEvery days, at the daily hour
    if (!$force && (int)$d['bkEvery'] > 0 && $hourReached && time() - (int)$d['bkLast'] >= (int)$d['bkEvery'] * 86400 - 3 * 3600 && ($d['sent']['bkfile'] ?? '') !== $today) {
        $d['sent']['bkfile'] = $today;   // one try a day, even if it fails (the problem shows in Settings > Telegram)
        $r = nt_backup_send($d);
        if (!empty($r['ok'])) $sent++; else $errs[] = (string)($r['description'] ?? 'Backup file not sent.');
    }
    $d['lastError'] = $errs ? $errs[0] : '';
    if ($sent) $d['lastSent'] = time();
    // only what this run changed goes back into the file (the bot and Settings may have saved meanwhile)
    nt_update(function (&$cur) use ($d) {
        $cur['lastRun'] = $d['lastRun']; $cur['lastError'] = $d['lastError']; $cur['bkError'] = $d['bkError'];
        $cur['lastSent'] = max((int)$cur['lastSent'], (int)$d['lastSent']); $cur['bkLast'] = max((int)$cur['bkLast'], (int)$d['bkLast']);
        $cur['sent'] = array_merge(is_array($cur['sent']) ? $cur['sent'] : [], $d['sent']);
        // forget sent markers older than 45 days
        foreach ($cur['sent'] as $k => $v) if (is_int($v) && $v < time() - 45 * 86400) unset($cur['sent'][$k]);
        foreach (is_array($cur['snooze']) ? $cur['snooze'] : [] as $k => $v) if ((int)($v['until'] ?? 0) < time() - 2 * 86400) unset($cur['snooze'][$k]);   // ran out long ago
    });
    flock($lk, LOCK_UN); fclose($lk);
    if ($errs) return ['ok' => false, 'note' => 'Telegram: ' . $errs[0]];
    return ['ok' => true, 'note' => $sent ? 'Sent ' . $sent . ($sent === 1 ? ' message.' : ' messages.') : 'Nothing to send right now.'];
}
/** "Chrome on Windows", "Safari on iPhone"... from the browser's user agent (a hint, not proof). */
function nt_device(string $ua): string {
    if ($ua === '') return 'Unknown device';
    $b = preg_match('/Edg\//', $ua) ? 'Edge' : (preg_match('/OPR\/|Opera/', $ua) ? 'Opera' : (preg_match('/SamsungBrowser/', $ua) ? 'Samsung Internet' :
         (preg_match('/Firefox\//', $ua) ? 'Firefox' : (preg_match('/Chrome\/|CriOS/', $ua) ? 'Chrome' : (preg_match('/Safari\//', $ua) ? 'Safari' : (preg_match('/curl|python|wget|bot/i', $ua) ? 'A script or bot' : 'A browser'))))));
    $o = preg_match('/iPhone/', $ua) ? 'iPhone' : (preg_match('/iPad/', $ua) ? 'iPad' : (preg_match('/Android/', $ua) ? 'Android' : (preg_match('/Windows/', $ua) ? 'Windows' :
         (preg_match('/Mac OS X|Macintosh/', $ua) ? 'Mac' : (preg_match('/CrOS/', $ua) ? 'ChromeOS' : (preg_match('/Linux/', $ua) ? 'Linux' : ''))))));
    return $b . ($o !== '' ? ' on ' . $o : '');
}
/** A security alert (queued by hub_alert in boot.php). */
function nt_security(array $c): void {
    $d = nt_load();
    if (!$d['login'] || $d['token'] === '' || $d['chat'] === '') return;
    $site = (string)(hub_settings()['siteName'] ?? 'Homebase Hub');
    $t = [
        'login'      => ['🔐', 'New Login', 'Someone logged in to your site.'],
        'locked'     => ['🚫', 'Logins Paused', 'Too many wrong passwords or codes. Logins from this address are paused for a while.'],
        'password'   => ['🔑', 'Password Changed', 'The website password was changed. Every other device was logged out.'],
        'logoutall'  => ['🚪', 'Other Devices Logged Out', 'Every other device was logged out.'],
        'twostep_on' => ['🛡', 'Two-Step Login Turned On', 'Logins now also need a code from the authenticator app.'],
        'twostep_off'=> ['⚠️', 'Two-Step Login Turned Off', 'Logins now need only the password.'],
        'recovery'   => ['🧾', 'New Recovery Codes', 'New recovery codes were made; the old ones no longer work.'],
        'restore'    => ['♻️', 'Backup Restored', 'Data was restored from a backup file' . ($c['extra'] !== '' ? ': ' . $c['extra'] : '') . '.'],
    ][$c['what']] ?? ['ℹ️', 'Account Change', ''];
    $m = $t[0] . ' <b>' . nt_h($t[1]) . '</b>' . "\n" . nt_h($site) . "\n\n" . nt_h($t[2]) .
         "\n\n🕒 " . nt_h(date('l, j M Y, g:i A', $c['time'])) .
         "\n🌍 " . nt_h($c['ip'] ?: 'Unknown Address') . ($c['country'] !== '' && $c['country'] !== 'XX' ? ' (' . nt_h($c['country']) . ')' : '') .
         "\n💻 " . nt_h(nt_device($c['ua']));
    if ($c['what'] !== 'locked') $m .= "\n\n<i>Not you? Change the password in Settings › Security and click Log Out Other Devices.</i>";
    else $m .= "\n\n<i>If that wasn't you trying, someone is guessing your password. Turn on two-step login in Settings › Security.</i>";
    nt_send($d, $m);
}
/** The whole site as one backup file, sent to the chat. Counts as your full backup (the Backup icon turns green). */
function nt_backup_send(array &$d): array {
    require_once __DIR__ . '/backup.php';
    $s = hub_settings();
    $json = json_encode(bk_export(array_fill_keys(BK_PARTS, true), !empty($d['bkEnc']) && bk_key()), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) return ['ok' => false, 'description' => 'The backup could not be made.'];
    $base = preg_replace('/[^a-z0-9]+/', '-', strtolower((string)$s['siteName'])) . '-backup-' . date('Y-m-d-His');
    $name = $base . '.json'; $data = $json; $enc = false;
    if (!empty($d['bkEnc']) && bk_key()) {   // a backup passphrase is set: Telegram only ever gets the encrypted file
        try { $data = bk_encrypt($json); $name = $base . '.enc.json'; $enc = true; } catch (Exception $e) { return ['ok' => false, 'description' => $e->getMessage()]; }
    } elseif (strlen($json) > 45 * 1048576) { $data = gzencode($json, 9); $name = $base . '.json.gz'; }   // big sites: compressed (Import reads .gz too)
    if (strlen($data) > 49 * 1048576) return ['ok' => false, 'description' => 'The backup is ' . round(strlen($data) / 1048576) . ' MB; Telegram bots can send at most 50 MB.'];
    $tmp = hub_dir('core') . '/tg-' . bin2hex(random_bytes(6)) . '.tmp';
    if (@file_put_contents($tmp, $data) === false) return ['ok' => false, 'description' => 'Could not write a temporary file in site-data/core.'];
    $size = strlen($data) >= 1048576 ? round(strlen($data) / 1048576, 1) . ' MB' : max(1, round(strlen($data) / 1024)) . ' KB';
    $cap = '💾 <b>' . nt_h($s['siteName']) . ' Backup</b>' . "\n" . nt_h(date('l, j M Y, g:i A')) . ', ' . $size .
           "\n\nEverything: Links, Info, Cards, Tasks, Start Page and Settings. To restore: Backup icon › Restore." .
           ($enc ? (bk_key_mode() === 'login' ? "\n🔒 Encrypted: it opens with your website password (the one you have today)." : "\n🔒 Encrypted: it opens only with your encryption passphrase.")
                 : "\n⚠️ Not encrypted. Set an encryption passphrase (Settings › Security › Encryption) to lock these files.");
    $r = nt_tg_file((string)$d['token'], (string)$d['chat'], $tmp, $name, $cap);
    @unlink($tmp);
    if (!empty($r['ok'])) {
        $d['bkLast'] = time(); $d['bkError'] = '';
        hub_settings_update(function ($cur) { $cur['backupLast'] = time(); return $cur; });   // a copy off the server: the reminder starts over (fresh read: never undoes a save made meanwhile)
    } else $d['bkError'] = (string)($r['description'] ?? 'Telegram refused the file.');
    return $r;
}
/** Called after a page has its answer: runs the reminders at most every 10 minutes, so they also work without a cron job. */
function nt_tick(): void {
    // bot messages (polling mode): checked when pages are open, at most every 10 seconds (a login waiting for approval
    // checks every 3 seconds on its own)
    $f = hub_jpath(nt_file());
    if (is_file($f)) { try { nt_poll(10); } catch (Throwable $e) {} }
    // the domain watch and reminders: at most every 10 minutes
    $wf = hub_dir('core') . '/watch-tick.txt';
    if (time() - (int)@file_get_contents($wf) >= 600) {
        @file_put_contents($wf, (string)time());
        try { require_once __DIR__ . '/watch.php'; if (wt_load()['sites']) wt_run(false); } catch (Throwable $e) {}
    }
    if (!is_file($f)) return;
    $d = nt_load();
    if (!$d['on'] || time() - (int)$d['lastRun'] < 600) return;   // lastRun only: polling writes the file every few seconds
    nt_run(false);
}
function nt_view(array $d): array {
    return ['ok' => true, 'on' => (bool)$d['on'], 'hasToken' => $d['token'] !== '', 'tokenHint' => nt_token_hint((string)$d['token']), 'chat' => (string)$d['chat'],
            'chatName' => (string)$d['chatName'], 'hour' => (int)$d['hour'], 'tasks' => (bool)$d['tasks'], 'timed' => (bool)$d['timed'], 'backup' => (bool)$d['backup'],
            'lastRun' => (int)$d['lastRun'], 'lastSent' => (int)$d['lastSent'], 'cronLast' => (int)@file_get_contents(hub_dir('core') . '/cron-last.txt'), 'now' => time(), 'lastError' => (string)$d['lastError'], 'tz' => hub_tz(),
            'login' => (bool)$d['login'], 'bkEvery' => (int)$d['bkEvery'], 'bkLast' => (int)$d['bkLast'], 'bkError' => (string)$d['bkError'],
            'bkEnc' => (bool)$d['bkEnc'], 'encReady' => (function () { require_once __DIR__ . '/backup.php'; return (bool)bk_key(); })(),
            'encMode' => (function () { require_once __DIR__ . '/backup.php'; return bk_key_mode(); })(),
            'hook' => (bool)$d['hook'], 'hookInfo' => $d['hook'] ? nt_hook_info($d) : null,
            'cronCmd' => '*/5 * * * * php ' . realpath(HUB_CORE . '/cron.php') . ' >/dev/null 2>&1',
            'cronUrl' => ($d['url'] !== '' ? $d['url'] : nt_site_url()) . 'web/hub/core/cron.php?key=' . $d['key']];
}

/* ======================= the two-way bot ======================= */
/* Answers only your own chat (the one in Settings > Telegram); anything from other chats is ignored.
   Instant mode: Telegram calls web/hub/core/telegram.php (a webhook). Otherwise the site asks Telegram for new messages
   when the cron job runs or a page is open (nt_poll), so replies can take a few minutes. */

function nt_task_buttons(array $t): array {
    $row = [['text' => '✓ Done', 'callback_data' => 'td:' . $t['id'] . ':' . $t['due']]];
    if (($t['repeat']['unit'] ?? 'none') !== 'none') $row[] = ['text' => '⏭ Skip', 'callback_data' => 'ts:' . $t['id'] . ':' . $t['due']];
    $z = 'tz:' . $t['id'] . ':' . $t['due'] . ':';
    return ['inline_keyboard' => [$row, [['text' => '💤 1 Hour', 'callback_data' => $z . '1h'], ['text' => '💤 3 Hours', 'callback_data' => $z . '3h'], ['text' => '💤 Tomorrow', 'callback_data' => $z . 'tm']]]];
}
/** Is this task's reminder on hold right now (Snooze button or /snooze)? */
function nt_snoozed(array $d, string $id): bool {
    $s = $d['snooze'][$id] ?? null;
    return is_array($s) && (int)($s['until'] ?? 0) > time();
}
/** The tasks of $list that are not snoozed. */
function nt_unsnoozed(array $d, array $list): array {
    return array_values(array_filter($list, function ($t) use ($d) { return !nt_snoozed($d, $t['id']); }));
}
/** When a snooze ends: '1h', '3h', 'tm' (tomorrow, at the hour of the daily digest) or a number of seconds. Between 5 minutes and 7 days from now. */
function nt_snooze_until(array $d, $how): int {
    if ($how === 'tm') return strtotime('tomorrow ' . sprintf('%02d:00', (int)$d['hour']));
    $sec = $how === '1h' ? 3600 : ($how === '3h' ? 10800 : (int)$how);
    return time() + max(300, min(7 * 86400, $sec));
}
/** Holds back the reminders of one task until $until. Returns a plain-text answer. */
function nt_bot_snooze(string $id, string $due, int $until): string {
    require_once HUB_WEB . '/tasks/lib.php';
    $name = '';
    foreach (tasks_read()['tasks'] as $t) if ($t['id'] === $id && $t['status'] === 'active') $name = $t['name'];
    if ($name === '') return 'That task no longer exists.';
    nt_update(function (&$x) use ($id, $due, $until) { $x['snooze'][$id] = ['until' => $until, 'due' => $due]; });
    return '💤 Snoozed: ' . $name . ' until ' . date('D, j M, g:i A', $until) . '.';
}
/** "/snooze Netflix 2h" (30m, 2h, 1d or tomorrow; one hour if left out) */
function nt_bot_snooze_by_name(array $d, string $arg): string {
    require_once HUB_WEB . '/tasks/lib.php';
    $arg = trim($arg); $how = '1h';
    if ($arg === '') return 'Which task? For example: /snooze Netflix 2h';
    if (preg_match('/^(.*?)\s+(?:(\d{1,3})\s*(m|mins?|minutes?|h|hrs?|hours?|d|days?)|(tomorrow))$/iu', $arg, $m)) {
        $arg = trim($m[1]);
        if (!empty($m[4])) $how = 'tm';
        else { $u = strtolower($m[3])[0]; $how = (string)((int)$m[2] * ($u === 'm' ? 60 : ($u === 'h' ? 3600 : 86400))); }
    }
    if ($arg === '') return 'Which task? For example: /snooze Netflix 2h';
    $hits = array_values(array_filter(tasks_read()['tasks'], function ($t) use ($arg) { return $t['status'] === 'active' && mb_stripos($t['name'], $arg) !== false; }));
    if (!$hits) return 'No active task matches "' . $arg . '".';
    if (count($hits) > 1) {
        usort($hits, function ($a, $b) { return strcmp($a['due'], $b['due']); });
        return 'Several tasks match. Be more exact: ' . implode(', ', array_map(function ($t) { return $t['name']; }, array_slice($hits, 0, 6)));
    }
    return nt_bot_snooze($hits[0]['id'], $hits[0]['due'], nt_snooze_until($d, $how));
}
/** Asks Telegram for new messages (polling mode), at most every $every seconds. Returns how many were handled. */
function nt_poll(int $every = 3): int {
    $d = nt_load();
    if ($d['hook'] || $d['token'] === '' || $d['chat'] === '' || time() - (int)$d['lastPoll'] < $every) return 0;
    $lk = @fopen(hub_dir('core') . '/notify-poll.lock', 'c');
    if (!$lk || !flock($lk, LOCK_EX | LOCK_NB)) return 0;
    $d = nt_update(function (&$x) { $x['lastPoll'] = time(); });   // fresh: another poll may have moved the offset meanwhile
    $r = nt_tg($d['token'], 'getUpdates', ['offset' => (int)$d['offset'] + 1, 'timeout' => 0, 'limit' => 30, 'allowed_updates' => ['message', 'callback_query']]);
    $n = 0;
    if (!empty($r['ok'])) foreach ($r['result'] ?? [] as $u) {
        nt_update(function (&$x) use ($u) { $x['offset'] = max((int)$x['offset'], (int)($u['update_id'] ?? 0)); });
        nt_handle_update($u); $n++;
    }
    flock($lk, LOCK_UN); fclose($lk);
    return $n;
}
function nt_reply(array $d, string $html, ?array $markup = null): void { nt_send($d, $html, $markup); }
/** One update from Telegram: a message (command, link or text) or a button press. */
function nt_handle_update(array $u): void {
    $d = nt_load();
    if ($d['token'] === '' || $d['chat'] === '') return;
    if (isset($u['callback_query'])) {
        $q = $u['callback_query'];
        if ((string)($q['message']['chat']['id'] ?? '') !== (string)$d['chat']) return;
        $data = (string)($q['data'] ?? ''); $text = '';
        if (preg_match('/^ap:(ok|no):([a-f0-9]{16})$/', $data, $m)) { require_once __DIR__ . '/approval.php'; $text = ap_answer($m[2], $m[1] === 'ok'); }
        elseif (preg_match('/^t([ds]):([a-z0-9]{6,16}):(\d{4}-\d{2}-\d{2})$/', $data, $m)) $text = nt_bot_done($m[2], $m[3], $m[1] === 's' ? 'skip' : 'paid');
        elseif (preg_match('/^tz:([a-z0-9]{6,16}):(\d{4}-\d{2}-\d{2}):(1h|3h|tm)$/', $data, $m)) $text = nt_bot_snooze($m[1], $m[2], nt_snooze_until($d, $m[3]));
        nt_tg($d['token'], 'answerCallbackQuery', ['callback_query_id' => (string)$q['id'], 'text' => mb_substr(strip_tags($text), 0, 190)]);
        if ($text !== '' && isset($q['message']['message_id'])) {
            $old = (string)($q['message']['text'] ?? '');
            nt_tg($d['token'], 'editMessageReplyMarkup', ['chat_id' => (string)$d['chat'], 'message_id' => (int)$q['message']['message_id'], 'reply_markup' => ['inline_keyboard' => []]]);
            if (strpos($data, 'ap:') === 0) nt_tg($d['token'], 'editMessageText', ['chat_id' => (string)$d['chat'], 'message_id' => (int)$q['message']['message_id'], 'text' => $old . "\n\n" . strip_tags($text)]);
            else nt_reply($d, nt_h($text));   // task names can hold & or <, which Telegram's HTML mode would refuse
        }
        return;
    }
    $msg = $u['message'] ?? null;
    if (!$msg || (string)($msg['chat']['id'] ?? '') !== (string)$d['chat']) return;
    $txt = trim((string)($msg['text'] ?? ''));
    if ($txt === '') return;
    $cmd = strtolower((string)preg_replace('/@\w+$/', '', strtok($txt, " \n")));
    $arg = trim((string)substr($txt, strlen(strtok($txt, " \n"))));
    switch ($cmd) {
        case '/start': case '/help': nt_reply($d, nt_bot_help()); return;
        case '/today': nt_bot_list($d, 'today'); return;
        case '/week': nt_bot_list($d, 'week'); return;
        case '/next': case '/tasks': nt_bot_list($d, 'next'); return;
        case '/add': nt_reply($d, nt_bot_add($arg)); return;
        case '/done': nt_reply($d, nt_bot_done_by_name($arg)); return;
        case '/snooze': nt_reply($d, nt_h(nt_bot_snooze_by_name($d, $arg))); return;
        case '/backup': $r = nt_backup_send($d); nt_save_keys($d, ['bkLast', 'bkError']); if (empty($r['ok'])) nt_reply($d, '⚠️ Backup not sent: ' . nt_h($r['description'] ?? 'unknown problem')); return;
        case '/status': nt_reply($d, nt_bot_status()); return;
    }
    nt_reply($d, "I didn't understand that. Send /help for everything I can do.");
}
function nt_bot_help(): string {
    return '🤖 <b>What I Can Do</b>' . "\n\n" .
        "/today  overdue and due today, with Done buttons\n/week  the next 7 days\n/next  the next 10 tasks\n" .
        "/add Netflix 649 monthly 5 Nov  a new task (price, repeat, date and time are optional)\n/done Netflix  mark a task done\n/snooze Netflix 2h  pause its reminders (30m, 2h, 1d or tomorrow)\n" .
        "/backup  send a backup file now\n/status  a quick check of the site\n\n" .
        "Buttons under reminders mark tasks done, skip a date or snooze them.";
}
/** today | week | next: active tasks with Done buttons (8 at most) */
function nt_bot_list(array $d, string $what): void {
    require_once HUB_WEB . '/tasks/lib.php';
    $data = tasks_read(); $today = date('Y-m-d'); $wk = date('Y-m-d', strtotime('+7 days')); $def = (string)($data['settings']['currency'] ?? 'INR');
    $list = array_values(array_filter($data['tasks'], function ($t) use ($what, $today, $wk) {
        if ($t['status'] !== 'active') return false;
        return $what === 'today' ? $t['due'] <= $today : ($what === 'week' ? $t['due'] <= $wk : true);
    }));
    usort($list, function ($a, $b) { return strcmp($a['due'] . $a['time'], $b['due'] . $b['time']); });
    if ($what === 'next') $list = array_slice($list, 0, 10);
    $title = ['today' => 'Overdue and Today', 'week' => 'Next 7 Days', 'next' => 'Next Tasks'][$what];
    if (!$list) { nt_reply($d, '👍 <b>' . $title . '</b>' . "\nNothing here."); return; }
    $m = '📋 <b>' . $title . ' (' . count($list) . ')</b>'; $kb = [];
    foreach ($list as $t) {
        $t['curx'] = $t['cur'] !== '' ? $t['cur'] : $def;
        $days = (int)round((strtotime($t['due']) - strtotime($today)) / 86400);
        $m .= "\n" . nt_line($t, $days < 0 ? -$days . ' Days Overdue' : ($days === 0 ? 'Today' : ($days === 1 ? 'Tomorrow' : 'In ' . $days . ' Days')));
        if (count($kb) < 8) $kb[] = [['text' => '✓ ' . mb_substr($t['name'], 0, 28), 'callback_data' => 'td:' . $t['id'] . ':' . $t['due']]];
    }
    nt_reply($d, $m, ['inline_keyboard' => $kb]);
}
function nt_bot_done(string $id, string $due, string $kind): string {
    require_once HUB_WEB . '/tasks/lib.php';
    $name = ''; $res = '';
    tasks_modify(function (&$data) use ($id, $due, $kind, &$res, &$name) {
        foreach ($data['tasks'] as $t) if ($t['id'] === $id) $name = $t['name'];
        $res = tasks_complete($data, $id, $due, $kind);
        return $res !== '' && $res !== 'already';
    });
    if ($res === '') return 'That task no longer exists.';
    if ($res === 'already') return '"' . $name . '" was already handled.';
    $what = $kind === 'skip' ? '⏭ Skipped' : '✅ Done';
    return $what . ': ' . $name . (strpos($res, 'next:') === 0 ? '. Next date: ' . date('D, j M Y', strtotime(substr($res, 5))) . '.' : '.');
}
function nt_bot_done_by_name(string $q): string {
    require_once HUB_WEB . '/tasks/lib.php';
    if ($q === '') return 'Which task? For example: /done Netflix';
    $hits = array_values(array_filter(tasks_read()['tasks'], function ($t) use ($q) { return $t['status'] === 'active' && mb_stripos($t['name'], $q) !== false; }));
    if (!$hits) return 'No active task matches "' . nt_h($q) . '".';
    if (count($hits) > 1) {
        usort($hits, function ($a, $b) { return strcmp($a['due'], $b['due']); });
        return 'Several tasks match. Use the buttons from /today or /next, or be more exact: ' . nt_h(implode(', ', array_map(function ($t) { return $t['name']; }, array_slice($hits, 0, 6))));
    }
    return nt_h(nt_bot_done($hits[0]['id'], $hits[0]['due'], 'paid'));
}
/**
 * "/add Netflix 649 monthly 5 Nov 9pm" -> a task. Understands: a price (649, ₹649, $12.50, Rs 500), a repeat (daily, weekly,
 * monthly, quarterly, yearly, every 2 weeks...), a date (today, tomorrow, in 3 days, 5 Nov, Nov 5, 5/11, 2026-11-05, monday),
 * a time (9pm, 21:30). The rest is the name.
 */
function nt_parse_add(string $s): ?array {
    $s = ' ' . trim(preg_replace('/\s+/u', ' ', $s)) . ' '; $t = ['repeat' => ['n' => 1, 'unit' => 'none'], 'cur' => '', 'price' => null, 'time' => ''];
    $take = function ($re) use (&$s) { if (preg_match($re, $s, $m)) { $s = str_replace($m[0], ' ', $s); return $m; } return null; };
    if ($m = $take('/\s(?:every\s+(\d{1,2})\s+(day|week|month|year)s?)\s/i')) $t['repeat'] = ['n' => (int)$m[1], 'unit' => strtolower($m[2])];
    elseif ($m = $take('/\s(daily|weekly|monthly|quarterly|yearly|annually|annual|every\s+(?:day|week|month|year))\s/i')) {
        $w = strtolower($m[1]);
        $t['repeat'] = ['n' => $w === 'quarterly' ? 3 : 1, 'unit' => ['daily' => 'day', 'weekly' => 'week', 'monthly' => 'month', 'quarterly' => 'month', 'yearly' => 'year', 'annually' => 'year', 'annual' => 'year'][$w] ?? substr($w, 6)];
    }
    if ($m = $take('/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s/i')) { $h = (int)$m[1] % 12 + (strtolower($m[3]) === 'pm' ? 12 : 0); $t['time'] = sprintf('%02d:%02d', $h, (int)($m[2] ?? 0)); }
    elseif ($m = $take('/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\s/')) $t['time'] = sprintf('%02d:%02d', (int)$m[1], (int)$m[2]);
    $due = '';
    $mon = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';
    if ($m = $take('/\s(today|tomorrow)\s/i')) $due = date('Y-m-d', strtotime($m[1]));
    elseif ($m = $take('/\sin\s+(\d{1,3})\s+(day|week|month)s?\s/i')) $due = date('Y-m-d', strtotime('+' . $m[1] . ' ' . $m[2]));
    elseif ($m = $take('/\s(\d{4})-(\d{2})-(\d{2})\s/')) $due = checkdate((int)$m[2], (int)$m[3], (int)$m[1]) ? "$m[1]-$m[2]-$m[3]" : '';
    elseif ($m = $take('/\s(\d{1,2})(?:st|nd|rd|th)?\s+(' . $mon . ')\.?(?:\s+(\d{4}))?\s/i') ?: $take('/\s(' . $mon . ')\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\s/i')) {
        [$dd, $mm] = ctype_digit($m[1]) ? [$m[1], $m[2]] : [$m[2], $m[1]];
        $y = $m[3] ?? ''; $ts = strtotime("$dd $mm " . ($y ?: date('Y')));
        if ($ts && !$y && date('Y-m-d', $ts) < date('Y-m-d')) $ts = strtotime("$dd $mm " . (date('Y') + 1));   // "5 Jan" in December = next year
        $due = $ts ? date('Y-m-d', $ts) : '';
    }
    elseif ($m = $take('/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/')) {   // 5/11 = 5 November (day first)
        $y = isset($m[3]) ? (strlen($m[3]) === 2 ? '20' . $m[3] : $m[3]) : date('Y');
        $due = checkdate((int)$m[2], (int)$m[1], (int)$y) ? sprintf('%04d-%02d-%02d', $y, $m[2], $m[1]) : '';
        if ($due !== '' && !isset($m[3]) && $due < date('Y-m-d')) $due = sprintf('%04d-%02d-%02d', (int)$y + 1, $m[2], $m[1]);
    }
    elseif ($m = $take('/\s(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s/i')) $due = date('Y-m-d', strtotime('next ' . $m[1]));
    // the price after the date, so "15 Nov" is never read as a price of 15
    if ($m = $take('/\s(₹|rs\.?\s?|inr\s?|\$|usd\s?|€|eur\s?|£|gbp\s?)?(\d[\d,]*(?:\.\d{1,2})?)(?:\s?(rs|inr|usd|eur|gbp|rupees|dollars))?\s/iu')) {
        $c = strtolower(trim(($m[1] ?? '') . ($m[3] ?? '')));
        $t['cur'] = preg_match('/\$|usd|dollar/', $c) ? 'USD' : (preg_match('/€|eur/', $c) ? 'EUR' : (preg_match('/£|gbp/', $c) ? 'GBP' : ''));
        $t['price'] = (float)str_replace(',', '', $m[2]);
    }
    $name = trim(preg_replace('/\s+/u', ' ', $s));
    if ($name === '') return null;
    $t['name'] = mb_substr(mb_strtoupper(mb_substr($name, 0, 1)) . mb_substr($name, 1), 0, 120);
    $t['due'] = $due ?: date('Y-m-d');
    return $t;
}
function nt_bot_add(string $arg): string {
    require_once HUB_WEB . '/tasks/lib.php';
    $p = tasks_add_text($arg, 'Telegram');
    if ($p === null) return 'Tell me what to add, for example:' . "\n/add Netflix 649 monthly 5 Nov\n/add Car insurance 18500 yearly 10 Oct 2027\n/add Call bank tomorrow 11am";
    if ($p === false) return '⚠️ The task could not be saved (the tasks file could not be read). Open Tasks on the site.';
    $def = (string)(tasks_read()['settings']['currency'] ?? 'INR');
    $lbl = tasks_repeat_label($p['repeat']);
    return '➕ <b>Added: ' . nt_h($p['name']) . '</b>' . "\n📅 " . nt_h(date('D, j M Y', strtotime($p['due'])) . ($p['time'] !== '' ? ', ' . nt_time($p['time']) : '')) .
        ($p['price'] !== null ? "\n💰 " . nt_h(nt_money($p['price'], $p['cur'] !== '' ? $p['cur'] : $def)) : '') . "\n🔁 " . nt_h($lbl) .
        "\n\nWrong? Edit it in Tasks on the site.";
}
function nt_bot_status(): string {
    $s = hub_settings(); $m = '🩺 <b>' . nt_h($s['siteName']) . ' Status</b>' . "\n";
    $last = (int)$s['backupLast']; $m .= "\n💾 Last full backup: " . ($last ? nt_h(date('j M Y', $last)) . ' (' . (int)floor((time() - $last) / 86400) . ' days ago)' : 'never');
    if (is_file(HUB_WEB . '/tasks/lib.php')) { require_once HUB_WEB . '/tasks/lib.php'; [$late, $today] = nt_due_lists(); $m .= "\n📋 Overdue: " . count($late) . ', due today: ' . count($today); }
    if (is_file(__DIR__ . '/watch.php')) {
        require_once __DIR__ . '/watch.php';
        foreach (wt_load()['sites'] as $w) {
            $up = !empty($w['up']) ? (empty($w['st']) ? '…' : (!empty($w['st']['ok']) ? '🟢 up' : '🔴 down')) : '';
            $m .= "\n🌐 " . nt_h($w['host']) . ($up ? ' ' . $up : '') . (!empty($w['dom']['exp']) ? ', domain to ' . nt_h(date('j M Y', strtotime($w['dom']['exp']))) : '') . (!empty($w['ssl']['exp']) ? ', SSL to ' . nt_h(date('j M', strtotime($w['ssl']['exp']))) : '');
        }
    }
    $m .= "\n🧩 Version " . HUB;
    return $m;
}
/** Where Telegram calls the site for instant replies. Up to 1.49 it was web/core-data/telegram.php. */
const NT_HOOK_PATH = 'web/hub/core/telegram.php';
/** Instant replies: tells Telegram to call NT_HOOK_PATH (with a secret it sends back on every call). */
function nt_hook_set(array &$d, bool $on): array {
    if (!$on) { $r = nt_tg($d['token'], 'deleteWebhook', ['drop_pending_updates' => false]); if (!empty($r['ok'])) $d['hook'] = false; return $r; }
    $url = ($d['url'] !== '' ? $d['url'] : nt_site_url());
    if (!preg_match('~^https://~', $url)) return ['ok' => false, 'description' => 'Instant replies need the site on https:// (turn on SSL first).'];
    if (!preg_match('/^[A-Za-z0-9_-]{32,64}$/', (string)$d['hookKey'])) $d['hookKey'] = bin2hex(random_bytes(20));
    $r = nt_tg($d['token'], 'setWebhook', ['url' => $url . NT_HOOK_PATH, 'secret_token' => $d['hookKey'], 'allowed_updates' => ['message', 'callback_query'], 'max_connections' => 5]);
    if (!empty($r['ok'])) { $d['hook'] = true; $d['hookPath'] = NT_HOOK_PATH; }
    return $r;
}
/** Instant replies set up before the engine moved (1.50): tells Telegram the new address once, the next time reminders run
 *  while the site is open. Nothing is asked of Telegram unless instant replies are on. Returns true when it moved them. */
function nt_hook_follow(): bool {
    $d = nt_load();
    if (!$d['hook'] || $d['token'] === '' || $d['hookPath'] === NT_HOOK_PATH) return false;
    $r = nt_hook_set($d, true);
    if (empty($r['ok'])) return false;
    nt_save_keys($d, ['hook', 'hookKey', 'hookPath']);
    return true;
}
/** What Telegram says about the webhook: waiting messages and the last problem it had reaching the site. */
function nt_hook_info(array $d): array {
    $r = nt_tg((string)$d['token'], 'getWebhookInfo');
    $i = $r['result'] ?? [];
    return ['pending' => (int)($i['pending_update_count'] ?? 0), 'error' => (string)($i['last_error_message'] ?? ''), 'errorAt' => (int)($i['last_error_date'] ?? 0)];
}
