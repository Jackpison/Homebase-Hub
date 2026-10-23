<?php
// Test and screenshot only: invented demo data for Info and Cards.
// Demo data for screenshots (invented). Usage: php seed.php /path/to/site
$site = $argv[1];
require $site . '/web/core-data/lib/boot.php';
function rid8() { return bin2hex(random_bytes(4)); }
function box($t, $n, $w = '', $h = '') { return ['id' => rid8(), 'w' => $w, 'h' => $h, 'title' => $t, 'notes' => $n, 'rev' => 1, 'saved' => time()]; }
$info = ['rev' => 3, 'tabs' => [
  ['id' => rid8(), 'name' => 'Home', 'layout' => 'cards', 'color' => '', 'boxes' => [
    box('Wi-Fi and Router', "Network: Homebase-5G\nRouter page: 192.168.1.1\nGuest network: on weekends only", 'third'),
    box('Bins', "Recycling: Tuesday\nGeneral waste: Friday\nGarden waste: every second Monday", 'third'),
    box('Plants', "Water the fern on Sundays\nRepot the basil in spring\nThe olive tree likes the south window", 'third'),
    box('Shopping List', "- Coffee beans\n- Oat milk\n- Lemons\n- Batteries (AA)\n- Light bulb for the hallway", 'half'),
    box('Ideas', "Paint the study a warm white\nShelves above the desk\nA reading lamp for the corner chair", 'half'),
  ]],
  ['id' => rid8(), 'name' => 'Trip Notes', 'layout' => 'doc', 'color' => '', 'boxes' => [
    box('Weekend in the Mountains', "Leave Friday after work, about four hours by car.\nStay: the small guest house by the lake (booked).\n\nPack\n- Warm jacket and hiking boots\n- Headlamp\n- Camera and the spare battery\n\nPlan\nSaturday: the ridge trail, early start.\nSunday: slow breakfast, the market, drive back after lunch.", 'full'),
    box('Places to Eat', "The bakery on the square opens at 7.\nThe trattoria by the bridge needs a booking on Saturdays.", 'full'),
  ]],
  ['id' => rid8(), 'name' => 'Recipes', 'layout' => 'cards', 'color' => '', 'boxes' => [
    box('Lemon Pasta', "Spaghetti, lemon zest and juice, butter, parmesan, black pepper.\nToss with a little pasta water.", 'half'),
    box('Overnight Oats', "Oats, milk, yoghurt, a spoon of honey.\nTop with berries in the morning.", 'half'),
  ]],
]];
hub_write_guarded(hub_dir('info') . '/info.php', $info);
$cards = ['cards' => [
  ['bank' => 'Northwind Bank', 'name' => 'Everyday Rewards', 'network' => 'Visa', 'variant' => 'Signature', 'limit' => 250000, 'owner' => 'Alex', 'kind' => 'Credit', 'type' => 'LTF', 'fee' => 0, 'expiry' => '08/29', 'remark' => '1% back on everything'],
  ['bank' => 'Contoso Bank', 'name' => 'Travel Plus', 'network' => 'Mastercard', 'variant' => 'World', 'limit' => 400000, 'owner' => 'Alex', 'kind' => 'Credit', 'type' => 'LTF', 'fee' => 2500, 'expiry' => '03/28', 'remark' => 'Lounge access'],
  ['bank' => 'Fabrikam Bank', 'name' => 'Fuel Saver', 'network' => 'RuPay', 'variant' => 'Platinum', 'limit' => 120000, 'owner' => 'Sam', 'kind' => 'Credit', 'type' => 'LTF', 'fee' => 500, 'expiry' => '11/27', 'remark' => 'Fuel surcharge waived'],
  ['bank' => 'Northwind Bank', 'name' => 'Savings Debit', 'network' => 'Visa', 'variant' => 'Classic', 'limit' => null, 'owner' => 'Sam', 'kind' => 'Debit', 'type' => 'Savings', 'fee' => 0, 'expiry' => '05/30', 'remark' => ''],
  ['bank' => 'Tailspin Bank', 'name' => 'Shopping Card', 'network' => 'Mastercard', 'variant' => 'Platinum', 'limit' => 90000, 'owner' => 'Alex', 'kind' => 'Credit', 'type' => 'Secured', 'fee' => 0, 'expiry' => '01/31', 'remark' => 'Against a deposit'],
  ['bank' => 'Contoso Bank', 'name' => 'Cash Back', 'network' => 'Visa', 'variant' => 'Platinum', 'limit' => 180000, 'owner' => 'Jordan', 'kind' => 'Credit', 'type' => 'LTF', 'fee' => 999, 'expiry' => '09/28', 'remark' => '5% on groceries'],
], 'people' => ['Alex', 'Sam', 'Jordan'], 'notes' => '', 'banks' => new stdClass, 'settings' => new stdClass, 'saved' => time()];
hub_jput(hub_dir('cards') . '/cards.php', json_encode($cards, JSON_UNESCAPED_UNICODE));
$s = hub_settings(); $s['backupLast'] = time(); hub_settings_save($s);   // no backup reminder in screenshots
echo "seeded\n";
