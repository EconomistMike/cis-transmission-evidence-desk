# Source report verification

From the repository root, with Python 3.11 or later and the repository’s existing Node 22 prerequisite:

```sh
nice -n 10 python3 tools/source_report.py --as-of 2026-10-22 --review-interval-days 365
nice -n 10 python3 tools/family_exports.py
nice -n 10 python3 -m unittest discover -s check_tests -v
```

The normal `npm test` command includes these Python contract cases through
`tests/source-report.spec.cjs`; it still runs every existing browser test.

The report reads the combined evidence pack and its registered archive files.
It checks unique identifiers, original hashes, derivative availability, publisher
URL syntax and the source/selection graph. It never fetches publisher URLs or
rewrites evidence. Publisher hosts use a local Node WHATWG URL parser plus DNS
label checks; the helper makes no network requests. Missing or failed Node parsing
produces CHECK_PREREQUISITE rather than claiming a broken publisher URL.
Exit status 1 means a structural/integrity/input error;
publication age alone does not fail the command.

Year-only and month-only publication dates remain calendar intervals. The age
range can include negative days when that imprecise period extends past the
assessment date; this does not assert an exact future publication date. The
configurable interval groups sources for review. An older source may be the
correct historical evidence, and a recent source may still be unsuitable.

The research cut-off and correction date are reported separately. Neither git
commit dates nor correction dates refresh publication dates or the research
search. Undated and explicitly unavailable sources remain visible. The report
does not certify capture age, current project status, source meaning, excerpts,
PDF page numbers, export equality or publication approval.

The same `npm test` command also runs the actual offline source report and checks
all registered derivative paths/bytes against `check_tests/derivative-pins.json`.
The pins record the text files inspected at public commit
`38aab87c79bf4686e59b52c943b61ea8d3641122`; they do not establish historical private
derivative identity or certify that extraction matches a PDF. This closes the
separate risk of text changing while the original capture hash stays unchanged.

A changed, added, removed or relocated derivative requires review of its source,
extraction and affected citations before deliberately updating the versioned
pins. Preserve the relevant capture/extractor identity and review evidence with
that change; do not regenerate expected hashes merely to silence a failure.
Contributors can change these local tests and pins, so this is a review safeguard,
not independently controlled approval. No source file is modified by the check.
Source age alone remains non-failing in the actual-package gate.

The separate `family_exports.py` check compares each family's six substantive
fields, family/project identities, declared/exported source register and available
contract/research/correction metadata
with the combined JSON. Booleans differ from numbers, including nested fields;
numeric representations such as 1 and 1.0 agree. Decimal parsing preserves the
recorded numeric precision. Duplicate JSON keys and non-finite constants fail.
Source register order and object key order do not alter content identity.
Mismatch diagnostics identify the first differing field with an escaped JSON
pointer following the export filename.

Disposable cases exercise matching exports, missing/malformed records, changed
types, source sets, dates and unsafe paths. The normal test command also checks
the actual family JSON files. This guard addresses Python equality treating
false as numeric zero in the legacy validator. It does not change that validator
or certify citation meaning, Markdown, workbook or rendered HTML equality. The
source report remains responsible for the combined citation/selection graph;
export agreement does not establish that two matching claims are correct.
