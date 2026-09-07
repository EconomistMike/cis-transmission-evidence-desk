const { test, expect } = require('@playwright/test');

for (const [view, table] of [['workbook','estimates'],['policy','analysis-estimates']]) {
  test(`${view}: explicit metadata and range-bound labels replace generic pills`, async ({ page }, testInfo) => {
    await page.goto('/?view='+view);
    const row=id=>page.locator(`#${table} tbody tr`).filter({has:page.locator(`[data-record-details="${id}"]`)});
    const low=row('CWO-AO-2020-ISP-COST-LOW');
    const high=row('CWO-AO-2020-ISP-COST-HIGH');
    await expect(low.locator('.record-basis')).toHaveText('Price basis and estimate class not stated.');
    await expect(low.locator('.record-basis')).toBeVisible();
    await expect(low.locator('.record-status')).toHaveText('conceptual / pre-RIT-T planner estimate');
    await expect(low.locator('.record-status')).toBeVisible();
    await expect(low.locator('.record-bound')).toHaveText('Lower bound');
    await expect(high.locator('.record-bound')).toHaveText('Upper bound');
    await expect(low.locator('.record-basis').locator('..').locator('.pill')).toHaveCount(0);
    const known=row('HUM-AO-2024-ISP-COST');
    await expect(known.locator('.record-basis')).toContainText('Price basis:');
    await expect(known.locator('.record-basis')).toContainText('Estimate: Class 3');
    await expect(known.locator('.record-bound')).toHaveCount(0);
    if(view==='workbook'){
      await low.locator('.record-basis').scrollIntoViewIfNeeded();
      await page.screenshot({path:testInfo.outputPath('record-labels.png')});
    }
  });
}
