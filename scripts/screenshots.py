#!/usr/bin/env python3
"""Screenshots of the real app with demo data: python3 scripts/screenshots.py build/site-update-X.Y.Z.zip OUTDIR [--webp]
--webp also writes them into website/img as WebP (with the cut-out versions the pages use).
Needs PHP and Playwright with Chromium. Pages load only from the local test server."""
import sys, os, time, json, subprocess, shutil, zipfile, urllib.request, http.cookiejar, re, datetime, threading, http.server, hashlib
os.environ['PHP_CLI_SERVER_WORKERS']='6'
from playwright.sync_api import sync_playwright
UA='Mozilla/5.0 (X11; Linux x86_64) HomebaseShots/1.0'; PW='correct horse battery staple'
ZIP=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
D='/tmp/shotsite3'; shutil.rmtree(D,ignore_errors=True); os.makedirs(D); zipfile.ZipFile(ZIP).extractall(D)
php=subprocess.Popen(['php','-S','127.0.0.1:8140','-t',D],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
B='http://127.0.0.1:8140'; cj=http.cookiejar.CookieJar(); op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj)); csrf=''
def call(a,b=None):
    rq=urllib.request.Request(B+'/web/hub/core/api.php?action='+a,data=json.dumps(b).encode() if b is not None else None,headers={'User-Agent':UA,'Content-Type':'application/json','X-Hub-CSRF':csrf},method='POST' if b is not None else 'GET')
    return json.loads(op.open(rq).read())
def post(path,b):
    rq=urllib.request.Request(B+path,data=json.dumps(b).encode(),headers={'User-Agent':UA,'Content-Type':'application/json','X-Hub-CSRF':csrf,'X-Requested-With':'bookmarks'},method='POST'); return json.loads(op.open(rq).read())
call('state'); t=open(D+'/site-data/core/SETUP-CODE.php').read().replace('<?php','')
code=re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})',t).group(1)
r=call('setup',{'code':code,'password':PW}); csrf=r.get('csrf') or call('state')['csrf']
links={'tabs':[{'id':'main','title':'Bookmarks','categories':[
 {'title':'Reading','links':[{'title':'Hacker News','url':'https://news.ycombinator.com'},{'title':'Wikipedia','url':'https://www.wikipedia.org'},{'title':'The Guardian','url':'https://www.theguardian.com'},{'title':'Ars Technica','url':'https://arstechnica.com'}]},
 {'title':'Work','links':[{'title':'GitHub','url':'https://github.com'},{'title':'Mozilla Developer Network','url':'https://developer.mozilla.org'},{'title':'Stack Overflow','url':'https://stackoverflow.com'},{'title':'Can I Use','url':'https://caniuse.com'}]},
 {'title':'Maps and Travel','links':[{'title':'OpenStreetMap','url':'https://www.openstreetmap.org'},{'title':'Wikivoyage','url':'https://www.wikivoyage.org'},{'title':'Time and Date','url':'https://www.timeanddate.com'}]},
 {'title':'Home Network','links':[{'title':'Router','url':'http://192.168.1.1'},{'title':'Media Server','url':'https://example.com'},{'title':'Printer','url':'http://192.168.1.20'}]},
 {'title':'Music','links':[{'title':'Bandcamp','url':'https://bandcamp.com'},{'title':'Radio Garden','url':'https://radio.garden'}]},
 {'title':'Learning','links':[{'title':'Khan Academy','url':'https://www.khanacademy.org'},{'title':'Coursera','url':'https://www.coursera.org'}]}]},
 {'id':'priv','title':'Private','private':True,'categories':[{'title':'Accounts','links':[{'title':'Bank','url':'https://example.com/bank'},{'title':'Health Portal','url':'https://example.com/health'}]}]}]}
