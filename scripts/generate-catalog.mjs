/**
 * Generates lib/catalog/catalog.json from the installed Marketplace SDK packages.
 *
 * Every SDK operation is reachable through the same `client.query(key, { params })` /
 * `client.mutate(key, { params })` signature, so the agent needs a searchable catalog
 * rather than one hand-written tool schema per operation.
 *
 * Run: node scripts/generate-catalog.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SDK_ROOT = join(ROOT, 'node_modules', '@sitecore-marketplace-sdk');
const OUT = join(ROOT, 'lib', 'catalog', 'catalog.json');

function walk(dir, hits = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'experimental') walk(full, hits);
    } else if (entry === 'augmentation.gen.d.ts') {
      hits.push(full);
    }
  }
  return hits;
}

/** Captures `type Name = { ... };` bodies by brace matching, incl. namespace-nested ones. */
function indexTypes(source) {
  const types = new Map();
  const re = /(?:^|\n)\s*(?:export\s+)?type\s+(\w+)\s*=\s*\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const start = source.indexOf('{', m.index + m[0].length - 1);
    let depth = 0;
    let end = start;
    for (let i = start; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    types.set(m[1], source.slice(start, end + 1));
  }
  return types;
}

/** Trims generated-code indentation so stored params stay compact. */
function tidy(block) {
  const lines = block.split('\n');
  const indents = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => l.match(/^\s*/)[0].length);
  const base = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l, i) => (i === 0 ? l : l.slice(base)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The success response for an operation is `{Op}Responses`, an object keyed by status code
 * whose 2xx entry names the payload type. Knowing the response shape matters as much as the
 * params: without it the agent has to call an operation just to discover what came back.
 */
function resolveResponse(types, operationName) {
  const pascal = operationName.charAt(0).toUpperCase() + operationName.slice(1);
  const block = types.get(`${pascal}Responses`);
  if (!block) return null;

  const success = block.match(/^\s*(?:2\d\d|'2\d\d'|"2\d\d"):\s*([^;\n]+);/m);
  if (!success) return null;

  const named = success[1].trim().replace(/^Array<(.+)>$/, '$1').replace(/\[\]$/, '').trim();
  return { name: success[1].trim(), body: types.has(named) ? tidy(types.get(named)) : null };
}

const operations = [];

for (const file of walk(SDK_ROOT)) {
  const pkg = file.split(sep + 'node_modules' + sep)[1].split(sep).slice(0, 2).join('/');
  const source = readFileSync(file, 'utf8');
  const types = indexTypes(readFileSync(join(dirname(file), 'types.gen.d.ts'), 'utf8'));

  let kind = null;
  let doc = [];
  let deprecated = false;

  for (const raw of source.split('\n')) {
    const line = raw.trim();

    if (/interface QueryMap\s*\{/.test(line)) kind = 'query';
    else if (/interface MutationMap\s*\{/.test(line)) kind = 'mutation';
    else if (/interface SubscribeMap\s*\{/.test(line)) kind = 'subscribe';

    if (line.startsWith('/**') || line.startsWith('*')) {
      if (/@deprecated/.test(line)) deprecated = true;
      doc.push(
        line
          .replace(/^\/\*\*/, '')
          .replace(/\*\/$/, '')
          .replace(/^\*/, '')
          .replace(/@deprecated/, '')
          .trim()
      );
      continue;
    }

    const keyMatch = line.match(/^'([\w.]+)':\s*\{/);
    if (keyMatch && kind) {
      operations.push({
        key: keyMatch[1],
        namespace: keyMatch[1].split('.').slice(0, 2).join('.'),
        kind,
        package: pkg,
        deprecated,
        summary: doc.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
        _pending: true,
      });
      doc = [];
      deprecated = false;
      continue;
    }

    // `params: Parameters<typeof sdk.opName>[0];` resolves to the `{Op}Data` type.
    const paramsMatch = line.match(/params:\s*Parameters<typeof sdk\.(\w+)>/);
    const current = operations[operations.length - 1];
    if (paramsMatch && current?._pending) {
      const op = paramsMatch[1];
      const typeName = op.charAt(0).toUpperCase() + op.slice(1) + 'Data';
      current.operation = op;
      current.params = types.has(typeName) ? tidy(types.get(typeName)) : null;

      const resolved = resolveResponse(types, op);
      if (resolved) {
        current.responseType = resolved.name;
        if (resolved.body) current.response = resolved.body;
      }

      // `body: SomeRequestModel` and `data: Array<SomeModel>` are useless without the model's
      // shape. Resolve transitively, since those models reference further models of their
      // own, but cap it so a deeply linked schema cannot pull in half the type graph.
      const refs = {};
      let frontier = [current.params, current.response].filter(Boolean);

      for (let depth = 0; depth < 3 && frontier.length && Object.keys(refs).length < 24; depth++) {
        const next = [];
        for (const text of frontier) {
          for (const [, name] of text.matchAll(/\b([A-Z]\w+)\b/g)) {
            if (!types.has(name) || refs[name] || name === current.responseType) continue;
            refs[name] = tidy(types.get(name));
            next.push(refs[name]);
          }
        }
        frontier = next;
      }

      if (Object.keys(refs).length) current.referencedTypes = refs;

      delete current._pending;
    }
  }
}

for (const op of operations) delete op._pending;

// The host-bridge keys live in the client package and are declared inline, not via sdk.*.
const clientTypes = join(SDK_ROOT, 'client', 'dist', 'sdk-types.d.ts');
const clientSource = readFileSync(clientTypes, 'utf8');
let clientKind = null;
let clientDoc = [];
for (const raw of clientSource.split('\n')) {
  const line = raw.trim();
  if (/interface QueryMap\s*\{/.test(line)) clientKind = 'query';
  else if (/interface MutationMap\s*\{/.test(line)) clientKind = 'mutation';
  else if (/interface SubscribeMap\s*\{/.test(line)) clientKind = 'subscribe';

  if (line.startsWith('/**') || line.startsWith('*')) {
    clientDoc.push(line.replace(/^\/\*\*|\*\/$|^\*/g, '').trim());
    continue;
  }
  const keyMatch = line.match(/^'([\w.]+)':\s*\{/);
  if (keyMatch && clientKind && !operations.some((o) => o.key === keyMatch[1] && o.kind === clientKind)) {
    operations.push({
      key: keyMatch[1],
      namespace: keyMatch[1].split('.')[0],
      kind: clientKind,
      package: '@sitecore-marketplace-sdk/client',
      deprecated: false,
      summary: clientDoc.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
      operation: null,
      params: null,
    });
    clientDoc = [];
  }
}

const version = (name) =>
  JSON.parse(readFileSync(join(SDK_ROOT, name, 'package.json'), 'utf8')).version;

operations.sort((a, b) => a.key.localeCompare(b.key));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sdkVersions: { xmc: version('xmc'), client: version('client'), ai: version('ai') },
      operations,
    },
    null,
    2
  )
);

const deprecatedCount = operations.filter((o) => o.deprecated).length;
const missingParams = operations.filter((o) => o.params === null && o.operation).length;
const withResponse = operations.filter((o) => o.response).length;
console.log(`catalog: ${operations.length} operations -> lib/catalog/catalog.json`);
console.log(`  deprecated: ${deprecatedCount}`);
console.log(`  unresolved params: ${missingParams}`);
console.log(`  with response shape: ${withResponse}`);
for (const ns of [...new Set(operations.map((o) => o.namespace))].sort()) {
  console.log(`  ${ns}: ${operations.filter((o) => o.namespace === ns).length}`);
}
