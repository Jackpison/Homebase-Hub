<?php
// Settings > Overview's "What's New" (1.53.1) gets only the newest version's notes, not the whole changelog.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
$md = "# Changelog\n\n## Version Map\n\n| Version | What |\n| --- | --- |\n| 2.0.0 | x |\n\n---\n\n## 2.0.0\n\n### Links\n\n- New thing.\n\n---\n\n## 1.9.0\n\n- Old thing.\n";
$l = hub_changelog_latest($md);
t('the newest version\'s section, from its heading to the next ---', strpos($l, "## 2.0.0") === 0 && strpos($l, 'New thing.') !== false && strpos($l, 'Old thing') === false && strpos($l, 'Version Map') === false, $l);
t('a changelog without a version heading gives nothing', hub_changelog_latest("# Changelog\n\nNothing yet.") === '');
$real = (string) file_get_contents($site . '/web/hub/docs/CHANGELOG.md');
$lr = hub_changelog_latest($real);
t('on the real changelog it is the current version and far smaller than the whole file', strpos($lr, '## ' . HUB) === 0 && strlen($lr) < strlen($real) / 10, strlen($lr) . ' of ' . strlen($real));
