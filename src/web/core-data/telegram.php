<?php
/**
 * Telegram's instant replies (webhook): Telegram sends each message and button press here, with the secret set by
 * Settings > Telegram > Instant Replies. Anything without that secret is refused.
 */
require __DIR__ . '/lib/notify.php';
header('Content-Type: application/json'); header('Cache-Control: no-store'); header('X-Robots-Tag: noindex');
$d = nt_load();
$key = (string)($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '');
if (!$d['hook'] || $d['hookKey'] === '' || !hash_equals((string)$d['hookKey'], $key)) { http_response_code(403); exit('{}'); }
$u = json_decode((string)file_get_contents('php://input', false, null, 0, 1048576), true);
echo '{}';   // Telegram only needs a quick 200; the work happens after
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request(); elseif (function_exists('litespeed_finish_request')) litespeed_finish_request();
if (is_array($u)) { try { nt_handle_update($u); } catch (Throwable $e) {} }
