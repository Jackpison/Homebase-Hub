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
 * The Tasks calendar feed (1.61.0): calendar.php?k=<secret key>. Off until you turn it on in Tasks Settings. A calendar app (Google, Apple,
 * Outlook) subscribes to this address and has no login, so the key in the address is the only thing that lets it in. A wrong, missing or
 * switched-off key all get the same plain 404. Nothing is written here, and nothing but the task names, dates, repeats, categories, prices
 * and links is sent (never notes).
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';
hub_headers();
header('Cross-Origin-Resource-Policy: cross-origin');   // a calendar app is not this site
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'HEAD') { http_response_code(405); header('Allow: GET, HEAD'); exit; }
if (!tasks_cal_ok((string)($_GET['k'] ?? ''))) {
    http_response_code(404); header('Content-Type: text/plain; charset=utf-8'); echo "Not found\n"; exit;
}
header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="tasks.ics"');
header('Cache-Control: private, max-age=300');
header('Referrer-Policy: no-referrer');
echo tasks_ics(tasks_read(), (string)($_SERVER['HTTP_HOST'] ?? 'homebase'), (hub_settings()['siteName'] ?? '') !== '' ? hub_settings()['siteName'] . ' Tasks' : 'Tasks');
