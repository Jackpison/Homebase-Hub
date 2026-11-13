  /* Settings > Telegram: task and backup reminders through your own Telegram bot. Saved straight away (not with Save settings). */
  function pRemind(p) {
    p.innerHTML = spinRow();
    var hourLabel = function (h) { return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); };
    var BK_TXT = { 1: 'Every Day', 3: 'Every 3 Days', 7: 'Every Week', 14: 'Every 2 Weeks', 30: 'Every Month' };
    /* "Right Now": what is actually happening, in plain sentences: is the schedule running, what comes next, what went out last, what went wrong. */
    function live(n, ready) {
      var now = n.now || Math.floor(Date.now() / 1000), rows = [];
      var line = function (state, text) { rows.push(checkRow(state === 'ok' ? '' : state === 'off' ? 'off' : 'warn', state === 'ok' ? '✓' : state === 'off' ? '–' : '!', '', text)); };
      if (!ready) line('bad', '<b>Not connected yet.</b> Open the <b>Setup</b> tab and follow the 4 steps.');
      else {
        var cronAge = n.cronLast ? now - n.cronLast : -1;
        if (cronAge >= 0 && cronAge < 1800) line('ok', '<b>Schedule is running.</b> Last check ' + esc(ago(n.cronLast)) + '.');
        else if (cronAge >= 0) line('bad', '<b>Schedule has stopped.</b> It last ran ' + esc(ago(n.cronLast)) + '. Check the cron job in your hosting panel (Setup tab).');
        else line('bad', '<b>No schedule yet.</b> Messages only go out while one of your pages is open. Add the cron job (Setup tab).');
        if (n.on && n.tasks) {
          var d = new Date(); var next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), n.hour, 0, 0); if (next <= d) next.setDate(next.getDate() + 1);
          line('ok', '<b>Daily message</b> at ' + hourLabel(n.hour) + ' (' + esc(n.tz) + ') · next ' + (next.getDate() === d.getDate() ? 'today' : 'tomorrow') + '.');
        } else line('off', n.on ? 'Daily message is off.' : '<b>Messages are paused.</b> Turn them on in the Messages tab.');
        line(n.lastSent ? 'ok' : 'off', n.lastSent ? 'Last message sent ' + esc(ago(n.lastSent)) + '.' : 'Nothing sent yet.');
        if (n.bkEvery) line(n.bkError ? 'bad' : n.bkLast ? 'ok' : 'off', n.bkError ? '<b>Last backup to Telegram failed:</b> ' + esc(n.bkError) : n.bkLast ? 'Last backup file sent ' + esc(ago(n.bkLast)) + (n.encReady ? ', encrypted.' : ', <b>not encrypted</b> (set a passphrase in Security › Encryption).') : 'The first backup file goes out at the next daily hour.');
        if (n.hook) { var hi = n.hookInfo || {}; line(hi.error ? 'bad' : 'ok', hi.error ? '<b>Instant replies have a problem:</b> ' + esc(hi.error) + (hi.errorAt ? ' (' + esc(ago(hi.errorAt)) + ')' : '') : 'Instant replies are working' + (hi.pending ? ' · ' + hi.pending + ' waiting' : '') + '.'); }
        if (n.lastError) line('bad', '<b>Last problem:</b> ' + esc(n.lastError));
        else line('ok', 'No problems reported.');
      }
      return '<div class="ix-sect">Right Now</div><div class="ix-checks">' + rows.join('') + '</div>';
    }
    var tested = false;   // (1.77.1) a test message was sent in this visit: step 4 then says so and points to what comes next
    function draw(n, chats, msg, err) {
      var ready = n.hasToken && n.chat;
      if (msg) toast(msg);   // the message is also shown on the Status tab, but you may be on another tab when it arrives
      if (!ready && !TABSEL.telegram) TABSEL.telegram = 'setup';   // nothing works until the bot is connected, so start there
      var acc = function (k, title, sum, body) { return '<details class="ix-acc" data-tg="' + k + '"><summary><span>' + title + '</span><small>' + sum + '</small></summary><div class="ix-accb">' + body + '</div></details>'; };
      var sent = [n.tasks && 'digest', n.timed && 'due now', n.backup && 'backup reminder', n.login && 'login alerts'].filter(Boolean);
      var bkTxt = BK_TXT[n.bkEvery] || 'Off';
      var now = n.now || Math.floor(Date.now() / 1000), running = n.cronLast && now - n.cronLast < 1800;
      var toggle = function (k, title, hint, on, dis) { return '<label class="ix-tg"><span>' + title + '<small>' + hint + '</small></span><input type="checkbox" data-k="' + k + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '></label>'; };
      var hero = '<div class="ix-hero"><span class="ix-hero-i ' + (ready ? (running ? 'good' : 'warn') : 'warn') + '">' + svg(ICON.send) + '</span><div class="ix-hero-t"><div class="ix-hero-h">' +
        (ready ? 'Connected to ' + esc(n.chatName || n.chat) : n.hasToken ? 'One More Step: Connect Your Chat' : 'Connect Your Telegram Bot') + '</div><p>' +
        (ready ? (running ? 'Your bot is working and the schedule is running.' : 'Your bot is connected, but the schedule needs a look (see Right Now below).') : 'Reminders, login alerts and backups, sent to your phone by your own bot. It takes about two minutes.') + '</p>' +
        (ready ? '' : '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn pri" data-go="bot">' + (n.hasToken ? 'Continue Setup' : 'Start Setup') + '</button></div>') + '</div></div>';
      var tiles = '<div class="ix-tiles">' +
        tile('bot', ICON.gear, 'Setup', ready ? 'Connected' : n.hasToken ? 'No Chat Yet' : 'Not Set Up', ready ? 'good' : 'warn', ready ? 'Bot and schedule are ready.' : 'Make a bot, connect your chat, add the schedule.') +
        tile('bk', ICON.box, 'Backups', n.bkEvery ? bkTxt : 'Off', n.bkEvery ? (n.encReady ? 'good' : 'warn') : '', n.bkEvery ? (n.encReady ? 'Encrypted backup files.' : 'Not encrypted: set a passphrase in Security.') : 'Get a full backup file sent to your chat.') +
        tile('msg', ICON.bell, 'Messages', !ready ? 'Off' : n.on ? (sent.length ? sent.length + ' Kinds On' : 'Nothing Picked') : 'Off', ready && n.on ? 'good' : '', n.on && ready ? 'Daily message at ' + hourLabel(n.hour) + '.' : 'Choose what you want to hear about.') +
        tile('two', ICON.pulse, 'Instant Replies', n.hook ? 'On' : 'Off', n.hook ? 'good' : '', n.hook ? 'The bot answers within a second.' : 'The bot answers within a few minutes.') + '</div>';
      p.innerHTML = hero + (msg ? '<p class="' + (err ? 'ix-err' : 'ix-note') + '">' + esc(msg) + '</p>' : '') + tiles + live(n, ready) +

        acc('bot', 'Setup', ready ? 'Connected to ' + esc(n.chatName || n.chat) + '. The schedule (a cron job) is what sends messages on time.' : 'Three short steps: create a bot, connect your chat, send a test.',
          tabHead(ICON.gear, 'Setup', 'Three short steps: create a bot, connect your chat, send a test.') + (function () {
            var d1 = !!n.hasToken, d3 = !!n.chat, d4 = ready && !!n.on;
            var stp = function (num, done, open, title, sum, body) {
              return '<li class="ix-tls' + (done ? ' done' : '') + (open ? ' open' : '') + '"><span class="ix-tl-n">' + (done ? '✓' : num) + '</span><div class="ix-tl-t"' + (done ? ' role="button" tabindex="0"' : '') + '>' + title + '<span class="ix-sd ix-sd-' + (done ? 'ready' : open ? 'building' : 'queued') + '">' + (done ? 'Done' : open ? 'Next' : 'Waiting') + '</span></div>' +
                (done && sum ? '<div class="ix-tl-s">' + sum + '</div>' : '') + '<div class="ix-tl-b">' + body + '</div></li>'; };
            return '<ol class="ix-tl">' +
              stp(1, d1, !d1, 'Create Your Bot', 'Token saved (' + esc(n.tokenHint || 'hidden') + ')', '<p>In Telegram, open <b>@BotFather</b>, send <code>/newbot</code> and answer its questions. It gives you a <b>token</b>: a long line of letters and numbers. Paste it here.</p>' +
                '<div class="ix-fd"><label for="nt-tok">Bot Token</label><div class="ix-row"><input type="password" id="nt-tok" autocomplete="off" spellcheck="false" placeholder="' + esc(n.tokenHint || '123456789:AAE…') + '" style="flex:1;min-width:200px">' +
                '<button type="button" class="ix-btn pri" id="nt-st">Save Token</button>' + (n.hasToken ? '<button type="button" data-hold class="ix-btn" id="nt-rm">Remove</button>' : '') + '</div><small>It stays on your server and is only used to talk to Telegram.</small></div>') +
              stp(2, d3, d1 && !d3, 'Connect Your Chat', 'Connected to ' + esc(n.chatName || n.chat || ''), '<p>Open your new bot in Telegram, send it <code>/start</code>, then press <b>Find My Chat</b>.</p>' +
                '<div class="ix-row"><button type="button" class="ix-btn" id="nt-find"' + (n.hasToken ? '' : ' disabled') + '>Find My Chat</button></div>' +
                '<div class="ix-status">' + (n.chat ? '<span class="ix-ok">✓</span><span><b>Connected to</b> ' + esc(n.chatName || n.chat) + (n.chatName ? ' <small>(' + esc(n.chat) + ')</small>' : '') + '</span>' : '<span>!</span><span>No chat yet. Send <code>/start</code> to your bot first.</span>') + '</div>' +
                (chats && chats.length > 1 ? '<div class="ix-row">' + chats.map(function (c) { return '<button type="button" class="ix-btn" data-chat="' + esc(c.id) + '" data-name="' + esc(c.name) + '">Use ' + esc(c.name || c.id) + '</button>'; }).join('') + '</div>' : '')) +
              stp(3, d4, d3, 'Send a Test', tested ? 'Test message sent' : 'Ready', tested && d4
                ? '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Test message sent.</b> It should be in Telegram now.</span></div>' +
                  '<div class="ix-row"><button type="button" class="ix-btn pri" data-go="msg">Choose What to Hear About</button><button type="button" class="ix-btn" id="nt-test">Send Another Test</button></div>'
                : '<p>You should get a message from your bot within a second. Then open the <b>Messages</b> tab to choose what you want to hear about.</p>' +
                  '<div class="ix-row"><button type="button" class="ix-btn' + (ready && !tested ? ' pri' : '') + '" id="nt-test"' + (ready ? '' : ' disabled') + '>Send Test</button></div>') +
              '</ol>' +
              '<div class="ix-rcl">' + rowCard({ ic: ICON.clock, title: 'Keep It on Schedule', desc: 'Messages go out on time only if your host runs a small job every 10 minutes (a cron job).',
                act: '<button type="button" class="ix-btn" id="nt-schb" aria-expanded="false">Show the Command</button>', hide: true, id: 'nt-sch',
                body: '<p>In your hosting panel (cPanel › Cron Jobs), add this to run <b>every 10 minutes</b>:</p>' +
                linkField({ id: 'nt-cmd', value: n.cronCmd, prefix: 'Cron', readonly: true, label: 'Cron job command', cls: 'ix-uf-gap' }) +   // (1.69.1) the link field
                '<p>If your host only accepts a web address, use this one instead and keep it private:</p>' +
                // the key in the address shows as dots; Copy gives the whole line
                linkField({ id: 'nt-url', value: n.cronUrl, show: String(n.cronUrl).replace(/([?&]key=)[^&]+/, '$1•••••'), prefix: 'curl', readonly: true,
                  copyText: 'curl -s "' + n.cronUrl + '"', label: 'Cron job web address', cls: 'ix-uf-gap' }) }) + '</div>'
          })()) +

        acc('msg', 'Messages', !ready ? 'Finish Setup first, then choose what you want to hear about.' : n.on ? 'A daily message at ' + hourLabel(n.hour) + ', plus the alerts you pick below.' : 'Daily messages are off.',
          tabHead(ICON.bell, 'Messages', 'Choose what your bot tells you, and when.') +
          ecCard(n.on && ready ? 'good' : '', ICON.bell, 'Messages', 'The main switch. Messages go to the chat connected in Setup.', toggle('on', 'Messages On', ready ? 'Turn everything below on or off at once.' : 'Set up the bot and chat first.', n.on, !ready)) +
          ecCard('', ICON.check, 'Tasks', 'Reminders about the tasks in your Tasks page.',
            toggle('tasks', 'Daily Digest', 'Overdue tasks, tasks due today, and tasks inside their "Remind Me" window.', n.tasks) +
            toggle('timed', 'Due Now', 'Tasks with a time get a message when that time passes.', n.timed)) +
          ecCard('', ICON.shield, 'Site Alerts', 'News about the site itself.',
            toggle('backup', 'Backup Reminder', 'Once a day while a backup is due.', n.backup) +
            toggle('login', 'Login Alerts', 'Straight away: logins, paused logins, password and two-step changes, restores.', n.login)) +
          ecCard('', ICON.clock, 'Delivery Time', 'When the daily message goes out.',
            '<div class="ix-row"><select id="nt-hour" style="width:auto">' + Array.apply(null, Array(24)).map(function (x, h) { return '<option value="' + h + '"' + (n.hour === h ? ' selected' : '') + '>' + hourLabel(h) + '</option>'; }).join('') + '</select>' +
            '<span class="ix-note" style="margin:0">' + esc(String(n.tz).replace(/_/g, ' ')) + ' time</span><button type="button" class="ix-btn" id="nt-now"' + (ready ? '' : ' disabled') + '>Send Now</button></div>' +
            '<p class="ix-note">Last checked: ' + (n.lastRun ? when(n.lastRun) : 'never') + '. Last message: ' + (n.lastSent ? when(n.lastSent) : 'none yet') + '.' + (n.lastError ? ' <span class="ix-err">Last problem: ' + esc(n.lastError) + '</span>' : '') + '</p>') +
          ecCard('', ICON.send, 'Send Today\'s Tasks', 'The daily list, sent to your chat right now.', '<div class="ix-row"><button type="button" class="ix-btn pri" id="nt-today"' + (ready ? '' : ' disabled') + '>Send Today\'s Tasks Now</button></div>')) +

        acc('two', 'Instant Replies', (n.hook ? 'On: the bot answers your commands within a second.' : 'Off: the bot answers within a few minutes.') + ' It understands 8 commands.',
          '<div class="ix-rcl">' + rowCard({ ic: ICON.pulse, color: n.hook ? '#22c55e' : '', title: 'Instant Replies', desc: (n.hook ? 'On: the bot answers within a second.' : 'Off: the bot answers within a few minutes.') +
              (n.hook && n.hookInfo && n.hookInfo.error ? ' <span class="ix-err">Telegram reports: ' + esc(n.hookInfo.error) + '</span>' : ''),
            act: '<input type="checkbox" class="ix-sw" id="nt-hook" aria-label="Instant Replies"' + (n.hook ? ' checked' : '') + (n.hasToken ? '' : ' disabled') + '>',
            body: '<p class="ix-note ix-hknote" style="margin:0">With it on, <b>Approve in Telegram</b> logs you in within a second (needs https). With it off everything still works, a few minutes slower.</p>' +
              '<details class="ix-how"><summary>Behind Cloudflare?</summary><p>If replies stop, add a WAF rule that skips <code>/web/hub/core/telegram.php</code>.</p></details>' }) + '</div>' +
          '<div class="ix-sect">Commands</div><p class="ix-note" style="margin-top:0">Send any of these to your bot. Only your own chat is answered.</p>' +
          '<div class="ix-cmdg">' + [['/today', 'Overdue and today, with Done buttons'], ['/week', 'The next 7 days'], ['/next', 'The next 10 tasks'], ['/add Netflix 649 monthly 5 Nov', 'A new task'],
            ['/done Netflix', 'Mark one done'], ['/snooze Netflix 2h', 'Pause its reminders'], ['/backup', 'A backup file now'], ['/status', 'A quick health check']].map(function (c) {
            return '<div class="ix-cmdc"><code>' + esc(c[0]) + '</code><span>' + esc(c[1]) + '</span></div>'; }).join('') + '</div>');
      p.querySelectorAll('[data-go]').forEach(function (x) { x.onclick = function () { if (x.dataset.go === 'bk') { go('backup'); return; } var d = p.querySelector('details[data-tg="' + x.dataset.go + '"]'); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
      var call = function (action, body, btn, wait) {
        if (btn) btn.disabled = true;
        return api(action, body || {}, null, wait).then(function (j) {
          if (btn) btn.disabled = false;
          if (!j || !j.ok) { draw(j && j.cronCmd ? j : n, chats, (j && j.error) || 'Something went wrong.', true); return null; }
          return j;
        }, function () {   // no answer in time (a slow host, or the connection dropped): free the button, and say the action may still have worked
          if (btn) btn.disabled = false;
          draw(n, chats, 'The site did not answer in time. A backup can still arrive in Telegram: look there before you try again.', true); return null;
        });
      };
      var tok = p.querySelector('#nt-tok');
      p.querySelector('#nt-st').onclick = function () {
        if (!tok.value.trim()) { tok.focus(); return; }
        call('notify_save', { token: tok.value.trim() }, this).then(function (j) { if (j) draw(j, null, 'Token saved. Now send /start to your bot and click Find My Chat.'); });
      };
      var rm = p.querySelector('#nt-rm');
      if (rm) rm.onclick = function () {
        call('notify_save', { clearToken: true }, rm).then(function (j) { if (j) draw(j, null, 'Bot removed. Reminders are off.'); });
      };
      p.querySelector('#nt-find').onclick = function () {
        call('notify_find', {}, this).then(function (j) {
          if (!j) return;
          var c = j.chats || [];
          draw(j, c, !c.length ? 'No messages found. Open your bot in Telegram, send /start, then try again.' : c.length === 1 ? 'Found your chat. Click Send Test.' : 'Several chats wrote to the bot. Pick yours.', !c.length);
        });
      };
      p.querySelectorAll('[data-chat]').forEach(function (b) { b.onclick = function () {
        call('notify_save', { chat: b.dataset.chat }, b).then(function (j) { if (j) { j.chatName = j.chatName || b.dataset.name; call('notify_test', { chatName: b.dataset.name }).then(function (k) { draw(k || j, null, k ? 'Chat saved and a test message sent.' : ''); }); } });
      }; });
      var sb = p.querySelector('#nt-schb'); if (sb) sb.onclick = function () { var x = p.querySelector('#nt-sch .ix-rc-x'); x.hidden = !x.hidden; sb.setAttribute('aria-expanded', x.hidden ? 'false' : 'true'); sb.textContent = x.hidden ? 'Show the Command' : 'Hide'; };
      p.querySelectorAll('.ix-tls.done>.ix-tl-t').forEach(function (h) { h.onclick = function () { h.parentNode.classList.toggle('open'); }; h.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); h.click(); } }; });
      p.querySelector('#nt-test').onclick = function () { call('notify_test', {}, this).then(function (j) { if (j) { tested = true; draw(j, null, 'Test message sent. Check Telegram.'); } }); };
      p.querySelector('#nt-now').onclick = function () { call('notify_run', {}, this).then(function (j) { if (j) draw(j, null, j.note || 'Done.', !j.ok); }); };
      p.querySelectorAll('[data-k]').forEach(function (c) { c.onchange = function () {
        var o = {}; o[c.dataset.k] = c.checked;
        call('notify_save', o).then(function (j) { if (j) { n = j; draw(j, null); toast(c.dataset.k === 'on' ? (j.on ? 'Reminders on.' : 'Reminders off.') : 'Saved.'); } });
      }; });
      p.querySelector('#nt-hook').onchange = function (e) {
        var c = e.target; c.disabled = true;
        api('tg_hook', { on: c.checked }).then(function (j) { c.disabled = false; if (!j.ok) { c.checked = !c.checked; toast(j.error || 'Telegram refused.'); return; } draw(j, null, j.hook ? 'Instant replies are on. Send /help to your bot to try it.' : 'Instant replies are off; the site checks every few minutes.'); });
      };
      p.querySelector('#nt-today').onclick = function () {
        var b = this; b.textContent = 'Sending…';
        call('notify_today', {}, b, { timeout: 30000 }).then(function (j) { b.textContent = 'Send Today\'s Tasks Now'; if (j) toast('Sent. Check Telegram.'); });
      };
      p.querySelector('#nt-hour').onchange = function (e) { call('notify_save', { hour: +e.target.value }).then(function (j) { if (j) { n = j; draw(j, null); toast('Daily messages at ' + hourLabel(j.hour) + '.'); } }); };
    }
    api('notify').then(function (n) { if (!n || !n.ok) { p.innerHTML = '<p class="ix-err">' + esc((n && n.error) || 'Could not load.') + '</p>'; return; } draw(n); });
  }
