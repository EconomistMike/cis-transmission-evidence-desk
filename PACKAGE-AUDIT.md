# Package audit — 7 September 2026

## Verdict: corrections required

The exports are substantially consistent with each other, but **consistency is not proof of factual accuracy**. Do not treat the current chart-review `supported_value` fields as an automatically verified replacement chart.

The research snapshot ends on **4 September 2026**. This audit checked the archived evidence; it did not conduct a new search for subsequent project announcements or regulatory decisions.

## What passed

- Reconciled core fields across Excel, combined JSON, ten family JSON files and the HTML's embedded evidence.
- Checked 479 observations, 99 components, 138 timeline events, 150 warnings and 120 chart findings across ten families.
- Reconciled the original chart inputs, evaluating the workbook's simple arithmetic separately from literal original formula text.
- All 93 original archived source files match the SHA-256 values in the register. All 93 derivatives are present.
- Reviewed all 11 findings labelled `contradicted` against targeted archived passages, with additional cost/capacity scope checks for each family.

## Required research corrections

1. **Marinus cost scope:** the package incorrectly says the reported $7,570m excludes NWTD and is a Link-only replacement. The 2025 RIT-T defines Project Marinus as Marinus Link plus NWTD (PDF p6), labels the $5,035m/$2,535m figures as Project Marinus stage costs and NWTD as a component (p18). AEMO 2026 Appendix 5 p59 also distinguishes onshore scope in the Stage 2 options. A like-for-like Link-only cost is not established by the current correction. Do not subtract components to invent one.
2. **Replacement units and boundaries:** bare values sometimes describe individual units, different scales or different project scopes. Examples include 100 MVA per syncon for EnergyConnect, 1,500 MVA per Dinawan transformer and 1,000 MVA per Tragowel transformer—not project totals. Other replacements mix AUD million with AUD billion or MW with GW. These need explicit units and scope before use outside their explanatory notes.
3. **Sydney Ring South:** the supplied original is $3.5bn, consistent with rounding $3.519bn nominal to one decimal. The assertion that the author transposed digits in $3.510bn is not supported by this snapshot. Retain the genuine price-basis and route-length qualifications.
4. **VNI Victoria:** $3.7bn is not half of $7.6bn. The current state allocation is unverified; historical allocations do not establish a current split.
5. **CWO feeder length:** 150 km has positive source support. The alternative 166 km description differs in date and potentially measurement/conditional scope. Preserve the discrepancy without presenting the supplied 150 km as simply disproved.
6. **EnergyConnect ratio note:** an old 165 km attribution remains although the adjacent finding now identifies a 160 km Stage 1 source. Neither a social-benefit numerator nor a stage-only denominator establishes a project construction-cost-per-km metric.

Five of the eleven contradiction findings held clearly on the stated comparison boundaries. Six require corrections or milestone/definition qualifications. This is not a finding that all ten projects are defective.

## Packaging issues

- `Chart Review!D45` stores an original formula as an executable Excel formula rather than literal audit text. The original formula must remain available, but must not execute against unrelated review-table cells.
- The JSON retains the upstream `generated.path_base` of `../../`, which does not describe the current `site/` layout.
- Ten source-manifest paths referenced in the register are not shipped in this repository. Hashes were independently verified using the register; do not imply that the referenced manifest files are included.
- Three source publication dates are unstated. Missing dates remain missing—not inferred from retrieval or filename dates.
- One uncited Hunter timeline entry records failed acquisition attempts. It is an availability log, not a source-backed project milestone.

## Presentation direction

The supplied colleague workbook remains an immutable comparison snapshot; later edits to it are unknown. The intended default is latest recorded evidence with its own genuine uncertainty, with a separate workbook-comparison view. That default must not be populated by copying the current `supported_value` fields blindly.

At this audit checkpoint the research corrections and view split are pending. No original research or source bytes were changed. The JSON button has separate download handling and regression tests to keep an ordinary click in the explorer while saving the original JSON bytes.
