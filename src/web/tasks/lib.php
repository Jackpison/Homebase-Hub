<?php
declare(strict_types=1);
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
        'repeat' => tasks_clean_repeat($r, $n, $unit),
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
/**
 * (1.72.0) More ways to repeat, on top of { n, unit }:
 *   week:  wd   the weekdays it falls on (0 Sunday .. 6 Saturday), e.g. [1, 3, 5] = Monday, Wednesday and Friday; none = the due date's weekday
 *   month: on   'day' (the same date, the default) | 'last' (the last day of the month) | 'nth' (the nth weekday: nth 1..4 or -1 = the last, dow 0..6)
 * Anything else is dropped, so an old or odd value is simply the plain repeat.
 */
function tasks_clean_repeat(array $r, int $n, string $unit): array {
    $out = ['n' => $n, 'unit' => $unit];
    if ($unit === 'week' && is_array($r['wd'] ?? null)) {
        $wd = array_values(array_unique(array_filter(array_map('intval', array_filter($r['wd'], 'is_numeric')), function ($d) { return $d >= 0 && $d <= 6; })));
        sort($wd);
        if ($wd) $out['wd'] = $wd;
    }
    if ($unit === 'month') {
        $on = $r['on'] ?? 'day';
        if ($on === 'last') $out['on'] = 'last';
        elseif ($on === 'nth' && in_array((int)($r['nth'] ?? 0), [-1, 1, 2, 3, 4], true) && is_numeric($r['dow'] ?? null) && (int)$r['dow'] >= 0 && (int)$r['dow'] <= 6) {
            $out['on'] = 'nth'; $out['nth'] = (int)$r['nth']; $out['dow'] = (int)$r['dow'];
        }
    }
    return $out;
}
/** The day of the month of the nth weekday (dow 0-6; nth 1-4, or -1 for the last) in month $m (1-12) of $y. */
function tasks_nth_weekday(int $y, int $m, int $nth, int $dow): int {
    $dim = (int)date('t', mktime(12, 0, 0, $m, 1, $y));
    if ($nth < 0) { $last = (int)date('w', mktime(12, 0, 0, $m, $dim, $y)); return $dim - (($last - $dow + 7) % 7); }
    $first = (int)date('w', mktime(12, 0, 0, $m, 1, $y));
    return min($dim, 1 + (($dow - $first + 7) % 7) + 7 * ($nth - 1));
}
/** The date after $due for a repeating task; monthly and yearly tasks keep their day of the month (31st -> 30th -> 31st). */
function tasks_next_date(array $t): string {
    $u = $t['repeat']['unit'] ?? 'none'; $n = max(1, (int)($t['repeat']['n'] ?? 1));
    $ts = strtotime($t['due'] . ' 12:00');
    if ($u === 'day') return date('Y-m-d', strtotime("+$n day", $ts));
    if ($u === 'week' && !empty($t['repeat']['wd'])) {   // the next chosen weekday: later this week, else in the week n weeks on
        $wd = $t['repeat']['wd']; $cur = (int)date('w', $ts); $mon = strtotime('-' . (($cur + 6) % 7) . ' day', $ts);
        for ($i = 1; $i <= 7 * $n + 7; $i++) {
            $d = strtotime("+$i day", $ts); $dMon = strtotime('-' . (((int)date('w', $d) + 6) % 7) . ' day', $d);
            $weeks = (int)round(($dMon - $mon) / 604800);
            if (in_array((int)date('w', $d), $wd, true) && $weeks % $n === 0) return date('Y-m-d', $d);
        }
    }
    if ($u === 'week') return date('Y-m-d', strtotime('+' . 7 * $n . ' day', $ts));
    if ($u === 'month' && in_array($t['repeat']['on'] ?? 'day', ['last', 'nth'], true)) {
        $y = (int)date('Y', $ts); $m = (int)date('n', $ts) - 1 + $n; $y += intdiv($m, 12); $m = $m % 12 + 1;
        $day = ($t['repeat']['on'] === 'last') ? (int)date('t', mktime(12, 0, 0, $m, 1, $y)) : tasks_nth_weekday($y, $m, (int)$t['repeat']['nth'], (int)$t['repeat']['dow']);
        return sprintf('%04d-%02d-%02d', $y, $m, $day);
    }
    if ($u === 'month' || $u === 'year') {
        $y = (int)date('Y', $ts); $m = (int)date('n', $ts) - 1;
        if ($u === 'month') $m += $n; else $y += $n;
        $y += intdiv($m, 12); $m %= 12;
        $day = min((int)($t['day'] ?? 0) ?: (int)date('j', $ts), (int)date('t', mktime(12, 0, 0, $m + 1, 1, $y)));
        return sprintf('%04d-%02d-%02d', $y, $m + 1, $day);
    }
    return $t['due'];
}
/* ---------- the calendar link (1.61.0) ----------
 * An optional secret link that Google, Apple or Outlook Calendar can subscribe to (web/tasks/calendar.php?k=...). Off until you turn it on.
 * site-data/tasks/calendar.php (guarded): { on, key }. Anyone with the link sees the task names, so a new link can be made any time;
 * the old one stops at once. A wrong, missing or switched-off key all get the same plain 404. */
