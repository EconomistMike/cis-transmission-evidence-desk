const { test, expect } = require('@playwright/test');

test('bare URL defaults to recorded evidence, without workbook scores', async ({ page }, testInfo) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#latest')).toHaveClass('mode active');
  await expect(page.locator('[data-perspective="evidence"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#latest tbody tr')).toHaveCount(10);
  await expect(page.locator('#latest [data-card],#latest .signal')).toHaveCount(0);
  await expect(page.locator('#latest')).toContainText('4 September 2026');
  await expect(page.locator('#latest')).toContainText('not a state allocation');
  await expect(page.locator('#latest [data-observation="WRL-AO-2026-AUSNET-CAPABILITY"] .latest-value')).toHaveText('More than 3,000 MW');
  await expect(page.locator('#latest [data-observation="WRL-AO-2026-COMPLETION-NOV2029"] .latest-value')).toHaveText('November 2029');
  await expect(page.locator('#latest [data-observation="SRS-AO-2026-COMPLETION-ODP"] .latest-value')).toHaveText('2033-34');
  await expect(page.locator('#latest [data-observation="SRS-AO-2026-PADR-OPT6-TIMING-STAGE1"] .latest-value')).toHaveText('2030/31');
  expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('latest-desktop.png')});
});

test('perspective switch preserves filters and original comparison', async ({ page }) => {
  await page.goto('/');
  await page.locator('#project-filter').selectOption({label:'HumeLink'});
  await page.locator('[data-perspective="comparison"]').click();
  await expect(page.locator('#chart')).toHaveClass('mode active');
  await expect(page.locator('#chart-table tbody tr:visible')).toHaveCount(1);
  await expect(page.locator('#chart-table tbody tr:visible')).toContainText('4.9');
  await page.reload();
  await expect(page.locator('[data-perspective="comparison"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-perspective="evidence"]').click();
  await expect(page.locator('#latest tbody tr:visible')).toHaveCount(1);
  await expect(page.locator('#latest tbody tr:visible')).toContainText('4,892 AUD million');
  await page.locator('#search').fill('unmatchable search value');
  await expect(page.locator('#latest .empty')).toBeVisible();
});

test('evidence perspective works on mobile and reaches records', async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await expect(page.locator('.mode-nav [data-mode="chart"]')).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('latest-mobile.png')});
  await page.locator('.mode-nav [data-mode="workbook"]').click();
  await expect(page.locator('#workbook')).toHaveClass('mode active');
  await expect(page.locator('[data-perspective="evidence"]')).toHaveAttribute('aria-pressed','true');
});
