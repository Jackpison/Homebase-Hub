#!/usr/bin/env python3
"""Screenshots of the real app with demo data: python3 scripts/screenshots.py build/site-update-X.Y.Z.zip OUTDIR
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
    rq=urllib.request.Request(B+'/web/core-data/api.php?action='+a,data=json.dumps(b).encode() if b is not None else None,headers={'User-Agent':UA,'Content-Type':'application/json','X-Hub-CSRF':csrf},method='POST' if b is not None else 'GET')
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
        c=b.new_context(user_agent=UA,viewport={'width':w,'height':h},device_scale_factor=1); c.add_cookies(cookies)
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
    m=ctx(390,844,'dark').new_page()
    for n,u in [('m-links','/web/links/'),('m-tasks','/web/tasks/'),('m-info','/web/info/'),('m-settings','/web/settings/#overview'),('m-tools','/web/tools/')]: snap(m,n,u)
    b.close()
php.terminate()
