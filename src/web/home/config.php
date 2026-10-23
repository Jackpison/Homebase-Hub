<?php
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && @realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) { http_response_code(404); exit; }   // an include file: never run on its own, even where .htaccess is ignored
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/*
 * Site limits. You normally don't need to touch this file.
 *
 * Password: the start page uses the one site login (see web/docs/README.txt).
 */

// Largest background upload, in megabytes. Your host has its own limit too
// (your hosting PHP settings: upload_max_filesize).
const MAX_UPLOAD_MB = 40;

// Largest link/site icon upload, in kilobytes.
const MAX_ICON_KB = 500;

// Links per column (two columns).
const LINKS_PER_COLUMN = 5;

// Photos and videos are downloaded to your server so they load fast.
// How many to keep per source:
const PHOTOS_PER_SOURCE = 20;
const VIDEOS_PER_SOURCE = 10;

// Each saved photo/video is deleted after it has been shown this many times,
// and a fresh one is downloaded in its place.
const MAX_VIEWS = 3;

// Longest background video clip to download, in seconds.
const VIDEO_MAX_SECONDS = 15;

// Saved photos are shrunk to this width (needs the GD extension, which most hosts have).
const PHOTO_MAX_WIDTH = 2560;

// Keywords for Wallhaven, Unsplash, Pixabay and custom sources, separated by commas.
const MAX_KEYWORDS = 10;

// Custom sources you can add in Edit > Background.
const MAX_CUSTOM_SOURCES = 10;