function tasks_cal_file(): string { return hub_dir('tasks') . '/calendar.json'; }
function tasks_cal_state(): array {
    $j = hub_jread(tasks_cal_file()) ?? [];
    $key = is_string($j['key'] ?? null) && preg_match('/^[a-f0-9]{32}$/', $j['key']) ? $j['key'] : '';
    return ['on' => !empty($j['on']) && $key !== '', 'key' => $key];
}
/** Turns the link on or off (a key is made the first time), or makes a new key. Returns the state after, or null when it could not be saved. */
function tasks_cal_set(?bool $on, bool $renew = false): ?array {
    $cur = tasks_cal_state();
    $key = $cur['key'] === '' || $renew ? bin2hex(random_bytes(16)) : $cur['key'];
    $on = $on ?? $cur['on'];
    if (!hub_jput(tasks_cal_file(), json_encode(['on' => $on, 'key' => $key]))) return null;
    return ['on' => $on, 'key' => $key];
}
function tasks_cal_ok(string $k): bool {
    $s = tasks_cal_state();
    return $s['on'] && preg_match('/^[a-f0-9]{32}$/', $k) === 1 && hash_equals($s['key'], $k);
}
function tasks_ics_text(string $v): string { return str_replace(["\\", ';', ',', "\r\n", "\n", "\r"], ["\\\\", '\\;', '\\,', '\\n', '\\n', '\\n'], $v); }
/** One content line, folded at 75 bytes (never inside a multi-byte character), ended with CRLF. */
function tasks_ics_line(string $l): string {
    $out = ''; $cur = ''; $first = true;
    foreach (preg_split('//u', $l, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $ch) {
        if (strlen($cur) + strlen($ch) > ($first ? 75 : 74)) { $out .= $cur . "\r\n "; $cur = ''; $first = false; }
        $cur .= $ch;
    }
    return $out . $cur . "\r\n";
}
/** The tasks as an iCalendar feed: each active task is an all-day event (or a 30-minute one when it has a time), repeating like the task does. */
function tasks_ics(array $data, string $host, string $title = 'Tasks'): string {
    $o = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Homebase Hub//Tasks//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' . tasks_ics_text($title),
          'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H'];
    $rr = ['day' => 'DAILY', 'week' => 'WEEKLY', 'month' => 'MONTHLY', 'year' => 'YEARLY'];
    foreach ($data['tasks'] as $t) {
        if (($t['status'] ?? 'active') !== 'active') continue;
        $d = str_replace('-', '', $t['due']);
        $o[] = 'BEGIN:VEVENT'; $o[] = 'UID:' . $t['id'] . '@' . preg_replace('/[^a-z0-9.-]/i', '', $host);
        $o[] = 'DTSTAMP:' . gmdate('Ymd\THis\Z', (int)($t['updated'] ?? time()));
        if ($t['time'] !== '') {
            $start = $d . 'T' . str_replace(':', '', $t['time']) . '00';
            $o[] = 'DTSTART:' . $start; $o[] = 'DTEND:' . gmdate('Ymd\THis', strtotime($t['due'] . ' ' . $t['time'] . ' UTC') + 1800);
        } else {
            $o[] = 'DTSTART;VALUE=DATE:' . $d; $o[] = 'DTEND;VALUE=DATE:' . gmdate('Ymd', strtotime($t['due'] . ' UTC') + 86400);
        }
        if (isset($rr[$t['repeat']['unit']])) $o[] = 'RRULE:FREQ=' . $rr[$t['repeat']['unit']] . ';INTERVAL=' . max(1, (int)$t['repeat']['n']) . tasks_ics_by($t['repeat']);
        $o[] = 'SUMMARY:' . tasks_ics_text($t['name']); $o[] = 'TRANSP:TRANSPARENT';
        $desc = array_filter([$t['cat'] !== '' ? 'Category: ' . $t['cat'] : '', $t['price'] !== null ? 'Price: ' . rtrim(rtrim(number_format((float)$t['price'], 2, '.', ''), '0'), '.') . ($t['cur'] !== '' ? ' ' . $t['cur'] : '') : '']);
        if ($desc) $o[] = 'DESCRIPTION:' . tasks_ics_text(implode("\n", $desc));
        if ($t['url'] !== '') $o[] = 'URL:' . $t['url'];
        if ($t['remind'] >= 0) { $o[] = 'BEGIN:VALARM'; $o[] = 'ACTION:DISPLAY'; $o[] = 'DESCRIPTION:' . tasks_ics_text($t['name']); $o[] = $t['remind'] === 0 ? 'TRIGGER:PT0S' : 'TRIGGER:-P' . (int)$t['remind'] . 'D'; $o[] = 'END:VALARM'; }
        $o[] = 'END:VEVENT';
    }
    $o[] = 'END:VCALENDAR';
    return implode('', array_map('tasks_ics_line', $o));
}

