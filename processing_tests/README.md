# Presentation synchronisation tests

Run `nice -n 10 npm test` for the complete existing repository suite. The added
Playwright wrapper runs the Python fixture tests using the existing openpyxl
requirement. A focused run is:

```sh
PYTHONDONTWRITEBYTECODE=1 nice -n 10 python3 -m unittest discover -s processing_tests -v
```

Each case copies the existing `tools/embed-evidence.py` into a disposable tree
with synthetic JSON, HTML and a small real workbook, including explicit zero,
missing metadata and an uncached formula string. The published site is never
the write target. Cases check record/metadata synchronisation, preserved input
bytes and shell markup, script-safe JSON round-tripping, idempotence, and
rejection before writing when original chart values change, the evidence element
is absent or metadata columns disagree. Fixture subprocesses explicitly use
normal Python optimisation because the existing metadata guard is an assert.

These tests do not certify source meaning, all malformed inputs or the complete
correction pipeline. Existing assert-based safeguards are bypassable under
optimised Python; these tests do not change that production behaviour. No prior
tests, expectations, dependencies or configuration are changed.

The existing original-row guard uses Python equality, which treats numeric 1 and
boolean true as equal. A synthetic probe confirmed that type change is accepted.
It is a reported production limitation requiring a separate implementation fix;
these tests neither certify that case nor assert the defective result as correct.
