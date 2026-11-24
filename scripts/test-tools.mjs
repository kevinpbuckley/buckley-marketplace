/**
 * Regression test for the composite tools and history compaction, run against a fake SDK client.
 *
 * moveComponent and addComponentWithContent replace multi-step chains the agent used to get
 * wrong, above all the xmc.pages.saveLayout body (the layout goes in as a JSON string under
 * body.layout.body, with the page revision), which took five attempts by hand.
 *
 * Run: npm run tools:test
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Inside the repo, not the OS temp dir, so the copies resolve zod and ai from node_modules.
const WORK = join(ROOT, '.tmp-tool-test');
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
process.on('exit', () => rmSync(WORK, { recursive: true, force: true }));

// Node's ESM loader needs explicit extensions; the app relies on the bundler for them.
for (const name of ['operation-client', 'layout', 'moveComponent', 'addComponentWithContent', 'types']) {
  const src = readFileSync(join(ROOT, 'lib', 'tools', `${name}.ts`), 'utf8').replace(
    /from '\.\/([\w-]+)'/g,
    "from './$1.mts'"
  );
  writeFileSync(join(WORK, `${name}.mts`), src);
}
writeFileSync(
  join(WORK, 'compact-history.mts'),
  readFileSync(join(ROOT, 'lib', 'compact-history.ts'), 'utf8').replace(/^import 'server-only';$/m, '')
);

const load = (n) => import(pathToFileURL(join(WORK, `${n}.mts`)).href);
const { moveRendering } = await load('layout');
const addTool = await load('addComponentWithContent');
const moveTool = await load('moveComponent');
const { compactHistory } = await load('compact-history');

const r = (instanceId, placeholderKey, dataSource) => ({ id: `rend-${instanceId}`, instanceId, placeholderKey, dataSource });

function fakeClient({ renderings, components = [], addFailures = 0 }) {
  const calls = [];
  const layout = { devices: [{ id: 'dev', layoutId: 'lay', placeholders: [], renderings }] };
  let failuresLeft = addFailures;
  const client = {
    calls,
    layout,
    async query(key, options) {
      calls.push({ kind: 'query', key, params: options?.params });
      const ok = (data) => ({ data: { data, error: undefined } });
      if (key === 'xmc.pages.retrievePageState')
        return ok({ revision: 'rev-1', layoutEditingKind: 'Final', finalLayout: JSON.stringify(layout) });
      if (key === 'xmc.agent.pagesGetComponentsOnPage') return ok({ components });
      if (key === 'xmc.agent.contentGetContentItemById') return ok({ fields: { SubCopy: { value: '<p>Hello</p>' }, Other: '' } });
      throw new Error(`unexpected query ${key}`);
    },
    async mutate(key, options) {
      calls.push({ kind: 'mutation', key, params: options?.params });
      if (key === 'xmc.pages.saveLayout') {
        layout.devices = JSON.parse(options.params.body.layout.body).devices;
        return { data: { savedPage: { id: 'page' } } };
      }
      if (key === 'pages.reloadCanvas') return undefined;
      if (key === 'xmc.agent.pagesAddComponentOnPage') {
        if (failuresLeft-- > 0)
          return { data: undefined, error: { detail: 'Item name already exists' }, response: { status: 400 } };
        layout.devices[0].renderings.push(r('{IID-NEW}', 'headless-main', '{DS-NEW}'));
        return { data: { componentId: 'iid-new', pageId: 'page', datasourceId: 'ds-new' } };
      }
      throw new Error(`unexpected mutation ${key}`);
    },
  };
  return client;
}

const base = { pageId: 'page', site: 'solterra', language: 'en' };
const ids = (c) => c.layout.devices[0].renderings.map((x) => x.instanceId);
let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed++;
  console.log(`PASS  ${name}`);
};

await test('moves a component before another and saves the layout shape the API accepts', async () => {
  const client = fakeClient({ renderings: [r('q1', 'headless-main'), r('q2', 'headless-main'), r('rt', 'headless-main')] });
  const result = await moveRendering({ client, contextId: 'ctx' }, { ...base, instanceId: 'rt', position: 'before', relativeTo: 'q1' });
  assert.equal(result.ok, true);
  assert.deepEqual(ids(client), ['rt', 'q1', 'q2']);
  const save = client.calls.find((c) => c.key === 'xmc.pages.saveLayout').params;
  assert.equal(typeof save.body.layout.body, 'string');
  assert.equal(save.body.layout.kind, 'Final');
  assert.equal(save.body.revision, 'rev-1');
  assert.equal(save.body.site, 'solterra');
  assert.equal(save.query.sitecoreContextId, 'ctx');
});

await test('first/last stay within the placeholder when others are interleaved', async () => {
  const client = fakeClient({
    renderings: [r('h', 'header'), r('a', 'main'), r('f', 'footer'), r('b', 'main'), r('c', 'main')],
  });
  await moveRendering({ client, contextId: 'ctx' }, { ...base, instanceId: 'c', position: 'first' });
  assert.deepEqual(ids(client), ['h', 'c', 'a', 'f', 'b']);
  await moveRendering({ client, contextId: 'ctx' }, { ...base, instanceId: 'c', position: 'last' });
  assert.deepEqual(ids(client), ['h', 'a', 'f', 'b', 'c']);
});

await test('moves to another placeholder', async () => {
  const client = fakeClient({ renderings: [r('a', 'main'), r('b', 'side')] });
  const result = await moveRendering({ client, contextId: 'ctx' }, { ...base, instanceId: 'a', position: 'last', placeholder: 'side' });
  assert.equal(result.placeholder, 'side');
  assert.deepEqual(result.order.map((o) => o.instanceId), ['b', 'a']);
});

await test('unknown instance fails without saving and lists the layout', async () => {
  const client = fakeClient({ renderings: [r('a', 'main')] });
  const result = await moveRendering({ client, contextId: 'ctx' }, { ...base, instanceId: 'zzz', position: 'first' });
  assert.equal(result.ok, false);
  assert.equal(result.componentsInLayout[0].instanceId, 'a');
  assert.equal(client.calls.some((c) => c.key === 'xmc.pages.saveLayout'), false);
});

await test('moveComponent reloads the canvas only for the open page', async () => {
  const client = fakeClient({ renderings: [r('a', 'main'), r('b', 'main')] });
  const ctx = { client, contextId: 'ctx', pagesContext: { pageInfo: { id: '{PAGE}' } } };
  const out = await moveTool.execute({ ...base, instanceId: 'b', position: 'first' }, ctx);
  assert.equal(out.success, true);
  assert.equal(out.output.canvasReloaded, true);
  const other = await moveTool.execute({ ...base, pageId: 'other', instanceId: 'a', position: 'first' }, { ...ctx, client: fakeClient({ renderings: [r('a', 'main')] }) });
  assert.equal(other.output.canvasReloaded, false);
});

await test('addComponentWithContent: unique name, retry on clash, verify, flag empty, position', async () => {
  const client = fakeClient({
    renderings: [r('q1', 'headless-main', '{DS-1}')],
    components: [
      { id: 'q1', componentName: 'Quote', componentDetails: { name: 'Clean Energy Quote', path: '/Data/Clean Energy Quote', fields: { nodes: [{ name: 'subCopy', value: '' }] } } },
    ],
    addFailures: 1,
  });
  const out = await addTool.execute(
    { ...base, componentRenderingId: 'rend', placeholderPath: 'headless-main', componentItemName: 'Clean Energy Quote', fields: { subCopy: '<p>Hello</p>' }, position: 'first' },
    { client, contextId: 'ctx', pagesContext: { pageInfo: { id: 'page' } } }
  );
  assert.equal(out.success, true, JSON.stringify(out));
  const names = client.calls.filter((c) => c.key === 'xmc.agent.pagesAddComponentOnPage').map((c) => c.params.body.componentItemName);
  assert.deepEqual(names, ['Clean Energy Quote_2', 'Clean Energy Quote_3']);
  assert.equal(out.output.componentItemName, 'Clean Energy Quote_3');
  assert.equal(out.output.contentVerified, true);
  assert.match(out.output.warnings[0], /Existing Quote .* has no content/);
  assert.deepEqual(ids(client), ['{IID-NEW}', 'q1']);
  assert.equal(out.output.canvasReloaded, true);
});

await test('addComponentWithContent reports fields that did not save', async () => {
  const client = fakeClient({ renderings: [] });
  const out = await addTool.execute(
    { ...base, componentRenderingId: 'rend', placeholderPath: 'headless-main', componentItemName: 'X', fields: { Missing: 'text' } },
    { client, contextId: 'ctx' }
  );
  assert.equal(out.output.contentVerified, false);
  assert.match(out.output.warnings.join(' '), /fields are empty on the new datasource: Missing/);
});

await test('compactHistory shortens earlier tool results only', async () => {
  const big = { html: 'x'.repeat(5000) };
  const part = (name, output) => ({ type: `tool-${name}`, toolCallId: name, state: 'output-available', input: {}, output });
  const messages = [
    { id: '1', role: 'user', parts: [{ type: 'text', text: 'one' }] },
    { id: '2', role: 'assistant', parts: [part('invokeOperation', big), part('describeOperation', big), part('searchOperations', { results: [{ key: 'k', kind: 'query', summary: 's' }] })] },
    { id: '3', role: 'user', parts: [{ type: 'text', text: 'two' }] },
    { id: '4', role: 'assistant', parts: [part('invokeOperation', big)] },
  ];
  const out = compactHistory(messages);
  assert.match(out[1].parts[0].output.compacted, /shortened from \d+ characters/);
  assert.equal(out[1].parts[1].output, big);
  assert.deepEqual(out[1].parts[2].output, { earlierSearch: ['query k'] });
  assert.equal(out[3].parts[0].output, big);
  assert.equal(messages[1].parts[0].output, big, 'input must not be mutated');
});

console.log(`\n${passed} passed`);
