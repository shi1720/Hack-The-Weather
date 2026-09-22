import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function demo(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore demo workspace/ }).click();
  await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
}

test('real Conduit replay changes decisions and supports the complete operator workflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await demo(page);
  await expect(page.locator('.stat').first()).toContainText('6');
  await expect(page.locator('.bottom-note')).toContainText('18,364');
  await page.getByLabel('Replay date').selectOption('2026-09-15');
  await expect(page.locator('.stat').first()).toContainText('0');
  await expect(page.locator('.stat').nth(3)).not.toContainText('KSh0');
  await page.getByLabel('Replay date').selectOption('2026-09-07');
  await expect(page.getByText('Data unavailable', { exact: true })).toBeVisible();
  await page.getByLabel('Replay date').selectOption('2026-09-12');
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Historical replay');
  await page.getByRole('button', { name: 'Create operator jobs' }).click();
  await expect(page.getByRole('heading', { name: 'A plan your team can act on.' })).toBeVisible();
  const spread = page.locator('.task-row').filter({ hasText: 'Spread at 11:00 EAT' }).first();
  await spread.getByRole('button', { name: 'Complete', exact: true }).click();
  await expect(page.locator('.yard-bay.drying').first()).toContainText('Mavuno A-01');
  await page.getByRole('button', { name: 'Batches', exact: true }).click();
  await page.getByRole('button', { name: 'Mavuno A-01', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm storage readiness' }).click();
  await expect(page.getByRole('status')).toContainText('reading');
  await page.getByRole('button', { name: 'Log reading', exact: true }).last().click();
  await page.getByLabel('New measured moisture (%)').fill('12.7');
  await page
    .getByLabel('Measurement note')
    .fill('Demo only: meter 02; three representative samples.');
  await page.getByRole('button', { name: 'Save measurement' }).click();
  await page.getByRole('button', { name: 'Mavuno A-01', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm storage readiness' }).click();
  await expect(page.locator('tr').filter({ hasText: 'Mavuno A-01' })).toContainText('ready');
  await page.getByRole('button', { name: 'Impact ledger' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence, one batch at a time.' })).toBeVisible();
  await expect(page.locator('.stat').nth(2)).toContainText('Tariff-equivalent reduction');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence' }).click();
  expect((await download).suggestedFilename()).toBe('kavu-impact-ledger.csv');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Evidence, one batch at a time.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('registration, batch intake, logout and login persist private records', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  const email = `test-${Date.now()}@example.test`,
    password = 'A meaningful test password 123!';
  await page.getByLabel('Your name').fill('Test operator');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
  await expect(
    page.getByText('Your workspace is ready. Add a batch to build its first plan.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Batches', exact: true }).click();
  await page.getByRole('button', { name: 'Add batch', exact: true }).click();
  await page.getByLabel('Batch name').fill('Test maize E-05');
  await page.getByLabel('Grower or group').fill('Test cooperative');
  await page.getByLabel('Weight (kg)').fill('2200');
  await page.getByLabel('Measured moisture (%)', { exact: true }).fill('17.1');
  await page.getByLabel('Needed by (EAT)').fill('2026-09-26');
  await page.getByRole('dialog').getByRole('button', { name: 'Add batch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Test maize E-05' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('bad-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Test maize E-05' })).toBeVisible();
  await page.getByRole('button', { name: 'Account settings' }).click();
  await page.getByLabel('Current password', {exact:true}).fill(password);
  await page.getByLabel('New password', {exact:true}).fill('Changed test password 456!');
  await page.getByLabel('Confirm new password', {exact:true}).fill('Changed test password 456!');
  await page.getByRole('button', {name:'Change password',exact:true}).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', {exact:true}).fill('Changed test password 456!');
  await page.getByRole('button', {name:'Sign in',exact:true}).click();
  await expect(page.getByRole('button', {name:'Test maize E-05'})).toBeVisible();
});

test('mobile navigation, data evidence and constrained planning remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Data & settings' }).click();
  await expect(page.getByRole('heading', { name: 'Trust starts at the source.' })).toBeVisible();
  await expect(page.getByText('18,364', { exact: true })).toBeVisible();
  await page.getByLabel('Outdoor capacity (kg)').fill('0');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status')).toContainText('saved');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.locator('.stat').nth(2)).toContainText('0/ 0 t');
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('welcome and overview have no serious automated accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const welcome = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    welcome.violations
      .filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.getByRole('button', { name: /Explore demo workspace/ }).click();
  await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
  const app = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(
    app.violations
      .filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});

test('handover includes only the selected plan and missing rainfall stays unknown', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await demo(page);
  await page.getByLabel('Replay date').selectOption('2026-09-08');
  await expect(page.getByText('Rain data unavailable', { exact: true })).toBeVisible();
  await page.getByLabel('Replay date').selectOption('2026-09-12');
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await page.getByRole('button', { name: 'Create operator jobs' }).click();
  await page.getByLabel('Replay date').selectOption('2026-09-15');
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await page.getByRole('button', { name: 'Create operator jobs' }).click();
  await page.getByRole('button', { name: 'Copy brief' }).click();
  const humidBrief = await page.evaluate(() => navigator.clipboard.readText());
  expect(humidBrief).toContain('15 Sept');
  expect(humidBrief).not.toContain('Spread at');
  await page.getByLabel('Replay date').selectOption('2026-09-12');
  await page.getByRole('button', { name: 'Copy brief' }).click();
  const dryBrief = await page.evaluate(() => navigator.clipboard.readText());
  expect(dryBrief).toContain('12 Sept');
  expect(dryBrief).toContain('Spread at 11:00');
  expect(dryBrief).not.toContain('mechanical');
  expect(dryBrief).toContain('HISTORICAL REPLAY');
});