print('links',post('/web/links/api.php?action=save',{'data':links}).get('ok'))
today=datetime.date.today(); d=lambda n:(today+datetime.timedelta(days=n)).isoformat()
tasks=[{'name':'Renew domain name','due':d(12),'repeat':{'n':1,'unit':'year'},'price':1199,'cur':'INR','cat':'Website','pay':'Card'},
 {'name':'Pay hosting','due':d(3),'repeat':{'n':1,'unit':'month'},'price':499,'cur':'INR','cat':'Website','pay':'Card'},
 {'name':'Back up photos','due':d(0),'repeat':{'n':1,'unit':'week'},'cat':'Home'},
 {'name':'Change smoke alarm batteries','due':d(40),'repeat':{'n':6,'unit':'month'},'cat':'Home'},
 {'name':'Library books due','due':d(-2),'repeat':{'n':0,'unit':'none'},'cat':'Errands'},
 {'name':'Music streaming','due':d(8),'repeat':{'n':1,'unit':'month'},'price':119,'cur':'INR','cat':'Subscriptions','pay':'Card'},
 {'name':'Car insurance','due':d(55),'repeat':{'n':1,'unit':'year'},'price':18500,'cur':'INR','cat':'Car','pay':'Bank transfer'},
 {'name':'Dentist check-up','due':d(21),'repeat':{'n':6,'unit':'month'},'cat':'Health'},
 {'name':'Cloud storage','due':d(16),'repeat':{'n':1,'unit':'month'},'price':75,'cur':'INR','cat':'Subscriptions','pay':'Card'}]
