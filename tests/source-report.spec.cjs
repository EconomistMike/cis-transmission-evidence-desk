const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

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
