const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

test('source-age and provenance checker rejects synthetic contract violations', () => {
  const result = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'check_tests', '-p', 'test_source_report.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 20000,
  });
  expect(result).toBe('');
});