print('tasks',post('/web/tasks/api.php',{'action':'save','tasks':tasks,'rev':0}).get('ok'))
print(subprocess.run(['php',os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tests', 'lib', 'seed_demo.php'),D],capture_output=True,text=True).stdout.strip())
# Home's widgets (1.51): a countdown, a pinned note, World Clock and Weather. The forecast is written as if the server had saved it,
# so nothing asks Open-Meteo.
HOME_SEED = r'''
require $argv[1] . '/web/home/lib.php';
$info = hub_read_guarded(hub_dir('info') . '/info.php'); $tab = $info['tabs'][0]; $box = $tab['boxes'][0];
$d = fn($n) => date('Y-m-d', strtotime("$n days"));
$s = load_site();
$s['widgets'] = clean_widgets(['style' => $argv[2], 'clock' => true, 'list' => array_map(fn($id) => ['id' => $id, 'on' => true], ['today', 'countdown', 'weather', 'note', 'calendar', 'worldclock', 'quote', 'tools', 'pad']),
  'countdown' => ['name' => 'Goa Trip', 'date' => $d(12)], 'note' => ['tab' => $tab['id'], 'box' => $box['id']],
  'zones' => [['tz' => 'Europe/London', 'name' => 'London'], ['tz' => 'America/New_York', 'name' => 'New York']], 'weather' => ['town' => 'Bengaluru', 'unit' => 'c']]);
write_json(SITE_FILE, clean_site($s));
$days = [[$d(0), 29, 19, 'Partly cloudy', 'partly'], [$d(1), 27, 19, 'Rain', 'rain'], [$d(2), 28, 18, 'Mostly clear', 'sun']];
write_json(weather_file(), ['key' => 'bengaluru|c', 'town' => 'bengaluru', 'place' => ['name' => 'Bengaluru, Karnataka', 'lat' => 12.97, 'lon' => 77.59], 'saved' => time() + 86400,
  'data' => ['temp' => 27, 'text' => 'Partly cloudy', 'pic' => 'partly', 'day' => true, 'place' => 'Bengaluru, Karnataka', 'unit' => '°C', 'saved' => time() + 86400,
             'days' => array_map(fn($x) => ['date' => $x[0], 'max' => $x[1], 'min' => $x[2], 'text' => $x[3], 'pic' => $x[4]], $days)]]);
pad_write("Ask about the rent receipt.");
'''
VISITS = r'''
require $argv[1] . '/web/links/lib.php';
$d = hub_read_guarded(hub_dir('links') . '/bookmarks.php');
foreach (['https://news.ycombinator.com' => 14, 'https://github.com' => 23, 'https://www.wikipedia.org' => 6, 'https://stackoverflow.com' => 9, 'https://www.openstreetmap.org' => 3, 'http://192.168.1.1' => 4, 'https://bandcamp.com' => 2] as $u => $n)
    for ($i = 0; $i < $n; $i++) visits_add($u, 'shot' . $i, $d, false, time() - 3600 * $i);
'''
subprocess.run(['php', '-r', VISITS, '--', D], check=True)
def home_seed(style): subprocess.run(['php', '-r', HOME_SEED, '--', D, style], check=True)
cookies=[{'name':c.name,'value':c.value,'domain':'127.0.0.1','path':'/'} for c in cj]
def snap(pg,name,url=None,wait=1800,click=None,full=False):
    if url: pg.goto(B+url,wait_until='domcontentloaded'); pg.reload(wait_until='domcontentloaded')
    pg.wait_for_timeout(wait)
    if click:
        try: pg.locator(click).first.click(timeout=4000); pg.wait_for_timeout(1200)
        except Exception as e: print('  click failed',name,str(e)[:80])
    pg.screenshot(path=f'{OUT}/{name}.png',full_page=full); print(name)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--no-sandbox'])
    def ctx(w,h,theme):
        c=b.new_context(user_agent=UA,viewport={'width':w,'height':h},device_scale_factor=1,timezone_id='Asia/Kolkata'); c.add_cookies(cookies)
        c.add_init_script("try{localStorage.setItem('ix-seen-ver','%s');localStorage.setItem('hub-theme','%s')}catch(e){}" % (re.search(r'(\d+\.\d+\.\d+)',os.path.basename(ZIP)).group(1),theme))
        c.route('**/*',lambda r: r.continue_() if r.request.url.startswith(B) or r.request.url.startswith('data:') else r.abort()); return c
    for theme in ('dark','light'):
        pg=ctx(1440,900,theme).new_page(); s='' if theme=='dark' else '-light'
        snap(pg,'links'+s,'/web/links/'); snap(pg,'info'+s,'/web/info/'); snap(pg,'cards'+s,'/web/cards/'); snap(pg,'tasks'+s,'/web/tasks/')
        if theme=='dark':
            snap(pg,'info-doc','/web/info/',click='text=Trip Notes')
            # Links > Import Bookmarks with a preview of a Chrome export
            pg.goto(B+'/web/links/',wait_until='domcontentloaded'); pg.wait_for_timeout(1500)
            pg.evaluate("document.querySelector('#importBmBtn').click()"); pg.wait_for_selector('#impDlg[open]')
            pg.set_input_files('#impFile',os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'tests','fixtures','bookmarks','chrome.html')); pg.wait_for_timeout(800)
            pg.screenshot(path=f'{OUT}/links-import.png'); print('links-import')
            snap(pg,'tasks-calendar','/web/tasks/',click='#views button[data-view="cal"]')
            snap(pg,'tasks-analytics','/web/tasks/',click='#views button[data-view="an"]')
            snap(pg,'tools','/web/tools/')
            for n,h in [('overview','overview'),('general','general'),('appearance','look'),('presets','themes'),('colors','colors'),('security','security'),('telegram','telegram'),('backup','backup'),('updates','updates'),('files','files'),('health','health'),('check','check'),('changelog','changelog')]:
                snap(pg,'s-'+n,'/web/settings/#'+h)
        else:
            snap(pg,'s-overview-light','/web/settings/#overview'); snap(pg,'tools-light','/web/tools/')
    # Home (1440 x 683, as on the website): the Glass Dock with Today open, Glance and Expand, and what a visitor sees
    # Home shows the time: photograph it at a quarter to eight in the evening (India), not at whatever time this runs
    EVENING=datetime.datetime.combine(today, datetime.time(19, 42), tzinfo=datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
    def evening(c): c.clock.install(time=EVENING); return c
    hc=ctx(1440,683,'dark'); hc.add_init_script("try{sessionStorage.setItem('hl-welcomed','1');localStorage.setItem('tools.v3',JSON.stringify({recent:['pdf-merge','image-resize','qr-generator','pdf-sign']}))}catch(e){}")
    hp=evening(hc).new_page(); home_seed('dock')
    snap(hp,'home-1','/web/home/',click='#wChips [data-w=today]')
    home_seed('glance'); snap(hp,'home-2','/web/home/')
    vc=b.new_context(user_agent=UA,viewport={'width':1440,'height':683},device_scale_factor=1,timezone_id='Asia/Kolkata')
    vc.add_init_script("try{sessionStorage.setItem('hl-welcomed','1');document.cookie='hl_seen=0;path=/'}catch(e){}"); vc.route('**/*',lambda r: r.continue_() if r.request.url.startswith(B) or r.request.url.startswith('data:') else r.abort())
    vp=evening(vc).new_page(); vp.goto(B+'/web/home/',wait_until='domcontentloaded'); vp.wait_for_timeout(800); vp.click('#nextBg'); snap(vp,'home-3',wait=2500)
    home_seed('dock')
    m=ctx(390,844,'dark').new_page()
    m.context.add_init_script("try{sessionStorage.setItem('hl-welcomed','1')}catch(e){}"); evening(m.context)
    for n,u in [('m-home','/web/home/'),('m-links','/web/links/'),('m-tasks','/web/tasks/'),('m-info','/web/info/'),('m-settings','/web/settings/#overview'),('m-tools','/web/tools/')]: snap(m,n,u)
    # ---- 1.60: the settings of every page, edit mode, the login window, new tools (dark) ----
    def item(pg, label):   # presses a page's menu item (the pencil menu or the edit bar both use these buttons)
        pg.evaluate("(l) => document.querySelector('[data-hub=\"item\"][data-hub-label=\"' + l + '\"]').click()", label); pg.wait_for_timeout(1200)
    def shot(pg, name, full=False): pg.screenshot(path=f'{OUT}/{name}.png', full_page=full); print(name)
    for theme in ('dark', 'light'):
        sx = '' if theme == 'dark' else '-light'; pg = ctx(1440, 900, theme).new_page()
        for app, label in [('links', 'Links Settings'), ('info', 'Info Settings'), ('cards', 'Cards Settings'), ('tasks', 'Tasks Settings')]:
            pg.goto(B + '/web/' + app + '/', wait_until='domcontentloaded'); pg.wait_for_timeout(1800); item(pg, label); shot(pg, app + '-settings' + sx)
        if theme == 'dark':
            pg.goto(B + '/web/cards/', wait_until='domcontentloaded'); pg.wait_for_timeout(1800); item(pg, 'Holders'); shot(pg, 'cards-holders')
            pg.goto(B + '/web/cards/', wait_until='domcontentloaded'); pg.wait_for_timeout(1800); item(pg, 'Banks'); shot(pg, 'cards-banks')
            # the pencil menu, then editing with the edit bar at the bottom
            pg.goto(B + '/web/links/', wait_until='domcontentloaded'); pg.wait_for_timeout(1800); pg.click('#ix-editb'); pg.wait_for_timeout(600); shot(pg, 'links-menu')
            pg.locator('#ix-pop button').first.click(); pg.wait_for_timeout(1400); pg.hover('#ix-ebar .ix-eb >> nth=0'); pg.wait_for_timeout(400); shot(pg, 'links-edit')
            pg.goto(B + '/web/cards/', wait_until='domcontentloaded'); pg.wait_for_timeout(1800); pg.click('#ix-editb'); pg.wait_for_timeout(500); pg.locator('#ix-pop button').first.click(); pg.wait_for_timeout(1400); shot(pg, 'cards-edit')
            # Tools: a section, calculators, documents, presets and both layouts
            T = B + '/web/tools/'
            def tool(i, w=2200): pg.goto(T + '#/', wait_until='domcontentloaded'); pg.wait_for_timeout(500); pg.goto(T + '#/tool/' + i); pg.wait_for_timeout(w)
            pg.goto(T + '#/s/calculators', wait_until='domcontentloaded'); pg.wait_for_timeout(2000); shot(pg, 'tools-calculators')
            tool('loan-emi'); shot(pg, 'tools-emi')
            tool('sip-calculator'); shot(pg, 'tools-sip')
            pg.evaluate("localStorage.removeItem('tools.invoice.v1')"); tool('invoice-generator')
            for l, v in [('Business Name', 'Sharma Traders'), ('Tax ID', '27AAAAA0000A1Z5'), ('Phone', '+91 98765 43210'), ('Email', 'accounts@sharmatraders.in'), ('Customer Name', 'Mehta & Sons'),
                         ('Customer Tax ID', '27BBBBB1111B1Z6'), ('Description 1', 'Steel rods, 12 mm'), ('Quantity 1', '10'), ('Rate 1', '450')]: pg.get_by_label(l, exact=True).fill(v)
            pg.locator('#root textarea').first.fill('14, Market Road\nPune 411001'); pg.locator('#root textarea').nth(1).fill('22, Station Road\nMumbai 400001')
            pg.get_by_role('button', name='Add Item', exact=True).click(); pg.get_by_label('Description 2', exact=True).fill('Delivery'); pg.get_by_label('Rate 2', exact=True).fill('500')
            pg.get_by_label('Split the tax into two halves').check(); pg.get_by_label('Payment Details or Notes').fill('Bank: HDFC Bank, A/c 50100123456789, IFSC HDFC0001234')
            pg.evaluate('document.activeElement.blur(); scrollTo(0, 0)'); pg.wait_for_timeout(400); shot(pg, 'tools-invoice')
            with pg.expect_download() as dl: pg.get_by_role('button', name='Download PDF', exact=True).click()
            pdf = f'{OUT}/invoice.pdf'; shutil.copy(dl.value.path(), pdf)
            if shutil.which('pdftoppm'): subprocess.run(['pdftoppm', '-r', '110', '-png', '-singlefile', '-f', '1', '-l', '1', pdf, f'{OUT}/tools-invoice-pdf'], check=False); print('tools-invoice-pdf')
            tool('text-compare'); pg.get_by_label('Original text').fill('Dear Ravi,\nThe meeting is on Monday at 10 am.\nPlease bring the reports.\nThanks'); pg.get_by_label('Changed text').fill('Dear Ravi,\nThe meeting is on Tuesday at 11 am.\nPlease bring the reports and the budget.\nThanks,\nAsha'); pg.wait_for_timeout(700); shot(pg, 'tools-compare')
            tool('qr-generator'); pg.fill('#root input[type=url]', 'https://example.com/hello'); pg.wait_for_timeout(400)
            with pg.expect_download() as dl: pg.get_by_role('button', name='Download PNG', exact=True).click()
            qr = f'{OUT}/qr-in.png'; shutil.copy(dl.value.path(), qr)
            pg.get_by_role('button', name='Save as Preset', exact=True).click(); pg.get_by_label('Preset name').fill('Black and White'); pg.get_by_role('button', name='Save', exact=True).click(); pg.wait_for_timeout(800)
            tool('qr-scanner'); pg.set_input_files('#root .dropwrap input[type=file]', qr); pg.wait_for_timeout(3500); shot(pg, 'tools-scanner')
            tool('pdf-sign'); pg.get_by_role('button', name='Type', exact=True).click(); pg.get_by_label('Your name', exact=True).fill('Asha Rao'); pg.wait_for_timeout(300)
            pg.get_by_role('button', name='Save as Preset', exact=True).click(); pg.get_by_label('Preset name').fill('My Signature'); pg.get_by_role('button', name='Save', exact=True).click(); pg.wait_for_timeout(4700)   # the message fades first
            pg.evaluate("document.querySelector('#root .pbar').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(300); shot(pg, 'tools-preset')
            pg.goto(T + '#/settings'); pg.wait_for_timeout(1800); shot(pg, 'tools-settings')
            pg.get_by_role('button', name='Tabs on Top', exact=True).click(); pg.wait_for_timeout(400); tool('loan-emi'); shot(pg, 'tools-tabs')
            pg.goto(T + '#/settings'); pg.get_by_role('button', name='Side Menu', exact=True).click(); pg.wait_for_timeout(300)
            # Home Settings and the Widgets window (Home photographed in the evening, as above)
            hp2 = evening(ctx(1440, 900, 'dark')).new_page(); hp2.goto(B + '/web/home/', wait_until='domcontentloaded'); hp2.wait_for_timeout(2500)
            # Home loads its settings when you choose from its menu, so go through the corner menu as a person does
            hp2.click('[data-ix=corner]'); hp2.wait_for_timeout(500); hp2.locator('#ix-pop button', has_text='Home Settings').click(); hp2.wait_for_timeout(1300); shot(hp2, 'home-settings')
            hp2.goto(B + '/web/home/', wait_until='domcontentloaded'); hp2.wait_for_timeout(2500); hp2.click('[data-ix=corner]'); hp2.wait_for_timeout(500)
            hp2.locator('#ix-pop button', has_text='Edit This Page').click(); hp2.wait_for_timeout(1500); item(hp2, 'Widgets'); shot(hp2, 'home-widgets')
            # the login window, as a visitor sees it, on a computer and a phone
            for w, h, n in [(1440, 900, 'login'), (390, 844, 'm-login')]:
                lc = b.new_context(user_agent=UA, viewport={'width': w, 'height': h}, device_scale_factor=1 if w > 500 else 2, timezone_id='Asia/Kolkata')
                lc.route('**/*', lambda r: r.continue_() if r.request.url.startswith(B) or r.request.url.startswith('data:') else r.abort())
                lp = lc.new_page(); lp.goto(B + '/web/links/', wait_until='domcontentloaded'); lp.wait_for_timeout(1500)
                lp.evaluate("setTimeout(() => HUB.login(), 0); 0"); lp.wait_for_timeout(1000); shot(lp, n)
    b.close()
php.terminate()

# ---- the website's pictures: every PNG as WebP in website/img, plus the cut-out versions the pages use ----
if '--webp' in sys.argv:
    from PIL import Image
    IMG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'website', 'img')
    CROPS = {'links-crop': ('links', 560), 'info-crop': ('info', 600), 'info-doc-crop': ('info-doc', 640), 'cards-crop': ('cards', 640), 'tools-crop': ('tools', 700),
             'tasks-analytics-crop': ('tasks-analytics', 900), 'shot-links': ('links', 709), 'shot-info': ('info', 709), 'shot-tasks': ('tasks', 709), 'shot-tools': ('tools', 709)}
    for f in sorted(os.listdir(OUT)):
        if f.endswith('.png') and f != 'qr-in.png':
            Image.open(os.path.join(OUT, f)).convert('RGB').save(os.path.join(IMG, f[:-4] + '.webp'), 'WEBP', quality=82, method=6)
    for name, (src, hgt) in CROPS.items():
        im = Image.open(os.path.join(OUT, src + '.png')).convert('RGB'); im.crop((0, 0, im.width, min(hgt, im.height))).save(os.path.join(IMG, name + '.webp'), 'WEBP', quality=82, method=6)
    print('website/img updated')
