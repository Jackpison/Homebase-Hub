<?php
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/**
 * The schedule (Settings > Telegram > Run It on a Schedule). Run it every 5 minutes from a cron job in your hosting panel:
 *   php /path/to/site/web/hub/core/cron.php                         (command line, preferred)
 *   curl -s "https://your-site/web/hub/core/cron.php?key=..."        (by address: the key is shown in Settings > Telegram)
 * Each run: new bot messages (when instant replies are off), the domain and uptime watch, then reminders and backups.
 */
require __DIR__ . '/lib/notify.php';
if (PHP_SAPI !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    $d = nt_load();
    if (!hash_equals((string)$d['key'], (string)($_GET['key'] ?? ''))) { http_response_code(403); exit("Wrong or missing key.\n"); }
}
@set_time_limit(240);
$out = [];
try { $n = nt_poll(); if ($n) $out[] = "Bot: $n message" . ($n === 1 ? '' : 's') . '.'; } catch (Throwable $e) { $out[] = 'Bot: ' . $e->getMessage(); }
try { require_once __DIR__ . '/lib/watch.php'; if (wt_load()['sites']) { wt_run(false); $out[] = 'Watch: checked.'; } } catch (Throwable $e) { $out[] = 'Watch: ' . $e->getMessage(); }
try { require_once __DIR__ . '/lib/ghupdate.php'; gh_tick(); } catch (Throwable $e) { $out[] = 'GitHub check: ' . $e->getMessage(); }   // does nothing unless the daily check was switched on
$r = nt_run(false); $out[] = $r['note'];
$h = hub_dir('core') . '/cron-last.txt'; @file_put_contents($h, (string)time());   // Health shows when the schedule last ran
echo implode("\n", $out), "\n";
