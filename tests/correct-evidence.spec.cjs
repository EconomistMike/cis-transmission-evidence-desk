const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

test('archived correction mechanics preserve immutable synthetic inputs and coherent replicas', () => {
  const result = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'processing_tests', '-p', 'test_correct_evidence.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONOPTIMIZE: '0' },
  });
  expect(result).toBe('');
});
