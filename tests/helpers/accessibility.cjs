// Deliberately bounded structural and Chromium computed-name checks, not WCAG certification.
function inspectStructure({ decorativeImageIndices = [], hiddenAreaIndices = [], focusableAreaIndices = [] } = {}) {
  const issues = [];
  const add = (code, node, detail) => issues.push({ code, element: node?.id ? '#' + node.id : node?.tagName?.toLowerCase(), detail });
  const visible = node => node.checkVisibility({ visibilityProperty: true }) && !node.closest('[inert]');
  const exposed = node => visible(node) && !node.closest('[aria-hidden="true" i]');
  if (!document.documentElement.lang.trim()) add('DOCUMENT_LANGUAGE', document.documentElement, 'Document needs a language');
  if (!document.title.trim()) add('DOCUMENT_TITLE', document.documentElement, 'Document needs a title');
  const ids = new Set();
  for (const node of document.querySelectorAll('[id]')) {
    if (node.id && ids.has(node.id)) add('DUPLICATE_ID', node, node.id);
    ids.add(node.id);
  }
  const references = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant', 'aria-owns', 'aria-details', 'aria-errormessage', 'aria-flowto'];
  for (const node of document.querySelectorAll(references.map(field => `[${field}]`).join(','))) {
    for (const field of references) {
      for (const id of (node.getAttribute(field) || '').split(/\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) add('ARIA_REFERENCE', node, field + ' references missing ' + id);
      }
    }
  }
  for (const [index, node] of [...document.querySelectorAll('img')].entries()) {
    if (exposed(node) && !node.hasAttribute('alt') && !decorativeImageIndices.includes(index)) add('IMAGE_ALT', node, 'Image needs an alt attribute or an effective decorative role');
  }
  for (const node of document.querySelectorAll('a[href]')) {
    const target = new URL(node.href, location.href);
    if (target.origin !== location.origin || target.pathname !== location.pathname || target.search !== location.search || !target.hash) continue;
    try {
      const rawFragment = target.hash.slice(1);
      decodeURIComponent(rawFragment); // Reject malformed encoding even in a directive.
      const fragment = decodeURIComponent(rawFragment.split(':~:')[0]);
      if (!fragment || fragment.toLowerCase() === 'top') continue;
      if (fragment && !document.getElementById(fragment) && ![...document.getElementsByName(fragment)].some(n => n.tagName === 'A')) add('LOCAL_FRAGMENT', node, 'Missing fragment target ' + fragment);
    } catch { add('LOCAL_FRAGMENT', node, 'Malformed fragment encoding'); }
  }
  for (const node of document.querySelectorAll('a[href],area[href],button,input,select,textarea,summary,iframe,[tabindex],[contenteditable],audio[controls],video[controls]')) {
    const parsedIndex = /^[\t\n\f\r ]*([+-]?\d+)/.exec(node.getAttribute('tabindex') || '');
    const validExplicitIndex = parsedIndex && BigInt(parsedIndex[1]) >= -2147483648n && BigInt(parsedIndex[1]) <= 2147483647n;
    const editableTabStop = node.isContentEditable && !node.parentElement?.isContentEditable && !validExplicitIndex;
    const isArea = node.tagName === 'AREA';
    const areaIndex = isArea ? [...document.querySelectorAll('area')].indexOf(node) : -1;
    const ariaHidden = node.closest('[aria-hidden="true" i]') || (isArea && hiddenAreaIndices.includes(areaIndex));
    if (!ariaHidden || !(node.tabIndex >= 0 || editableTabStop) || node.matches(':disabled')) continue;
    const focusTarget = isArea ? focusableAreaIndices.includes(areaIndex) : visible(node);
    if (focusTarget) add('HIDDEN_FOCUSABLE', node, 'Aria-hidden content contains a sequential keyboard focus target');
  }
  return issues;
}

