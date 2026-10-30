<?php
// 1.61: Files (web/files/lib.php): what the server keeps for your files. Names, types and keys arrive locked ("enc1:...") and are only
// checked for shape; folders, quota, Trash, restore, share links and clean-up are the server's own rules. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/files/lib.php';
require $site . '/web/hub/core/lib/backup.php';

$enc = fn(string $seed = 'x') => 'enc1:' . base64_encode(str_pad($seed, 40, '.') . random_bytes(8));
$ok = fn($r) => $r === '';
$piece = fn(int $n) => str_repeat('A', $n);

function put(array &$d, string $p, int $pieces, int $bytes, $enc): string {
    $out = [];
    $r = fl_op_put_start($d, $p, $enc('name'), $enc('key'), $pieces, $bytes, $out);
    if ($r !== '') return 'ERR:' . $r[0];
    $id = $out['id'];
    $per = intdiv($bytes, $pieces);
    for ($n = 0; $n < $pieces; $n++) hub_write(fl_blob_path($id, $n), str_repeat('B', $n === $pieces - 1 ? $bytes - $per * ($pieces - 1) : $per));
    $r = fl_op_put_done($d, $id);
    return $r === '' ? $id : 'ERR:' . $r[0];
}

$d = fl_load();
t('a new site has no files, the default limit is 5 GB and links are on', $d['items'] === [] && $d['settings']['limit'] === 5 * 1024 ** 3 && $d['settings']['shares'] === true && $d['settings']['trashDays'] === 30);
t('nothing is locked with the site key yet', !sv_use_files() && sv_in_use() === []);

// ---- shapes: only locked text is accepted for a name or a key ----
t('a plain name is refused', fl_op_mkdir($d, '', 'Holiday photos')[1] === 400);
t('a name with markup is refused', fl_op_mkdir($d, '', 'enc1:<script>alert(1)</script>AAAAAAAAAAAAAAAAAAAA')[1] === 400);
t('a name that is far too long is refused', fl_op_mkdir($d, '', 'enc1:' . str_repeat('A', 2100))[1] === 400);
t('a folder inside a folder that does not exist is refused', fl_op_mkdir($d, bin2hex(random_bytes(8)), $enc())[1] === 400);
t('a parent that is not an id is refused by the settings cleaner (no path tricks)', !fl_id_ok('../../etc') && !fl_id_ok('ABCDEF0123456789') && fl_id_ok('abcdef0123456789'));

// ---- folders ----
t('a folder is made', $ok(fl_op_mkdir($d, '', $enc('docs'))) && count($d['items']) === 1);
$docs = array_key_first($d['items']);
fl_op_mkdir($d, $docs, $enc('taxes')); $taxes = array_keys($d['items'])[1];
t('a folder inside a folder', $d['items'][$taxes]['p'] === $docs && fl_depth($d, $taxes) === 2);
$deep = $taxes; $made = 2;
while ($made < FL_MAX_DEPTH) { fl_op_mkdir($d, $deep, $enc()); $deep = array_key_last($d['items']); $made++; }
t('folders can be ' . FL_MAX_DEPTH . ' levels deep, not more', fl_op_mkdir($d, $deep, $enc())[1] === 400);
$d = fl_load(); $d['items'] = []; fl_op_mkdir($d, '', $enc('docs')); $docs = array_key_first($d['items']); fl_op_mkdir($d, $docs, $enc('taxes')); $taxes = array_key_last($d['items']);

