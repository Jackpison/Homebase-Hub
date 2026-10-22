<?php
/*
 * Your start page. The site is three folders side by side:
 *   core/       the shared login, settings, backup, Telegram and the bar (the engine), and docs/ (README.txt, CHANGELOG.md)
 *   web/        the pages: home (this start page), links, info, cards, tasks, tools
 *   site-data/  your private data (made by the site; updates never touch it)
 */
define('HOME_BASE', 'web/home/');
$page = __DIR__ . '/web/home/index.php';
if (!is_file($page)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Start page files are missing.\nExpected: web/home/index.php next to this file.");
}
require $page;
