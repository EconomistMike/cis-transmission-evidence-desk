const { test, expect } = require('@playwright/test');
const { execFileSync, spawnSync } = require('node:child_process');
const { embeddedPayload } = require('./helpers/embedded-payload.cjs');
const { assertNonemptySuccess, runPythonTests } = require('./helpers/python-unittest.cjs');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

test('source-age and provenance checker rejects synthetic contract violations', () => {
  runPythonTests('test_source_report.py');
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
  runPythonTests('test_derivative_integrity.py');
});

test('family JSON exports preserve combined content and JSON types', () => {
  test.setTimeout(60000);
  runPythonTests('test_family_exports.py');
  const output = execFileSync('python3', ['tools/family_exports.py'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 20000,
  });
  const report = JSON.parse(output);
  expect(report.errors).toEqual([]);
  expect(report.families_checked).toBeGreaterThan(0);
});

test('embedded records preserve combined content and identical entry points', async ({ page, request }) => {
  test.setTimeout(180000);
  runPythonTests('test_presentation_exports.py', { timeout: 60000 });
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

test('source Python unittest success requires at least one discovered test on every Python version', () => {
  const empty = { status: 0, signal: null, stdout: '', stderr: '\nRan 0 tests in 0.000s\n\nOK\n' };
  expect(() => assertNonemptySuccess(empty)).toThrow(/nonempty Python unittest suite/);
  assertNonemptySuccess({ ...empty, stderr: '\nRan 1 test in 0.001s\n\nOK\n' });
  assertNonemptySuccess({ ...empty, stderr: '\nRan 13 tests in 0.001s\n\nOK\n' });
  expect(() => assertNonemptySuccess({ ...empty, status: 1, stderr: 'Ran 1 test\nFAILED' })).toThrow();
});

test('source Python discovery wrapper rejects an empty directory and runs a valid fixture', () => {
  const root = mkdtempSync(join(tmpdir(), 'python discovery '));
  try {
    mkdirSync(join(root, 'check_tests'));
    expect(() => runPythonTests('test_fixture.py', { cwd: root })).toThrow();
    writeFileSync(join(root, 'check_tests', 'test_fixture.py'),
      'import unittest\nclass Fixture(unittest.TestCase):\n    def test_control(self):\n        self.assertEqual(2 + 3, 5)\n');
    runPythonTests('test_fixture.py', { cwd: root });
    writeFileSync(join(root, 'check_tests', 'test_fixture.py'),
      'import unittest\nclass Fixture(unittest.TestCase):\n    def test_control(self):\n        self.fail("synthetic fixture failure")\n');
    expect(() => runPythonTests('test_fixture.py', { cwd: root })).toThrow(/synthetic fixture failure/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
