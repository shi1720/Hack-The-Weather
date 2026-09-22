import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

async function enterDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore demo workspace/ }).click();
  await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
}

async function navigate(page: Page, name: string) {
  const opener = page.getByRole('button', { name: 'Open navigation' });
  if (await opener.isVisible()) await opener.click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('all five app pages fit phone, tablet and desktop and pass serious accessibility checks', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enterDemo(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of ['Overview', 'Batches', 'Drying yard', 'Impact ledger', 'Data & settings']) {
      await navigate(page, name);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${name} at ${width}px`,
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        audit.violations
          .filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        `${name} at ${width}px`,
      ).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

test('phone navigation and dialogs keep keyboard focus inside, restore it and expose hourly evidence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page);
  await expect(page.locator('.sidebar')).toHaveAttribute('inert', '');
  const opener = page.getByRole('button', { name: 'Open navigation' });
  await opener.click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(page.locator('.sidebar')).toHaveAttribute('inert', '');
  await page
    .getByRole('button', { name: '11:00 EAT: Drying window. View weather evidence' })
    .click();
  await expect(page.locator('.hour-evidence')).toContainText('humidity');
  await expect(page.locator('.hour-evidence')).toContainText('0 mm rain');
  await navigate(page, 'Batches');
  const add = page.getByRole('button', { name: 'Add batch', exact: true });
  await add.click();
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Add batch' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
});

test('demo guide compares real weather and reset restores sample records only after confirmation', async ({
  page,
}) => {
  await enterDemo(page);
  await page.getByText('Explore the complete workflow', { exact: true }).click();
  await page.getByRole('button', { name: 'Missing data', exact: true }).click();
  await expect(page.getByText('Data unavailable', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Humid day', exact: true }).click();
  await expect(page.locator('.stat').first()).toContainText('0');
  await page.getByRole('button', { name: 'Dry day', exact: true }).click();
  await expect(page.locator('.stat').first()).toContainText('6');
  await navigate(page, 'Batches');
  await page.getByRole('button', { name: 'Mavuno A-01', exact: true }).click();
  await page.getByRole('button', { name: 'Log reading', exact: true }).last().click();
  await page.getByLabel('New measured moisture (%)').fill('15');
  await page.getByLabel('Measurement note').fill('Illustrative audit reading only.');
  await page.getByRole('button', { name: 'Save measurement' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Keep my changes' }).click();
  await expect(page.locator('tr').filter({ hasText: 'Mavuno A-01' })).toContainText('15%');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Reset sample records' }).click();
  await expect(page.locator('tr').filter({ hasText: 'Mavuno A-01' })).toContainText('18.2%');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('filtered CSV is usable and safely quotes spreadsheet formulas and embedded punctuation', async ({
  page,
}) => {
  await enterDemo(page);
  await navigate(page, 'Batches');
  await page.getByRole('button', { name: 'Add batch', exact: true }).click();
  await page.getByLabel('Batch name').fill('=SUM(1,2)');
  await page.getByLabel('Grower or group').fill('Sample "collective", east');
  await page.getByLabel('Weight (kg)').fill('250');
  await page.getByLabel('Measured moisture (%)', { exact: true }).fill('17.5');
  await page.getByRole('dialog').getByRole('button', { name: 'Add batch', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Search batches').fill('=SUM');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('kavu-batches.csv');
  const text = await fs.readFile((await download.path())!, 'utf8');
  expect(text).toContain('"\'=SUM(1,2)"');
  expect(text).toContain('"Sample ""collective"", east"');
  expect(text).not.toContain('Mavuno');
  await page.getByLabel('Search batches').fill('No such batch');
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('button', { name: 'Mavuno A-01', exact: true })).toBeVisible();
});

test('revision conflicts preserve form entries and expired sessions return to an explained sign-in', async ({
  page,
}) => {
  await enterDemo(page);
  await navigate(page, 'Data & settings');
  const yardName = page.getByLabel('Cooperative / yard name');
  await yardName.fill('Unsaved operator draft');
  await page.route(
    '**/api/commands',
    (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'REVISION_CONFLICT', error: 'Workspace changed.' }),
      }),
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('alert')).toContainText('Latest records loaded');
  await expect(yardName).toHaveValue('Unsaved operator draft');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('.toast')).toContainText('saved');
  await expect(page.locator('.workspace-switch')).toContainText('Unsaved operator draft');
  await page.route(
    '**/api/commands',
    (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHENTICATED', error: 'Session expired.' }),
      }),
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Your session has ended');
});

test('real intake defaults to today and replay cannot be mistaken for current outdoor work', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('UI audit operator');
  await page.getByLabel('Email address').fill(`ui-audit-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('A long sample password for UI testing!');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.getByRole('region', { name: 'Set up your workspace' })).toBeVisible();
  await expect(page.getByText('Reviewing past weather.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Add your first batch', exact: true }).first().click();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  await expect(page.getByLabel('Needed by (EAT)')).toHaveValue(today);
  await expect(page.getByLabel('Needed by (EAT)')).toHaveAttribute('min', today);
  await page.getByLabel('Batch name').fill('Fresh intake');
  await page.getByLabel('Grower or group').fill('Sample group');
  await page.getByLabel('Weight (kg)').fill('250');
  await page.getByLabel('Measured moisture (%)', { exact: true }).fill('16');
  await page.getByRole('dialog').getByRole('button', { name: 'Add batch', exact: true }).click();
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Outdoor work is disabled');
  await page.getByRole('button', { name: 'Create operator jobs' }).click();
  await expect(page.getByRole('button', { name: 'Replay only' })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Replay only' }).first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset demo' })).toHaveCount(0);
});

