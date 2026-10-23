# Browser safeguards

Run the complete existing suite from the repository root:

```sh
nice -n 10 npm test
```

Use the repository's existing Playwright and Chromium setup. `CHROMIUM_PATH` may
select an already installed browser; these checks install no browser or packages.

The added accessibility cases check document language/title, one exposed main
landmark, duplicate IDs, ARIA ID references, image alternatives, same-document
fragments and keyboard targets inside aria-hidden content. Chromium's computed
accessibility tree supplies control and region/dialog names, including native
input names. Negative fixtures demonstrate each selected guard. Positive fixtures
retain native labels, title names, decorative images and inert content.

Ten public view/sheet combinations are checked at 1440px and 390px, with explicit
activation assertions. The evidence popup is also checked for keyboard entry,
close-button focus, Escape/close activation, focus restoration and horizontal
containment at both widths. Local targets are collected across all views,
including archives and linked assets; each must return a successful HTTP status.
A missing-file fixture proves the local-link guard observes a 404. Archive
coverage requires visible anchors; permanently hidden links cannot satisfy it.
Image targets include the browser-selected currentSrc and declared fallback,
including picture-selected images with no src attribute. Picture success fixtures
intercept a synthetic image response; missing-picture HTTP checks use a real 404.
Browser-defined top and text-directive fragments are accepted; text matching is
outside this check. Main roles come from the exposed accessibility tree.
Rendering visibility uses Chromium's checkVisibility API. Hidden-state matching
retains case-insensitive ARIA values, inherited disabled state, closed details
and nested editing-host behaviour in dedicated fixtures.
Native search/list/date/time/colour control names are covered. Region/dialog
fallback tokens use the existing Playwright effective-role query, including
fixtures where a later region token is inactive.
The image attribute check requires alt unless the effective role is decorative;
focusable images do not inherit a decorative exemption from literal role text.
Editor Tab-stop fixtures cover empty/invalid/overflow attributes and valid
negative integer prefixes using Chromium's signed 32-bit parsing behaviour.

This is a bounded Chromium regression suite, not a complete WCAG audit. It does
not assess contrast, prose quality, reading order, every keyboard interaction,
other browser engines, publisher availability, PDF page meaning or HTTP-200 error
pages. New tests use the existing npm command; no existing test, expectation,
configuration, dependency or deployment workflow is changed.

Image-map areas have no box. Their hidden state comes from Chromium's partial
accessibility tree, including ARIA hiding inherited through the associated image.
For a hidden area with non-negative tabindex, the check probes native focus in
a separate browser context containing the current HTML, full URL and viewport.
It retains the original scripting flag and document type; an injected script-src
policy prevents page scripts from executing, preserving inactive noscript content
and scripting-dependent media rules.
It preserves the inspected page’s focus and next Tab starting point. Chromium determines map
association, rendering and inertness rather than a parallel DOM approximation.
Actual-Tab fixtures cover single/shared maps, name/ID association, failed images,
ARIA hiding and valid non-target controls. The check remains Chromium-specific;
programmatic focus is used only in that disposable area-probe context, and actual
sequential navigation supplies the fixture oracle. Probe resources are confined
to the inspected HTTP origin (data-URI fixtures need no network); page scripts do
not run there. These static-page checks do not reconstruct arbitrary script state. Native rendering visibility also permits
CSS to override the hidden attribute.

The disposable area probe retains native input/textarea values, checked and
selected state, window scroll and the original native focus. A temporary forced
CSS focus state bootstraps restoration where an image is visible only through
focus-within; forced states are cleared before candidate checks. Each candidate
starts from that restored focus, in keyboard modality. File selections and
arbitrary JavaScript application state are not reconstructed. These operations
remain confined to the disposable context.

The twenty actual-view checks each have a 120-second test budget. A loaded-host
integration exceeded the prior 30-second default in the policy view. The guard,
fixtures and assertions are unchanged; the link sweep retains its separate
180-second aggregate and 10-second per-request limits.

The ARIA relationship guard checks labelledby, describedby, controls,
activedescendant, owns, details, errormessage and flowto ID references.
Computed-name probes include switch, tab, menu-item variants, tree-item and
option roles, with exposed unnamed/labelled counterpart fixtures in Chromium.
These remain bounded structural checks, not complete ARIA conformance checks.

Computed-name checks also include alert dialogs and name-required grid, treegrid,
tree, radio-group, meter and progress-bar widgets. Scrollbar names remain optional
under [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#scrollbar); valid unnamed
and named scrollbar fixtures guard against imposing an extra requirement.