/** (1.72.0) the extra part of a calendar repeat rule: the weekdays (BYDAY=MO,WE), the last day (BYMONTHDAY=-1) or the nth weekday (BYDAY=2TU) */
function tasks_ics_by(array $r): string {
    $code = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    if (($r['unit'] ?? '') === 'week' && !empty($r['wd'])) return ';BYDAY=' . implode(',', array_map(function ($d) use ($code) { return $code[$d]; }, $r['wd']));
    if (($r['unit'] ?? '') === 'month' && ($r['on'] ?? '') === 'last') return ';BYMONTHDAY=-1';
    if (($r['unit'] ?? '') === 'month' && ($r['on'] ?? '') === 'nth') return ';BYDAY=' . (int)$r['nth'] . $code[(int)$r['dow']];
    return '';
}
/* ---------- (1.72.0) calendars you follow ----------
 * Add the address of a calendar (Google's secret iCal address, Apple's public link, an Outlook ICS link, a school's calendar). The server
 * fetches it when it is added and then every 6 hours (the schedule, or a Tasks page that finds it old), reads its events, works out the
 * repeating ones, and keeps those from 2 weeks ago to about 6 months ahead in site-data/tasks/subs.json. Tasks shows them in the calendar
 * (read-only), and Home's Today widget lists today's. Nothing is fetched until you add an address; the address is never shown in full.
 * subs.json: { list: [{ id, name, url, color, at (last fetch), error, events: [{ d, t, s }] }] } */