// ---- files: start, pieces, done ----
$out = [];
t('a file with no pieces is refused', fl_op_put_start($d, '', $enc(), $enc(), 0, 10, $out)[1] === 413);
t('a file bigger than any file can be is refused', fl_op_put_start($d, '', $enc(), $enc(), 4, FL_MAX_FILE + 1, $out)[1] === 413);
t('pieces that could not hold that many bytes are refused', fl_op_put_start($d, '', $enc(), $enc(), 1, FL_PIECE_MAX + 5, $out)[1] === 400);
$id = put($d, $docs, 3, 3000, $enc);
t('a file is uploaded in pieces and written down when they are all there', fl_id_ok($id) && empty($d['items'][$id]['up']) && $d['items'][$id]['z'] === 3000 && fl_pieces_have($id, 3) === 3);
t('the pieces are stored under the id, with no extension', is_file(fl_blob_path($id, 0)) && !preg_match('/\./', basename(fl_blob_path($id, 0))));
$out = []; fl_op_put_start($d, '', $enc(), $enc(), 2, 100, $out); $half = $out['id']; hub_write(fl_blob_path($half, 0), str_repeat('C', 50));
t('a file with a piece missing is not finished', fl_op_put_done($d, $half)[1] === 409 && !empty($d['items'][$half]['up']));
hub_write(fl_blob_path($half, 1), str_repeat('C', 49));
t('...nor one whose pieces are not the size it said', fl_op_put_done($d, $half)[1] === 409);
hub_write(fl_blob_path($half, 1), str_repeat('C', 50));
t('...and it is finished once they match', $ok(fl_op_put_done($d, $half)) && empty($d['items'][$half]['up']));
t('a finished file can not be finished again', fl_op_put_done($d, $half)[1] === 404);

// ---- quota ----
$d['settings']['limit'] = 5000;
t('usage counts every stored byte', fl_usage($d) === 3000 + 100);
$out = [];
$r = fl_op_put_start($d, '', $enc(), $enc(), 1, 2000, $out);
t('a file that would go over the limit is refused (507) with a plain message', is_array($r) && $r[1] === 507 && strpos($r[0], 'full') !== false, json_encode($r));
t('...one that fits is accepted', is_string(fl_op_put_start($d, '', $enc(), $enc(), 1, 1500, $out)) && isset($out['id']));
fl_purge($d, [$out['id']]);
$d['settings']['limit'] = 0;
t('limit 0 means only the server\'s free space limits', is_string(fl_op_put_start($d, '', $enc(), $enc(), 1, 1500, $out)));
fl_purge($d, [$out['id']]);

// ---- rename, move ----
t('rename', $ok(fl_op_rename($d, $id, $enc('renamed'))) && $d['items'][$id]['m'] !== '');
t('a plain name is refused on rename too', fl_op_rename($d, $id, 'plain')[1] === 400);
t('move a file to the top', $ok(fl_op_move($d, [$id], '')) && $d['items'][$id]['p'] === '');
t('a folder can not go into itself', fl_op_move($d, [$docs], $docs)[1] === 400);
t('...nor below itself', fl_op_move($d, [$docs], $taxes)[1] === 400);
t('moving into a folder that is not there is refused', fl_op_move($d, [$id], bin2hex(random_bytes(8)))[1] === 400);
t('moving something that is not there is refused', fl_op_move($d, [bin2hex(random_bytes(8))], '')[1] === 404);
fl_op_move($d, [$id], $taxes);

// ---- Trash and restore ----
$other = put($d, '', 1, 100, $enc);
t('trash a folder: it and everything in it leave the list, the folder is the one shown in Trash', $ok(fl_op_trash($d, [$docs]))
    && $d['items'][$docs]['del'] > 0 && !empty($d['items'][$docs]['top']) && $d['items'][$taxes]['del'] > 0 && empty($d['items'][$taxes]['top']) && $d['items'][$id]['del'] > 0);
t('a file in Trash is not shared, renamed or moved', fl_op_rename($d, $id, $enc())[1] === 404 && fl_op_move($d, [$id], '')[1] === 404);
t('nothing can be made inside a folder in Trash', fl_op_mkdir($d, $docs, $enc())[1] === 400);
t('restore brings the folder and everything in it back to where it was', $ok(fl_op_restore($d, [$docs], null)) && $d['items'][$docs]['del'] === 0 && $d['items'][$id]['del'] === 0 && $d['items'][$id]['p'] === $taxes && empty($d['items'][$docs]['top']));
fl_op_trash($d, [$id]); fl_op_trash($d, [$taxes]);
t('a file trashed on its own before its folder keeps its own date, so it stays in Trash when the folder comes back', $d['items'][$id]['del'] > 0);
$d['items'][$id]['del'] -= 5;   // trashed 5 seconds before the folder
fl_op_restore($d, [$taxes], null);
t('...(restoring the folder leaves the earlier-trashed file in Trash)', $d['items'][$taxes]['del'] === 0 && $d['items'][$id]['del'] > 0 && !empty($d['items'][$id]['top']));
fl_op_trash($d, [$docs]);
fl_op_restore($d, [$id], null);
t('a file restored while its folder is in Trash goes to the top', $d['items'][$id]['p'] === '' && $d['items'][$id]['del'] === 0);
fl_op_restore($d, [$docs], 'bad' === 'x' ? '' : null);
t('restore refuses what is not in the Trash', fl_op_restore($d, [$other], null)[1] === 404);

