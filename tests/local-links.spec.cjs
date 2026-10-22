const { test, expect } = require('@playwright/test');

async function localTargets(page) {
  return page.locator('a[href],link[href],script[src],img').evaluateAll(nodes => {
    const local = values => [...new Set(values.filter(href => {
      try { return new URL(href).origin === location.origin; } catch { return false; }
    }).map(href => href.split('#')[0]))];
    const visibleAnchors = nodes.filter(node => node.tagName === 'A' && node.checkVisibility({ visibilityProperty: true, opacityProperty: true, contentVisibilityAuto: true }) && !node.closest('[inert],[aria-hidden="true" i]'));
    return {
      targets: local(nodes.flatMap(node => node.tagName === 'IMG' ? [node.src, node.currentSrc] : [node.href || node.src])),
      visibleAnchors: local(visibleAnchors.map(node => node.href)),
    };
  });
}
async function failedTargets(request, targets) {
  const failures = [];
  for (const href of targets) {
    const response = await request.head(href, { timeout: 10000 });
    if (!response.ok()) failures.push({ href, status: response.status() });
  }
  return failures;
}

test('local link guard detects a missing rendered target and retains assets', async ({ page, request }) => {
  await page.goto('/');
  await page.setContent('<a href="/__guard_missing__">Missing</a><script src="/deck-copy.js"></script><a href="https://example.org/remote">External</a>');
  const { targets } = await localTargets(page);
  expect(targets.map(href => new URL(href).pathname).sort()).toEqual(['/__guard_missing__', '/deck-copy.js']);
  expect(await failedTargets(request, targets)).toEqual([{ href: new URL('/__guard_missing__', page.url()).href, status: 404 }]);
});

test('archive coverage excludes hidden-only anchors and retains the selected responsive image', async ({ page }) => {
  await page.goto('/');
  await page.route('**/__guard_selected__.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await page.setContent('<a href="/visible.pdf">Visible</a><a hidden style="display:block" href="/css-visible.pdf">CSS visible</a><div hidden><a href="/hidden.pdf">Hidden</a></div><div style="content-visibility:hidden"><a href="/skipped.pdf">Skipped</a></div><details><summary><a href="/summary.pdf">Operable summary</a></summary><a href="/closed.pdf">Closed</a></details><img src="/fallback.svg" srcset="/__guard_selected__.svg 1x" alt="">');
  const collected = await localTargets(page);
  expect(collected.visibleAnchors.map(href => new URL(href).pathname)).toEqual(['/visible.pdf', '/css-visible.pdf', '/summary.pdf']);
  expect(collected.targets.map(href => new URL(href).pathname)).toEqual(expect.arrayContaining(['/fallback.svg', '/__guard_selected__.svg']));
});

test('all rendered local links and assets resolve across public views', async ({ page, request }) => {
  test.setTimeout(180000);
  const targets = new Set();
  const visibleAnchors = new Set();
  for (const [view, sheet] of [['latest-chart'], ['latest'], ['dashboard'], ['chart'], ['policy'], ['workbook', 'estimates'], ['workbook', 'scope'], ['workbook', 'timeline'], ['workbook', 'sources'], ['desk']]) {
    await page.goto('/?view=' + view);
    await expect(page.locator('#' + view)).toHaveClass('mode active');
    if (sheet) {
      await page.locator(`[data-sheet="${sheet}"]`).click();
      await expect(page.locator('#' + sheet)).toHaveClass('subsheet active');
    }
    const collected = await localTargets(page);
    for (const href of collected.targets) targets.add(href);
    for (const href of collected.visibleAnchors) visibleAnchors.add(href);
  }
  const paths = new Set([...visibleAnchors].map(href => new URL(href).pathname));
  const archives = await page.evaluate(() => D.sources.flatMap(source => [source.local_path, source.derivative_path]).filter(Boolean));
  expect(archives.length).toBeGreaterThan(0);
  for (const archive of archives) expect(paths.has('/' + archive), archive).toBeTruthy();
  expect(await failedTargets(request, [...targets])).toEqual([]);
});

test('picture-selected sources are collected and missing selected resources fail HTTP checks', async ({ page, request }) => {
  await page.goto('/');
  await page.route('**/__guard_picture_good__.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await page.setContent('<picture><source srcset="/__guard_picture_good__.svg"><img alt="Fixture diagram"></picture>');
  await expect(page.locator('img')).toHaveJSProperty('naturalWidth', 1);
  expect((await localTargets(page)).targets).toEqual([new URL('/__guard_picture_good__.svg', page.url()).href]);
  await page.setContent('<picture><source srcset="/__guard_picture_missing__.svg"><img alt="Missing diagram"></picture>');
  await expect(page.locator('img')).toHaveJSProperty('naturalWidth', 0);
  const collected = await localTargets(page);
  expect(collected.targets).toEqual([new URL('/__guard_picture_missing__.svg', page.url()).href]);
  expect(await failedTargets(request, collected.targets)).toEqual([{ href: collected.targets[0], status: 404 }]);
});
