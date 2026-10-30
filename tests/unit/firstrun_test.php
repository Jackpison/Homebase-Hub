<?php
// 1.61.5: a page with nothing on it says what to do and offers the first step (Links, Cards, Files; Tasks already did).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
$src = fn(string $p) => (string)file_get_contents($site . '/web/' . $p);
t('an empty Links tab offers "Add Your First Links" (to a logged-in person only)', str_contains($src('links/assets/links.js'), 'Add Your First Links') && preg_match('/S\.auth && !S\.editing \? h\(.button./', $src('links/assets/links.js')) === 1);
t('an empty Cards page offers "Add Your First Card"', str_contains($src('cards/assets/cards.js'), 'Add Your First Card'));
t('an empty Files page offers "Upload Your First File"', str_contains($src('files/assets/files.js'), 'Upload Your First File'));
t('an empty Tasks page already offers its first step', str_contains($src('tasks/assets/tasks.js'), 'No Tasks Yet'));
