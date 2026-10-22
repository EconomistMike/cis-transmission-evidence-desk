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
