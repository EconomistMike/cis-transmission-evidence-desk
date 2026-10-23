// Use the WHATWG URL family used by browser navigation; perform no requests.
const { domainToASCII, domainToUnicode } = require('node:url');
function validPublisherURL(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return false;
    if (url.hostname.startsWith('[')) return true; // URL already validated the IPv6 literal.
    const hostname = url.hostname.replace(/\.$/, '');
    return hostname.length <= 253 && hostname.split('.').every(label => {
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) return false;
      if (!label.startsWith('xn--')) return true;
      // Some supported Node versions preserve malformed ACE labels literally.
      // Require real Unicode decoding and a canonical IDNA round trip.
      const decoded = domainToUnicode(label);
      return decoded !== '' && decoded !== label && domainToASCII(decoded) === label;
    });
  } catch { return false; }
}
module.exports = { validPublisherURL };
if (require.main === module) {
  const value = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
  process.stdout.write(JSON.stringify(validPublisherURL(value)));
}
