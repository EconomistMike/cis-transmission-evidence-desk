const { test, expect } = require('@playwright/test');
const { inspectAccessibility } = require('./helpers/accessibility.cjs');
const fixture = body => `<html lang="en"><head><title>Check fixture</title></head><body><main>${body}</main></body></html>`;
const fixtureImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

for (const [label, html, code] of [
  ['language', fixture('OK').replace('lang="en"', ''), 'DOCUMENT_LANGUAGE'],
  ['title', fixture('OK').replace('<title>Check fixture</title>', ''), 'DOCUMENT_TITLE'],
  ['main', fixture('OK').replaceAll('main', 'section'), 'MAIN_LANDMARK'],
  ['exposed main role', fixture('OK').replace('<main>', '<main role="presentation">'), 'MAIN_LANDMARK'],
  ['duplicate ID', fixture('<p id="same">One</p><p id="same">Two</p>'), 'DUPLICATE_ID'],
  ['ARIA reference', fixture('<button aria-describedby="absent">Details</button>'), 'ARIA_REFERENCE'],
  ['button name', fixture('<button></button>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['textbox name', fixture('<input>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['search field name', fixture('<input type="search">'), 'EMPTY_ACCESSIBLE_NAME'],
  ...['date', 'datetime-local', 'month', 'week', 'time', 'color'].map(type => [`${type} field name`, fixture(`<input type="${type}">`), 'EMPTY_ACCESSIBLE_NAME']),
  ['multiple select name', fixture('<select multiple><option>Choice</option></select>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['list select name', fixture('<select size="3"><option>Choice</option></select>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['first region token name', fixture('<section role="region generic">Body</section>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['fallback region token name', fixture('<section role="unknown region">Body</section>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['region name', fixture('<section role="region">Body text is not a landmark name</section>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['select name', fixture('<select><option>Option text is not a label</option></select>'), 'EMPTY_ACCESSIBLE_NAME'],
  ['image alternative', fixture('<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">'), 'IMAGE_ALT'],
  ['focusable decorative image alternative', fixture(`<img role="presentation" tabindex="0" src="${fixtureImage}">`), 'IMAGE_ALT'],
  ['fragment target', fixture('<a href="#absent">Go</a>'), 'LOCAL_FRAGMENT'],
  ['fragment encoding', fixture('<a href="#%ZZ">Go</a>'), 'LOCAL_FRAGMENT'],
  ['hidden focus target', fixture('<div aria-hidden="true"><button>Still tabbable</button></div>'), 'HIDDEN_FOCUSABLE'],
  ['self-hidden focus target', fixture('<button aria-hidden="true">Still tabbable</button>'), 'HIDDEN_FOCUSABLE'],
  ['hidden editable', fixture('<div aria-hidden="true" contenteditable="true">Editable</div>'), 'HIDDEN_FOCUSABLE'],
  ['mixed-case hidden self', fixture('<button aria-hidden="TRUE">Hidden</button>'), 'HIDDEN_FOCUSABLE'],
  ['mixed-case hidden ancestor', fixture('<div aria-hidden="TrUe"><button>Hidden</button></div>'), 'HIDDEN_FOCUSABLE'],
  ['explicit nested editor Tab stop', fixture('<div contenteditable tabindex="-1"><span contenteditable aria-hidden="true" tabindex="0">Nested</span></div>'), 'HIDDEN_FOCUSABLE'],
]) {
  test(`accessibility guard rejects missing ${label}`, async ({ page }) => {
    await page.setContent(html);
    expect((await inspectAccessibility(page)).map(issue => issue.code)).toContain(code);
  });
}

test('accessibility guard accepts native names, labelled regions and inert or decorative content', async ({ page }) => {
  await page.setContent(fixture('<label for="entry">Search records</label><input id="entry"><input type="submit"><button title="Close"></button><span id="region-label">Evidence</span><section role="region" aria-labelledby="region-label">Body</section><img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="><img alt="Informative diagram" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="><div inert aria-hidden="true"><button>Inactive</button></div>'));
  expect(await inspectAccessibility(page)).toEqual([]);
});

test('browser semantics retain display-contents main, disabled descendants and special fragments', async ({ page }) => {
  await page.setContent(fixture('<fieldset disabled aria-hidden="true"><button>Disabled by fieldset</button></fieldset><a href="#top">Top</a><a href="#:~:text=Example">Text directive</a>'));
  await page.locator('main').evaluate(node => node.style.display = 'contents');
  expect(await inspectAccessibility(page)).toEqual([]);
});

test('browser semantics retain hidden CSS content and a labelled search field', async ({ page }) => {
  await page.setContent(fixture('<button aria-hidden="true" style="visibility:hidden">Not a Tab target</button><label>Search records<input type="search"></label>'));
  expect(await inspectAccessibility(page)).toEqual([]);
});

test('native control labels and effective role fallback preserve valid names and inactive tokens', async ({ page }) => {
  const controls = ['date', 'datetime-local', 'month', 'week', 'time', 'color'].map(type => `<label>${type} record<input type="${type}"></label>`).join('');
  await page.setContent(fixture(controls + '<label>Multiple records<select multiple><option>Choice</option></select></label><label>Record list<select size="3"><option>Choice</option></select></label><section role="region generic" aria-label="First region">Body</section><section role="unknown region" aria-label="Fallback region">Body</section><section role="generic region">Inactive region</section><section role="group region">Inactive region</section>'));
  expect(await inspectAccessibility(page)).toEqual([]);
});

test('decorative image role whitespace and fallback use effective semantics', async ({ page }) => {
  await page.setContent(fixture(`<img role=" presentation " src="${fixtureImage}"><img role="unknown presentation" src="${fixtureImage}"><img role="none" src="${fixtureImage}">`));
  expect(await inspectAccessibility(page)).toEqual([]);
});

for (const value of ['', 'invalid', '-2147483649', '2147483648']) {
  test(`hidden editing host with default tabindex ${JSON.stringify(value)} remains a Tab target`, async ({ page }) => {
    await page.setContent(fixture(`<button id="start">Start</button><div id="editor" contenteditable aria-hidden="true" tabindex="${value}">Edit</div><button id="end">End</button>`));
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#editor')).toBeFocused();
    expect((await inspectAccessibility(page)).map(issue => issue.code)).toContain('HIDDEN_FOCUSABLE');
  });
}

test('valid negative editing-host tabindex values stay outside sequential navigation', async ({ page }) => {
  for (const value of ['-1', ' -1junk', '-2147483648']) {
    await page.setContent(fixture(`<button id="start">Start</button><div id="editor" contenteditable aria-hidden="true" tabindex="${value}">Edit</div><button id="end">End</button>`));
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#end')).toBeFocused();
    expect(await inspectAccessibility(page)).toEqual([]);
  }
});

test('rendering and editing hosts distinguish non-targets while retaining summaries and valid fragments', async ({ page }) => {
  await page.setContent(fixture('<div style="content-visibility:hidden"><button aria-hidden="true">Skipped content</button></div><details><summary>Operable summary</summary><button aria-hidden="true">Closed content</button></details><div contenteditable tabindex="-1"><span contenteditable aria-hidden="true">Nested editor</span></div><a href="#section%20one">ID fragment</a><section id="section one">Target</section><a name="legacy"></a><a href="#legacy">Named anchor</a>'));
  expect(await inspectAccessibility(page)).toEqual([]);
  await page.locator('summary').focus();
  await expect(page.locator('summary')).toBeFocused();
});

for (const [label, area, map, image, detected] of [
  ['self hidden', 'aria-hidden="true"', '', '', true],
  ['map hidden', '', 'aria-hidden="true"', '', true],
  ['inert map still tabbable', '', 'aria-hidden="true" inert', '', true],
  ['inert area still tabbable', 'aria-hidden="true" inert', '', '', true],
  ['hidden associated image', 'aria-hidden="true"', '', 'hidden', false],
  ['inert associated image', 'aria-hidden="true"', '', 'inert', false],
  ['negative area tabindex', 'aria-hidden="true" tabindex="-1"', '', '', false],
]) {
  test(`image-map keyboard guard handles ${label}`, async ({ page }) => {
    await page.setContent(fixture(`<button id="start">Start</button><img ${image} width="100" height="100" src="${fixtureImage}" usemap="#fixture-map" alt="Diagram"><map name="fixture-map" ${map}><area id="target" ${area} shape="rect" coords="0,0,100,100" href="#end" alt="Area"></map><button id="end">End</button>`));
    await expect(page.locator('img')).toHaveJSProperty('naturalWidth', 1);
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(detected ? '#target' : '#end')).toBeFocused();
    const hiddenTargets = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
    expect(hiddenTargets.map(issue => issue.element)).toEqual(detected ? ['#target'] : []);
  });
}

for (const [label, wrapper, image, focused, detected] of [
  ['hidden image', '', 'aria-hidden="true"', true, true],
  ['hidden image ancestor', 'aria-hidden="TRUE"', '', true, true],
  ['exposed image', '', '', true, false],
  ['CSS hidden image', '', 'aria-hidden="true" style="visibility:hidden"', false, false],
]) {
  test(`image-map keyboard guard follows associated ${label}`, async ({ page }) => {
    await page.setContent(fixture(`<button id="start">Start</button><div ${wrapper}><img ${image} width="100" height="100" src="${fixtureImage}" usemap="#fixture-map" alt="Diagram"></div><map name="fixture-map"><area id="target" shape="rect" coords="0,0,100,100" href="#end" alt="Area"></map><button id="end">End</button>`));
    await expect(page.locator('img')).toHaveJSProperty('naturalWidth', 1);
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(focused ? '#target' : '#end')).toBeFocused();
    const hiddenTargets = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
    expect(hiddenTargets.map(issue => issue.element)).toEqual(detected ? ['#target'] : []);
  });
}

for (const [label, first, second, area, focused, detected] of [
  ['exposed first image', '', 'aria-hidden="true"', '', true, false],
  ['hidden first image', 'aria-hidden="true"', '', '', true, true],
  ['inert first image', 'inert', '', 'aria-hidden="true"', false, false],
  ['unrendered first image', 'hidden', '', 'aria-hidden="true"', false, false],
  ['invisible first image', 'style="visibility:hidden"', '', 'aria-hidden="true"', false, false],
]) {
  test(`shared image-map guard respects ${label}`, async ({ page }) => {
    await page.setContent(fixture(`<button id="start">Start</button><img ${first} width="100" height="100" src="${fixtureImage}" usemap="#shared" alt="First diagram"><img ${second} width="100" height="100" src="${fixtureImage}" usemap="#shared" alt="Second diagram"><map name="shared"><area id="target" ${area} shape="rect" coords="0,0,100,100" href="#end" alt="Area"></map><button id="end">End</button>`));
    for (const image of await page.locator('img').all()) await expect(image).toHaveJSProperty('naturalWidth', 1);
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(focused ? '#target' : '#end')).toBeFocused();
    const hiddenTargets = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
    expect(hiddenTargets.map(issue => issue.element)).toEqual(detected ? ['#target'] : []);
  });
}

for (const [label, map, area, image, extra, detected] of [
  ['map ID hidden area', 'id="fixture-map"', 'aria-hidden="true"', '', '', true],
  ['map ID hidden image', 'id="fixture-map"', '', 'aria-hidden="true"', '', true],
  ['map ID exposed', 'id="fixture-map"', '', '', '', false],
  ['failed image hidden area', 'name="fixture-map"', 'aria-hidden="true"', 'data-broken', '', true],
  ['failed first shared image', 'name="fixture-map"', 'aria-hidden="true"', 'data-broken', `<img src="${fixtureImage}" usemap="#fixture-map" width="100" height="100" alt="Second diagram">`, true],
  ['failed image exposed', 'name="fixture-map"', '', 'data-broken', '', false],
]) {
  test(`image-map native focus handles ${label}`, async ({ page }) => {
    const source = image.includes('data-broken') ? 'data:image/png;base64,broken' : fixtureImage;
    await page.setContent(fixture(`<button id="start">Start</button><img ${image} src="${source}" width="100" height="100" usemap="#fixture-map" alt="Diagram">${extra}<map ${map}><area id="target" ${area} shape="rect" coords="0,0,100,100" href="#end" alt="Area"></map><button id="end">End</button>`));
    await expect(page.locator('img').first()).toHaveJSProperty('complete', true);
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#target')).toBeFocused();
    const hiddenTargets = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
    expect(hiddenTargets.map(issue => issue.element)).toEqual(detected ? ['#target'] : []);
    await expect(page.locator('#target')).toBeFocused();
  });
}

test('area inspection preserves the first Tab from initially unfocused content', async ({ page }) => {
  await page.setContent(fixture(`<button id="start">Start</button><img src="${fixtureImage}" usemap="#m" width="100" height="100" alt="Map"><map name="m"><area aria-hidden="true" href="#end" alt="Area"></map><button id="end">End</button>`));
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BODY');
  expect((await inspectAccessibility(page)).map(issue => issue.code)).toContain('HIDDEN_FOCUSABLE');
  await page.keyboard.press('Tab');
  await expect(page.locator('#start')).toBeFocused();
});

for (const hidden of [true, false]) {
  test(`explicit area without href retains inherited hidden=${hidden} semantics`, async ({ page }) => {
    await page.setContent(fixture(`<button id="start">Start</button><img ${hidden ? 'aria-hidden="true"' : ''} src="${fixtureImage}" usemap="#m" width="100" height="100" alt="Map"><map name="m"><area id="target" tabindex="0" alt="Area"></map><button id="end">End</button>`));
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#target')).toBeFocused();
    const hiddenTargets = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
    expect(hiddenTargets.map(issue => issue.element)).toEqual(hidden ? ['#target'] : []);
    await expect(page.locator('#target')).toBeFocused();
  });
}

for (const [label, css, fallback, focused] of [
  ['fragment exposes image', '#diagram { display:none } #diagram:target { display:block }', '', true],
  ['fragment hides image', '#diagram:target { display:none }', '', false],
  ['inactive fallback cannot hide image', '', '<noscript><style>#diagram { display:none }</style></noscript>', true],
  ['inactive fallback cannot expose image', '#diagram { display:none }', '<noscript><style>#diagram { display:block }</style></noscript>', false],
  ['scripting media can expose image', '#diagram { display:none } @media (scripting: enabled) { #diagram { display:block } }', '', true],
  ['inactive scripting media cannot expose image', '#diagram { display:none } @media (scripting: none) { #diagram { display:block } }', '', false],
  ['inactive fallback cannot shift areas', '', '<noscript><map name="unused"><area tabindex="0" alt="Unused"></map></noscript>', true],
]) {
  test(`isolated area snapshot retains ${label}`, async ({ page }) => {
    const html = fixture(`<style>${css}</style>${fallback}<button id="start">Start</button><div id="diagram"><img src="${fixtureImage}" usemap="#m" width="100" height="100" alt="Map"></div><map name="m"><area id="target" aria-hidden="true" href="#end" alt="Area"></map><button id="end">End</button>`);
    await page.route('**/__guard_area_snapshot__', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('/__guard_area_snapshot__#diagram');
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(focused ? '#target' : '#end')).toBeFocused();
    const hiddenTargets = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
    expect(hiddenTargets.map(issue => issue.element)).toEqual(focused ? ['#target'] : []);
    await expect(page.locator(focused ? '#target' : '#end')).toBeFocused();
  });
}

test('area snapshot blocks scripts and handlers without changing scripting semantics', async ({ page }) => {
  await page.setContent(fixture(`<button id="start">Start</button><img id="diagram" src="${fixtureImage}" onload="this.style.display='none'" usemap="#m" width="100" height="100" alt="Map"><script>document.querySelector('#diagram').style.display='none'</script><map name="m"><area id="target" aria-hidden="true" href="#end" alt="Area"></map><button id="end">End</button>`));
  await expect(page.locator('img')).toHaveJSProperty('complete', true);
  await page.locator('img').evaluate(node => node.style.display = 'block');
  await page.locator('#start').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#target')).toBeFocused();
  expect((await inspectAccessibility(page)).map(issue => issue.code)).toContain('HIDDEN_FOCUSABLE');
  await expect(page.locator('#target')).toBeFocused();
});

for (const [label, css, target] of [
  ['exposes image', 'img { display:none } main:focus-within img { display:block }', '#target'],
  ['hides image', 'main:focus-within img { display:none }', '#end'],
]) {
  test(`area snapshot preserves native focus that ${label}`, async ({ page }) => {
    await page.setContent(fixture(`<style>${css}</style><button id="start">Start</button><img src="${fixtureImage}" usemap="#m" width="100" height="100" alt="Map"><map name="m"><area id="target" aria-hidden="true" href="#end" alt="Area"></map><button id="end">End</button>`));
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(target)).toBeFocused();
    for (const start of ['#start', target]) {
      await page.locator(start).focus();
      const issues = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
      expect(issues.map(issue => issue.element)).toEqual(target === '#target' ? ['#target'] : []);
      await expect(page.locator(start)).toBeFocused();
    }
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(target)).toBeFocused();
  });
}

for (const [label, css, target] of [
  ['exposes image', '#diagram { display:none } input:checked ~ #diagram { display:block }', '#target'],
  ['hides image', 'input:checked ~ #diagram { display:none }', '#end'],
]) {
  test(`area snapshot preserves native checked state that ${label}`, async ({ page }) => {
    await page.setContent(fixture(`<style>${css}</style><input id="toggle" type="checkbox" tabindex="-1" aria-label="Toggle"><button id="start">Start</button><div id="diagram"><img src="${fixtureImage}" usemap="#m" width="100" height="100" alt="Map"></div><map name="m"><area id="target" aria-hidden="true" href="#end" alt="Area"></map><button id="end">End</button>`));
    await page.locator('#toggle').evaluate(node => node.checked = true);
    expect(await page.locator('#toggle').getAttribute('checked')).toBeNull();
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(target)).toBeFocused();
    const issues = (await inspectAccessibility(page)).filter(issue => issue.code === 'HIDDEN_FOCUSABLE');
    expect(issues.map(issue => issue.element)).toEqual(target === '#target' ? ['#target'] : []);
    await expect(page.locator(target)).toBeFocused();
    await expect(page.locator('#toggle')).toBeChecked();
  });
}

test('CSS-rendered hidden attribute controls remain keyboard targets', async ({ page }) => {
  await page.setContent(fixture('<button id="start">Start</button><button id="target" hidden style="display:block" aria-hidden="true">Target</button><button>End</button>'));
  await page.locator('#start').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#target')).toBeFocused();
  expect((await inspectAccessibility(page)).map(issue => issue.code)).toContain('HIDDEN_FOCUSABLE');
});

for (const width of [1440, 390]) {
  for (const [view, sheet] of [['latest-chart'], ['latest'], ['dashboard'], ['chart'], ['policy'], ['workbook', 'estimates'], ['workbook', 'scope'], ['workbook', 'timeline'], ['workbook', 'sources'], ['desk']]) {
    test(`public view ${view}/${sheet || ''} retains structural accessibility at ${width}px`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/?view=' + view);
      await expect(page.locator('#' + view)).toHaveClass('mode active');
      if (sheet) {
        await page.locator(`[data-sheet="${sheet}"]`).click();
        await expect(page.locator('#' + sheet)).toHaveClass('subsheet active');
      }
      expect(await inspectAccessibility(page)).toEqual([]);
    });
  }
}

async function tabTo(page, target) {
  for (let step = 0; step < 32; step++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(node => node === document.activeElement)) return true;
  }
  return false;
}

