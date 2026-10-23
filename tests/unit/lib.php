<?php
// A tiny test helper: t('what should happen', $ok). The script's exit code is 1 when any check failed.
$GLOBALS['__t'] = ['pass' => 0, 'fail' => 0];
function t(string $name, bool $ok, string $extra = ''): void {
    $GLOBALS['__t'][$ok ? 'pass' : 'fail']++;
    echo ($ok ? 'PASS ' : 'FAIL ') . $name . ($ok || $extra === '' ? '' : '  [' . $extra . ']') . "\n";
}
register_shutdown_function(function () { $r = $GLOBALS['__t']; echo $r['pass'] . '/' . ($r['pass'] + $r['fail']) . ' passed' . "\n"; if ($r['fail']) exit(1); });