// ---- share links ----
$out = [];
t('a share link needs the file to exist and the right shape of text', fl_op_share_create($d, $id, 'plain', 0, $out)[1] === 400 && fl_op_share_create($d, bin2hex(random_bytes(8)), $enc(), 0, $out)[1] === 404);
t('a folder can not be shared', fl_op_share_create($d, $docs, $enc(), 0, $out)[1] === 404);
t('an end date in the past (or more than ten years away) is refused', fl_op_share_create($d, $id, $enc(), time() - 5, $out)[1] === 400 && fl_op_share_create($d, $id, $enc(), time() + 4000 * 86400, $out)[1] === 400);
t('a link is made: 32 letters and digits, from random bytes', $ok(fl_op_share_create($d, $id, $enc('meta'), 0, $out)) && fl_token_ok($out['token']));
$tok = $out['token'];
$out2 = []; fl_op_share_create($d, $id, $enc('meta'), 0, $out2);
t('every link is different', $out2['token'] !== $tok);
fl_save($d);
$s = fl_share_get($tok);
t('the holder of the link gets the locked meta, the number of pieces and the size, not the id or the key', $s && $s['c'] === 3 && $s['z'] === 3000 && strncmp($s['sm'], 'enc1:', 5) === 0);
t('a wrong or odd link gets nothing', fl_share_get('x') === null && fl_share_get(str_repeat('a', 32)) === null && fl_share_get('../../../etc/passwd../../../etc/passwd') === null);
$ended_before = fl_share_get($tok, time() + 400 * 86400) !== null;   // never ends
$d['shares'][$tok]['exp'] = time() + 100; fl_save($d);
t('a link that has ended gets nothing (the same as one that never was)', $ended_before && fl_share_get($tok, time() + 50) !== null && fl_share_get($tok, time() + 200) === null);
$d = fl_load(); $d['settings']['shares'] = false; fl_save($d);
t('with links turned off no link works', fl_share_get($tok) === null);
$d['settings']['shares'] = true; fl_save($d);
t('...and they work again when it is turned on (they were kept)', fl_share_get($tok) !== null);
$d = fl_load();
fl_op_trash($d, [$id]);
t('a link to something that goes to Trash stops working and is removed', !isset($d['shares'][$tok]) && count(array_filter($d['shares'], fn($x) => $x['id'] === $id)) === 0);
fl_op_restore($d, [$id], null);
t('a link can be removed, and removing it twice says it is gone', ($o = []) === [] && $ok(fl_op_share_create($d, $id, $enc(), 0, $o)) && $ok(fl_op_share_delete($d, $o['token'])) && fl_op_share_delete($d, $o['token'])[1] === 404);
$d['settings']['shares'] = false;
t('with links turned off none can be made', fl_op_share_create($d, $id, $enc(), 0, $out)[1] === 403);
$d['settings']['shares'] = true;

// ---- purge ----
$out = []; fl_op_share_create($d, $id, $enc(), 0, $out); $t2 = $out['token'];
fl_op_trash($d, [$id]);
t('only what is in Trash can be removed for good', fl_op_purge($d, [$other])[1] === 404);
$blob = fl_blob_path($id, 0);
t('removing for good deletes the pieces and the links', is_file($blob) && $ok(fl_op_purge($d, [$id])) && !is_file($blob) && !isset($d['items'][$id]) && !isset($d['shares'][$t2]));
$f2 = put($d, $taxes, 1, 100, $enc); fl_op_trash($d, [$docs]);
$inside = [$taxes, $f2];
t('removing a folder removes what is inside it, pieces included', $ok(fl_op_purge($d, [$docs])) && !isset($d['items'][$taxes]) && !isset($d['items'][$f2]) && !is_file(fl_blob_path($f2, 0)));
fl_op_trash($d, [$other]);
t('empty Trash removes what is in it and nothing else', $ok(fl_op_empty_trash($d)) && !isset($d['items'][$other]) && isset($d['items'][$half]) && count($d['items']) === 1);