async function restoreProbeFocus(probe, path) {
  await probe.evaluate(() => document.activeElement?.blur());
  if (!path) return;
  const session = await probe.context().newCDPSession(probe);
  const forced = [];
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    let selector = 'html';
    for (let depth = 0; depth <= path.length; depth++) {
      if (depth) selector += ' > :nth-child(' + (path[depth - 1] + 1) + ')';
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      if (!nodeId) throw new Error('Focus target changed while reproducing the static snapshot');
      const states = depth === path.length ? ['focus', 'focus-within', 'focus-visible'] : ['focus-within'];
      await session.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states });
      forced.push(nodeId);
    }
    await probe.locator(selector).evaluate(node => node.focus({ preventScroll: true }));
    if (!await probe.locator(selector).evaluate(node => document.activeElement === node)) throw new Error('Could not reproduce native focus in the static snapshot');
  } finally {
    try { for (const nodeId of forced) await session.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }); }
    finally { await session.detach(); }
  }
}

async function probeAreaFocus(page, hiddenAreas) {
  const candidates = await page.locator('area').evaluateAll((areas, hidden) => areas.flatMap((node, index) =>
    node.tabIndex >= 0 && (hidden.includes(index) || node.closest('[aria-hidden="true" i]')) ? [index] : []), hiddenAreas);
  if (!candidates.length) return [];
  // Probe a separate context: restoring activeElement in the
  // original page would still change its next sequential keyboard starting point.
  const scriptingEnabled = await page.evaluate(() => matchMedia('(scripting: enabled)').matches);
  const context = await page.context().browser().newContext({ javaScriptEnabled: scriptingEnabled, viewport: page.viewportSize() || undefined });
  try {
    const probe = await context.newPage();
    const state = await page.evaluate(() => {
      const snapshot = document.documentElement.cloneNode(true);
      const originals = [document.documentElement, ...document.documentElement.querySelectorAll('*')];
      const copies = [snapshot, ...snapshot.querySelectorAll('*')];
      const focused = document.activeElement?.matches(':focus') ? copies[originals.indexOf(document.activeElement)] : null;
      const policy = document.createElement('meta');
      policy.httpEquiv = 'Content-Security-Policy';
      policy.content = "script-src 'none'; frame-src 'none'; object-src 'none'; worker-src 'none'";
      snapshot.querySelector('head').prepend(policy);
      const doctype = document.doctype ? new XMLSerializer().serializeToString(document.doctype) : '';
      const focusPath = focused ? [] : null;
      for (let node = focused; node && node !== snapshot; node = node.parentElement) focusPath.unshift([...node.parentElement.children].indexOf(node));
      return {
        html: doctype + snapshot.outerHTML, focusPath, scroll: [scrollX, scrollY],
        inputs: [...document.querySelectorAll('input')].map(node => ({ value: node.value, checked: node.checked, indeterminate: node.indeterminate })),
        textareas: [...document.querySelectorAll('textarea')].map(node => node.value),
        selects: [...document.querySelectorAll('select')].map(node => ({ index: node.selectedIndex, selected: [...node.options].map(option => option.selected) })),
      };
    });
    const navigationUrl = page.url();
    const url = navigationUrl.split('#')[0];
    if (/^https?:/.test(url)) {
      await probe.route('**/*', route => {
        const target = route.request().url();
        if (target === url) return route.fulfill({ contentType: 'text/html', body: state.html });
        if (new URL(target).origin === new URL(url).origin) return route.continue();
        return route.abort();
      });
      await probe.goto(navigationUrl, { timeout: 10000 });
    } else {
      await probe.route('**/*', route => route.abort());
      await probe.setContent(state.html, { timeout: 10000 });
    }
    await probe.evaluate(state => {
      for (const [index, node] of [...document.querySelectorAll('input')].entries()) {
        if (node.type !== 'file') node.value = state.inputs[index].value;
        node.checked = state.inputs[index].checked;
        node.indeterminate = state.inputs[index].indeterminate;
      }
      for (const [index, node] of [...document.querySelectorAll('textarea')].entries()) node.value = state.textareas[index];
      for (const [index, node] of [...document.querySelectorAll('select')].entries()) {
        if (node.multiple) [...node.options].forEach((option, offset) => option.selected = state.selects[index].selected[offset]);
        else node.selectedIndex = state.selects[index].index;
      }
      scrollTo(...state.scroll);
    }, state);
    // Sequential keyboard targets use keyboard modality. Recreate the original
    // native focus before each candidate; forced CSS only bootstraps hidden maps.
    await probe.keyboard.press('Tab');
    const focusable = [];
    for (const index of candidates) {
      await restoreProbeFocus(probe, state.focusPath);
      const focused = await probe.locator('area').nth(index).evaluate(node => {
        node.focus({ preventScroll: true });
        void document.documentElement.offsetHeight;
        return document.activeElement === node;
      });
      if (focused) focusable.push(index);
    }
    return focusable;
  } finally { await context.close(); }
}

