const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const treatment of ['included','open']){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const OriginalDate=Date;window.__testNow=Date.parse('2026-11-01T12:00:00Z');window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[window.__testNow]));}static now(){return window.__testNow;}};});
  await page.route('https://klar.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(path.join(__dirname,'..',file)),contentType:file.endsWith('.js')?'text/javascript':'text/html'});});
  await page.goto('https://klar.test');await page.locator('[data-action="setup"]').click();
  assert.equal(await page.locator('#foundationBalance').count(),0);assert.equal(await page.evaluate(()=>state.profile),null);
  await page.locator('[data-contract-edit="rent"]').click();await page.locator('#contractProvider').fill('Beispiel Vermieter');await page.locator('#contractAmount').fill('800');await page.locator('#contractDue').fill('2026-11-01');await page.locator('#contractForm button').click();
  await page.reload();assert.equal(await page.evaluate(()=>state.contracts[0].amount),80000);assert.equal(await page.evaluate(()=>state.profile),null);
  for(let i=0;i<5;i++)await page.locator('#contractNext').click();
  await page.locator('#foundationBalance').fill(treatment==='included'?'1200':'2000');await page.locator('#foundationPayday').fill('2026-11-08');await page.locator('#foundationBalanceForm button').last().click();
  await page.locator('[data-foundation-choice]').selectOption(treatment);await page.reload();assert.equal(await page.locator('[data-foundation-choice]').inputValue(),treatment);
  await page.locator('#foundationChecked').check();await page.locator('#foundationReviewForm button').last().click();
  assert.equal(await page.evaluate(()=>state.contracts.length),1);assert.equal(await page.evaluate(()=>state.profile.start),'2026-11-01');
  assert.equal(await page.evaluate(()=>state.payments.length),treatment==='included'?0:1);
  assert.equal(await page.evaluate(()=>plan().due),treatment==='included'?0:80000);
  assert.equal(await page.evaluate(()=>currentBalance()),treatment==='included'?120000:200000);
  assert.equal(await page.evaluate(()=>localStorage.getItem(foundationDraftKey)),null);
  await page.reload();assert.equal(await page.evaluate(()=>state.contracts.length),1);
  await page.evaluate(()=>{window.__testNow=Date.parse('2026-11-08T12:00:00Z');salaryDialog();});
  if(treatment==='open'){
   await page.locator('#salaryLater').fill('2026-11-09');await page.locator('#salaryLaterForm button').click();assert.equal(await page.evaluate(()=>salaryDue()),false);assert.equal(await page.evaluate(()=>state.transactions.length),0);
   await page.evaluate(()=>{window.__testNow=Date.parse('2026-11-09T12:00:00Z');salaryDialog();});
  }
  await page.locator('#salaryAmount').fill('2500');await page.locator('#salaryConfirmed').check();await page.locator('#salaryForm button').click();
  assert.equal(await page.evaluate(()=>state.transactions.filter(t=>t.name==='Gehalt').length),1);
  assert.equal(await page.evaluate(()=>currentBalance()),treatment==='included'?370000:450000);
  assert.equal(await page.evaluate(()=>state.profile.payday),'2026-12-08');assert.equal(await page.evaluate(()=>salaryDue()),false);
  await page.evaluate(()=>{window.__testNow=Date.parse('2026-12-08T12:00:00Z');state.transactions.push({id:uid(),name:'Schon erfasstes Gehalt',amount:230000,date:today(),kind:'income',category:'Sonstiges'});salaryDialog();});
  await page.locator('#salaryAlready').click();await page.locator('#salaryExisting').selectOption({label:'Schon erfasstes Gehalt · 2.300,00 € · 8. Dez. 2026'}).catch(async()=>{const id=await page.locator('#salaryExisting option').last().getAttribute('value');await page.locator('#salaryExisting').selectOption(id);});
  await page.locator('#salaryLinkForm button').click();assert.equal(await page.evaluate(()=>state.transactions.length),2);assert.equal(await page.evaluate(()=>state.profile.payday),'2027-01-08');
  assert.equal(await page.evaluate(()=>{validateBackup(JSON.parse(JSON.stringify(state)));return true;}),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS contracts-first entry, durable draft/review, retained contracts, already-paid rent vs pending rent, salary confirmation, postponement, recurring 8th, backup validation and mobile width');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
