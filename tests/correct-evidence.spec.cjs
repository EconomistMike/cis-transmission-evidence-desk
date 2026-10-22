const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

test('archived correction mechanics preserve immutable synthetic inputs and coherent replicas', () => {
  const result = execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'processing_tests', '-p', 'test_correct_evidence.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONOPTIMIZE: '0' },
  });
  expect(result).toBe('');
});

test('correction check launcher rejects optimisation and accidental external effects', () => {
  const result = execFileSync('python3', ['-B', '-m', 'unittest', 'discover', '-s', 'processing_tests', '-p', 'test_check_corrections.py', '-v'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 20000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONOPTIMIZE: '0' },
  });
  expect(result).toBe('');
});

test('actual archived package passes the read-only correction check', () => {
  test.setTimeout(120000);
  const result = execFileSync('python3', ['-B', 'tools/check-corrections.py'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 90000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONOPTIMIZE: '0' },
  });
  expect(result).toContain('PASS: 120 unit/boundary-qualified findings');
  expect(result).toContain('unchanged cutoff');
});