// ---- clean-up that needs no one ----
$a = put($d, '', 1, 100, $enc); $b2 = put($d, '', 1, 100, $enc);
fl_op_trash($d, [$a]); $d['items'][$a]['del'] = time() - 31 * 86400;
$out = []; fl_op_put_start($d, '', $enc(), $enc(), 1, 100, $out); $stale = $out['id']; $d['items'][$stale]['at'] = time() - 13 * 3600; hub_write(fl_blob_path($stale, 0), 'x');
t('Trash older than its days goes for good; an upload that never finished is removed; the rest stays', fl_tidy($d) >= 2 && !isset($d['items'][$a]) && !isset($d['items'][$stale]) && isset($d['items'][$b2]) && !is_file(fl_blob_path($stale, 0)));
$old = fl_blob_dir() . '/' . bin2hex(random_bytes(8)) . '_0'; hub_write($old, 'orphan'); touch($old, time() - 7200);
$fresh = fl_blob_dir() . '/' . bin2hex(random_bytes(8)) . '_0'; hub_write($fresh, 'orphan');
t('a piece whose file is not in the list is swept after an hour (a fresh one is left alone)', fl_sweep_blobs($d) === 1 && !is_file($old) && is_file($fresh));
@unlink($fresh);

// ---- what the browser is shown, what is kept ----
fl_save($d); $d = fl_load(); $v = fl_view($d);
t('the view carries ids, parents, locked names and sizes, and no token or path', $v['ok'] && count($v['items']) === 2 && !isset($v['items'][0]['path']) && strpos(json_encode($v), 'blobs') === false);
$stored = (string)file_get_contents(hub_jpath(fl_file()));
t('the file the server keeps is guarded (a browser opening it gets nothing)', strncmp($stored, '<?php', 5) === 0);
hub_write(hub_jpath(fl_file()), HUB_GUARD . json_encode(['rev' => 1, 'items' => [['id' => 'NOT-AN-ID', 't' => 'f', 'm' => 'x'], ['id' => 'abcdef0123456789', 't' => 'x'], ['id' => 'abcdef0123456789', 't' => 'd', 'p' => '../x', 'm' => $enc()], ['id' => '0123456789abcdef', 't' => 'd', 'p' => '', 'm' => $enc(), 'del' => 5]], 'shares' => ['short' => ['id' => 'x']], 'settings' => ['limit' => -50, 'view' => 'evil', 'trashDays' => 3]]));
$d = fl_load();
t('a damaged or hand-edited file: what does not fit is left out, the rest is read, settings fall back', count($d['items']) === 1 && isset($d['items']['0123456789abcdef']) && $d['shares'] === [] && $d['settings']['limit'] === 0 && $d['settings']['view'] === 'list' && $d['settings']['trashDays'] === 30);
t('with files present the passphrase can not be removed from under them', sv_use_files() && sv_in_use() === ['Files']);
$d['items'] = [];
fl_save($d);
t('...and with none it can', !sv_use_files());
t('sizes read as words', fl_bytes(0) === '0 B' && fl_bytes(1536) === '1.5 KB' && fl_bytes(5 * 1024 ** 3) === '5 GB');