const TASKS_SUBS_MAX = 8;           // calendars
const TASKS_SUB_EVENTS = 1500;      // events kept per calendar
const TASKS_SUB_EVERY = 6 * 3600;   // seconds between fetches
function tasks_subs_file(): string { return hub_dir('tasks') . '/subs.json'; }
function tasks_subs_load(): array {
    $j = hub_jread(tasks_subs_file()) ?? [];
    $out = [];
    foreach (is_array($j['list'] ?? null) ? $j['list'] : [] as $c) {
        if (!is_array($c) || !is_string($c['id'] ?? null) || !preg_match('/^[a-f0-9]{8}$/', $c['id']) || !is_string($c['url'] ?? null)) continue;
        $out[] = ['id' => $c['id'], 'name' => tasks_str($c['name'] ?? '', 40) ?: 'Calendar', 'url' => $c['url'], 'color' => preg_match('/^#[0-9a-f]{6}$/i', (string)($c['color'] ?? '')) ? $c['color'] : '#4cc9f0',
                  'at' => max(0, (int)($c['at'] ?? 0)), 'error' => tasks_str($c['error'] ?? '', 200), 'events' => is_array($c['events'] ?? null) ? array_slice($c['events'], 0, TASKS_SUB_EVENTS) : []];
    }
    return $out;
}
function tasks_subs_save(array $list): bool { return hub_jput(tasks_subs_file(), json_encode(['list' => array_values($list)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE)); }
/** A calendar address as you would type it: webcal:// becomes https://; only http(s) addresses. '' when it is not one. */
function tasks_sub_url(string $u): string {
    $u = trim($u);
    if (preg_match('~^webcals?://~i', $u)) $u = 'https://' . preg_replace('~^webcals?://~i', '', $u);
    return preg_match('~^https?://[^\s<>"]+$~i', $u) && strlen($u) <= 2000 ? $u : '';
}
/** The address with its middle hidden: https://calendar.google.com/…/basic.ics */
function tasks_sub_show(string $u): string {
    $p = parse_url($u); if (!$p || empty($p['host'])) return '';
    $path = (string)($p['path'] ?? ''); $last = basename($path);
    return ($p['scheme'] ?? 'https') . '://' . $p['host'] . ($path !== '' && $path !== '/' ? '/…' . ($last !== '' && strlen($last) <= 30 && !preg_match('/[a-f0-9]{16,}/i', $last) ? '/' . $last : '') : '');
}
/** One iCalendar date or date-time in this site's time zone: [Y-m-d, H:i or ''] (all-day events have no time). null when unreadable. */
function tasks_ics_when(string $v, array $params, DateTimeZone $site): ?array {
    if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $v, $m) || strtoupper($params['VALUE'] ?? '') === 'DATE' && preg_match('/^(\d{4})(\d{2})(\d{2})/', $v, $m)) return [$m[1] . '-' . $m[2] . '-' . $m[3], ''];
    if (!preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/', $v, $m)) return null;
    $tz = $site;
    if ($m[7] === 'Z') $tz = new DateTimeZone('UTC');
    elseif (!empty($params['TZID'])) { try { $tz = new DateTimeZone(trim($params['TZID'], '"')); } catch (Exception $e) { $tz = $site; } }
    try { $dt = new DateTimeImmutable("$m[1]-$m[2]-$m[3] $m[4]:$m[5]:$m[6]", $tz); } catch (Exception $e) { return null; }
    $dt = $dt->setTimezone($site);
    return [$dt->format('Y-m-d'), $dt->format('H:i')];
}
/** The value of an iCalendar text property, unescaped. */
function tasks_ics_unescape(string $v): string { return str_replace(['\\n', '\\N', '\\,', '\;', '\\\\'], ["\n", "\n", ',', ';', '\\'], $v); }
/**
 * Reads an iCalendar file into events [{ d, t, s }] between $from and $to (Y-m-d), repeating events worked out (DAILY, WEEKLY with BYDAY,
 * MONTHLY with BYMONTHDAY or BYDAY like 2TU / -1FR, YEARLY; INTERVAL, COUNT, UNTIL, EXDATE; a moved single date replaces its usual one).
 * Cancelled events are left out. At most $max events, earliest first.
 */