test('keyboard-entry guard detects a trigger removed from the tab order', async ({ page }) => {
  await page.setContent(fixture('<div id="start" tabindex="0">Start</div><button id="target" tabindex="-1">Excluded trigger</button><button>Following</button>'));
  await page.locator('#start').focus();
  expect(await tabTo(page, page.locator('#target'))).toBe(false);
});

for (const width of [1440, 390]) {
  test(`evidence popup supports keyboard entry and focus restoration at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/?view=chart');
    const trigger = page.locator('#chart-table [data-card]').first();
    const popup = page.getByRole('dialog', { name: 'Evidence details', exact: true });
    await page.locator('#chart-table .table-wrap').focus();
    expect(await tabTo(page, trigger)).toBe(true);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(popup).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Close evidence details' })).toBeFocused();
    expect(await inspectAccessibility(page)).toEqual([]);
    const bounds = await popup.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowDown');
    await popup.getByRole('button', { name: 'Close evidence details' }).press('Enter');
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}


for (const attribute of ['aria-activedescendant', 'aria-owns', 'aria-details', 'aria-errormessage', 'aria-flowto']) {
  test(`ARIA reference guard covers ${attribute}`, async ({ page }) => {
    await page.setContent(fixture(`<div role="combobox" aria-label="Records" aria-expanded="true" aria-controls="choices" ${attribute}="absent" aria-invalid="true"></div><p id="message">Details</p><div role="listbox" id="choices" aria-label="Choices"><div role="option" id="choice" aria-selected="false">One</div></div>`));
    expect(await inspectAccessibility(page)).toContainEqual(expect.objectContaining({ code: 'ARIA_REFERENCE', detail: `${attribute} references missing absent` }));
    await page.locator('[role="combobox"]').evaluate((node, attribute) => node.setAttribute(attribute, attribute === 'aria-owns' ? 'choices' : attribute === 'aria-activedescendant' ? 'choice' : 'message'), attribute);
    expect(await inspectAccessibility(page)).toEqual([]);
  });
}


const namedWidgets = [
  ['alertdialog', 'aria-modal="true"', '', '', '<p>Alert content</p>'],
  ['grid', '', '', '', '<div role="row"><div role="gridcell">Cell</div></div>'],
  ['treegrid', '', '', '', '<div role="row"><div role="gridcell">Cell</div></div>'],
  ['tree', '', '', '', '<div role="treeitem" aria-selected="false">Entry</div>'],
  ['radiogroup', '', '', '', '<div role="radio" aria-checked="false">Choice</div>'],
  ['meter', 'aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"', '', ''],
  ['progressbar', 'aria-valuenow="50"', '', ''],
  ['switch', 'aria-checked="false"', '', ''],
  ['tab', 'aria-selected="false"', '<div role="tablist" aria-label="Tabs">', '</div>'],
  ['menuitem', '', '<div role="menu" aria-label="Actions">', '</div>'],
  ['menuitemcheckbox', 'aria-checked="false"', '<div role="menu" aria-label="Actions">', '</div>'],
  ['menuitemradio', 'aria-checked="false"', '<div role="menu" aria-label="Actions">', '</div>'],
  ['treeitem', 'aria-selected="false"', '<div role="tree" aria-label="Records">', '</div>'],
  ['option', 'aria-selected="false"', '<div role="listbox" aria-label="Choices">', '</div>'],
];
for (const [role, attributes, prefix, suffix, content = ''] of namedWidgets) {
  test(`computed name guard covers ${role}`, async ({ page }) => {
    await page.setContent(fixture(`${prefix}<div id="widget" role="${role}" ${attributes} tabindex="0">${content}</div>${suffix}`));
    await expect(page.getByRole(role)).toHaveCount(1);
    expect(await inspectAccessibility(page)).toContainEqual(expect.objectContaining({ code: 'EMPTY_ACCESSIBLE_NAME', element: role }));
    await page.locator('#widget').evaluate(node => node.setAttribute('aria-label', 'Record action'));
    await expect(page.getByRole(role)).toHaveAccessibleName('Record action');
    expect(await inspectAccessibility(page)).toEqual([]);
  });
}


test('ARIA scrollbars preserve optional accessible names', async ({ page }) => {
  // WAI-ARIA 1.2 #scrollbar: Accessible Name Required is False.
  await page.setContent(fixture('<div role="scrollbar" id="scroll" aria-controls="content" aria-valuenow="50" tabindex="0"></div><div id="content">Scrollable content</div>'));
  await expect(page.getByRole('scrollbar')).toHaveCount(1);
  expect(await inspectAccessibility(page)).toEqual([]);
  await page.locator('#scroll').evaluate(node => node.setAttribute('aria-label', 'Record position'));
  await expect(page.getByRole('scrollbar')).toHaveAccessibleName('Record position');
  expect(await inspectAccessibility(page)).toEqual([]);
});
