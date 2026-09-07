# Australian Transmission Evidence Desk

An editable, static evidence explorer for ten Australian transmission project families. It includes the policy-chart review, source records, archived documents, an Excel workbook and JSON evidence packs.

**Live explorer:** <https://subtle-lasso-pwzp.here.now/> — account-owned, non-expiring hosting on here.now.

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
| `site/evidence-pack.json` | Downloadable structured research snapshot |
| `site/evidence-workbook.xlsx` | Downloadable evidence workbook |
| `site/families/` | Per-project Markdown and JSON packs |
| `site/sources/` | Archived original documents and text derivatives |

After editing `evidence-desk.html`, run `npm run build` to refresh the identical `index.html` entry point. Do not edit the two HTML copies independently.

The default text is black; links and inline actions are blue; labels are grey. Green, amber and red denote evidence status. Long notes expand without removing their original wording. PDF links use recorded page numbers; web pages and text-line references do not invent PDF page jumps.

### Important boundary

This repository contains the **editable local explorer and exported research snapshot**, not the full research/generation pipeline held on cisbox. The JSON download, embedded HTML evidence and workbook are separate exports: changing one does not regenerate the others. Until the canonical pipeline is recovered, keep research changes on a review branch and reconcile all affected exports explicitly. Presentation changes can be made in the JavaScript and CSS without changing research data.

## Test

Requires Node.js 22+ and Python 3:

```sh
npm ci
npx playwright install chromium
npm run build
npm test
```

To use an existing Chrome installation instead of downloading a browser, set `CHROMIUM_PATH` to its executable path before `npm test`.

Tests cover entry-point consistency, source-file availability, all views and Workbook tabs, filters, popups, drawer focus, mobile overflow and preservation of full chart notes. They do not independently validate the research or every source-page citation.

## Collaborate

Fork the repository, create a branch, and open a pull request. Public readers can clone and propose changes without an invitation; direct write access requires a separate collaborator invitation.

For each change, state what changed, whether research values changed, and what you checked. For evidence changes include the source ID, pinpoint, date, units, price basis and project scope. Do not turn different scopes or price bases into an unexplained total. Keep quoted source excerpts unchanged.

## Publish

Publish the contents of `site/` as a static site, preserving its directory structure. The source documents are about 268 MiB in total with the UI and downloads; check the host's limits. The root `index.html` provides the landing page. Here.now requires authenticated publishing for a non-expiring, account-owned site; this repository contains no hosting credentials.

Do not upload local backups, test reports, credentials or session files. The original distribution ZIPs are not included because they contain an older interface.

## Source rights

Archived third-party documents retain their publishers' rights and attributions. Public access to this repository is not a blanket licence to redistribute or reuse those documents. No new licence is assigned to the research or third-party material by this export.