function tasks_ics_parse(string $ics, string $tz, string $from, string $to, int $max = TASKS_SUB_EVENTS): array {
    try { $site = new DateTimeZone($tz); } catch (Exception $e) { $site = new DateTimeZone('UTC'); }
    $lines = preg_split("/\r\n|\n|\r/", preg_replace("/\r?\n[ \t]/", '', $ics) ?? '') ?: [];
    $evs = []; $cur = null; $depth = 0;
    foreach ($lines as $line) {
        if ($line === '') continue;
        if (strcasecmp($line, 'BEGIN:VEVENT') === 0) { $cur = ['ex' => []]; $depth = 0; continue; }
        if ($cur === null) continue;
        if (stripos($line, 'BEGIN:') === 0) { $depth++; continue; }   // an alarm inside the event
        if (stripos($line, 'END:') === 0) { if ($depth > 0) { $depth--; continue; } if (strcasecmp($line, 'END:VEVENT') === 0) { $evs[] = $cur; $cur = null; } continue; }
        if ($depth > 0) continue;
        $c = strpos($line, ':'); if ($c === false) continue;
        $head = explode(';', substr($line, 0, $c)); $val = substr($line, $c + 1); $name = strtoupper(array_shift($head)); $params = [];
        foreach ($head as $p) { $e = strpos($p, '='); if ($e !== false) $params[strtoupper(substr($p, 0, $e))] = substr($p, $e + 1); }
        if ($name === 'DTSTART') $cur['start'] = tasks_ics_when($val, $params, $site);
        elseif ($name === 'SUMMARY') $cur['s'] = mb_substr(trim(tasks_ics_unescape($val)), 0, 200);
        elseif ($name === 'RRULE') $cur['rule'] = $val;
        elseif ($name === 'UID') $cur['uid'] = $val;
        elseif ($name === 'STATUS') $cur['status'] = strtoupper($val);
        elseif ($name === 'RECURRENCE-ID') $cur['rid'] = tasks_ics_when($val, $params, $site);
        elseif ($name === 'EXDATE') foreach (explode(',', $val) as $x) { $w = tasks_ics_when(trim($x), $params, $site); if ($w) $cur['ex'][] = $w[0]; }
    }
    // a moved or cancelled single date of a repeating event replaces its usual date
    $moved = [];
    foreach ($evs as $e) if (!empty($e['rid']) && !empty($e['uid'])) $moved[$e['uid']][] = $e['rid'][0];
    $out = [];
    foreach ($evs as $e) {
        if (empty($e['start']) || ($e['status'] ?? '') === 'CANCELLED') continue;
        $s = ($e['s'] ?? '') !== '' ? $e['s'] : 'Busy';
        if (!empty($e['rid']) || empty($e['rule'])) { if ($e['start'][0] >= $from && $e['start'][0] <= $to) $out[] = ['d' => $e['start'][0], 't' => $e['start'][1], 's' => $s]; continue; }
        $skip = array_flip(array_merge($e['ex'], $moved[$e['uid'] ?? ''] ?? []));
        foreach (tasks_rrule_dates($e['start'][0], $e['rule'], $from, $to, $max) as $d) if (!isset($skip[$d])) $out[] = ['d' => $d, 't' => $e['start'][1], 's' => $s];
    }
    usort($out, function ($a, $b) { return [$a['d'], $a['t']] <=> [$b['d'], $b['t']]; });
    return array_slice($out, 0, $max);
}
/** The dates of a repeat rule (RRULE) from $start, between $from and $to. */
function tasks_rrule_dates(string $start, string $rule, string $from, string $to, int $max): array {
    $r = []; foreach (explode(';', strtoupper($rule)) as $kv) { $e = strpos($kv, '='); if ($e !== false) $r[substr($kv, 0, $e)] = substr($kv, $e + 1); }
    $freq = $r['FREQ'] ?? ''; $n = max(1, min(400, (int)($r['INTERVAL'] ?? 1))); $count = isset($r['COUNT']) ? max(1, (int)$r['COUNT']) : PHP_INT_MAX;
    $until = isset($r['UNTIL']) && preg_match('/^(\d{4})(\d{2})(\d{2})/', $r['UNTIL'], $m) ? "$m[1]-$m[2]-$m[3]" : '9999-12-31';
    $code = ['SU' => 0, 'MO' => 1, 'TU' => 2, 'WE' => 3, 'TH' => 4, 'FR' => 5, 'SA' => 6];
    $byday = []; foreach (array_filter(explode(',', $r['BYDAY'] ?? '')) as $b) if (preg_match('/^([+-]?\d)?(SU|MO|TU|WE|TH|FR|SA)$/', $b, $m)) $byday[] = [(int)$m[1], $code[$m[2]]];
    $t = ['due' => $start, 'day' => (int)substr($start, 8, 2), 'repeat' => ['n' => $n, 'unit' => ['DAILY' => 'day', 'WEEKLY' => 'week', 'MONTHLY' => 'month', 'YEARLY' => 'year'][$freq] ?? 'none']];
    if ($t['repeat']['unit'] === 'none') return $start >= $from && $start <= $to ? [$start] : [];
    if ($freq === 'WEEKLY' && $byday) $t['repeat']['wd'] = array_values(array_unique(array_column($byday, 1)));
    if ($freq === 'MONTHLY' && ($r['BYMONTHDAY'] ?? '') === '-1') $t['repeat']['on'] = 'last';
    elseif ($freq === 'MONTHLY' && count($byday) === 1 && $byday[0][0] !== 0) { $t['repeat']['on'] = 'nth'; $t['repeat']['nth'] = max(-1, min(4, $byday[0][0])); $t['repeat']['dow'] = $byday[0][1]; }
    elseif ($freq === 'MONTHLY' && isset($r['BYMONTHDAY']) && (int)$r['BYMONTHDAY'] > 0) $t['day'] = min(31, (int)$r['BYMONTHDAY']);
    $t['repeat'] = tasks_clean_repeat($t['repeat'], $n, $t['repeat']['unit']);
    $out = []; $i = 0; $guard = 0;
    // a weekly rule with weekdays: the start date counts only when it is one of them
    $d = $start;
    if (!empty($t['repeat']['wd']) && !in_array((int)date('w', strtotime($d . ' 12:00')), $t['repeat']['wd'], true)) $d = tasks_next_date($t);
    while ($d <= $to && $d <= $until && $i < $count && $guard++ < 20000) {
        $i++;
        if ($d >= $from) { $out[] = $d; if (count($out) >= $max) break; }
        $t['due'] = $d; $d = tasks_next_date($t);
    }
    return $out;
}
/** Fetches one calendar now and keeps its events. Returns it, with error set when the fetch or the reading failed (the old events stay). */
function tasks_sub_fetch(array $c, string $tz): array {
    $r = hub_fetch($c['url'], ['max' => 5000000, 'ua' => 'Homebase Hub calendar', 'headers' => ['Accept: text/calendar, */*;q=0.5']]);
    $c['at'] = time();
    if (isset($r['error']) || ($r['status'] ?? 0) !== 200) { $c['error'] = 'Could not fetch the calendar' . (isset($r['status']) ? ' (it answered ' . (int)$r['status'] . ')' : '') . '.'; return $c; }
    if (stripos((string)$r['body'], 'BEGIN:VCALENDAR') === false) { $c['error'] = 'That address does not give a calendar (an .ics file).'; return $c; }
    $now = new DateTimeImmutable('now', new DateTimeZone($tz));
    $c['events'] = tasks_ics_parse((string)$r['body'], $tz, $now->modify('-14 days')->format('Y-m-d'), $now->modify('+190 days')->format('Y-m-d'));
    $c['error'] = '';
    return $c;
}
/** The schedule (or an open Tasks page): every calendar older than 6 hours is fetched again. Returns how many were fetched. */
function tasks_subs_tick(string $tz, bool $all = false): int {
    $list = tasks_subs_load(); $n = 0;
    foreach ($list as $i => $c) if ($all || time() - $c['at'] >= TASKS_SUB_EVERY) { $list[$i] = tasks_sub_fetch($c, $tz); $n++; }
    if ($n) tasks_subs_save($list);
    return $n;
}
/** What the Tasks page and Home get: the calendars (address hidden) and their events from $from to $to. */
function tasks_subs_view(string $from, string $to): array {
    $cals = []; $evs = [];
    foreach (tasks_subs_load() as $c) {
        $cals[] = ['id' => $c['id'], 'name' => $c['name'], 'color' => $c['color'], 'show' => tasks_sub_show($c['url']), 'at' => $c['at'], 'error' => $c['error'], 'n' => count($c['events'])];
        foreach ($c['events'] as $e) if (is_array($e) && ($e['d'] ?? '') >= $from && ($e['d'] ?? '') <= $to) $evs[] = ['c' => $c['id'], 'd' => (string)$e['d'], 't' => (string)($e['t'] ?? ''), 's' => (string)($e['s'] ?? '')];
    }
    return ['cals' => $cals, 'events' => $evs, 'stale' => (bool)array_filter(tasks_subs_load(), function ($c) { return time() - $c['at'] >= TASKS_SUB_EVERY; })];
}
function tasks_repeat_label(array $r): string {
    $n = max(1, (int)($r['n'] ?? 1)); $u = $r['unit'] ?? 'none';
    if ($u === 'none') return 'One-Time';
    $days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if ($u === 'week' && !empty($r['wd'])) {
        $names = array_map(function ($d) use ($days) { return substr($days[$d], 0, 3); }, $r['wd']);
        $list = count($names) > 1 ? implode(', ', array_slice($names, 0, -1)) . ' and ' . end($names) : $names[0];
        if ($r['wd'] === [1, 2, 3, 4, 5] && $n === 1) return 'Every Weekday';
        return ($n === 1 ? 'Every ' : 'Every ' . $n . ' Weeks on ') . $list;
    }
    if ($u === 'month' && in_array($r['on'] ?? 'day', ['last', 'nth'], true)) {
        $what = $r['on'] === 'last' ? 'the Last Day' : 'the ' . ([-1 => 'Last', 1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th'][(int)$r['nth']] ?? '') . ' ' . $days[(int)$r['dow']];
        return ($n === 1 ? 'Monthly' : ($n === 3 ? 'Quarterly' : 'Every ' . $n . ' Months')) . ' on ' . $what;
    }
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
    return hub_with_lock_or(hub_dir('tasks') . '/tasks.lock', function () use ($fn) {
        if (is_file(hub_jpath(tasks_file())) && hub_jread(tasks_file()) === null) return false;   // unreadable: never overwrite
        $data = tasks_read();
        $res = $fn($data);
        if (!$res) return $res;
        tasks_snapshot(false);
        $rev = (int)$data['rev']; $data = tasks_clean($data); $data['rev'] = $rev + 1;
        if (!hub_jput(tasks_file(), json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) return false;
        return $res;
    }, false);
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

