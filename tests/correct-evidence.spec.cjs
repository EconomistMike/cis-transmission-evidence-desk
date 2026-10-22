const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { runPythonTests } = require('./python-unittest.cjs');

test('archived correction mechanics preserve immutable synthetic inputs and coherent replicas', () => {
  runPythonTests('test_correct_evidence.py');
});

test('correction check launcher rejects optimisation and accidental external effects', () => {
  runPythonTests('test_check_corrections.py');
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
