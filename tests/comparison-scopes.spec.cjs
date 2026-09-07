const { test, expect } = require('@playwright/test');

test('comparison summary never labels partial or shared costs as project totals', async ({ page }) => {
  await page.goto('/?view=dashboard');
  const summary=page.locator('#national-summary');
  await expect(summary).toContainText('Standalone cost not established');
  await expect(summary).toContainText('NSW total not established');
  await expect(summary).toContainText('VIC total not established');
  await expect(summary).toContainText('Link-only cost not established');
  const wrl=summary.locator('tbody tr').filter({hasText:'Western Renewables Link'});
  await expect(wrl).not.toContainText('$315m');
});

test('original uncalculated formula is identified, not presented as latest evidence', async ({ page }) => {
  await page.goto('/?view=chart');
  await expect(page.locator('#chart-table')).toContainText('Original formula');
  await page.locator('[data-perspective="evidence"]').click();
  await expect(page.locator('#latest')).not.toContainText('=C11/E11');
});
