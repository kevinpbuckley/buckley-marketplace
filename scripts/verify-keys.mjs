/**
 * Verifies every SDK query/mutation key referenced in lib/tools exists in the generated
 * catalog, and flags any that are deprecated.
 *
 * Several tools previously called invented keys (`xmc.pages.createVersion`,
 * `xmc.agent.workflowExecuteCommand`) that silently failed at runtime. This catches that.
 *
 * Run: node scripts/verify-keys.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = join(ROOT, 'lib', 'tools');

const catalog = JSON.parse(readFileSync(join(ROOT, 'lib', 'catalog', 'catalog.json'), 'utf8'));
const byKey = new Map(catalog.operations.map((o) => [o.key, o]));

const KEY_PATTERN = /['"]((?:xmc|ai|host|pages|site|application)\.[a-zA-Z]+(?:\.[a-zA-Z]+)?)['"]/g;

const unknown = [];
const deprecated = [];
let checked = 0;

for (const file of readdirSync(TOOLS).filter((f) => f.endsWith('.ts'))) {
  const source = readFileSync(join(TOOLS, file), 'utf8');

  for (const [, key] of source.matchAll(KEY_PATTERN)) {
    // Only treat it as a key reference if it is being passed to query/mutate.
    if (!new RegExp(`(?:query|mutate)\\(\\s*['"]${key.replace(/\./g, '\\.')}['"]`).test(source)) {
      continue;
    }
    checked++;
    const op = byKey.get(key);
    if (!op) unknown.push(`${file}: ${key}`);
    else if (op.deprecated) deprecated.push(`${file}: ${key}`);
  }
}

console.log(`checked ${checked} key references across lib/tools`);

if (deprecated.length) {
  console.log(`\ndeprecated keys in use (${deprecated.length}):`);
  for (const entry of deprecated) console.log(`  ${entry}`);
}

if (unknown.length) {
  console.error(`\nunknown keys — these do not exist in the SDK (${unknown.length}):`);
  for (const entry of unknown) console.error(`  ${entry}`);
  process.exit(1);
}

console.log(deprecated.length ? '\nno unknown keys' : '\nno unknown or deprecated keys');
