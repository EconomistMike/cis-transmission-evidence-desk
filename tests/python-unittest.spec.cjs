const { test, expect } = require('@playwright/test');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { assertNonemptySuccess, runPythonTests } = require('./python-unittest.cjs');

test('Python unittest success requires at least one discovered test on every Python version', () => {
  const empty = { status: 0, signal: null, stdout: '', stderr: '\nRan 0 tests in 0.000s\n\nOK\n' };
  expect(() => assertNonemptySuccess(empty)).toThrow(/nonempty Python unittest suite/);
  assertNonemptySuccess({ ...empty, stderr: '\nRan 1 test in 0.001s\n\nOK\n' });
  assertNonemptySuccess({ ...empty, stderr: '\nRan 13 tests in 0.001s\n\nOK\n' });
  expect(() => assertNonemptySuccess({ ...empty, status: 1, stderr: 'Ran 1 test\nFAILED' })).toThrow();
});

test('Python discovery wrapper rejects an empty directory and runs a valid fixture', () => {
  const root = mkdtempSync(join(tmpdir(), 'python discovery '));
  try {
    mkdirSync(join(root, 'processing_tests'));
    expect(() => runPythonTests('test_fixture.py', { cwd: root })).toThrow();
    writeFileSync(join(root, 'processing_tests', 'test_fixture.py'),
      'import unittest\nclass Fixture(unittest.TestCase):\n    def test_control(self):\n        self.assertEqual(2 + 3, 5)\n');
    runPythonTests('test_fixture.py', { cwd: root });
    writeFileSync(join(root, 'processing_tests', 'test_fixture.py'),
      'import unittest\nclass Fixture(unittest.TestCase):\n    def test_control(self):\n        self.fail("synthetic fixture failure")\n');
    expect(() => runPythonTests('test_fixture.py', { cwd: root })).toThrow(/synthetic fixture failure/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
