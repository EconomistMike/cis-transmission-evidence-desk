const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const site = path.resolve(__dirname, '../site');

test('entry point and all archived source files are present', async () => {
  const html = fs.readFileSync(path.join(site, 'evidence-desk.html'), 'utf8');
  expect(fs.readFileSync(path.join(site, 'index.html'), 'utf8')).toBe(html);
  const data = JSON.parse(html.match(/<script[^>]*id="evidence"[^>]*>(.*?)<\/script>/s)[1]);
  for (const source of data.sources) {
    for (const key of ['local_path', 'derivative_path']) {
      if (source[key]) expect(fs.existsSync(path.join(site, source[key])), source[key]).toBeTruthy();
    }
  }
});

for (const [view, sheet] of [['dashboard'], ['chart'], ['policy'], ['workbook', 'estimates'], ['workbook', 'scope'], ['workbook', 'timeline'], ['workbook', 'sources'], ['desk']]) {
  test(`renders ${sheet || view} at desktop and mobile widths`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/?view=' + view);
    if (sheet) await page.locator(`[data-sheet="${sheet}"]`).click();
    await expect(page.locator('.mode.active h1')).toBeVisible();
    expect(await page.locator('.mode.active').innerText()).not.toContain('&amp;');
    await page.setViewportSize({ width: 390, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(errors).toEqual([]);
  });
}

test('combined filters, popup controls and full-note preservation', async ({ page }) => {
  await page.goto('/?view=chart');
  await page.locator('#search').fill('HumeLink');
  await page.locator('#filter').selectOption('cost');
  await expect(page.locator('#chart-table tbody tr[data-project="HumeLink"]')).toBeVisible();
  await page.locator('#search').fill('');
  await page.locator('#filter').selectOption('');
  await page.locator('#chart-table [data-card]').first().click();
  await expect(page.locator('#evidence-popup')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#evidence-popup')).toBeHidden();
  const preserved = await page.evaluate(() => D.packs.every(p => p.policy_chart.findings.every(f => {
    const node = document.createElement('div');
    node.innerHTML = DeckCopy.note(f.evidence, f.field === 'cost_aud_billion' ? DeckCopy.costs[p.family_slug] : undefined);
    return [...node.querySelectorAll('p')].some(n => n.textContent === f.evidence);
  })));
  expect(preserved).toBeTruthy();
});

test('drawer restores focus and local source links resolve', async ({ page, request }) => {
  await page.goto('/?view=workbook');
  const trigger = page.locator('#estimates [data-record-details]').first();
  await trigger.click();
  await expect(page.locator('#drawer-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('#record-drawer')).toHaveAttribute('inert', '');
  await page.locator('[data-sheet="sources"]').click();
  const links = await page.locator('#sources a').evaluateAll(as => as.map(a => a.href).filter(h => h.startsWith(location.origin)));
  expect(links.length).toBeGreaterThanOrEqual(186);
  for (const href of links) {
    const response = await request.head(href);
    expect(response.ok(), new URL(href).pathname).toBeTruthy();
  }
});
