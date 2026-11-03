<?php
// 1.72.0: calendars you follow in Tasks. An .ics file is read into events in the site's time zone: all-day and timed events, repeating
// events worked out (weekly on weekdays, the last Friday, a count, an end date), skipped and moved dates, cancelled events left out,
// folded lines and escaped text. The address: webcal:// becomes https://, only web addresses are taken, and it is never shown in full.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/tasks/lib.php';

$ics = implode("\r\n", [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//EN',
    'BEGIN:VEVENT', 'UID:a1', 'DTSTART;VALUE=DATE:20261110', 'SUMMARY:Bin day\, green bin', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:a2', 'DTSTART:20261111T183000Z', 'SUMMARY:Call with S', ' am (folded)', 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:a3', 'DTSTART;TZID=Europe/London:20261112T090000', 'SUMMARY:London meeting', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:w1', 'DTSTART;VALUE=DATE:20261102', 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH;COUNT=4', 'SUMMARY:Swim', 'EXDATE;VALUE=DATE:20261105', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:m1', 'DTSTART;VALUE=DATE:20261127', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;UNTIL=20270301', 'SUMMARY:Book club', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:m1', 'RECURRENCE-ID;VALUE=DATE:20261225', 'DTSTART;VALUE=DATE:20261223', 'SUMMARY:Book club (moved)', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:c1', 'DTSTART;VALUE=DATE:20261115', 'STATUS:CANCELLED', 'SUMMARY:Cancelled party', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:o1', 'DTSTART;VALUE=DATE:20250101', 'SUMMARY:Long ago', 'END:VEVENT',
    'END:VCALENDAR', '']);
$ev = tasks_ics_parse($ics, 'Asia/Kolkata', '2026-11-01', '2027-03-31');
$by = []; foreach ($ev as $e) $by[$e['s']][] = $e['d'] . ($e['t'] !== '' ? ' ' . $e['t'] : '');
t('an all-day event, with an escaped comma', ($by['Bin day, green bin'] ?? null) === ['2026-11-10']);
t('a UTC time is shown in the site time zone (18:30 UTC = 00:00 the next day in India); a folded line is joined; an alarm inside is skipped', ($by['Call with Sam (folded)'] ?? null) === ['2026-11-12 00:00']);
t('a time in another zone (09:00 London = 14:30 India)', ($by['London meeting'] ?? null) === ['2026-11-12 14:30']);
t('weekly on Mon and Thu, 4 times, one date skipped (EXDATE)', ($by['Swim'] ?? null) === ['2026-11-02', '2026-11-09', '2026-11-12']);
t('the last Friday of each month until 1 March, with 25 Dec moved to 23 Dec', ($by['Book club'] ?? null) === ['2026-11-27', '2027-01-29', '2027-02-26'] && ($by['Book club (moved)'] ?? null) === ['2026-12-23']);
t('a cancelled event is left out, and so is one before the window', !isset($by['Cancelled party']) && !isset($by['Long ago']));
t('events come earliest first', array_column($ev, 'd') === array_values(array_map(function ($e) { return $e['d']; }, $ev)) && $ev[0]['d'] === '2026-11-02');
t('at most the given number of events', count(tasks_ics_parse($ics, 'Asia/Kolkata', '2026-11-01', '2027-03-31', 3)) === 3);
t('a daily rule with an interval: every 2 days', tasks_rrule_dates('2026-11-01', 'FREQ=DAILY;INTERVAL=2;COUNT=3', '2026-01-01', '2027-01-01', 100) === ['2026-11-01', '2026-11-03', '2026-11-05']);
t('a monthly rule on the 15th', tasks_rrule_dates('2026-11-15', 'FREQ=MONTHLY;BYMONTHDAY=15;COUNT=2', '2026-01-01', '2027-12-31', 100) === ['2026-11-15', '2026-12-15']);
t('not a calendar at all: no events', tasks_ics_parse('<html>nope</html>', 'UTC', '2026-01-01', '2027-01-01') === []);

t('webcal:// becomes https://', tasks_sub_url('webcal://example.com/cal.ics') === 'https://example.com/cal.ics');
t('only web addresses: not file://, javascript: or a space', tasks_sub_url('file:///etc/passwd') === '' && tasks_sub_url('javascript:alert(1)') === '' && tasks_sub_url('https://a b') === '');
$shown = tasks_sub_show('https://calendar.google.com/calendar/ical/me%40gmail.com/private-0123456789abcdef0123/basic.ics');
t('the address is shown with its middle (where the secret is) hidden', $shown === 'https://calendar.google.com/…/basic.ics' && strpos($shown, 'private') === false);
t('a last part that looks like a key is hidden too', tasks_sub_show('https://x.example/c/0123456789abcdef0123456789abcdef') === 'https://x.example/…');
