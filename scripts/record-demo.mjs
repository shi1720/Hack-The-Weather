/** Record the real Kavu app. Explanatory cards are explicitly labelled and do not imitate app screens. */
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root = process.cwd();
const out = path.join(root, 'output/build/video');
const baseURL = process.env.KAVU_RECORD_URL || 'http://127.0.0.1:5174';
const duration = 265;
await fs.mkdir(out, { recursive: true });
const font = await fs.readFile(path.join(root,'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'));
const cards = {
  opening: { tag:'HACK THE WEATHER 2026 · DEMONSTRATION', title:'Every dry<br>hour counts.', lead:'A weather reading does not cover a pile of maize.<br>A person does.', foot:'KAVU · Shivam Gupta, founder & product lead', aside:'REAL CONDUIT WEATHER<br>ILLUSTRATIVE GRAIN BATCHES' },
  business: { tag:'BUSINESS HYPOTHESIS · EXPLANATORY CARD', title:'One supervisor.<br>Many farmers’ lots.', lead:'Start with maize cooperatives and aggregation yards<br>that already dry grain and use a moisture meter.', tiles:[['KSh 2,500','per active month / site'],['One accountable record','weather → work → measurement'],['To be tested','customer interviews + supervised pilot']], foot:'Price hypothesis. No paying customers, signed pilots or measured savings claimed.' },
  architecture: { tag:'IMPLEMENTED ARCHITECTURE · EXPLANATORY CARD', title:'Two ways to<br>use the same logic.', lead:'The public demo is local to your browser.<br>The self-hosted server supports private accounts and durable records.', tiles:[['Browser demonstration','React · localStorage · historical replay'],['Server application','Express · SQLite · private workspaces'],['Decision engine','Explainable rules · no paid LLM call']], foot:'AI assistance: Codex engineering & documentation. Shivam: product direction & commercial priorities.' },
  pilot: { tag:'NEXT STEP · PROPOSED PILOT', title:'The next proof<br>is in the yard.', lead:'Observe existing work. Compare in shadow mode.<br>Then measure adoption, moisture checks and actual costs.', tiles:[['01 · Observe','Record the existing workflow'],['02 · Compare','Supervisor judgment + explained rules'],['03 · Measure','Tasks · meter readings · real costs']], foot:'Proposed validation. No field outcomes are claimed.' },
  closing: { tag:'KAVU · FROM DATA TO IMPACT', title:'Evidence.<br>Action.<br>A new measurement.', lead:'Every dry hour counts.', foot:'github.com/shi1720/Hack-The-Weather', aside:'HISTORICAL WEATHER DEMONSTRATION<br>HUMAN NARRATION & TEAM CAMERA TO BE ADDED' },
};
function cardHTML(name){ const c=cards[name]; return `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font.toString('base64')})}*{box-sizing:border-box}body{margin:0;background:#213f31;color:#f5f4e9;font-family:Manrope,Arial,sans-serif;width:1920px;height:1080px;overflow:hidden}.card{position:relative;height:100%;padding:80px 100px}.brand{font-size:52px;font-weight:850;letter-spacing:-3px}.brand span{color:#dfcb7a}.tag{font-size:18px;letter-spacing:3px;color:#d9cc8b;font-weight:750;margin:38px 0 30px}h1{font-size:${name==='closing'?94:102}px;line-height:1.07;letter-spacing:-5px;margin:0 0 30px;max-width:1500px;font-weight:740}.lead{font-size:31px;line-height:1.55;color:#dce4d8;max-width:1500px;margin:0}.tiles{display:flex;gap:24px;margin-top:48px;max-width:1680px}.tile{flex:1;padding:27px 30px;background:#2c4c3b;border:1px solid #53705a;border-radius:14px}.tile strong{display:block;color:#ede1a2;font-size:28px;margin-bottom:12px}.tile span{font-size:22px;line-height:1.5;color:#d2dfce}.foot{position:absolute;left:100px;bottom:51px;font-size:19px;color:#bcccbd;max-width:1530px}.aside{position:absolute;right:100px;top:89px;text-align:right;line-height:1.9;color:#b8c9b3;letter-spacing:2px;font-size:15px}.orb{position:absolute;right:-170px;top:320px;width:620px;height:620px;border:1px solid #637051;border-radius:50%;z-index:-1}.orb:before{content:'';position:absolute;inset:42px;border:1px solid #637051;border-radius:50%}.line{position:absolute;left:100px;bottom:108px;width:130px;height:5px;background:#d9cc8b;border-radius:2px}</style></head><body><div class="card"><div class="brand">kavu<span>.</span></div><div class="tag">${c.tag}</div><h1>${c.title}</h1><p class="lead">${c.lead}</p>${c.tiles?`<div class="tiles">${c.tiles.map(([title,body])=>`<div class="tile"><strong>${title}</strong><span>${body}</span></div>`).join('')}</div>`:''}${c.aside?`<div class="aside">${c.aside}</div>`:''}<div class="orb"></div><div class="line"></div><div class="foot">${c.foot}</div></div></body></html>`; }
for(const name of Object.keys(cards)) await fs.writeFile(path.join(out,`${name}.html`),cardHTML(name));
const browser = await chromium.launch({ headless:true });
const context = await browser.newContext({ viewport:{width:1920,height:1080}, recordVideo:{dir:out,size:{width:1920,height:1080}}, deviceScaleFactor:1, reducedMotion:'reduce' });
const page = await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
let started;
async function card(name){ await page.setContent(cardHTML(name),{waitUntil:'load'}); await page.evaluate(()=>document.fonts.ready); }
async function at(seconds,label){ if(label)console.log(`CUE ${seconds}s · ${label}`); const target=started+seconds*1000; while(Date.now()<target) await page.waitForTimeout(Math.min(1000,target-Date.now())); }
async function click(locator){ await locator.scrollIntoViewIfNeeded(); const box=await locator.boundingBox(); if(box)await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:18}); await locator.click(); }
async function snap(name){ await page.screenshot({path:path.join(out,`${name}.png`)}); }
async function navigate(name){await click(page.getByRole('button',{name,exact:true}));await page.waitForTimeout(300);}
async function openMavuno(){await navigate('Batches');await click(page.getByRole('button',{name:'Mavuno A-01',exact:true}));await expect(page.getByRole('dialog')).toContainText('1,800');}
async function fillReading(value){await click(page.getByRole('button',{name:'Log reading',exact:true}).last());await page.getByLabel('New measured moisture (%)').pressSequentially(value,{delay:180});await page.getByLabel('Measurement note').pressSequentially('Demonstration only: example meter reading; three representative samples.',{delay:22});}
try {
  await card('opening'); started=Date.now(); await snap('00-opening'); console.log('CAPTURE STARTED');
  await at(15,'Welcome and real demo entry'); await page.goto(baseURL,{waitUntil:'networkidle'});
  await expect(page.getByRole('button',{name:/Explore demo workspace/})).toBeVisible();
  await at(22);await click(page.getByRole('button',{name:/Explore demo workspace/}));await expect(page.getByRole('heading',{name:'Make every dry hour count.'})).toBeVisible();
  await at(30);await snap('01-overview');
  await at(35,'Actual missing-data day: September8');await page.getByLabel('Replay date').selectOption('2026-09-08');await expect(page.getByText('Data unavailable',{exact:true})).toBeVisible();await snap('02-missing-evidence');
  await at(44,'Actual humid day: September15');await page.getByLabel('Replay date').selectOption('2026-09-15');await expect(page.locator('.stat').first()).toContainText('0');await snap('03-humid-day');
  await at(53,'Return to September12');await page.getByLabel('Replay date').selectOption('2026-09-12');await expect(page.locator('.stat').first()).toContainText('6');
  await at(60,'Seeded Mavuno batch:1800kg18.2%');await openMavuno();await expect(page.getByRole('dialog')).toContainText('18.2%');await snap('04-mavuno-intake');
  await at(77);await page.keyboard.press('Escape');await navigate('Overview');
  await at(80,'Review actual capacity-constrained plan');await click(page.getByRole('button',{name:'Build operator plan',exact:true}));await expect(page.getByRole('dialog')).toContainText('2,700');await snap('05-plan');
  await at(99);await click(page.getByRole('button',{name:'Create operator jobs',exact:true}));await expect(page.getByRole('heading',{name:'A plan your team can act on.'})).toBeVisible();
  await at(105,'Complete Mavuno spread');let spread=page.locator('.task-row').filter({hasText:'Mavuno A-01'}).filter({hasText:'Spread at 11:00 EAT'}).first();await spread.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);await click(spread.getByRole('button',{name:'Complete',exact:true}));
  await at(113,'Complete Mavuno turn');let turn=page.locator('.task-row').filter({hasText:'Mavuno A-01'}).filter({hasText:'Turn grain and inspect conditions'}).first();await turn.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);await click(turn.getByRole('button',{name:'Complete',exact:true}));
  await at(120);await page.getByLabel('Show completed').check();await snap('06-completed-work');
  await at(125,'Record15.0% measured moisture');await openMavuno();await fillReading('15.0');await snap('07-meter15');
  await at(141);await click(page.getByRole('button',{name:'Save measurement',exact:true}));
  await at(145,'Actual tariff equivalent, rounded2176KES');await navigate('Impact ledger');await expect(page.locator('.stat').nth(2)).toContainText('2,176');await snap('08-ledger2176');
  await at(160);await page.locator('.method-card').scrollIntoViewIfNeeded();
  await at(170,'Separate12.7% measurement');await openMavuno();await fillReading('12.7');
  await at(181);await click(page.getByRole('button',{name:'Save measurement',exact:true}));await click(page.getByRole('button',{name:'Mavuno A-01',exact:true}));
  await at(185);await click(page.getByRole('button',{name:'Confirm storage readiness',exact:true}));await expect(page.locator('tr').filter({hasText:'Mavuno A-01'})).toContainText('ready');await snap('09-measured-readiness');
  await at(190,'Business hypothesis card');await card('business');await snap('10-business');
  await at(215,'Architecture and contribution disclosure');await card('architecture');await snap('11-architecture');
  await at(240,'Proposed pilot');await card('pilot');await snap('12-pilot');
  await at(253,'Closing: add real team camera in edit');await card('closing');await snap('13-closing');
  await at(duration,'Capture complete');
  if(errors.length)throw new Error(`Browser errors: ${errors.join('; ')}`);
  await fs.writeFile(path.join(out,'capture-manifest.json'),JSON.stringify({baseURL,durationSeconds:duration,resolution:'1920x1080',capturedAt:new Date().toISOString(),browserErrors:errors,workflow:'Actual Kavu browser-local demonstration; official historical weather; seeded fictional inventory; real UI commands; explanatory cards are labelled.'},null,2));
} finally { await context.close(); await browser.close(); }
const raw=await page.video().path();
await fs.writeFile(path.join(out,'raw-video-path.txt'),raw+'\n');
const run=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited ${code}`)));});
await run('ffmpeg',['-y','-hide_banner','-loglevel','warning','-i',raw,'-t',String(duration),'-vf','fps=24','-c:v','libx264','-preset','medium','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(root,'output/kavu-demo-silent.mp4')]);
const cues=[
[0,15,'OPENING · Add real camera appearance','A weather reading does not cover a pile of maize. A person does.'],
[15,35,'ENTER THE REAL DEMO','Explore demo workspace. Historical Conduit weather; sample grain batches.'],
[35,44,'MISSING EVIDENCE · 8 SEPTEMBER','No observations means no invented drying window.'],
[44,53,'HUMID CONDITIONS · 15 SEPTEMBER','Available observations can still mean unsuitable weather.'],
[53,60,'WORKED EXAMPLE · 12 SEPTEMBER','Return to the actual six-hour historical window.'],
[60,80,'MAVUNO A-01 · SEEDED DEMONSTRATION','1,800 kg at18.2% moisture. These are sample inputs.'],
[80,105,'REVIEW AND CREATE OPERATOR JOBS','2,700 kg allocated within a3,000 kg yard. Whole batches; visible reasons.'],
[105,125,'COMPLETE REAL APP TASKS','Mavuno spread, then turn. Task completion does not prove grain is dry.'],
[125,145,'LOG A METER READING','15.0% is still above the13.0% operating target.'],
[145,170,'TARIFF EQUIVALENT · NOT VERIFIED SAVINGS','1.8 tonnes ×3.2 percentage points ×KSh377.80 ≈KSh2,176.'],
[170,190,'FRESH MEASUREMENT AND STORAGE REVIEW','12.7% supports the moisture target. Other quality procedures still apply.'],
[190,215,'BUSINESS HYPOTHESIS','Cooperative buyer. KSh2,500 per active month/site to test; no customers claimed.'],
[215,240,'TWO MODES · EXPLAINABLE LOGIC','Browser demo and private server workspaces. Disclose Codex assistance.'],
[240,253,'PROPOSED PILOT','Observe → shadow → measure adoption, moisture checks and actual costs.'],
[253,265,'CLOSING · Add actual team camera','Conduit evidence → completed job → new measurement. Every dry hour counts.'],
];
const timestamp=n=>`${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')},000`;
await fs.writeFile(path.join(root,'output/demo-cues.srt'),cues.map(([start,end,title,copy],i)=>`${i+1}\n${timestamp(start)} --> ${timestamp(end)}\n${title}\n${copy}\n`).join('\n'));
console.log('VIDEO READY output/kavu-demo-silent.mp4');
