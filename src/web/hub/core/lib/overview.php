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
 * Settings > Overview: where things stand, read from what is already saved (no slow checks, no calls to other servers).
 * The deeper checks (public error_log, disk use, speed) live in Health and are only mentioned here once they have been run.
 */
require_once __DIR__ . '/boot.php';
require_once __DIR__ . '/notify.php';
require_once __DIR__ . '/update.php';

function hub_overview(): array {
    $s = hub_settings(); $a = hub_auth() ?: []; $n = nt_load(); $now = time();
    $links = hub_read_guarded(hub_dir('links') . '/bookmarks.php') ?: []; $info = hub_read_guarded(hub_dir('info') . '/info.php') ?: [];
    $rec = !empty(($links['settings']['vault'] ?? [])['rec']) || !empty(($info['page']['vault'] ?? [])['rec']);
    $prot = [
        ['key' => 'https',    'on' => hub_https(),                                  'title' => 'HTTPS',              'next' => 'Turn on HTTPS (an SSL certificate) with your host, so what you type and see cannot be read on the way.'],
        ['key' => 'twostep',  'on' => !empty($a['totp']['on']),                     'title' => 'Two-Step Login',     'next' => 'Turn on Two-Step Login, so a stolen password alone gets nobody in.'],
        ['key' => 'enc',      'on' => hub_pp_on(),                              'title' => 'Encryption',         'next' => 'Set an encryption passphrase: encrypted tabs and backup files stay private even if someone copies your server.'],
        ['key' => 'recovery', 'on' => $rec,                                         'title' => 'Recovery Key',       'next' => 'Create a recovery key: without one, a forgotten passphrase means encrypted tabs are lost.'],
        ['key' => 'approval', 'on' => is_file(hub_dir('core') . '/login-approval.php'), 'title' => 'Login Approval', 'next' => 'Approve new logins in Telegram: you see every login and can refuse it.'],
    ];
    $on = 1 + count(array_filter($prot, function ($p) { return $p['on']; }));   // the password counts too
    $next = null; foreach ($prot as $p) if (!$p['on'] && !($p['key'] === 'recovery' && !hub_pp_on()) && !($p['key'] === 'approval' && $n['token'] === '')) { $next = $p; break; }
    $up = up_state(); $st = up_status();
    $tg = ['ready' => $n['token'] !== '' && $n['chat'] !== '', 'cronLast' => (int)@file_get_contents(hub_dir('core') . '/cron-last.txt'), 'lastSent' => (int)$n['lastSent'], 'on' => (bool)$n['on'], 'hour' => (int)$n['hour'],
           'bkEvery' => (int)$n['bkEvery'], 'bkLast' => (int)$n['bkLast'], 'bkError' => (string)($n['bkError'] ?? ''), 'lastError' => (string)($n['lastError'] ?? ''), 'hook' => (bool)$n['hook']];
    $alerts = [];
    if ($tg['ready'] && $tg['cronLast'] && $now - $tg['cronLast'] > 1800) $alerts[] = ['level' => 'warn', 'go' => 'telegram', 'text' => 'Telegram\'s schedule (the cron job) has not run for ' . max(1, (int)round(($now - $tg['cronLast']) / 3600)) . ' hours, so no messages go out.'];
    if ($tg['bkError'] !== '') $alerts[] = ['level' => 'warn', 'go' => 'telegram', 'text' => 'The last backup to Telegram failed: ' . $tg['bkError']];
    $last = (int)$s['backupLast']; $every = (int)$s['backupEvery'];
    if ($every > 0 && (!$last || ($now - $last) / 86400 >= $every)) $alerts[] = ['level' => 'info', 'go' => 'backup', 'text' => $last ? 'A backup is due (your last full one was ' . (int)round(($now - $last) / 86400) . ' days ago).' : 'You have not made a full backup yet.'];
    $f = $up['files'] ?? null;
    if ($f && ($f['extra'] > 0 || $f['changed'] > 0)) $alerts[] = ['level' => $f['extra'] > 0 ? 'warn' : 'info', 'go' => 'files', 'text' => ($f['extra'] > 0 ? $f['extra'] . ' file' . ($f['extra'] > 1 ? 's are' : ' is') . ' not part of this version of the site. ' : '') . ($f['changed'] > 0 ? $f['changed'] . ' file' . ($f['changed'] > 1 ? 's were' : ' was') . ' changed by hand.' : '')];
    if (!empty($up['staged'])) $alerts[] = ['level' => 'info', 'go' => 'updates', 'text' => 'An update (' . $up['staged']['version'] . ') is checked and waiting for you to apply it.'];
    $pn = hub_php_notice(); if ($pn) $alerts[] = ['level' => $pn['level'], 'go' => 'check', 'text' => $pn['text']];
    require_once __DIR__ . '/ghupdate.php'; $gh = gh_info();
    if ($gh['newer'] && empty($up['staged'])) $alerts[] = ['level' => 'info', 'go' => 'updates', 'text' => 'Version ' . $gh['latest']['version'] . ' is available on GitHub.'];
    return ['ok' => true, 'version' => HUB, 'php' => PHP_VERSION, 'https' => hub_https(), 'siteName' => $s['siteName'], 'logo' => $s['logo'] !== '', 'tz' => $s['tz'],
            'protect' => ['on' => $on, 'total' => count($prot) + 1, 'items' => $prot, 'next' => $next], 'telegram' => $tg,
            'backup' => ['last' => $last, 'every' => $every, 'enc' => hub_pp_on(), 'tg' => $tg['bkEvery']],
            'update' => ['newer' => $gh['newer'] ? $gh['latest']['version'] : null, 'last' => $up['last'] ?? null, 'staged' => $up['staged'] ?? null, 'hasManifest' => $st['hasManifest'], 'unwritable' => $st['unwritable'], 'previous' => $st['previous']],
            'files' => $f, 'alerts' => $alerts];
}
