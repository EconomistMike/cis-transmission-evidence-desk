# Archived evidence processing tests

Run `nice -n 10 npm test` for the complete existing repository suite. The added
Playwright wrappers run the Python fixture tests using the existing openpyxl
requirement. Every Python discovery wrapper requires a successful process, empty
stdout and a nonzero unittest count on stderr, including on Python 3.11.
Synthetic wrapper controls exercise zero-test success, a valid test and a
failing test. A focused run is:

```sh
PYTHONDONTWRITEBYTECODE=1 nice -n 10 python3 -m unittest discover -s processing_tests -v
```

Presentation cases copy the existing `tools/embed-evidence.py` into a disposable tree
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

Correction cases import the unchanged `tools/correct-evidence.py` definitions and
redirect its source/export/log paths into temporary trees. Synthetic records and
real workbooks exercise explicit zero qualification, repeatability, source-byte
and original-row/finding/excerpt/chart-input guards, overlapping narrative
replacements, workbook replicas, selected markers, literal original formulas and
Markdown escaping. A complete synthetic ten-family/120-finding export exercises
`validate` and the read-only `--check` entry point; deliberate replica, cut-off,
formula and archive changes must fail. No real project figure is used as a test
oracle, no live source or published file is written. One write-mode entry-point case uses
only the same temporary synthetic package, verifies its protected inputs and
checks the resulting change log. It never targets the repository site tree.

These cases establish mechanics, not the meaning of the historical correction
constants or every project-specific rewrite branch. Bounded mutation checks
expose the remaining branch gaps; survivors are not a coverage score. Production
asserts remain bypassable under optimisation, and Python equality still has
boolean/numeric and false-value limitations. Tests run with normal optimisation;
those production limitations require separate changes.

An unmatched original audit row is also retained during narrative replacements.
The write-mode test exercises successful disposable output generation; it does
not establish atomic replacement or rollback on a late validation failure.

The full suite also runs the actual archived package through
`PYTHONOPTIMIZE=0 nice -n 10 python3 -B tools/check-corrections.py`. This new
check launcher fixes the legacy argument to `--check`, refuses optimised Python
and installs an audit hook before invoking the unchanged validator. The hook
rejects filesystem writes and mutations, child processes and socket connections;
disposable stand-in validators exercise those failures before any actual-package
run. It prevents accidental external effects through the checked Python APIs;
it is not a security sandbox for hostile Python or native extensions. The
launcher cannot establish source meaning or repair the production writer's
late-failure behaviour. The added npm test gate requires consistency of the
actual package as well as passing synthetic fixtures.

One additional case reads the actual already-corrected JSON snapshot and applies
`correct` twice to an in-memory object, with all writer paths still redirected
to the test's temporary tree. Canonical JSON comparison checks that this
historical corrector leaves its completed snapshot unchanged, including JSON
types; the file bytes must remain untouched. This exercises project-specific
branches without hard-coding a project figure as the expected answer. It does
not establish that the archived narrative is correct.

Each negative correction-validation case rebuilds and validates a complete
clean synthetic export before applying its own damage. Rebuilding also restores
the original metadata, so earlier cut-off/path damage cannot mask later guards.

The correction-fixture wrapper allows 90 seconds for its subprocess within a
120-second test budget. A loaded-host integration hit the previous 20-second
subprocess limit; all assertions and the other fixture budgets are retained.
