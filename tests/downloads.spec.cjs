const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test('JSON click downloads original bytes without leaving the explorer', async ({ page }) => {
  await page.goto('/?view=chart');
  const before = page.url();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#dl-json').click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('evidence-pack.json');
  expect(await download.failure()).toBeNull();
  expect(fs.readFileSync(await download.path())).toEqual(fs.readFileSync(path.resolve(__dirname, '../site/evidence-pack.json')));
  expect(page.url()).toBe(before);
  await expect(page.getByRole('status')).toHaveText('JSON download started.');
});

test('JSON failure stays on page and reports an accessible error', async ({ page }) => {
  await page.route('**/evidence-pack.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/?view=chart');
  const before = page.url();
  await page.locator('#dl-json').click();
  await expect(page.getByRole('status')).toHaveText('JSON download failed. Please try again.');
  expect(page.url()).toBe(before);
  await expect(page.locator('#dl-json')).not.toHaveAttribute('aria-busy');
});
