#!/usr/bin/env node
/**
 * Builds every theme that has a src/ folder:
 *   <theme>/src/body.html → <theme>/theme.html
 * Placeholders in body.html:
 *   {{font:<file>}} → data: URI of <theme>/src/fonts/<file>
 *   {{img:<file>}}  → data: URI of <theme>/src/<file>
 *
 * Usage: node tools/build.mjs          # write theme.html files
 *        node tools/build.mjs --check  # fail if any theme.html is out of date (CI)
 * No dependencies.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = {
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.mp3': 'audio/mpeg',
};
const check = process.argv.includes('--check');

function themeDirs() {
  const out = [];
  const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory()) : []);
  for (const id of dirs(join(ROOT, 'official'))) out.push(join(ROOT, 'official', id));
  for (const user of dirs(join(ROOT, 'community'))) for (const id of dirs(join(ROOT, 'community', user))) out.push(join(ROOT, 'community', user, id));
  return out;
}

const dataUri = (path) => {
  const type = MIME[extname(path).toLowerCase()];
  if (!type) throw new Error(`unsupported file type: ${path}`);
  return `data:${type};base64,${readFileSync(path).toString('base64')}`;
};

let stale = 0;
for (const dir of themeDirs()) {
  const src = join(dir, 'src', 'body.html');
  if (!existsSync(src)) continue;
  const html = readFileSync(src, 'utf8')
    .replace(/\{\{font:([\w.-]+)\}\}/g, (_, f) => dataUri(join(dir, 'src', 'fonts', f)))
    .replace(/\{\{img:([\w.-]+)\}\}/g, (_, f) => dataUri(join(dir, 'src', f)));
  const out = join(dir, 'theme.html');
  const name = relative(ROOT, out);
  if (check) {
    if (!existsSync(out) || readFileSync(out, 'utf8') !== html) {
      console.error(`✗ ${name} is out of date: run node tools/build.mjs`);
      stale++;
    } else console.log(`✓ ${name}`);
  } else {
    writeFileSync(out, html);
    console.log(`✓ built ${name} (${Math.round(html.length / 1024)} KB)`);
  }
}
if (stale) process.exit(1);
