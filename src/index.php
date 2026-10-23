<?php
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/*
 * Your start page. The site is three folders side by side:
 *   web/        the pages (home, links, info, cards, tasks, tools, settings), core-data/ (the shared engine: login,
 *               settings, backup, Telegram, the bar) and docs/ (README.txt, CHANGELOG.md, readable source)
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
