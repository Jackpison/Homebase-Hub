<?php
declare(strict_types=1);
// 1.73.0: HUB_TRUSTED_PROXY. Behind your own reverse proxy (Docker with Caddy, nginx on a VPS) the site believes the proxy's
// X-Forwarded-For and X-Forwarded-Proto, but only when the request really comes from an address you listed. Without the
// setting, or from any other address, those headers are ignored, so nobody can fake their address (login limits) or HTTPS.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
chdir($site);
require $site . '/web/hub/core/lib/boot.php';

function req(string $from, array $h = []): void {
    foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED_PROTO', 'HTTP_CF_CONNECTING_IP', 'HTTPS'] as $k) unset($_SERVER[$k]);
    $_SERVER['REMOTE_ADDR'] = $from;
    foreach ($h as $k => $v) $_SERVER[$k] = $v;
}
$fwd = ['HTTP_X_FORWARDED_FOR' => '203.0.113.9', 'HTTP_X_FORWARDED_PROTO' => 'https'];

putenv('HUB_TRUSTED_PROXY');
req('172.30.77.2', $fwd);
t('not set: the forwarded address and HTTPS are ignored', hub_trusted_proxies() === [] && hub_ip() === '172.30.77.2' && !hub_https(), hub_ip());

putenv('HUB_TRUSTED_PROXY=172.30.77.0/24');
req('172.30.77.2', $fwd);
t('from the listed proxy: the visitor\'s address and HTTPS are used', hub_ip() === '203.0.113.9' && hub_https(), hub_ip());
req('198.51.100.7', $fwd);
t('from any other address: both headers are ignored', hub_ip() === '198.51.100.7' && !hub_https(), hub_ip());
req('172.30.77.2', ['HTTP_X_FORWARDED_FOR' => '6.6.6.6, 203.0.113.9']);
t('a visitor who sends their own X-Forwarded-For gets the address the proxy saw, not the one they wrote', hub_ip() === '203.0.113.9', hub_ip());
req('172.30.77.2', ['HTTP_X_FORWARDED_FOR' => 'not-an-address']);
t('a broken header falls back to the proxy\'s own address', hub_ip() === '172.30.77.2', hub_ip());
req('172.30.77.2', ['HTTP_X_FORWARDED_PROTO' => 'http']);
t('plain http through the proxy stays http', !hub_https());
req('172.30.77.2', ['HTTP_X_FORWARDED_PROTO' => 'HTTPS, http']);
t('the first X-Forwarded-Proto value counts, in any case', hub_https());

putenv('HUB_TRUSTED_PROXY=172.30.77.0/24, 10.0.0.5');
req('172.30.77.2', ['HTTP_X_FORWARDED_FOR' => '6.6.6.6, 203.0.113.9, 10.0.0.5']);
t('two proxies in a row: both are skipped, then the visitor', hub_ip() === '203.0.113.9', hub_ip());
req('172.30.77.2', ['HTTP_X_FORWARDED_FOR' => '203.0.113.9, 104.16.0.1', 'HTTP_CF_CONNECTING_IP' => '192.0.2.44']);
t('Cloudflare in front of your proxy: Cloudflare\'s visitor address is used', hub_ip() === '192.0.2.44', hub_ip());
req('172.30.77.2', ['HTTP_X_FORWARDED_FOR' => '203.0.113.9', 'HTTP_CF_CONNECTING_IP' => '192.0.2.44']);
t('...but a CF-Connecting-IP header without Cloudflare in the path is ignored', hub_ip() === '203.0.113.9', hub_ip());

putenv('HUB_TRUSTED_PROXY=fd00::/8');
req('fd00::2', ['HTTP_X_FORWARDED_FOR' => '2001:db8::1']);
t('IPv6 proxies and visitors work', hub_ip() === '2001:db8::1', hub_ip());

putenv('HUB_TRUSTED_PROXY=junk, 300.1.1.1, 10.0.0.0/99, 0.0.0.0/x, ::1, 192.168.5.5');
t('only real addresses and ranges are kept from the setting', hub_trusted_proxies() === ['::1', '192.168.5.5'], json_encode(hub_trusted_proxies()));
t('one address matches only itself', hub_ip_in('192.168.5.5', '192.168.5.5') && !hub_ip_in('192.168.5.6', '192.168.5.5') && !hub_ip_in('192.168.5.5', '192.168.5.0/abc'));

putenv('HUB_TRUSTED_PROXY');
file_put_contents($site . '/web/hub/core/config.php', "<?php\ndefine('HUB_TRUSTED_PROXY', '10.9.0.0/16');\n");
req('10.9.3.3', $fwd);
t('it can also be set in web/hub/core/config.php', hub_trusted_proxies() === ['10.9.0.0/16'] && hub_ip() === '203.0.113.9' && hub_https(), json_encode(hub_trusted_proxies()));
