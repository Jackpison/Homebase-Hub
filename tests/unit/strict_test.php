<?php
// 1.61: every PHP file of the site runs in strict mode (declare(strict_types=1) before anything else), so a number given where text is expected
// is an error you see in a test, not a quiet conversion. A new file without it fails here.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';

$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($site, FilesystemIterator::SKIP_DOTS));
$bad = []; $n = 0;
foreach ($it as $f) {
    if (substr((string)$f, -4) !== '.php' || str_contains((string)$f, '/starter/')) continue;
    $n++;
    $tokens = token_get_all((string)file_get_contents((string)$f)); $first = null;
    foreach ($tokens as $i => $tk) {   // the first statement after <?php, skipping comments and spaces
        if (is_array($tk) && in_array($tk[0], [T_OPEN_TAG, T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) continue;
        $first = is_array($tk) ? $tk[1] : $tk; $at = $i; break;
    }
    $ok = $first === 'declare';
    if ($ok) { $src = ''; for ($j = $at; $j < $at + 12 && $j < count($tokens); $j++) $src .= is_array($tokens[$j]) ? $tokens[$j][1] : $tokens[$j]; $ok = (bool)preg_match('/^declare\s*\(\s*strict_types\s*=\s*1\s*\)/', $src); }
    if (!$ok) $bad[] = substr((string)$f, strlen($site) + 1);
}
t('there are PHP files to check', $n >= 25, (string)$n);
t('every PHP file starts with declare(strict_types=1)', $bad === [], implode(', ', $bad));
