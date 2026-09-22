/** Supplementary proof of the real server account flow; no credentials are logged or persisted here. */
import { chromium, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root = process.cwd();
const out = path.join(root, 'output/build/video/accounts');
const baseURL = process.env.KAVU_ACCOUNT_RECORD_URL || 'http://127.0.0.1:5173';
await fs.mkdir(out, { recursive: true });
const email = `sample-${Date.now()}@example.test`;
const password = randomBytes(24).toString('base64url');
const deadline = new Date(Date.now() + 3 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let started;
async function at(seconds, label) { if (label) console.log(`ACCOUNT CUE ${seconds}s · ${label}`); const until = started + seconds * 1000; while (Date.now() < until) await page.waitForTimeout(Math.min(1000, until - Date.now())); }
async function click(locator) { await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox(); if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 }); await locator.click(); }
try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Create an account', exact: true })).toBeVisible();
  started = Date.now(); console.log('ACCOUNT CAPTURE STARTED');
  await at(2, 'Create a real server account with sample identity');
  await click(page.getByRole('button', { name: 'Create an account', exact: true }));
  await at(4); await page.getByLabel('Your name').pressSequentially('Sample operator', { delay: 75 });
  await at(6); await page.getByLabel('Email address').pressSequentially(email, { delay: 25 });
  await at(8); await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password'); await page.getByLabel('Password', { exact: true }).fill(password);
  await at(10); await click(page.getByRole('button', { name: 'Create workspace', exact: true }));
  await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
  await expect(page.getByText('Your workspace is ready. Add a batch to build its first plan.')).toBeVisible();
  const initial = await (await page.request.get(`${baseURL}/api/workspace`)).json();
  if (initial.batches.length !== 0) throw new Error('New account did not have an empty workspace.');
  await page.screenshot({ path: path.join(out, '01-empty-private-workspace.png') });
  await at(19, 'Create one small sample batch'); await click(page.getByRole('button', { name: 'Batches', exact: true }));
  await at(22); await click(page.getByRole('button', { name: 'Add batch', exact: true }));
  await at(23); await page.getByLabel('Batch name').pressSequentially('Server proof lot', { delay: 50 }); await page.getByLabel('Grower or group').pressSequentially('Sample cooperative', { delay: 50 });
  await at(27); await page.getByLabel('Weight (kg)').pressSequentially('250', { delay: 150 });
  await at(28); await page.getByLabel('Measured moisture (%)', { exact: true }).pressSequentially('17.5', { delay: 130 });
  await at(29); await page.getByLabel('Needed by (EAT)').fill(deadline);
  await at(30); await click(page.getByRole('dialog').getByRole('button', { name: 'Add batch', exact: true }));
  await expect(page.getByRole('button', { name: 'Server proof lot', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(out, '02-saved-batch.png') });
  await at(37, 'Sign out, then sign back in'); await click(page.getByRole('button', { name: 'Sign out', exact: true }));
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await at(39); await page.getByLabel('Email address').pressSequentially(email, { delay: 25 });
  await at(42); await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password'); await page.getByLabel('Password', { exact: true }).fill(password);
  await at(45); await click(page.getByRole('button', { name: 'Sign in', exact: true }));
  await expect(page.getByRole('button', { name: 'Server proof lot', exact: true })).toBeVisible();
  const restored = await (await page.request.get(`${baseURL}/api/workspace`)).json();
  if (restored.batches.length !== 1 || restored.batches[0].name !== 'Server proof lot' || restored.batches[0].weightKg !== 250 || restored.batches[0].moisturePct !== 17.5) throw new Error('Server persistence assertion failed.');
  await at(50, 'Inspect the persisted batch after login'); await click(page.getByRole('button', { name: 'Server proof lot', exact: true }));
  await expect(page.getByRole('dialog')).toContainText('250 kg'); await expect(page.getByRole('dialog')).toContainText('17.5%');
  await page.screenshot({ path: path.join(out, '03-persisted-after-login.png') });
  await at(60, 'Supplementary capture complete');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify({ capturedAt: new Date().toISOString(), mode: 'Local server, real account API and SQLite workspace', identity: 'Generated example.test account; sample operator and sample batch only', password: 'Random, masked; not logged or saved by this script', initialBatches: 0, persistedAfterSignOutAndSignIn: { name: 'Server proof lot', weightKg: 250, moisturePct: 17.5 }, browserErrors: errors }, null, 2));
  // Revoke the recorder's session without changing the final visible page.
  await page.request.post(`${baseURL}/api/auth/logout`, { headers: { 'X-Kavu-Request': '1' }, data: {} });
} finally { await context.close(); await browser.close(); }
const raw = await page.video().path();
const label = 'LOCAL SERVER DEMONSTRATION  |  sample .test account  |  separate from the public browser demo';
// Render only the disclosure strip as HTML, keeping the recording itself actual UI.
// This avoids depending on optional libfreetype/drawtext support in ffmpeg.
const labelBrowser = await chromium.launch();
const labelPage = await labelBrowser.newPage({ viewport: { width: 1440, height: 48 } });
await labelPage.setContent(`<html><body style="margin:0;width:1440px;height:48px;background:#213f31;color:#f4efcf;display:flex;align-items:center;justify-content:center;font:19px Arial,sans-serif">${label}</body></html>`);
const labelImage = path.join(out, 'local-server-disclosure.png');
await labelPage.screenshot({ path: labelImage });
await labelBrowser.close();
const filter = '[0:v]fps=24[ui];[ui][1:v]overlay=0:852:format=auto';
await new Promise((resolve, reject) => { const child = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-i', raw, '-i', labelImage, '-t', '60', '-filter_complex', filter, '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(root, 'output/kavu-accounts-silent.mp4')], { stdio: 'inherit' }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))); });
const probe = await new Promise((resolve, reject) => { let output = ''; const child = spawn('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(root, 'output/kavu-accounts-silent.mp4')]); child.stdout.on('data', chunk => output += chunk); child.on('error', reject); child.on('exit', code => code === 0 ? resolve(JSON.parse(output)) : reject(new Error('ffprobe failed'))); });
if (Math.abs(Number(probe.format.duration) - 60) > 0.1 || Number(probe.format.size) >= 5_000_000 || probe.streams.some(stream => stream.codec_type === 'audio')) throw new Error('Supplementary clip metadata validation failed.');
await fs.writeFile(path.join(out, 'video-verification.json'), JSON.stringify(probe, null, 2));
console.log('ACCOUNTS VIDEO READY: output/kavu-accounts-silent.mp4');
