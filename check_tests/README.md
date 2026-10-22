# Source report verification

From the repository root, with Python 3.11 or later and the repository’s existing Node 22 prerequisite:

```sh
nice -n 10 python3 tools/source_report.py --as-of 2026-10-22 --review-interval-days 365
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
