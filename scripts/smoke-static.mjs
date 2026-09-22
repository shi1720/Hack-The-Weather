import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Run against a built static demo, locally or at the public judge URL.
const url = process.env.KAVU_SMOKE_URL || 'http://127.0.0.1:4173/Hack-The-Weather/';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const apiRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.goto(url);
  await page.getByRole('button', { name: /Explore demo workspace/ }).click();
  await page.getByRole('heading', { name: 'Make every dry hour count.' }).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15000 });
  assert.match(await page.locator('.stat').first().innerText(), /6/);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Make every dry hour count.' }).waitFor();
  await page.getByLabel('Replay date').selectOption('2026-09-08');
  await page.getByText('Data unavailable', { exact: true }).waitFor();
  await page.getByLabel('Replay date').selectOption('2026-09-12');
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await page.getByRole('button', { name: 'Create operator jobs' }).click();
  const spread = page.locator('.task-row').filter({ hasText: 'Spread at 11:00 EAT' }).first();
  await spread.getByRole('button', { name: 'Complete', exact: true }).click();
  assert.match(await page.locator('.yard-bay.drying').first().innerText(), /Mavuno A-01/);
  await page.reload();
  await page.getByRole('heading', { name: 'A plan your team can act on.' }).waitFor();
  assert.match(await page.locator('.yard-bay.drying').first().innerText(), /Mavuno A-01/);
  assert.deepEqual(apiRequests, []);
  assert.deepEqual(errors, []);
  console.log('Static demo passed: real data, offline reload, missing-data policy, plan execution and persisted state; zero API calls or page errors.');
} finally {
  await browser.close();
}
