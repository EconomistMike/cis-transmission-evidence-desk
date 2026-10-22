const { test, expect } = require('@playwright/test');
const { execFileSync, spawnSync } = require('node:child_process');
const { embeddedPayload } = require('./helpers/embedded-payload.cjs');

test('source-age and provenance checker rejects synthetic contract violations', () => {
  const result = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'check_tests', '-p', 'test_source_report.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 20000,
  });
  expect(result).toBe('');
});

test('the actual offline evidence package passes structural and original-hash checks', () => {
  test.setTimeout(120000);
  const output = execFileSync('python3', ['tools/source_report.py'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 90000,
  });
  const report = JSON.parse(output);
  expect(report.errors).toEqual([]);
  expect(report.counts.sources).toBeGreaterThan(0);
});

test('registered derivative bytes retain their reviewed snapshot identity', () => {
  const result = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'check_tests', '-p', 'test_derivative_integrity.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 20000,
  });
  expect(result).toBe('');
});

test('family JSON exports preserve combined content and JSON types', () => {
  test.setTimeout(60000);
  const fixtures = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'check_tests', '-p', 'test_family_exports.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 20000,
  });
  expect(fixtures).toBe('');
  const output = execFileSync('python3', ['tools/family_exports.py'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 20000,
  });
  const report = JSON.parse(output);
  expect(report.errors).toEqual([]);
  expect(report.families_checked).toBeGreaterThan(0);
});

test('embedded records preserve combined content and identical entry points', async ({ page, request }) => {
  test.setTimeout(180000);
  const fixtures = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'check_tests', '-p', 'test_presentation_exports.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 60000,
  });
  expect(fixtures).toBe('');
  const canonical = await request.get('/evidence-desk.html');
  const entry = await request.get('/index.html');
  expect(canonical.ok()).toBe(true);
  expect(entry.ok()).toBe(true);
  const html = await canonical.body();
  expect(await entry.body()).toEqual(html);
  const payload = await embeddedPayload(page, canonical.url(), html);
  expect(typeof payload).toBe('string');
  const result = spawnSync('python3', ['tools/presentation_exports.py'], {
    cwd: process.cwd(), input: payload, encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 30000,
  });
  expect(result.error, result.error?.message).toBeUndefined();
  expect(result.status, (result.stdout ?? '') + (result.stderr ?? '')).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.errors).toEqual([]);
  expect(report.projects_checked).toBeGreaterThan(0);
});

test('embedded payload extraction preserves static data and rejects invalid markers', async ({ page }) => {
  const resources = [];
  await page.route('**/*', route => {
    resources.push(route.request().url());
    return route.abort();
  });
  for (const [initial, replacement] of [[1, 2], [2, 1]]) {
    await test.step(`retain initial ${initial} despite script replacement`, async () => {
      const raw = JSON.stringify({ revision: initial });
      const html = '<!doctype html><html><head><title>Fixture</title></head><body>' +
        '<noscript><script id="evidence" type="application/json">{"inactive":true}</script></noscript>' +
        '<script id="evidence" type=" APPLICATION/JSON ; charset=utf-8 ">' + raw + '</script>' +
        '<script>window.rewriteRan=true;document.getElementById("evidence").textContent=' +
        JSON.stringify(JSON.stringify({ revision: replacement })) + ';</script>' +
        '<img src="http://unused.test/image"><iframe src="http://unused.test/frame"></iframe></body></html>';
      const payload = await embeddedPayload(page, 'http://evidence.test/static', html);
      expect(JSON.parse(payload)).toEqual({ revision: initial });
      expect(await page.evaluate(() => window.rewriteRan)).toBeUndefined();
      expect(resources).toEqual([]);
    });
  }
  const invalid = {
    missing: '',
    duplicate: '<script id="evidence" type="application/json">{}</script><div id="evidence"></div>',
    wrongElement: '<div id="evidence" type="application/json">{}</div>',
    executable: '<script id="evidence" type="text/javascript">{}</script>',
    missingMime: '<script id="evidence">{}</script>',
    inertTemplate: '<template><script id="evidence" type="application/json">{}</script></template>',
  };
  for (const [label, markup] of Object.entries(invalid)) {
    await test.step(`reject ${label}`, async () => {
      await expect(embeddedPayload(page, 'http://evidence.test/static',
        '<!doctype html><html><head><title>Fixture</title></head><body>' + markup + '</body></html>'))
        .rejects.toThrow(/EVIDENCE_SCRIPT/);
    });
  }
});
