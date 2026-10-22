<?php
/**
 * Tasks API (web/tasks/api.php). PRIVATE: nothing is sent until you are logged in to the site.
 *
 *  GET                                      { auth, rev, tasks, log, settings }   (visitors: { private: true, auth: false })
 *  POST { action: "save", rev, tasks, log, settings }   replaces the list; rev must match, or 409 with the current data
 *
 * Every POST passes the same-site checks and the site's security check; saves are atomic and keep earlier versions.
 */
require __DIR__ . '/lib.php';
hub_headers();
header('Content-Type: application/json; charset=utf-8');
hub_same_origin();
if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) { @ob_start('ob_gzhandler'); }

function out(int $code, array $a): void { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit; }
function view(array $d): array { return ['auth' => true, 'rev' => $d['rev'], 'tasks' => $d['tasks'], 'log' => $d['log'], 'settings' => (object)$d['settings']]; }

$admin = hub_admin();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!$admin) out(200, ['private' => true, 'auth' => false]);
    out(200, view(tasks_read()));
}
if ($method !== 'POST') out(405, ['ok' => false, 'error' => 'Use GET or POST.']);

$raw = (string)file_get_contents('php://input', false, null, 0, 4194305);
if (strlen($raw) > 4194304) out(413, ['ok' => false, 'error' => 'Too much data (4 MB at most).']);
$b = json_decode($raw, true);
if (!is_array($b)) out(400, ['ok' => false, 'error' => 'Bad data.']);
if (!$admin) out(401, ['ok' => false, 'error' => 'You are logged out. Log in again.']);
if (!hub_csrf_ok()) out(403, ['ok' => false, 'error' => 'Security check failed. Reload the page.']);

if (($b['action'] ?? '') !== 'save' || !is_array($b['tasks'] ?? null)) out(400, ['ok' => false, 'error' => 'Unknown action.']);

$lk = @fopen(hub_dir('tasks') . '/tasks.lock', 'c');
if (!$lk) out(500, ['ok' => false, 'error' => 'Could not save (check the folder permissions).']);
flock($lk, LOCK_EX);
$src = hub_jpath(tasks_file());
if (is_file($src) && hub_jread(tasks_file()) === null) {   // never save an empty list over a file that couldn't be read
    flock($lk, LOCK_UN); fclose($lk);
    out(500, ['ok' => false, 'error' => 'The saved tasks could not be read, so nothing was changed. Restore an earlier version in Backup.']);
}
$cur = tasks_read();
if ((int)($b['rev'] ?? -1) !== $cur['rev']) { flock($lk, LOCK_UN); fclose($lk); out(409, ['ok' => false, 'error' => 'conflict', 'data' => view($cur)]); }
$new = tasks_clean(['tasks' => $b['tasks'], 'log' => is_array($b['log'] ?? null) ? $b['log'] : $cur['log'], 'settings' => $b['settings'] ?? $cur['settings']]);
$new['rev'] = $cur['rev'] + 1;
$fewer = count($new['tasks']) < count($cur['tasks']);
tasks_snapshot($fewer);   // deleting something always keeps an earlier version first
$ok = hub_jput(tasks_file(), json_encode($new, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
flock($lk, LOCK_UN); fclose($lk);
if (!$ok) out(500, ['ok' => false, 'error' => 'Could not save (check the folder permissions).']);
out(200, ['ok' => true, 'rev' => $new['rev'], 'tasks' => $new['tasks'], 'log' => $new['log']]);
