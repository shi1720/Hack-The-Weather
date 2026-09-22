/** Record actual hosted Kavu journeys and compose disclosed AI narration with timed captions.
 * Run normally to capture+render; use --render to reuse the verified capture after an encoder retry.
 * Add --reuse-video with --render to reuse the encoded scene clips too.
 * Audio is supplied separately. No credentials or service keys are logged or saved here.
 */
import { chromium, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const out = path.join(root, 'output/build/narrated/capture');
const audioDir = path.join(root, 'output/build/narrated/audio');
const baseURL = process.env.KAVU_NARRATED_URL || 'https://kavu-drying.web.app/';
const script = JSON.parse(
  await fs.readFile(path.join(root, 'docs/submission/narration-v2.json'), 'utf8'),
);
const targetDurations = [18, 34, 25, 24, 26, 22, 30, 25, 28, 33];
const run = (command, args, capture = false) =>
  new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(command, args, {
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });
    if (capture) child.stdout.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve(output) : reject(new Error(`${command} exited ${code}`)),
    );
  });
await fs.mkdir(out, { recursive: true });
const font = await fs.readFile(
  path.join(
    root,
    'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
  ),
);
function cardHTML(kind) {
  const architecture = kind === 'architecture';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><style>
  @font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font.toString('base64')})}*{box-sizing:border-box}body{margin:0;background:#213f31;color:#f7f4e8;font-family:Manrope,Arial,sans-serif;width:1600px;height:780px;overflow:hidden}.card{height:100%;padding:48px 68px;position:relative}.brand{font-size:40px;font-weight:800;letter-spacing:-2px}.brand span{color:#e0c979}.tag{font-size:13px;letter-spacing:2.5px;font-weight:750;color:#dace91;margin:26px 0 18px}h1{font-size:62px;line-height:1.1;letter-spacing:-2.6px;margin:0 0 18px}.lead{font-size:22px;line-height:1.6;color:#d4dfcf;margin:0 0 26px;max-width:1300px}.tiles{display:grid;grid-template-columns:repeat(${architecture ? 4 : 3},1fr);gap:18px}.tile{background:#2b4b38;border:1px solid #4f6d52;border-radius:10px;padding:22px;min-height:140px}.tile span{font-size:12px;color:#d8cc91;letter-spacing:1px}.tile strong{display:block;font-size:23px;line-height:1.4;margin:9px 0}.tile p{font-size:16px;line-height:1.5;color:#d4dfcf;margin:0}.pilot{display:flex;align-items:center;gap:22px;margin-top:29px;color:#d5e1cf;font-size:19px}.pilot strong{color:#eadb9a}.credit{position:absolute;left:68px;right:68px;bottom:35px;border-top:1px solid #52674e;padding-top:19px;display:flex;justify-content:space-between;gap:30px;color:#c8d6c3;font-size:13px;line-height:1.6}.credit strong{color:#ebe0b0}.ai{font-size:13px;max-width:550px;text-align:right}.footnote{font-size:14px;color:#bbcdb6;margin-top:20px}</style><body><div class="card"><div class="brand">kavu<span>.</span></div><div class="tag">${architecture ? 'IMPLEMENTED ARCHITECTURE · EXPLANATORY CARD' : 'PRODUCT PLAN · PRICING AND PILOT HYPOTHESES'}</div><h1>${architecture ? 'A working foundation.<br>A next step in the field.' : 'One supervisor.<br>Many farmers’ lots.'}</h1><p class="lead">${architecture ? 'Private accounts and durable workspaces. Shared, inspectable decision rules.' : 'Built for maize cooperatives and aggregation yards that coordinate drying work.'}</p><div class="tiles">${(architecture
    ? [
        ['INTERFACE', 'React + TypeScript', 'Responsive operations desk'],
        ['SERVER', 'API on Cloud Run', 'Account and command validation'],
        ['RECORDS', 'Cloud Firestore', 'Durable private workspaces'],
        ['DECISIONS', 'Shared rules', 'Conduit evidence + measured inputs'],
      ]
    : [
        [
          'THE PROSPECTIVE BUYER',
          'Cooperative or yard',
          'One site coordinating many farmers’ lots',
        ],
        ['PRICE TO TEST', 'KSh 2,500', 'Per active month, per site'],
        [
          'VALUE TO VERIFY',
          'Clearer daily work',
          'Handover time, moisture checks and actual costs',
        ],
      ]
  )
    .map(
      ([tag, title, text]) =>
        `<div class="tile"><span>${tag}</span><strong>${title}</strong><p>${text}</p></div>`,
    )
    .join(
      '',
    )}</div>${architecture ? '<p class="footnote">Next milestone: supervised field evidence. No measured food-loss or emissions reduction claimed.</p>' : '<div class="pilot"><strong>PROPOSED PILOT</strong><span>Observe → Shadow → Coordinate → Measure</span></div><p class="footnote">Pricing and pilot are hypotheses. No paying customers, signed pilot or revenue is claimed.</p>'}<div class="credit"><div>${architecture ? '<strong>Shivam Gupta</strong> · product direction and commercial priorities<br><strong>Codex</strong> · engineering and documentation assistance' : 'Conduit evidence → completed work → a new measurement'}</div><div class="ai">${architecture ? 'AI-generated narration. This is not Shivam Gupta’s voice.<br>Real team appearances are still needed for the official submission.' : 'A practical operating workflow, with a business model to test.'}</div></div></div></body></html>`;
}
for (const name of ['business', 'architecture'])
  await fs.writeFile(path.join(out, `${name}.html`), cardHTML(name));
if (!process.argv.includes('--render')) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 780 },
    recordVideo: { dir: out, size: { width: 1600, height: 780 } },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const recordingBegan = Date.now();
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [],
    badResponses = [],
    scenes = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400)
      badResponses.push({ status: response.status(), path: new URL(response.url()).pathname });
  });
  let sceneStarted;
  const at = async (seconds) => {
    const until = sceneStarted + seconds * 1000;
    while (Date.now() < until) await page.waitForTimeout(Math.min(1000, until - Date.now()));
  };
  const click = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await locator.click();
  };
  const snap = (name) => page.screenshot({ path: path.join(out, `${name}.png`) });
  const nav = async (name) => {
    await click(page.getByRole('button', { name, exact: true }));
    await page.waitForTimeout(180);
  };
  const close = async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };
  const mavuno = async () => {
    await nav('Batches');
    await click(page.getByRole('button', { name: 'Mavuno A-01', exact: true }));
    await expect(page.getByRole('dialog')).toContainText('1,800');
  };
  const saveReading = async (value, note) => {
    await page.getByLabel('New measured moisture (%)').pressSequentially(value, { delay: 100 });
    await page.getByLabel('Measurement note').pressSequentially(note, { delay: 14 });
    await click(page.getByRole('button', { name: 'Save measurement', exact: true }));
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };
  const scene = async (id, task) => {
    sceneStarted = Date.now();
    const rawStart = (sceneStarted - recordingBegan) / 1000;
    console.log(
      `NARRATED CAPTURE · scene ${id} · ${script.segments.find((s) => s.id === id).title}`,
    );
    await task();
    const desired = targetDurations[Number(id) - 1];
    const elapsed = (Date.now() - sceneStarted) / 1000;
    const duration = Math.max(desired, Math.ceil(elapsed + 0.5));
    await at(duration);
    scenes.push({
      id,
      rawStart,
      duration,
      audioOffset: 1,
      tempo: id === '02' ? 0.82 : 1,
      title: script.segments.find((s) => s.id === id).title,
      kind: ['09', '10'].includes(id) ? 'explanatory card' : 'actual hosted application',
    });
    await fs.writeFile(path.join(out, 'partial-scenes.json'), JSON.stringify(scenes, null, 2));
  };
  let accountVerified = false,
    ledgerVerified = false,
    readinessVerified = false;
  try {
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('button', { name: 'Create an account', exact: true }),
    ).toBeVisible();
    await scene('01', async () => {
      await at(2);
      await snap('01-hosted-welcome');
    });
    await scene('02', async () => {
      const email = `walkthrough-${Date.now().toString(36)}@example.test`;
      const password = randomBytes(24).toString('base64url');
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
      await at(1);
      await click(page.getByRole('button', { name: 'Create an account', exact: true }));
      await page.getByLabel('Your name').pressSequentially('Recording example', { delay: 18 });
      await page.getByLabel('Email address').pressSequentially(email, { delay: 12 });
      await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
        'type',
        'password',
      );
      await page.getByLabel('Password', { exact: true }).fill(password);
      await at(4);
      await click(page.getByRole('button', { name: 'Create workspace', exact: true }));
      await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
      const empty = await (await page.request.get(new URL('/api/workspace', baseURL).href)).json();
      if (empty.batches?.length !== 0)
        throw new Error('Recording account must start with an empty workspace.');
      await snap('02a-empty-cloud-workspace');
      await at(6);
      await click(page.getByRole('button', { name: 'Add your first batch', exact: true }).first());
      await page.getByLabel('Batch name').pressSequentially('Recording sample 01', { delay: 16 });
      await page
        .getByLabel('Grower or group')
        .pressSequentially('Recording example', { delay: 14 });
      await page.getByLabel('Weight (kg)').pressSequentially('500', { delay: 90 });
      await page
        .getByLabel('Measured moisture (%)', { exact: true })
        .pressSequentially('17.0', { delay: 70 });
      await page.getByLabel('Needed by (EAT)').fill(today);
      await at(10);
      await click(page.getByRole('dialog').getByRole('button', { name: 'Add batch', exact: true }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await nav('Batches');
      await expect(
        page.getByRole('button', { name: 'Recording sample 01', exact: true }),
      ).toBeVisible();
      await at(14);
      await click(page.getByRole('button', { name: 'Sign out', exact: true }));
      await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
      await page.getByLabel('Email address').pressSequentially(email, { delay: 12 });
      await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
        'type',
        'password',
      );
      await page.getByLabel('Password', { exact: true }).fill(password);
      await at(17);
      await click(page.getByRole('button', { name: 'Sign in', exact: true }));
      await expect(
        page.getByRole('button', { name: 'Recording sample 01', exact: true }),
      ).toBeVisible();
      const restored = await (
        await page.request.get(new URL('/api/workspace', baseURL).href)
      ).json();
      if (
        restored.batches?.length !== 1 ||
        restored.batches[0].name !== 'Recording sample 01' ||
        restored.batches[0].weightKg !== 500 ||
        restored.batches[0].moisturePct !== 17
      )
        throw new Error('Hosted account did not restore the same sample record.');
      accountVerified = true;
      await snap('02b-persisted-after-cloud-login');
      await at(21);
      await click(page.getByRole('button', { name: 'Recording sample 01', exact: true }));
      await snap('02c-private-sample-record');
      await at(25);
      await close();
      await click(page.getByRole('button', { name: 'Sign out', exact: true }));
      await expect(page.getByRole('button', { name: /Explore demo workspace/ })).toBeVisible();
      await at(28);
      await click(page.getByRole('button', { name: /Explore demo workspace/ }));
      await expect(page.getByRole('button', { name: 'Mavuno A-01', exact: true })).toBeVisible();
      await nav('Overview');
      await expect(page.locator('.stat').first()).toContainText('6');
    });
    await scene('03', async () => {
      await nav('Data & settings');
      await expect(page.getByText('18,364', { exact: true })).toBeVisible();
      await snap('03a-conduit-counts');
      await at(7);
      await page
        .getByRole('heading', { name: 'Primary rain gauge', exact: true })
        .scrollIntoViewIfNeeded();
      await at(13);
      await page
        .getByRole('heading', { name: 'Original files & provenance', exact: true })
        .scrollIntoViewIfNeeded();
      await snap('03b-original-files');
      await at(19);
      await nav('Overview');
      await page.locator('.context-bar').scrollIntoViewIfNeeded();
    });
    await scene('04', async () => {
      await at(1);
      await page.getByLabel('Replay date').selectOption('2026-09-08');
      await expect(page.getByText('Data unavailable', { exact: true })).toBeVisible();
      await snap('04a-missing');
      await at(9);
      await page.getByLabel('Replay date').selectOption('2026-09-15');
      await expect(page.locator('.stat').first()).toContainText('0');
      await snap('04b-humid');
      await at(16);
      await page.getByLabel('Replay date').selectOption('2026-09-12');
      await expect(page.locator('.stat').first()).toContainText('6');
      await snap('04c-six-hours');
    });
    await scene('05', async () => {
      await mavuno();
      await expect(page.getByRole('dialog')).toContainText('18.2%');
      await snap('05a-mavuno1800');
      await at(7);
      await close();
      await nav('Overview');
      await at(9);
      await click(page.getByRole('button', { name: 'Build operator plan', exact: true }));
      await expect(page.getByRole('dialog')).toContainText('2,700');
      await snap('05b-capacity-plan');
      await at(18);
      await click(page.getByRole('button', { name: 'Create operator jobs', exact: true }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(
        page.getByRole('heading', { name: 'A plan your team can act on.' }),
      ).toBeVisible();
    });
    await scene('06', async () => {
      await at(1);
      const spread = page
        .locator('.task-row')
        .filter({ hasText: 'Mavuno A-01' })
        .filter({ hasText: 'Spread at 11:00 EAT' })
        .first();
      await click(spread.getByRole('button', { name: 'Complete', exact: true }));
      await at(5);
      const turn = page
        .locator('.task-row')
        .filter({ hasText: 'Mavuno A-01' })
        .filter({ hasText: 'Turn grain and inspect conditions' })
        .first();
      await click(turn.getByRole('button', { name: 'Complete', exact: true }));
      await at(8);
      await page.getByLabel('Show completed').check();
      await page
        .locator('.task-row.complete')
        .filter({ hasText: 'Mavuno A-01' })
        .first()
        .scrollIntoViewIfNeeded();
      await snap('06-completed-work');
      await at(11);
      await click(page.getByRole('button', { name: 'Copy brief', exact: true }));
      await at(15);
      await mavuno();
      await click(page.getByRole('button', { name: 'Log reading', exact: true }).last());
    });
    await scene('07', async () => {
      await at(1);
      await saveReading('15.0', 'Demonstration reading for video; illustrative meter input.');
      await at(6);
      await nav('Impact ledger');
      await expect(page.locator('.stat').nth(2)).toContainText('2,176');
      ledgerVerified = true;
      await snap('07-ledger2176');
      await at(20);
      await page.locator('.method-card').scrollIntoViewIfNeeded();
    });
    await scene('08', async () => {
      await at(1);
      await mavuno();
      await click(page.getByRole('button', { name: 'Log reading', exact: true }).last());
      await saveReading(
        '12.7',
        'Separate example reading for video; representative sampling still required.',
      );
      await at(8);
      await click(page.getByRole('button', { name: 'Mavuno A-01', exact: true }));
      await click(page.getByRole('button', { name: 'Confirm storage readiness', exact: true }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('tr').filter({ hasText: 'Mavuno A-01' })).toContainText('ready');
      readinessVerified = true;
      await snap('08a-ready-record');
      await at(12);
      await click(page.getByRole('button', { name: 'Mavuno A-01', exact: true }));
      await snap('08b-measurement-history');
      await at(22);
      await close();
    });
    await scene('09', async () => {
      await page.goto(pathToFileURL(path.join(out, 'business.html')).href);
      await page.evaluate(() => document.fonts.ready);
      await snap('09-pricing-pilot-hypotheses');
    });
    await scene('10', async () => {
      await page.goto(pathToFileURL(path.join(out, 'architecture.html')).href);
      await page.evaluate(() => document.fonts.ready);
      await snap('10a-verified-architecture');
      await at(23);
      await page.goto(new URL('/#overview', baseURL).href, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
      await snap('10b-actual-product-closing');
    });
    if (errors.length || badResponses.length)
      throw new Error(`Capture errors: ${JSON.stringify({ errors, badResponses })}`);
    const raw = await page.video().path();
    const manifest = {
      baseURL,
      capturedAt: new Date().toISOString(),
      raw,
      viewport: { width: 1600, height: 780 },
      outputResolution: '1920x1080 with a reserved 144-pixel caption band',
      scenes,
      accountVerified,
      ledgerVerified,
      readinessVerified,
      browserErrors: errors,
      apiErrors: badResponses,
      identity: 'Generated example.test identity; random masked password retained only in memory.',
      voice: 'Stock AI narrator, not Shivam Gupta; disclosed on screen.',
    };
    await fs.writeFile(path.join(out, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
    await page.request.post(new URL('/api/auth/logout', baseURL).href, {
      headers: { 'X-Kavu-Request': '1', Origin: new URL(baseURL).origin },
      data: {},
    });
  } finally {
    await context.close();
    await browser.close();
  }
  console.log('HOSTED CAPTURE VERIFIED');
}
const manifest = JSON.parse(await fs.readFile(path.join(out, 'capture-manifest.json'), 'utf8'));
let globalStart = 0;
for (const scene of manifest.scenes) {
  scene.globalStart = globalStart;
  globalStart += scene.duration;
  scene.pauses =
    scene.id === '02'
      ? [
          { at: 4.9, seconds: 6 },
          { at: 13.5, seconds: 3 },
        ]
      : scene.id === '04'
        ? [
            { at: 4.2, seconds: 2.8 },
            { at: 9.7, seconds: 1 },
          ]
        : [];
}
if (globalStart < 225 || globalStart > 280)
  throw new Error(
    `Unexpected final duration ${globalStart}s. Review scene timing before publication.`,
  );
manifest.duration = globalStart;
await fs.writeFile(path.join(out, 'composition-manifest.json'), JSON.stringify(manifest, null, 2));
for (const scene of manifest.scenes) {
  const frameCount = Math.round(scene.duration * 24);
  if (!process.argv.includes('--reuse-video'))
    await run('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(scene.rawStart),
      '-i',
      manifest.raw,
      '-t',
      String(scene.duration),
      '-vf',
      `fps=24,scale=1920:936,pad=1920:1080:0:0:color=0x213f31,tpad=stop_mode=clone:stop_duration=1`,
      '-frames:v',
      String(frameCount),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-an',
      path.join(out, `scene-${scene.id}.mp4`),
    ]);
  const audioArgs = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    path.join(audioDir, `${scene.id}.wav`),
  ];
  if (scene.pauses.length) {
    const boundaries = [0, ...scene.pauses.map((pause) => pause.at / scene.tempo)];
    const pieces = [
      `[0:a]aresample=48000,atempo=${scene.tempo},asplit=${boundaries.length}${boundaries.map((_, i) => `[a${i}]`).join('')}`,
    ];
    const order = [];
    for (let i = 0; i < boundaries.length; i++) {
      pieces.push(
        `[a${i}]atrim=start=${boundaries[i]}${i + 1 < boundaries.length ? `:end=${boundaries[i + 1]}` : ''},asetpts=PTS-STARTPTS[p${i}]`,
      );
      order.push(`[p${i}]`);
      if (scene.pauses[i]) {
        pieces.push(`anullsrc=r=48000:cl=mono:d=${scene.pauses[i].seconds}[s${i}]`);
        order.push(`[s${i}]`);
      }
    }
    pieces.push(
      `${order.join('')}concat=n=${order.length}:v=0:a=1,adelay=1000:all=1,apad=whole_dur=${scene.duration}[voice]`,
    );
    audioArgs.push('-filter_complex', pieces.join(';'), '-map', '[voice]');
  } else
    audioArgs.push(
      '-af',
      `atempo=${scene.tempo},adelay=1000:all=1,apad=whole_dur=${scene.duration}`,
    );
  await run('ffmpeg', [
    ...audioArgs,
    '-t',
    String(scene.duration),
    '-ar',
    '48000',
    '-ac',
    '1',
    path.join(out, `voice-${scene.id}.wav`),
  ]);
}
const quote = (p) => `'${p.replaceAll("'", "'\\''")}'`;
await fs.writeFile(
  path.join(out, 'scenes.ffconcat'),
  manifest.scenes.map((s) => `file ${quote(path.join(out, `scene-${s.id}.mp4`))}`).join('\n'),
);
await fs.writeFile(
  path.join(out, 'voices.ffconcat'),
  manifest.scenes.map((s) => `file ${quote(path.join(out, `voice-${s.id}.wav`))}`).join('\n'),
);
await run('ffmpeg', [
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  path.join(out, 'scenes.ffconcat'),
  '-c',
  'copy',
  path.join(out, 'actual-ui.mp4'),
]);
await run('ffmpeg', [
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  path.join(out, 'voices.ffconcat'),
  '-c:a',
  'pcm_s16le',
  path.join(out, 'narration.wav'),
]);
const captionPython = String.raw`
import json, re, difflib, textwrap, os, math
from PIL import Image, ImageDraw, ImageFont
root=os.getcwd();out=os.path.join(root,'output/build/narrated/capture')
manifest=json.load(open(os.path.join(out,'composition-manifest.json')))
script=json.load(open(os.path.join(root,'docs/submission/narration-v2.json')))
font_paths=[os.environ.get('KAVU_CAPTION_FONT',''),'/System/Library/Fonts/Supplemental/Arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
font_path=next((path for path in font_paths if path and os.path.isfile(path)),None)
if not font_path:raise RuntimeError('Set KAVU_CAPTION_FONT to an installed readable TrueType font.')
font=ImageFont.truetype(font_path,34)
small=ImageFont.truetype(font_path,18)
normalize=lambda value:re.sub(r'[^a-z0-9]','',value.lower())
cues=[]
for scene in manifest['scenes']:
 text=next(s['text'] for s in script['segments'] if s['id']==scene['id']).replace('\u2014',':')
 canonical=text.split(); words=json.load(open(os.path.join(root,'output/build/narrated/audio',scene['id']+'-words.json')))['words']
 matched=[None]*len(canonical)
 for tag,a,b,c,d in difflib.SequenceMatcher(None,[normalize(w) for w in canonical],[normalize(w['word']) for w in words],autojunk=False).get_opcodes():
  if tag=='equal':
   for i,j in zip(range(a,b),range(c,d)):matched[i]=(words[j]['start'],words[j]['end'])
  elif tag in ('replace','delete'):
   start=words[c]['start'] if c<len(words) else words[-1]['end'];end=words[d-1]['end'] if d>c else start+0.10
   step=max(.04,(end-start)/max(1,b-a))
   for k,i in enumerate(range(a,b)):matched[i]=(start+k*step,start+(k+1)*step)
 shift=lambda t:t/scene['tempo']+sum(p['seconds'] for p in scene.get('pauses',[]) if t>=p['at'])
 scaled=[(scene['globalStart']+scene['audioOffset']+shift(start),scene['globalStart']+scene['audioOffset']+shift(end)) for start,end in matched]
 a=0
 while a<len(canonical):
  b=a+1
  while b<len(canonical):
   line=' '.join(canonical[a:b+1]);duration=scaled[b][1]-scaled[a][0];pause=scaled[b][0]-scaled[b-1][1]
   if len(line)>85 or duration>4.6 or (b-a>=4 and (pause>.45 or canonical[b-1].endswith(('.', '?', '!')))):break
   b+=1
  start=scaled[a][0];next_start=scaled[b][0] if b<len(canonical) else scene['globalStart']+scene['duration']-.4
  end=min(max(scaled[b-1][1]+.16,start+.8),next_start,scene['globalStart']+scene['duration']-.15)
  if end<=start:end=start+.15
  cues.append({'start':start,'end':end,'text':' '.join(canonical[a:b]),'scene':scene['id']})
  a=b
script_words=' '.join(segment['text'] for segment in script['segments']).split()
caption_words=' '.join(cue['text'] for cue in cues).split()
errors=[]
for i,cue in enumerate(cues):
 if cue['start']<0 or cue['end']<=cue['start'] or cue['end']>manifest['duration']:errors.append(f'Invalid range at cue {i+1}')
 if i and cue['start']<cues[i-1]['end']-.001:errors.append(f'Overlap at cue {i+1}')
if caption_words!=script_words:errors.append('Captions do not preserve every spoken script word.')
if any('\u2014' in cue['text'] for cue in cues):errors.append('Unexpected em dash in captions.')
verification={'cues':len(cues),'scriptWords':len(script_words),'durationSeconds':manifest['duration'],'exactScriptCoverage':caption_words==script_words,'overlapOrRangeErrors':errors,'scene02Tempo':.82,'scene02PauseSeconds':[6,3],'scene04PauseSeconds':[2.8,1]}
json.dump(verification,open(os.path.join(out,'caption-verification.json'),'w'),indent=2)
if errors:raise RuntimeError('; '.join(errors))
json.dump(cues,open(os.path.join(out,'caption-cues.json'),'w'),indent=2)
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
with open(os.path.join(root,'output/kavu-demo-narrated.srt'),'w') as f:
 for i,cue in enumerate(cues):f.write(f"{i+1}\n{stamp(cue['start'])} --> {stamp(cue['end'])}\n"+'\n'.join(textwrap.wrap(cue['text'],width=65,break_long_words=False))+'\n\n')
def png(text,scene,index):
 image=Image.new('RGB',(1920,144),'#213f31');draw=ImageDraw.Draw(image)
 lines=textwrap.wrap(text,width=85,break_long_words=False);y=19 if len(lines)>1 else 37
 for line in lines:
  draw.text((960,y),line,font=font,fill='#faf7e9',anchor='mt');y+=41
 label=f"KAVU  |  {scene['id']} / 10  |  "+('PRODUCT PLAN: HYPOTHESES' if scene['id']=='09' else 'ARCHITECTURE + ACTUAL PRODUCT' if scene['id']=='10' else 'ACTUAL HOSTED APPLICATION')+'  |  AI-GENERATED NARRATION'
 if scene['id'] in ('01','10'):label+='  |  kavu-drying.web.app'
 draw.text((960,116),label,font=small,fill='#c7d9bb',anchor='mt')
 name=os.path.join(out,f'caption-{index:04}.png');image.save(name);return name
intervals=[];index=0
for scene in manifest['scenes']:
 pos=scene['globalStart'];end=pos+scene['duration']; relevant=[c for c in cues if c['scene']==scene['id']]
 for cue in relevant:
  if cue['start']>pos:
   intervals.append((png('',scene,index),cue['start']-pos));index+=1
  intervals.append((png(cue['text'],scene,index),cue['end']-cue['start']));index+=1;pos=cue['end']
 if pos<end:intervals.append((png('',scene,index),end-pos));index+=1
with open(os.path.join(out,'captions.ffconcat'),'w') as f:
 for name,duration in intervals:
  escaped=name.replace("'","'\\''");f.write(f"file '{escaped}'\nduration {duration:.6f}\n")
 f.write("file '"+intervals[-1][0].replace("'","'\\''")+"'\n")
print(f'Prepared {len(cues)} synchronized caption cues over {manifest["duration"]} seconds.')
`;
await fs.writeFile(path.join(out, 'render-captions.py'), captionPython);
await run('python3', [path.join(out, 'render-captions.py')]);
await run('ffmpeg', [
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  path.join(out, 'captions.ffconcat'),
  '-t',
  String(globalStart),
  '-r',
  '24',
  '-c:v',
  'qtrle',
  path.join(out, 'captions.mov'),
]);
const final = path.join(root, 'output/kavu-demo-narrated.mp4');
await run('ffmpeg', [
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-i',
  path.join(out, 'actual-ui.mp4'),
  '-i',
  path.join(out, 'captions.mov'),
  '-i',
  path.join(out, 'narration.wav'),
  '-filter_complex',
  '[0:v][1:v]overlay=0:936[v]',
  '-map',
  '[v]',
  '-map',
  '2:a',
  '-t',
  String(globalStart),
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '24',
  '-pix_fmt',
  'yuv420p',
  '-af',
  'loudnorm=I=-16:TP=-1.5:LRA=9',
  '-ar',
  '48000',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  '-movflags',
  '+faststart',
  final,
]);
const probe = JSON.parse(
  await run(
    'ffprobe',
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', final],
    true,
  ),
);
const video = probe.streams.find((s) => s.codec_type === 'video'),
  audio = probe.streams.find((s) => s.codec_type === 'audio');
if (
  !video ||
  video.width !== 1920 ||
  video.height !== 1080 ||
  video.codec_name !== 'h264' ||
  !audio ||
  Math.abs(Number(probe.format.duration) - globalStart) > 0.15 ||
  Number(probe.format.size) > 50_000_000
)
  throw new Error('Narrated output metadata failed verification.');
await fs.writeFile(path.join(out, 'video-verification.json'), JSON.stringify(probe, null, 2));
console.log(`NARRATED VIDEO READY: ${final} (${globalStart}s, ${probe.format.size} bytes)`);