async function inspectAccessibility(page) {
  const decorativeImages = await page.getByRole('presentation').or(page.getByRole('none')).evaluateAll(elements => {
    const images = [...document.querySelectorAll('img')];
    return elements.map(node => images.indexOf(node)).filter(index => index >= 0);
  });
  let issues;
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const { root } = await session.send('DOM.getDocument');
    const areas = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'area' });
    const hiddenAreas = [];
    for (const [index, nodeId] of areas.nodeIds.entries()) {
      const { node } = await session.send('DOM.describeNode', { nodeId });
      const partial = await session.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: true });
      const areaAX = partial.nodes.find(ax => ax.backendDOMNodeId === node.backendNodeId);
      let hidden = areaAX?.ignoredReasons?.some(reason => ['ariaHiddenElement', 'ariaHiddenSubtree'].includes(reason.name));
      // Focus can cause Chromium to expose an aria-hidden area temporarily.
      // Its AX parent chain still identifies the effective associated image.
      for (let parent = partial.nodes.find(ax => ax.nodeId === areaAX?.parentId); parent; parent = partial.nodes.find(ax => ax.nodeId === parent.parentId)) {
        if (!parent.backendDOMNodeId) continue;
        const described = await session.send('DOM.describeNode', { backendNodeId: parent.backendDOMNodeId });
        if (described.node.nodeName !== 'IMG') continue;
        const resolved = await session.send('DOM.resolveNode', { backendNodeId: parent.backendDOMNodeId });
        try {
          const result = await session.send('Runtime.callFunctionOn', { objectId: resolved.object.objectId, functionDeclaration: `function() { return Boolean(this.closest('[aria-hidden="true" i]')); }`, returnByValue: true });
          hidden ||= result.result.value;
        } finally { await session.send('Runtime.releaseObject', { objectId: resolved.object.objectId }); }
        break;
      }
      if (hidden) hiddenAreas.push(index);
    }
    const focusableAreas = await probeAreaFocus(page, hiddenAreas);
    issues = await page.evaluate(inspectStructure, { decorativeImageIndices: decorativeImages, hiddenAreaIndices: hiddenAreas, focusableAreaIndices: focusableAreas });
    if (nodes.filter(node => !node.ignored && node.role?.value === 'main').length !== 1) issues.push({ code: 'MAIN_LANDMARK', element: 'document', detail: 'Expected one exposed main landmark' });
    const namedRoles = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'listbox', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'treeitem', 'option', 'slider', 'spinbutton', 'Date', 'DateTime', 'InputTime', 'ColorWell', 'dialog', 'region']);
    for (const node of nodes) {
      if (!node.ignored && namedRoles.has(node.role?.value) && !node.name?.value?.trim()) issues.push({ code: 'EMPTY_ACCESSIBLE_NAME', element: node.role.value, detail: 'Exposed control or named landmark needs a computed accessible name' });
    }
    // Chromium demotes unnamed regions to generic. Reuse Playwright's effective-role
    // semantics so fallback tokens work without treating inactive tokens as regions.
    const effectiveRegions = await page.getByRole('region').or(page.getByRole('dialog')).evaluateAll(elements => {
      const explicit = [...document.querySelectorAll('[role]')];
      return elements.map(node => explicit.indexOf(node)).filter(index => index >= 0);
    });
    const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[role]' });
    for (const index of effectiveRegions) {
      if (nodeIds[index] === undefined) throw new Error('Role inspection DOM changed during the check');
      const { node } = await session.send('DOM.describeNode', { nodeId: nodeIds[index] });
      const ax = nodes.find(candidate => candidate.backendDOMNodeId === node.backendNodeId);
      if (ax && !ax.ignored && !namedRoles.has(ax.role?.value) && !ax.name?.value?.trim()) issues.push({ code: 'EMPTY_ACCESSIBLE_NAME', element: 'explicit landmark', detail: 'Region or dialog needs a computed accessible name' });
    }
  } finally { await session.detach(); }
  return issues;
}
module.exports = { inspectAccessibility };
