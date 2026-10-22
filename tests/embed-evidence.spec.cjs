const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

test('presentation synchronisation preserves inputs and rejects invalid fixture builds', () => {
  const result = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'processing_tests', '-p', 'test_embed_evidence.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  expect(result).toBe('');
});
