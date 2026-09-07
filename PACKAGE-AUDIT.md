# Package audit and corrections — 7 September 2026

## Outcome

The identified audit errors have been corrected across combined JSON, family JSON/Markdown, Excel and embedded website data. Independent source-based review confirmed the principal corrections and the follow-up fixes below. The colleague's original comparison inputs, original chart formulas, raw source excerpts and archived documents are preserved.

**Research cutoff remains 4 September 2026.** The correction date is not a new evidence-search date. This is a bounded archived-evidence review, not a certification of every claim or of current-world status after the cutoff. Unknown costs, incompatible scopes and genuinely conflicting sources remain qualified.

## Corrections applied

- **Marinus:** Project Marinus includes Marinus Link and NWTD. The $7,570m feedback-loop figure is not a like-for-like Link-only replacement. Stage 2 Option 2A and transferred Burnie–Hampshire Hills scope are distinguished. No Link-only total is invented by subtraction. Sources: 2025 RIT-T PDF pp6,18; AEMO 2026 Appendix A5 PDF p59.
- **Units and boundaries:** all non-null chart-review `supported_value` fields now include descriptive units/boundaries rather than ambiguous bare scalars. Per-unit syncon/transformer ratings are not project totals. No current state-only VNI cost, standalone WRL cost, comparable CWO family total or Link-only Marinus cost is asserted where none is established. The latest view reads explicit source observations, not replacement cells.
- **Sydney Ring South cost:** the supplied $3.5bn is consistent with rounding the $3.519bn nominal PADR Option 6 estimate. The unsupported $3.510bn/transposition allegation is removed. Different price bases and the older 114 km versus later approximately 100 km route remain qualified. Sources: PADR pp38,43; 2023 preparatory p8.
- **VNI Victoria:** $3.7bn is not half of $7.6bn. The precise author calculation and current state allocation remain unresolved; historical state allocations are not substituted. Sources: 2023 PACR p48; AEMO 2026 p52.
- **CWO:** the sourced 150 km is no longer treated as simply disproved by the 166 km alternative; vintage, corridor/line measurement and conditional scope remain unresolved. Completion comparisons require a defined milestone: 2029 falls inside the AER staged window but is not AEMO's December 2028 committed-project milestone. Sources: CWO-18 pp11–12; CWO-23 p10; CWO-26; CWO-22 pp23,57.
- **EnergyConnect:** the ratio note uses the source's 160 km Stage 1 attribution, not a stale 165 km description. Social value is not construction capex. Line/corridor and feeder/spur definitions are qualified rather than silently treated as identical. Sources: Transgrid completion page text161–166; project page text1705; AEMO 2024 pp17–18.
- **SRS delivery:** May PADR earliest Stage 1 service in 2030/31 does not match the June ODP's delivery of both stages in 2033–34. Both definitions are shown separately. Sources: PADR p38; AEMO 2026 **PDF p44, footnote87**.
- **WRL delivery:** the already-quoted November 2029 expected completion now has an explicit structured value and visible headline. Source: AEMO 2026 PDF p24. The “more than 3,000 MW” proponent capability qualifier is preserved separately from planner capacity measures.

## Packaging and presentation

- `Chart Review!D45` is literal original formula text, not an executable formula pointing into unrelated review cells. The comparison UI labels the uncalculated original as “Original formula”; it is not evaluated as latest evidence.
- Combined JSON uses `./`; family JSON uses `../`. Upstream manifest references are explicitly marked `manifest_included: false`. No missing upstream manifest was fabricated. Shipped archives can be verified directly against registered hashes.
- `audit_correction_date` and a revision note distinguish corrections from the historical upstream build report and its input hashes.
- Default **Latest evidence** contains selected, dated, source-defined estimates and milestones with their own missing-data, scope and uncertainty qualifications. No original-workbook scores are shown there.
- **Workbook comparison** preserves the supplied colleague workbook snapshot; subsequent colleague edits are unknown. Its summary no longer labels partial or shared amounts as project/state totals.
- JSON downloads save the original package bytes without navigating away. Failures remain on the page with an accessible message.

## Verification

- Reconciled 479 observations, 99 components, 138 timeline events, 150 warnings, 120 chart findings and ten families across the exports.
- All 93 original archive hashes match the register; all 93 derivatives are present. Before/after checks protect all 186 archived files, original comparison rows/findings, raw excerpts and original workbook chart inputs/formulas/styles.
- Corrected JSON matches embedded substantive website data. Supplementary comparison columns are embedded from the workbook; `index.html` matches `evidence-desk.html`.
- 18 browser tests pass, covering perspectives, scope/date regressions, original formula handling, downloads, all views and Workbook tabs, filtering, focus, source links and mobile overflow. Desktop/mobile screenshots inspected.
- Independent read-only review checked the principal corrections against source passages and confirmed both follow-up blockers and the WRL date note were resolved.

Run `python3 tools/correct-evidence.py --check`, `npm run build` and `npm test` using the README environment. `tools/evidence-correction-log.json` records changed JSON paths, source pinpoints and protected-state hashes.

## Still outside this correction

No fresh-source sweep after 4 September, exhaustive original-PDF visual audit, new common-price-basis cost series or invented missing project/state totals. The canonical cisbox research pipeline and older distribution ZIPs are not regenerated by this repository's presentation build. New source evidence requires a separate review and coordinated export update.
