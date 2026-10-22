<?php
/**
 * The schedule (Settings > Telegram > Run It on a Schedule). Run it every 5 minutes from a cron job in your hosting panel:
 *   php /path/to/site/web/core-data/cron.php                         (command line, preferred)
 *   curl -s "https://your-site/web/core-data/cron.php?key=..."        (by address: the key is shown in Settings > Telegram)
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
$r = nt_run(false); $out[] = $r['note'];
$h = hub_dir('core') . '/cron-last.txt'; @file_put_contents($h, (string)time());   // Health shows when the schedule last ran
echo implode("\n", $out), "\n";
