#!/usr/bin/env node
/**
 * Pull-request rules for this repo (run in CI with the PR's base sha and author):
 * - Community contributors may only change files under community/<their-github-login>/.
 * - Inside a theme folder only these files are allowed:
 *     theme.html, README.md, licenses/*.txt, src/body.html, src/<images>, src/fonts/<fonts>
 * - theme.html ≤ 5 MB.
 * Changes to official/, tools/ or .github/ are allowed but need a maintainer (CODEOWNERS).
 */
import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';

const [base, author] = process.argv.slice(2);
if (!base || !author) {
  console.error('usage: check-paths.mjs <base-sha> <author-login>');
  process.exit(2);
}
const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`], { encoding: 'utf8' })
  .split('\n').filter(Boolean);

const THEME_FILE = /^(theme\.html|README\.md|licenses\/[\w.-]+\.txt|src\/body\.html|src\/[\w.-]+\.(svg|png|jpe?g|webp|avif|gif|mp3)|src\/fonts\/[\w.-]+\.(woff2?|ttf|otf))$/;
const errors = [];
const needsMaintainer = [];

for (const f of changed) {
  const community = /^community\/([^/]+)\/([^/]+)\/(.+)$/.exec(f);
  if (community) {
    const [, user, id, rest] = community;
    if (user.toLowerCase() !== author.toLowerCase()) errors.push(`${f}: community themes go in community/${author}/ (your GitHub login)`);
    if (!/^[a-z0-9-]{3,40}$/.test(id)) errors.push(`${f}: theme folder must be 3–40 chars of a–z, 0–9, -`);
    if (!THEME_FILE.test(rest)) errors.push(`${f}: this file type is not allowed in a theme folder`);
  } else if (f.startsWith('official/') || f.startsWith('tools/') || f.startsWith('.github/') || !f.includes('/')) {
    needsMaintainer.push(f);
  } else if (f.startsWith('community/')) {
    errors.push(`${f}: use community/<your-login>/<theme-id>/…`);
  } else {
    errors.push(`${f}: unexpected location`);
  }
  if (f.endsWith('/theme.html') && existsSync(f) && statSync(f).size > 5 * 1024 * 1024) errors.push(`${f}: larger than 5 MB`);
}

if (needsMaintainer.length) console.log(`ℹ These changes need a maintainer review:\n  ${needsMaintainer.join('\n  ')}`);
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ ${changed.length} changed file(s) follow the repo rules`);
