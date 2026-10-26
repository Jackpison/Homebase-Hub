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
 * Tasks: shared by tasks/api.php and the site backup (core/backup.php).
 *
 * Data (site-data/tasks/tasks.php, a guarded file that answers 404 in a browser):
 *   { rev, tasks: [task], log: [entry], settings: { currency, soon, start, range, cal, sort, stats, week, dates } }
 *   entry = one completion, newest last (at most 500): { id, task, name, d "YYYY-MM-DD" (the date it covered), p price|null, cur, cat, mode,
 *            k paid|skip, t unix time }. Done one-time tasks beyond the newest 500 are removed too.
 *   task = { id, name, due "YYYY-MM-DD", time "HH:MM"|"", day 1-31 (day of the month a monthly/yearly task keeps),
 *            repeat { n 1-99, unit none|day|week|month|year }, price number|null, cur "USD"|"" (empty = the page's currency),
 *            mode online|offline|"" (how it is done or paid), cat, pay, auto bool,
 *            remind -1 (page default) | 0-365 days, url, notes, status active|paused|done,
 *            created, updated, doneAt (unix time), history [{ d "YYYY-MM-DD", p price|null, k paid|skip, t unix time }] }
 * Everything is checked here, whatever the browser sends.
 */
require_once __DIR__ . '/../hub/core/lib/boot.php';

const TASKS_MAX         = 2000;
const TASKS_KEEP        = 40;    // earlier versions kept
const TASKS_EVERY       = 600;   // seconds between automatic earlier versions
const TASKS_HISTORY_MAX = 60;    // payments remembered per task
const TASKS_LOG_MAX     = 500;   // completed entries kept (Completed view)

function tasks_file(): string { return hub_dir('tasks') . '/tasks.json'; }   // stored as tasks.php (guarded)

function tasks_str($v, int $max): string {
    if (!is_string($v) && !is_numeric($v)) return '';
    $v = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string)$v) ?? '');
    return mb_substr($v, 0, $max);
}
function tasks_date($v): string {
    if (!is_string($v) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m)) return '';
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]) && (int)$m[1] >= 1970 && (int)$m[1] <= 2200 ? $v : '';
}
function tasks_price($v): ?float {
    if ($v === null || $v === '' || !is_numeric($v)) return null;
    $f = round((float)$v, 2);
    return ($f < 0 || $f > 1e12) ? null : $f;
}
function tasks_clean_one($t): ?array {
    if (!is_array($t)) return null;
    $name = tasks_str($t['name'] ?? '', 120);
    $due = tasks_date($t['due'] ?? '');
    if ($name === '' || $due === '') return null;
    $id = is_string($t['id'] ?? null) && preg_match('/^[a-z0-9]{6,16}$/', $t['id']) ? $t['id'] : bin2hex(random_bytes(5));
    $r = is_array($t['repeat'] ?? null) ? $t['repeat'] : [];
    $unit = in_array($r['unit'] ?? '', ['none', 'day', 'week', 'month', 'year'], true) ? $r['unit'] : 'none';
    $n = max(1, min(99, (int)($r['n'] ?? 1)));
    $url = tasks_str($t['url'] ?? '', 500);
    if ($url !== '' && !preg_match('~^https?://[^\s<>"]+$~i', $url)) $url = '';
    $hist = [];
    foreach (is_array($t['history'] ?? null) ? $t['history'] : [] as $h) {
        if (!is_array($h) || ($d = tasks_date($h['d'] ?? '')) === '') continue;
        $hist[] = ['d' => $d, 'p' => tasks_price($h['p'] ?? null), 'k' => ($h['k'] ?? '') === 'skip' ? 'skip' : 'paid', 't' => max(0, (int)($h['t'] ?? 0))];
    }
    $now = time();
    return [
        'id' => $id, 'name' => $name, 'due' => $due,
        'time' => is_string($t['time'] ?? null) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $t['time']) ? $t['time'] : '',
        'day' => max(1, min(31, (int)($t['day'] ?? 0) ?: (int)substr($due, 8, 2))),
        'repeat' => ['n' => $n, 'unit' => $unit],
        'price' => tasks_price($t['price'] ?? null),
        'cur' => is_string($t['cur'] ?? null) && preg_match('/^[A-Z]{3}$/', $t['cur']) ? $t['cur'] : '',
        'mode' => in_array($t['mode'] ?? '', ['online', 'offline'], true) ? $t['mode'] : '',
        'cat' => tasks_str($t['cat'] ?? '', 40), 'pay' => tasks_str($t['pay'] ?? '', 60),
        'auto' => !empty($t['auto']),
        'remind' => max(-1, min(365, (int)($t['remind'] ?? -1))),
        'url' => $url, 'notes' => tasks_str($t['notes'] ?? '', 4000),
        'src' => is_string($t['src'] ?? null) && preg_match('/^[a-z]+:[a-z]+:[a-z0-9.-]{1,100}$/', $t['src']) ? $t['src'] : '',   // made by the site (domain watch): watch:dom:example.com
        'status' => in_array($t['status'] ?? '', ['active', 'paused', 'done'], true) ? $t['status'] : 'active',
        'created' => max(0, min($now + 86400, (int)($t['created'] ?? $now))) ?: $now,
        'updated' => max(0, min($now + 86400, (int)($t['updated'] ?? $now))) ?: $now,
        'doneAt' => max(0, (int)($t['doneAt'] ?? 0)),
        'history' => array_slice($hist, -TASKS_HISTORY_MAX),
    ];
}
function tasks_clean_settings($s): array {
    $s = is_array($s) ? $s : [];
    $cur = strtoupper((string)($s['currency'] ?? 'INR'));
    $pick = function ($k, array $ok, string $def) use ($s) { $v = (string)($s[$k] ?? $def); return in_array($v, $ok, true) ? $v : $def; };
    return ['currency' => preg_match('/^[A-Z]{3}$/', $cur) ? $cur : ($cur === '' ? '' : 'INR'),
            'soon' => max(0, min(90, (int)($s['soon'] ?? 7))),
            // how the page opens ('' = remember what this browser used last)
            'start' => $pick('start', ['', 'list', 'an', 'done'], ''),
            'range' => $pick('range', ['', 'all', 'week', 'month', 'year'], ''),
            'cal'   => $pick('cal', ['', 'on', 'off'], ''),
            'sort'  => $pick('sort', ['', 'due', 'due-', 'price-', 'price', 'name', 'cat'], ''),
            'stats' => array_key_exists('stats', $s) ? (bool)$s['stats'] : true,   // the summary cards above the list
            'week'  => $pick('week', ['sun', 'mon'], 'sun'),                      // the first day of the week (calendar, "This Week")
            'dates' => $pick('dates', ['in', 'us'], 'in')];                       // 16 Oct 2026 or Oct 16, 2026
}
function tasks_clean_entry($e): ?array {
    if (!is_array($e) || ($d = tasks_date($e['d'] ?? '')) === '') return null;
    $name = tasks_str($e['name'] ?? '', 120);
    if ($name === '') return null;
    return ['id' => is_string($e['id'] ?? null) && preg_match('/^[a-z0-9]{6,16}$/', $e['id']) ? $e['id'] : bin2hex(random_bytes(5)),
            'task' => is_string($e['task'] ?? null) && preg_match('/^[a-z0-9]{6,16}$/', $e['task']) ? $e['task'] : '',
            'name' => $name, 'd' => $d, 'p' => tasks_price($e['p'] ?? null),
            'cur' => is_string($e['cur'] ?? null) && preg_match('/^[A-Z]{3}$/', $e['cur']) ? $e['cur'] : '',
            'cat' => tasks_str($e['cat'] ?? '', 40), 'mode' => in_array($e['mode'] ?? '', ['online', 'offline'], true) ? $e['mode'] : '',
            'k' => ($e['k'] ?? '') === 'skip' ? 'skip' : 'paid', 't' => max(0, (int)($e['t'] ?? 0))];
}
/** The whole file, checked: unknown fields dropped, broken tasks skipped, ids unique, the completed list capped at 500. */
function tasks_clean(array $in): array {
    $out = []; $seen = [];
    foreach (is_array($in['tasks'] ?? null) ? $in['tasks'] : [] as $t) {
        if (count($out) >= TASKS_MAX) break;
        if (!($c = tasks_clean_one($t))) continue;
        if (isset($seen[$c['id']])) $c['id'] = bin2hex(random_bytes(5));
        $seen[$c['id']] = true;
        $out[] = $c;
    }
    // the completed list: from the file, or (older files) built once from each task's history
    $log = [];
    if (is_array($in['log'] ?? null)) {
        foreach ($in['log'] as $e) if ($c = tasks_clean_entry($e)) $log[] = $c;
    } else {
        foreach ($out as $t) foreach ($t['history'] as $h) {
            $log[] = ['id' => bin2hex(random_bytes(5)), 'task' => $t['id'], 'name' => $t['name'], 'd' => $h['d'], 'p' => $h['p'], 'cur' => $t['cur'],
                      'cat' => $t['cat'], 'mode' => $t['mode'], 'k' => $h['k'], 't' => $h['t'] ?: (int)strtotime($h['d'] . ' 12:00')];
        }
    }
    usort($log, function ($a, $b) { return $a['t'] <=> $b['t']; });
    $log = array_slice($log, -TASKS_LOG_MAX);
    // done one-time tasks: only the newest 500 are kept
    $done = array_keys(array_filter($out, function ($t) { return $t['status'] === 'done'; }));
    if (count($done) > TASKS_LOG_MAX) {
        usort($done, function ($a, $b) use ($out) { return $out[$b]['doneAt'] <=> $out[$a]['doneAt']; });
        foreach (array_slice($done, TASKS_LOG_MAX) as $i) unset($out[$i]);
        $out = array_values($out);
    }
    return ['rev' => max(0, (int)($in['rev'] ?? 0)), 'tasks' => $out, 'log' => $log, 'settings' => tasks_clean_settings($in['settings'] ?? [])];
}
/** The date after $due for a repeating task; monthly and yearly tasks keep their day of the month (31st -> 30th -> 31st). */
function tasks_next_date(array $t): string {
    $u = $t['repeat']['unit'] ?? 'none'; $n = max(1, (int)($t['repeat']['n'] ?? 1));
    $ts = strtotime($t['due'] . ' 12:00');
    if ($u === 'day') return date('Y-m-d', strtotime("+$n day", $ts));
    if ($u === 'week') return date('Y-m-d', strtotime('+' . 7 * $n . ' day', $ts));
    if ($u === 'month' || $u === 'year') {
        $y = (int)date('Y', $ts); $m = (int)date('n', $ts) - 1;
        if ($u === 'month') $m += $n; else $y += $n;
        $y += intdiv($m, 12); $m %= 12;
        $day = min((int)($t['day'] ?? 0) ?: (int)date('j', $ts), (int)date('t', mktime(12, 0, 0, $m + 1, 1, $y)));
        return sprintf('%04d-%02d-%02d', $y, $m + 1, $day);
    }
    return $t['due'];
}
function tasks_repeat_label(array $r): string {
    $n = max(1, (int)($r['n'] ?? 1)); $u = $r['unit'] ?? 'none';
    if ($u === 'none') return 'One-Time';
    if ($n === 1) return ['day' => 'Daily', 'week' => 'Weekly', 'month' => 'Monthly', 'year' => 'Yearly'][$u] ?? '';
    if ($u === 'month' && $n === 3) return 'Quarterly';
    return 'Every ' . $n . ' ' . ucfirst($u) . 's';
}
function tasks_read(): array { return tasks_clean(hub_jread(tasks_file()) ?? []); }

