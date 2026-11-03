<?php
// 1.72.0: more ways for a task to repeat: chosen weekdays, the last day of the month, the nth weekday of the month. The server keeps only
// valid values, finds the next date the same way the page does, names the rule in plain words, and the calendar feed carries it.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/tasks/lib.php';

$t = function (array $rep, string $due) { return ['repeat' => $rep, 'due' => $due, 'day' => (int)substr($due, 8, 2)]; };
// weekdays: Mon, Wed, Fri
$mwf = ['n' => 1, 'unit' => 'week', 'wd' => [1, 3, 5]];
t('Mon/Wed/Fri: Monday 2 Nov 2026 goes to Wednesday 4 Nov', tasks_next_date($t($mwf, '2026-11-02')) === '2026-11-04');
t('Mon/Wed/Fri: Friday 6 Nov goes to Monday 9 Nov', tasks_next_date($t($mwf, '2026-11-06')) === '2026-11-09');
$two = ['n' => 2, 'unit' => 'week', 'wd' => [2]];
t('every 2 weeks on Tuesday: 3 Nov goes to 17 Nov', tasks_next_date($t($two, '2026-11-03')) === '2026-11-17');
$two2 = ['n' => 2, 'unit' => 'week', 'wd' => [1, 4]];
t('every 2 weeks on Mon and Thu: Mon 2 Nov -> Thu 5 Nov -> Mon 16 Nov', tasks_next_date($t($two2, '2026-11-02')) === '2026-11-05' && tasks_next_date($t($two2, '2026-11-05')) === '2026-11-16');
// last day of the month
$last = ['n' => 1, 'unit' => 'month', 'on' => 'last'];
t('the last day of the month: 31 Jan -> 28 Feb -> 31 Mar', tasks_next_date($t($last, '2027-01-31')) === '2027-02-28' && tasks_next_date($t($last, '2027-02-28')) === '2027-03-31');
t('in a leap year February has 29 days', tasks_next_date($t($last, '2028-01-31')) === '2028-02-29');
// nth weekday
$secTue = ['n' => 1, 'unit' => 'month', 'on' => 'nth', 'nth' => 2, 'dow' => 2];
t('the 2nd Tuesday: 10 Nov 2026 -> 8 Dec 2026', tasks_next_date($t($secTue, '2026-11-10')) === '2026-12-08');
$lastFri = ['n' => 3, 'unit' => 'month', 'on' => 'nth', 'nth' => -1, 'dow' => 5];
t('every 3 months on the last Friday: 27 Nov 2026 -> 26 Feb 2027', tasks_next_date($t($lastFri, '2026-11-27')) === '2027-02-26');
t('nth weekday helper: 1st Monday of Feb 2027 is the 1st, last Sunday of Oct 2026 is the 25th', tasks_nth_weekday(2027, 2, 1, 1) === 1 && tasks_nth_weekday(2026, 10, -1, 0) === 25);
t('the plain repeats still work: monthly on the same date', tasks_next_date($t(['n' => 1, 'unit' => 'month'], '2026-11-15')) === '2026-12-15');

// cleaning: only valid values are kept
$c = tasks_clean_one(['name' => 'Gym', 'due' => '2026-11-02', 'repeat' => ['n' => 1, 'unit' => 'week', 'wd' => [5, 1, 1, 9, 'x', 3]]]);
t('weekdays are kept sorted and without doubles; a bad day is dropped', $c['repeat'] === ['n' => 1, 'unit' => 'week', 'wd' => [1, 3, 5]]);
$c = tasks_clean_one(['name' => 'Rent', 'due' => '2026-11-30', 'repeat' => ['n' => 1, 'unit' => 'month', 'on' => 'nth', 'nth' => 7, 'dow' => 2]]);
t('a 7th weekday is not a thing: it falls back to the same date each month', $c['repeat'] === ['n' => 1, 'unit' => 'month']);
$c = tasks_clean_one(['name' => 'X', 'due' => '2026-11-30', 'repeat' => ['n' => 1, 'unit' => 'day', 'wd' => [1], 'on' => 'last']]);
t('weekdays and "on" only belong to weekly and monthly tasks', $c['repeat'] === ['n' => 1, 'unit' => 'day']);

// in words, and in the calendar feed
t('labels: "Every Mon, Wed and Fri", "Every Weekday", "Every 2 Weeks on Tue"',
  tasks_repeat_label($mwf) === 'Every Mon, Wed and Fri' && tasks_repeat_label(['n' => 1, 'unit' => 'week', 'wd' => [1, 2, 3, 4, 5]]) === 'Every Weekday' && tasks_repeat_label($two) === 'Every 2 Weeks on Tue');
t('labels: "Monthly on the Last Day", "Monthly on the 2nd Tuesday", "Quarterly on the Last Friday"',
  tasks_repeat_label($last) === 'Monthly on the Last Day' && tasks_repeat_label($secTue) === 'Monthly on the 2nd Tuesday' && tasks_repeat_label(['n' => 3] + $lastFri) === 'Quarterly on the Last Friday');
t('calendar rules: BYDAY=MO,WE,FR; BYMONTHDAY=-1; BYDAY=2TU; BYDAY=-1FR',
  tasks_ics_by($mwf) === ';BYDAY=MO,WE,FR' && tasks_ics_by($last) === ';BYMONTHDAY=-1' && tasks_ics_by($secTue) === ';BYDAY=2TU' && tasks_ics_by($lastFri) === ';BYDAY=-1FR' && tasks_ics_by(['n' => 1, 'unit' => 'month']) === '');
