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

The presentation check closes a separate stale-output gap: editing the combined
JSON and family exports can leave older data embedded in the HTML. The existing
build contract says `index.html` is an identical copy of `evidence-desk.html`.
A new Playwright case checks both successful HTTP responses and their exact
bytes, then uses Chromium's DOM to obtain the unique `script#evidence` JSON data
block. It parses the fetched UTF-8 bytes with a script-blocking Content Security
Policy while retaining the browser's enabled scripting flag. Unneeded image and
frame requests are blocked too. Page scripts cannot rewrite the comparison
payload, and noscript fallback markup remains inactive. This response policy
does not provide general network isolation or certify arbitrary navigation.
Browser parsing owns HTML semantics; no parallel HTML parser is added. Dedicated
browser fixtures reject script rewrites, missing/duplicate markers, wrong element
or MIME types and inert template markers, while retaining valid MIME spacing.

`presentation_exports.py` reads that payload from standard input and compares
complete projects (including the renderer's derived name), source records,
build-report data and all available generated metadata with the combined pack.
It reuses the family check's strict JSON/decimal comparison. Source order and
extra presentation-only metadata remain legitimate; project/record array order
is retained. Disposable cases reject stale fields, boolean/number drift,
malformed data, truthful invalid-input counts, the CLI's default input location,
missing inputs and escaping symlinks. Both the fixtures and the
actual HTML/JSON agreement run through the existing `npm test` command.

This check does not certify JavaScript renderer behaviour, workbook supplementary
columns, styles, formulas, source meaning or freshness. It does not change the
embedding script or replace the source/selection graph and family schema checks.
Legitimate changes to the embedding layout or identical-entry-point contract
need explicit review of this safeguard. Contributors can still change or bypass
the local checks; successful agreement is not publication approval.

All four Python fixture-discovery calls require process success, empty stdout and
a positive unittest count. Empty discovery can exit zero on supported Python
versions; a successful process alone is insufficient. Synthetic result controls
and disposable empty/passing/failing directories exercise this requirement. The
helper preserves the existing fixture time budgets. It is local to this PR so
that the source checks and separate processing PR remain independently runnable.

The presentation fixtures also reject matching empty project arrays: matching copies must still satisfy the nonempty-package contract. This case detects a logical-operator mutation found in a separate holdout sample.