/** An earlier version at most every 10 minutes (always when forced); the last 40 are kept. Restored from Backup. */
function tasks_snapshot(bool $force = false): void {
    $src = hub_jpath(tasks_file());
    if (!is_file($src)) return;
    $vd = hub_dir('tasks') . '/versions';
    if (!is_dir($vd)) @mkdir($vd, 0700, true);
    $files = glob($vd . '/*.php') ?: []; sort($files);
    if (!$force && $files && time() - filemtime(end($files)) < TASKS_EVERY) return;
    $name = $vd . '/' . date('Ymd-His') . '.php';
    if (!is_file($name)) @copy($src, $name);
    $files = glob($vd . '/*.php') ?: []; sort($files);
    while (count($files) > TASKS_KEEP) @unlink(array_shift($files));
}

/**
 * Changes Tasks from outside the page (Telegram bot, domain watch): under the same lock as the page's saves, from the file
 * as it is now. $fn(&$data) changes $data and returns true when something changed; then an earlier version is kept and
 * rev goes up (an open Tasks page sees the change instead of overwriting it).
 */
function tasks_modify(callable $fn) {
    $lk = @fopen(hub_dir('tasks') . '/tasks.lock', 'c');
    if (!$lk) return false;
    flock($lk, LOCK_EX);
    try {
        if (is_file(hub_jpath(tasks_file())) && hub_jread(tasks_file()) === null) return false;   // unreadable: never overwrite
        $data = tasks_read();
        $res = $fn($data);
        if (!$res) return $res;
        tasks_snapshot(false);
        $rev = (int)$data['rev']; $data = tasks_clean($data); $data['rev'] = $rev + 1;
        if (!hub_jput(tasks_file(), json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) return false;
        return $res;
    } finally { flock($lk, LOCK_UN); fclose($lk); }
}
/** Marks the date $due of task $id done (or skipped), exactly like the Done button on the page. Returns a short result or ''. */
function tasks_complete(array &$data, string $id, string $due, string $kind = 'paid'): string {
    foreach ($data['tasks'] as &$t) {
        if ($t['id'] !== $id) continue;
        if ($t['status'] !== 'active') return 'already';
        if ($due !== '' && $t['due'] !== $due) return 'already';   // this date was handled already
        $now = time();
        $data['log'][] = ['id' => bin2hex(random_bytes(5)), 'task' => $t['id'], 'name' => $t['name'], 'd' => $t['due'], 'p' => $kind === 'skip' ? null : $t['price'],
                          'cur' => $t['cur'], 'cat' => $t['cat'], 'mode' => $t['mode'], 'k' => $kind, 't' => $now];
        $t['history'][] = ['d' => $t['due'], 'p' => $kind === 'skip' ? null : $t['price'], 'k' => $kind, 't' => $now];
        if ($t['repeat']['unit'] === 'none') { $t['status'] = 'done'; $t['doneAt'] = $now; $res = 'done'; }
        else { $t['due'] = tasks_next_date($t); $res = 'next:' . $t['due']; }
        $t['updated'] = $now;
        return $res;
    }
    return '';
}

/**
 * Adds one task written in plain words ("Netflix 649 monthly 5 Nov 9pm"), read the same way as Telegram's /add
 * (nt_parse_add). $from goes in the notes ("Added from Home."). Returns the new task, null when the text names nothing,
 * or false when the tasks file could not be read (then nothing is written).
 */
function tasks_add_text(string $text, string $from) {
    require_once HUB_CORE . '/lib/notify.php';
    $p = nt_parse_add($text);
    if (!$p) return null;
    $now = time();
    $task = ['id' => bin2hex(random_bytes(5))] + $p + ['cat' => '', 'remind' => -1, 'url' => '', 'notes' => 'Added from ' . $from . '.', 'status' => 'active', 'created' => $now, 'updated' => $now, 'day' => (int)substr($p['due'], 8, 2)];
    if (!tasks_modify(function (&$data) use ($task) { $data['tasks'][] = $task; return true; })) return false;
    foreach (tasks_read()['tasks'] as $t) if ($t['id'] === $task['id']) return $t;   // as saved (cleaned)
    return tasks_clean_one($task);
}

