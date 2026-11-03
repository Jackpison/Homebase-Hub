<?php
// Test only: lets the site talk to the local stand-in instead of GitHub. The site itself never defines these.
define('GH_TEST_ALLOW', ['127.0.0.1:8124']);
define('GH_TEST_PAGES', 'http://127.0.0.1:8124/latest.json');
define('GH_TEST_API', 'http://127.0.0.1:8124/api.json');
define('GH_TEST_ZIPBASE', 'http://127.0.0.1:8124/');
define('HUB_TEST_FAVICON', __DIR__ . '/../fixtures/favicon-fixture.png');   // the Favicon download test: an icon without asking Google
define('HUB_TEST_PUBLIC', ['127.0.0.1:8125']);   // (1.72.0) the calendar test: a local stand-in for a calendar on the internet (tasks_more_test)
