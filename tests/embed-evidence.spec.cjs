const { test } = require('@playwright/test');
const { runPythonTests } = require('./python-unittest.cjs');

test('presentation synchronisation preserves inputs and rejects invalid fixture builds', () => {
  runPythonTests('test_embed_evidence.py');
});