test('forecast failures preserve replay and a refresh does not overwrite the selected replay day', async ({
  page,
}) => {
  await enterDemo(page);
  await page.getByLabel('Replay date').selectOption('2026-09-15');
  await page.route(
    '**/api/forecast?**',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAVAILABLE',
          error: 'Weather provider temporarily unavailable.',
        }),
      }),
    { times: 1 },
  );
  await page.getByLabel('Weather mode').selectOption('forecast');
  await expect(page.locator('.toast')).toContainText('Weather provider temporarily unavailable');
  await expect(page.getByLabel('Weather mode')).toHaveValue('replay');
  await expect(page.getByLabel('Replay date')).toHaveValue('2026-09-15');
  let calls = 0;
  await page.route('**/api/forecast?**', (route) => {
    calls++;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        fetchedAt: new Date().toISOString(),
        issuedAt: new Date().toISOString(),
        source: 'Mocked forecast for UI state verification only',
        latitude: -1.091,
        longitude: 37.014,
        hours: [],
      }),
    });
  });
  await page.getByLabel('Weather mode').selectOption('forecast');
  await expect(page.getByRole('button', { name: 'Refresh live forecast' })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh live forecast' }).click();
  await expect.poll(() => calls).toBe(2);
  await page.getByLabel('Weather mode').selectOption('replay');
  await expect(page.getByLabel('Replay date')).toHaveValue('2026-09-15');
});

test('load and save failures offer a retry without dropping typed intake values', async ({
  page,
}) => {
  await page.route(
    '**/api/workspace',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Workspace temporarily unavailable.' }),
      }),
    { times: 1 },
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Explore demo workspace/ }).click();
  await expect(page.getByRole('alert')).toContainText('Workspace temporarily unavailable');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Make every dry hour count.' })).toBeVisible();
  await navigate(page, 'Batches');
  await page.getByRole('button', { name: 'Add batch', exact: true }).click();
  await page.getByLabel('Batch name').fill('Preserved intake');
  await page.getByLabel('Grower or group').fill('Sample group');
  await page.getByLabel('Weight (kg)').fill('250');
  await page.getByLabel('Measured moisture (%)', { exact: true }).fill('17.5');
  await page.route('**/api/commands', (route) => route.abort('internetdisconnected'), { times: 1 });
  await page.getByRole('dialog').getByRole('button', { name: 'Add batch', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('server could not be reached');
  await expect(page.getByLabel('Batch name')).toHaveValue('Preserved intake');
  await expect(page.getByLabel('Weight (kg)')).toHaveValue('250');
  await page.getByRole('dialog').getByRole('button', { name: 'Add batch', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Preserved intake', exact: true })).toHaveCount(1);
});

test('an open forecast page withdraws outdoor allocation when its weather expires', async ({
  page,
}) => {
  const now = new Date('2026-09-22T05:00:00.000Z');
  await page.clock.install({ time: now });
  await enterDemo(page);
  const workspace = await (await page.request.get('/api/workspace')).json();
  await page.route('**/api/forecast?**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        fetchedAt: now.toISOString(),
        issuedAt: now.toISOString(),
        source: 'UI test fixture, not a real forecast',
        latitude: workspace.settings.latitude,
        longitude: workspace.settings.longitude,
        hours: Array.from({ length: 24 }, (_, h) => ({
          timestamp: new Date(Date.UTC(2026, 8, 21, 21 + h)).toISOString(),
          temperatureC: 25,
          humidityPct: 45,
          rainMm: 0,
          windMs: 1,
          sampleCount: 1,
          coverage: 1,
          vpdKpa: 1.5,
          verdict: 'dry',
          reasons: [],
        })),
      }),
    }),
  );
  await page.getByLabel('Weather mode').selectOption('forecast');
  // The 08:00 hour has already started; only the eight upcoming complete hours count.
  await expect(page.locator('.stat').first()).toContainText('8');
  await page.clock.fastForward(7 * 60 * 60 * 1000);
  await expect(page.locator('.stat').first()).toContainText('0');
  await expect(page.locator('.stat').nth(2)).toContainText('0/ 3 t');
  await page.locator('.plan-notices summary').click();
  await expect(page.locator('.plan-notices')).toContainText('No fresh, valid forecast');
});

test('plan, intake, batch, measurement and reset dialogs pass serious accessibility checks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page);
  async function auditDialog(label: string) {
    await expect(page.getByRole('dialog')).toBeVisible();
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      audit.violations
        .filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      label,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await auditDialog('Plan review');
  await page.keyboard.press('Escape');
  await navigate(page, 'Batches');
  await page.getByRole('button', { name: 'Add batch', exact: true }).click();
  await auditDialog('Intake');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mavuno A-01', exact: true }).click();
  await auditDialog('Batch detail');
  await page.getByRole('button', { name: 'Log reading', exact: true }).last().click();
  await auditDialog('Meter reading');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await auditDialog('Reset confirmation');
});

test('failed plan creation keeps an explanation in the dialog and can be retried', async ({
  page,
}) => {
  await enterDemo(page);
  await page.getByRole('button', { name: 'Build operator plan', exact: true }).click();
  await page.route(
    '**/api/commands',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'The server is temporarily unavailable. Please retry.' }),
      }),
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Create operator jobs' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'temporarily unavailable',
  );
  await page.getByRole('button', { name: 'Create operator jobs' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.task-row')).not.toHaveCount(0);
});
