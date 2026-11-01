const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();let refreshes=0,offline=false,hold=false,release;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://klar.test/**',r=>{const name=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(path.join(__dirname,'..',name)),contentType:name.endsWith('.js')?'text/javascript':'text/html'});});
  await page.route('https://fvykxvrdvjeriahlxded.supabase.co/**',async r=>{
   const url=r.request().url();
   if(url.includes('grant_type=')){
    if(url.includes('refresh_token')){refreshes++;if(hold)await new Promise(resolve=>{release=resolve;});if(offline)return r.fulfill({status:503,json:{}});}
    return r.fulfill({json:{access_token:'access-'+refreshes,refresh_token:'refresh-'+refreshes,expires_in:3600,user:{id:'test-user',email:'test@example.test'}}});
   }
   return r.fulfill({json:[]});
  });
  const login=async remember=>{await page.evaluate(()=>cloudDialog());await page.locator('#cloudEmail').fill('test@example.test');await page.locator('#cloudPassword').fill('test-password-only');await page.locator('#cloudRemember').setChecked(remember);await page.locator('#cloudLogin button').first().click();await page.locator('#cloudLogout').waitFor();};
  const expire=()=>page.evaluate(()=>{cloudSession.expiresAt=0;persistCloudSession();});
  await page.goto('https://klar.test');await login(true);
  assert.equal(await page.evaluate(()=>localStorage.getItem(cloudSessionKey).includes('test-password-only')),false);
  await page.reload();assert.equal(await page.evaluate(()=>cloudSession?.email),'test@example.test');
  await expire();await page.evaluate(()=>{window.sessionReference=cloudSession;return Promise.all([ensureCloudSession(),ensureCloudSession()]);});
  assert.equal(refreshes,1);assert.equal(await page.evaluate(()=>window.sessionReference===cloudSession),true);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(cloudSessionKey)).refreshToken),'refresh-1');
  offline=true;await expire();await page.evaluate(()=>ensureCloudSession().catch(()=>{}));
  assert.ok(await page.evaluate(()=>localStorage.getItem(cloudSessionKey)));offline=false;
  await page.evaluate(()=>cloudRequest('/rest/v1/klar_financial_plans?select=payload'));assert.equal(refreshes,3);
  hold=true;await expire();await page.evaluate(()=>{window.pendingRefresh=ensureCloudSession().catch(e=>e.message);});
  await page.waitForTimeout(100);assert.ok(release);await page.evaluate(()=>forgetCloudSession());release();
  await page.evaluate(()=>window.pendingRefresh);assert.equal(await page.evaluate(()=>cloudSession),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem(cloudSessionKey)),null);
  hold=false;await login(false);assert.equal(await page.evaluate(()=>localStorage.getItem(cloudSessionKey)),null);
  await page.reload();assert.equal(await page.evaluate(()=>cloudSession),null);
  await login(true);await page.locator('#cloudLogout').click();await page.reload();assert.equal(await page.evaluate(()=>cloudSession),null);
  assert.deepEqual(errors,[]);
  console.log('PASS remembered login, token rotation, deduplicated refresh, sync identity, temporary outage, logout race, opt-out and logout/reload');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
