const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

function assertNonemptySuccess(result) {
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '', 'Python fixture tests unexpectedly wrote stdout');
  assert.match(result.stderr, /(?:^|\n)Ran [1-9][0-9]* tests? in /,
    'Expected a nonempty Python unittest suite');
}

function runPythonTests(pattern, options = {}) {
  const result = spawnSync('python3', ['-B', '-m', 'unittest', 'discover', '-s', 'processing_tests', '-p', pattern, '-v'], {
    cwd: options.cwd || process.cwd(), encoding: 'utf8', timeout: 20000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONOPTIMIZE: '0' },
  });
  assertNonemptySuccess(result);
}

module.exports = { assertNonemptySuccess, runPythonTests };
