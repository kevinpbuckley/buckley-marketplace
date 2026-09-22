/**
 * Regression test for catalog search ranking.
 *
 * Discovery is how the agent reaches the ~110 operations that have no dedicated tool, so a
 * bad ranking silently degrades it. A first version scored terms with a strict AND, which
 * meant "translate the whole site" returned nothing at all because "whole" matched no
 * operation — the agent then guessed, and answered with the wrong key.
 *
 * Run: node scripts/test-search.mjs
 */
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The module guards itself with `server-only`, which has no meaning outside Next's bundler.
const work = mkdtempSync(join(tmpdir(), 'catalog-search-'));
const source = readFileSync(join(ROOT, 'lib', 'catalog', 'index.ts'), 'utf8')
  .replace(/^import 'server-only';$/m, '')
  .replace(/^import catalog from '\.\/catalog\.json';$/m, "import catalog from './catalog.json' with { type: 'json' };");
writeFileSync(join(work, 'catalog-index.mts'), source);
copyFileSync(join(ROOT, 'lib', 'catalog', 'catalog.json'), join(work, 'catalog.json'));

const { searchOperations } = await import(pathToFileURL(join(work, 'catalog-index.mts')).href);

const CASES = [
  ['translate site', 'xmc.sites.translateSite'],
  ['translate whole site', 'xmc.sites.translateSite'],
  ['translate the entire website', 'xmc.sites.translateSite'],
  ['how do I rename a site', 'xmc.sites.renameSite'],
  ['delete page version', 'xmc.pages.deletePageVersions'],
  ['brand review', 'ai.skills.generateBrandReview'],
  ['duplicate a page', 'xmc.pages.duplicatePage'],
  ['upload an asset', 'xmc.agent.assetsUploadAsset'],
  ['show me all the sites', 'xmc.sites.listSites'],
  ['create a collection', 'xmc.sites.createCollection'],
  ['page screenshot', 'xmc.agent.pagesGetPageScreenshot'],
  ['content transfer status', 'xmc.contentTransfer.getContentTransferStatus'],
];

let failed = 0;

for (const [query, expected] of CASES) {
  const keys = searchOperations(query, { limit: 5 }).map((r) => r.key);
  if (keys[0] === expected) {
    console.log(`PASS  "${query}"`);
  } else {
    failed++;
    console.log(`FAIL  "${query}"`);
    console.log(`        expected ${expected}, got [${keys.slice(0, 4).join(', ') || 'NOTHING'}]`);
  }
}

// A deprecated key must never outrank its supported replacement.
const deprecated = searchOperations('list sites', { limit: 10 }).filter((r) => r.deprecated);
if (deprecated.length) {
  failed++;
  console.log(`FAIL  deprecated keys surfaced by default: ${deprecated.map((r) => r.key).join(', ')}`);
} else {
  console.log('PASS  deprecated keys excluded by default');
}

console.log(`\n${CASES.length + 1 - failed}/${CASES.length + 1} passed`);
if (failed) process.exit(1);
