<?php
// Router for `php -S`: a stand-in for other websites, used by fetch_test.php.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); $port = $_SERVER['SERVER_PORT'];
switch ($path) {
    case '/page': header('Content-Type: text/html; charset=utf-8'); echo '<html><head><title>Lakeside</title></head><body>hello</body></html>'; break;
    case '/hop': header('Location: /page', true, 302); break;                                         // a relative redirect
    case '/hop2': header('Location: http://127.0.0.1:' . $port . '/hop', true, 301); break;          // two hops
    case '/inside': header('Location: http://127.0.0.1:1/secret', true, 302); break;                 // onto another (private) port
    case '/lan': header('Location: http://10.0.0.1/admin', true, 302); break;                         // onto the home network
    case '/local': header('Location: http://localhost:' . $port . '/page', true, 302); break;       // a private name
    case '/loop': header('Location: /loop', true, 302); break;
    case '/big': header('Content-Type: application/octet-stream'); echo str_repeat('x', 300000); break;
    case '/head': header('Content-Type: text/html'); echo '<html><head><title>T</title></head>'; flush(); echo str_repeat('<p>body</p>', 50000); break;
    case '/ua': header('Content-Type: text/plain'); echo ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|' . ($_SERVER['HTTP_ACCEPT'] ?? '') . '|' . ($_SERVER['HTTP_X_EXTRA'] ?? ''); break;
    case '/missing': http_response_code(404); echo 'no'; break;
    default: http_response_code(500);
}
