# Australian Transmission Evidence Desk

An editable, static evidence explorer for ten Australian transmission project families. It includes the policy-chart review, source records, archived documents, an Excel workbook and JSON evidence packs.

**Live explorer:** <https://subtle-lasso-pwzp.here.now/> — account-owned, non-expiring hosting on here.now.

**Audit correction: 7 September 2026.** The identified scope/unit and comparison errors have been corrected and reviewed. [PACKAGE-AUDIT.md](PACKAGE-AUDIT.md) records the checks and limitations. This is not a fresh-source certification beyond the research cut-off.

The default **Latest evidence** view presents source-defined estimates and milestones. **Workbook comparison** preserves the supplied colleague workbook values and shows the corrected comparison findings. Later edits to that workbook are unknown.

**Research cut-off: 4 September 2026.** This is a research snapshot, not an approved publication or a statement of current project status. The interface preserves disputed figures, gaps, assumptions and scope differences. Read the evidence notes before reusing a number.

## View locally

Requires Python 3:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory site
```

Open <http://127.0.0.1:4173>. No account, server-side application or API key is required. The site also opens directly from `site/index.html`, though serving it locally gives more consistent browser behaviour.

## Edit

| File | Purpose |
|---|---|
| `site/evidence-desk.html` | Main HTML, embedded evidence payload and original renderers |
| `site/compact-view.js` | Compact tables, popups, summaries and interaction handling |
| `site/deck-copy.js` | Concise UI wording and presentation-only cost summaries |
| `site/evidence-layout.css` | Shared layout, responsive behaviour and semantic colours |
| `site/latest-evidence.js`, `site/latest-evidence.css` | Evidence-first view, explicit observation selections and perspective switch |
| `site/downloads.js` | JSON download without navigating away |
| `site/evidence-pack.json` | Downloadable structured research snapshot |
| `site/evidence-workbook.xlsx` | Downloadable evidence workbook |
| `site/families/` | Per-project Markdown and JSON packs |
| `site/sources/` | Archived original documents and text derivatives |

Run `npm run build` after editing: it embeds the JSON and workbook's supplementary evidence columns into `evidence-desk.html`, then refreshes the identical `index.html` entry point. It refuses changes to the colleague's original chart inputs. Do not edit the two HTML copies independently.

The default text is black; links and inline actions are blue; labels are grey. Green, amber and red denote evidence status. Long notes expand without removing their original wording. PDF links use recorded page numbers; web pages and text-line references do not invent PDF page jumps.

### Important boundary

This repository contains the **editable local explorer and exported research snapshot**, not the full research/generation pipeline held on cisbox. The JSON and workbook remain separate research exports. `npm run build` synchronizes their presentation into HTML but does not regenerate the workbook from arbitrary JSON edits. `tools/correct-evidence.py` applies this specific, repeatable audit correction and updates the family exports and workbook; `--check` verifies coherence and original-input/source integrity without writing. It is not a replacement for the canonical research pipeline. Keep new research changes on a review branch and reconcile every affected export explicitly. Presentation changes can be made in JavaScript and CSS without changing research data.

## Test

Requires Node.js 22+ and Python 3:

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
npm ci
npx playwright install chromium
python3 tools/correct-evidence.py --check
npm run build
npm test
```

To use an existing Chrome installation instead of downloading a browser, set `CHROMIUM_PATH` to its executable path before `npm test`.

Tests cover entry-point consistency, source files, both perspectives, original comparison values, units/scopes, JSON download and failure behaviour, all views and Workbook tabs, filters, popups, drawer focus, mobile overflow and full chart notes. They do not independently validate every research claim or every source-page citation.

## Collaborate

Fork the repository, create a branch, and open a pull request. Public readers can clone and propose changes without an invitation; direct write access requires a separate collaborator invitation.

For each change, state what changed, whether research values changed, and what you checked. For evidence changes include the source ID, pinpoint, date, units, price basis and project scope. Do not turn different scopes or price bases into an unexplained total. Keep quoted source excerpts unchanged.

## Publish

Publish the contents of `site/` as a static site, preserving its directory structure. The source documents are about 268 MiB in total with the UI and downloads; check the host's limits. The root `index.html` provides the landing page. Here.now requires authenticated publishing for a non-expiring, account-owned site; this repository contains no hosting credentials.

Do not upload local backups, test reports, credentials or session files. The original distribution ZIPs are not included because they contain an older interface.

## Source rights

Archived third-party documents retain their publishers' rights and attributions. Public access to this repository is not a blanket licence to redistribute or reuse those documents. No new licence is assigned to the research or third-party material by this export.
