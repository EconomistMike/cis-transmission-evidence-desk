async function embeddedPayload(page, url, html) {
  const handler = route => route.fulfill({
    status: 200, contentType: 'text/html; charset=utf-8', body: html,
    headers: { 'content-security-policy': "default-src 'none'; script-src 'none'" },
  });
  await page.route(url, handler);
  try {
    await page.goto(url);
    const marker = await page.evaluate(() => {
      const matches = document.querySelectorAll('[id="evidence"]');
      const node = document.getElementById('evidence');
      return { count: matches.length, tag: node?.tagName, type: node?.getAttribute('type'), payload: node?.textContent };
    });
    if (marker.count !== 1) throw new Error('EVIDENCE_SCRIPT_COUNT: expected one document element');
    if (marker.tag !== 'SCRIPT' || marker.type?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      throw new Error('EVIDENCE_SCRIPT_TYPE: expected an application/json script');
    }
    return marker.payload;
  } finally {
    await page.unroute(url, handler);
  }
}

module.exports = { embeddedPayload };
