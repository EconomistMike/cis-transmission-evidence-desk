import { copyFile } from 'node:fs/promises';
await copyFile(new URL('../site/evidence-desk.html', import.meta.url), new URL('../site/index.html', import.meta.url));
console.log('Updated site/index.html from site/evidence-desk.html');
