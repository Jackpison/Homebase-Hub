<?php
// For PHPStan only: the folder constants boot.php defines at run time, so the analyser knows them.
const HUB_PUBLIC = __DIR__ . '/../../src';
const HUB_WEB = HUB_PUBLIC . '/web';
const HUB_CORE = HUB_WEB . '/core-data';
const DATA_DIR = '/site-data/home';   // home/lib.php: define('DATA_DIR', hub_dir('home'))
