/**
 * Regression test for Buckley's composite operations and history compaction, run against a
 * fake SDK client.
 *
 * buckley.pages.moveComponent and buckley.pages.addComponentWithContent replace multi-step
 * chains the agent used to get wrong, above all the xmc.pages.saveLayout body (the layout goes
 * in as a JSON string under body.layout.body, with the page revision), which took five
 * attempts by hand. They are exercised through invokeOperation, the way the agent calls them.
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
function copy(from, to, extraReplace = (s) => s) {
  const src = readFileSync(join(ROOT, 'lib', from), 'utf8')
    .replace(/^import 'server-only';$/m, '')
    .replace(/from '(\.\.?\/[\w/-]+)'/g, (_, path) => `from '${path === '../operations' ? '../operations/index' : path}.mts'`);
  mkdirSync(dirname(join(WORK, to)), { recursive: true });
  writeFileSync(join(WORK, to), extraReplace(src));
}
for (const name of ['operation-client', 'types', 'invokeOperation']) copy(`tools/${name}.ts`, `tools/${name}.mts`);
for (const name of ['index', 'types', 'layout', 'moveComponent', 'addComponentWithContent', 'editor-refresh']) {
  copy(`operations/${name}.ts`, `operations/${name}.mts`);
}
copy('compact-history.ts', 'compact-history.mts');
copy('catalog/index.ts', 'catalog/index.mts', (s) =>
  s.replace("from './catalog.json';", "from './catalog.json' with { type: 'json' };")
);
writeFileSync(join(WORK, 'catalog', 'catalog.json'), readFileSync(join(ROOT, 'lib', 'catalog', 'catalog.json')));

const load = (n) => import(pathToFileURL(join(WORK, `${n}.mts`)).href);
const { moveRendering } = await load('operations/layout');
const { LOCAL_OPERATION_KEYS } = await load('operations/index');
const invoke = (await load('tools/invokeOperation')).execute;
const { findOperations } = await load('catalog/index');
const { compactHistory } = await load('compact-history');

// The composites run through invokeOperation exactly as the agent calls them.
const addTool = { execute: (params, ctx) => invoke({ key: 'buckley.pages.addComponentWithContent', kind: 'mutation', params }, ctx).then(unwrap) };
const moveTool = { execute: (params, ctx) => invoke({ key: 'buckley.pages.moveComponent', kind: 'mutation', params }, ctx).then(unwrap) };
function unwrap(out) {
  return out.success ? { success: true, output: out.output.result } : out;
}

const r = (instanceId, placeholderKey, dataSource) => ({ id: `rend-${instanceId}`, instanceId, placeholderKey, dataSource });

function fakeClient({ renderings = [], components = [], addFailures = 0, parentId = 'home' }) {
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
      if (key === 'xmc.pages.retrievePage')
        return parentId ? ok({ id: options.params.path.pageId, parentId }) : { data: { data: undefined, error: { detail: 'not found' }, response: { status: 404 } } };
      throw new Error(`unexpected query ${key}`);
    },
    async mutate(key, options) {
      calls.push({ kind: 'mutation', key, params: options?.params });
      if (key === 'xmc.pages.saveLayout') {
        layout.devices = JSON.parse(options.params.body.layout.body).devices;
        return { data: { savedPage: { id: 'page' } } };
      }
      if (key === 'pages.reloadCanvas' || key === 'pages.context') return undefined;
      if (key === 'xmc.agent.contentDeleteContent') return { data: { success: true, deletedId: options.params.path.itemId } };
      if (key === 'xmc.pages.deletePage') return { data: true };
      if (key === 'xmc.agent.pagesCreatePage') return { data: { itemId: 'new-page', name: 'New' } };
      if (key === 'xmc.pages.renamePage') return { data: { pageId: options.params.path.pageId, name: 'Renamed' } };
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

await test('every local operation is catalogued, as a mutation, and nothing else is', async () => {
  const catalogued = LOCAL_OPERATION_KEYS.map((key) => findOperations(key)[0]);
  assert.deepEqual(catalogued.map((op) => op?.kind), LOCAL_OPERATION_KEYS.map(() => 'mutation'));
  assert.equal(findOperations('buckley.pages.removeComponent').length, 0);
});

await test('invokeOperation rejects bad params and the wrong kind without calling the SDK', async () => {
  const client = fakeClient({ renderings: [r('a', 'main')] });
  const ctx = { client, contextId: 'ctx' };
  const missing = await invoke({ key: 'buckley.pages.moveComponent', kind: 'mutation', params: { pageId: 'page' } }, ctx);
  assert.equal(missing.success, false);
  assert.ok(missing.issues.some((i) => i.startsWith('instanceId')), JSON.stringify(missing.issues));
  const wrongKind = await invoke({ key: 'buckley.pages.moveComponent', kind: 'query', params: {} }, ctx);
  assert.match(wrongKind.error, /is a mutation/);
  assert.equal(client.calls.length, 0);
});

const editorCtx = (client, pageId = 'open-page') => ({
  client,
  contextId: 'ctx',
  pagesContext: { pageInfo: { id: pageId, language: 'en' }, siteInfo: { name: 'solterra' } },
});
const hostCalls = (client) => client.calls.filter((c) => c.key.startsWith('pages.')).map((c) => `${c.key} ${c.params?.itemId ?? ''}`.trim());

await test('deleting the open page opens its parent, looked up before the delete', async () => {
  const client = fakeClient({ parentId: 'home' });
  const out = await invoke({ key: 'xmc.agent.contentDeleteContent', kind: 'mutation', params: { path: { itemId: '{OPEN-PAGE}' } } }, editorCtx(client));
  assert.equal(out.output.editor.openedPageId, 'home');
  assert.deepEqual(client.calls.map((c) => c.key).slice(0, 2), ['xmc.pages.retrievePage', 'xmc.agent.contentDeleteContent']);
  assert.deepEqual(hostCalls(client), ['pages.context home']);
});

await test('deleting the open page without a findable parent navigates nowhere', async () => {
  const client = fakeClient({ parentId: null });
  const out = await invoke({ key: 'xmc.pages.deletePage', kind: 'mutation', params: { path: { pageId: 'open-page' } } }, editorCtx(client));
  assert.equal(out.output.editor.openedPageId, null);
  assert.deepEqual(hostCalls(client), []);
});

await test('creating a page opens it; renaming or deleting another page reopens the current one', async () => {
  const created = fakeClient({});
  const out = await invoke({ key: 'xmc.agent.pagesCreatePage', kind: 'mutation', params: { body: { name: 'New' } } }, editorCtx(created));
  assert.equal(out.output.editor.openedPageId, 'new-page');
  assert.deepEqual(hostCalls(created), ['pages.context new-page']);

  const renamed = fakeClient({});
  await invoke({ key: 'xmc.pages.renamePage', kind: 'mutation', params: { path: { pageId: 'other' }, body: { newName: 'x' } } }, editorCtx(renamed));
  assert.deepEqual(hostCalls(renamed), ['pages.context open-page', 'pages.reloadCanvas']);

  const deletedOther = fakeClient({});
  await invoke({ key: 'xmc.agent.contentDeleteContent', kind: 'mutation', params: { path: { itemId: 'other' } } }, editorCtx(deletedOther));
  assert.equal(deletedOther.calls.some((c) => c.key === 'xmc.pages.retrievePage'), false);
  assert.deepEqual(hostCalls(deletedOther), ['pages.context open-page', 'pages.reloadCanvas']);
});

await test('outside the Pages editor nothing is refreshed', async () => {
  const client = fakeClient({});
  const out = await invoke({ key: 'xmc.agent.pagesCreatePage', kind: 'mutation', params: { body: {} } }, { client, contextId: 'ctx' });
  assert.equal(out.output.editor, undefined);
  assert.deepEqual(hostCalls(client), []);
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