// ---- Files in a backup (an optional part) ----
require_once $site . '/web/hub/core/lib/vault.php';
$d = fl_load(); $d['items'] = []; $d['shares'] = []; $d['settings'] = fl_settings_default(); fl_save($d); $d = fl_load();
foreach (glob(fl_blob_dir() . '/*') ?: [] as $x) @unlink($x);   // pieces left by the sections above
fl_op_mkdir($d, '', $enc('docs')); $docs = array_key_first($d['items']);
$f1 = put($d, $docs, 2, 800, $enc); $f2 = put($d, '', 1, 100, $enc);
$o = []; fl_op_share_create($d, $f1, $enc('meta'), 0, $o); $tok = $o['token'];
fl_save($d);
$kidB = bin2hex(random_bytes(8)); sv_swap(['v' => 1, 'salt' => base64_encode(random_bytes(16)), 'iter' => 600000, 'wrap' => base64_encode(random_bytes(60)), 'kid' => $kidB], '');
t('Files is an optional part: not in a full backup unless asked for', !in_array('files', BK_PARTS, true) && in_array('files', BK_OPTIONAL, true) && !isset(bk_export(array_fill_keys(BK_PARTS, true))['parts']->files));
$ov = bk_overview()['files'];
t('the Backup panel counts the files and says they are locked', $ov['summary'] === '2 files, 900 B, locked' && $ov['tooBig'] === false && $ov['optional'] === true, json_encode($ov));
$bk = json_decode(json_encode(bk_export(['files' => true, 'settings' => true])), true);
t('a backup with Files carries the list, the links, the locked pieces (as they are) and the key id', count($bk['parts']['files']['items']) === 3 && count($bk['parts']['files']['blobs']) === 3 && isset($bk['parts']['files']['shares'][$tok]) && $bk['parts']['files']['kid'] === $kidB && !empty($bk['parts']['sitevault']));
t('...and no name, no key and no plain content', strpos(json_encode($bk['parts']['files']), 'docs') === false && base64_decode($bk['parts']['files']['blobs'][$f2 . '_0']) === str_repeat('B', 100));
// the folder and its files are removed, then restored
$d = fl_load(); fl_purge($d, array_keys($d['items'])); fl_save($d);
t('(the files are gone)', fl_load()['items'] === [] && glob(fl_blob_dir() . '/*') === []);
t('restore brings back the list, the links and every piece', bk_import($bk['parts'], ['files' => true]) === ['Files'] && count(fl_load()['items']) === 3 && isset(fl_load()['shares'][$tok]) && is_file(fl_blob_path($f1, 1)) && file_get_contents(fl_blob_path($f2, 0)) === str_repeat('B', 100));
t('...and a share link works again', fl_share_get($tok) !== null);
$bad = $bk; unset($bad['parts']['files']['blobs'][$f1 . '_1']);
$threw = false; try { bk_import($bad['parts'], ['files' => true]); } catch (Exception $e) { $threw = strpos($e->getMessage(), 'missing a piece') !== false; }
t('a backup with a piece missing is refused, and Files is left as it was', $threw && count(fl_load()['items']) === 3);
$bad = $bk; $bad['parts']['files']['blobs'][$f2 . '_0'] = base64_encode(str_repeat('B', 90));
$threw = false; try { bk_import($bad['parts'], ['files' => true]); } catch (Exception $e) { $threw = strpos($e->getMessage(), 'does not match its size') !== false; }
t('...and one with a piece of the wrong size', $threw);
$bad = $bk; $bad['parts']['files']['blobs']['../../evil'] = base64_encode(str_repeat('x', 40)); $bad['parts']['files']['blobs'][str_repeat('a', 16) . '_0'] = base64_encode(str_repeat('x', 40));
bk_import($bad['parts'], ['files' => true]);
t('a piece with a name that is not a piece of one of the files is ignored (no path tricks)', !is_file(fl_blob_dir() . '/../../evil') && !is_file(fl_blob_dir() . '/' . str_repeat('a', 16) . '_0'));
$other = $bk; $other['parts']['files']['kid'] = bin2hex(random_bytes(8));
$threw = false; try { bk_import($other['parts'], ['files' => true]); } catch (Exception $e) { $threw = strpos($e->getMessage(), 'another key') !== false; }
t('Files locked with another key than this site has are refused', $threw);
// too big
$d = fl_load(); $d['items'][$f2]['z'] = BK_FILES_MAX + 10; fl_save($d);
$threw = false; try { bk_export(['files' => true]); } catch (Exception $e) { $threw = strpos($e->getMessage(), 'site-data/files') !== false; }
t('Files too big for a backup file say what to do instead (copy the folder)', $threw && bk_overview()['files']['tooBig'] === true && strpos(bk_overview()['files']['summary'], 'copy the folder') !== false);
t('Start Over removes Files and the site key', in_array('Files', bk_reset_all(), true) && fl_load()['items'] === [] && sv_get() === null && glob(fl_blob_dir() . '/*') === []);
