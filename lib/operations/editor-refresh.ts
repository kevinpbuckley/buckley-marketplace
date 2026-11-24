import type { ToolExecutorContext } from '../tools/types';
import { callOperation, sameId } from '../tools/operation-client';

type Params = { path?: Record<string, unknown>; body?: Record<string, unknown> } | undefined;
type Result = Record<string, unknown> | null | undefined;

interface TreeChange {
  kind: 'create' | 'delete' | 'rename';
  /** The item the change is about: the new page for creates, the target for deletes and renames. */
  itemId: (params: Params, result: Result) => unknown;
  /** Only pages appear in the Pages tree; a new content item is not worth navigating to. */
  isPage: boolean;
}

/**
 * Mutations that change the Pages site tree. The SDK has no "refresh tree" call; the host
 * re-reads the tree when it navigates, so after one of these the editor is sent to a page.
 */
const TREE_CHANGES: Record<string, TreeChange> = {
  'xmc.agent.pagesCreatePage': { kind: 'create', itemId: (_p, r) => r?.itemId, isPage: true },
  'xmc.pages.createPage': { kind: 'create', itemId: (_p, r) => r?.pageId, isPage: true },
  'xmc.pages.duplicatePage': { kind: 'create', itemId: (_p, r) => r?.pageId, isPage: true },
  // Runs as a job and returns only a handle, so there is no new id to open.
  'xmc.pages.createBlueprint': { kind: 'create', itemId: () => undefined, isPage: true },
  'xmc.agent.contentCreateContentItem': { kind: 'create', itemId: (_p, r) => r?.itemId, isPage: false },
  'xmc.agent.contentDeleteContent': { kind: 'delete', itemId: (p) => p?.path?.itemId, isPage: true },
  'xmc.pages.deletePage': { kind: 'delete', itemId: (p) => p?.path?.pageId, isPage: true },
  'xmc.pages.renamePage': { kind: 'rename', itemId: (p) => p?.path?.pageId, isPage: true },
};

export interface EditorRefresh {
  openedPageId: string | null;
  reason: string;
  canvasReloaded: boolean;
}

export function changesTree(key: string): boolean {
  return key in TREE_CHANGES;
}

const asId = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

/**
 * Before a delete: if it removes the page open in the editor, find its parent now, because
 * once the item is gone there is nothing left to ask. Returns undefined otherwise.
 */
export async function parentOfOpenPageBeingDeleted(
  context: ToolExecutorContext,
  key: string,
  params: Params
): Promise<string | undefined> {
  const change = TREE_CHANGES[key];
  const page = context.pagesContext?.pageInfo;
  const site = context.pagesContext?.siteInfo?.name;
  if (change?.kind !== 'delete' || !page?.id || !site) return undefined;
  if (!sameId(asId(change.itemId(params, undefined)), page.id)) return undefined;

  const result = await callOperation(context, 'xmc.pages.retrievePage', 'query', {
    path: { pageId: page.id },
    query: { site, language: page.language ?? 'en' },
  });
  return result.ok === true ? asId((result.data as Result)?.parentId) : undefined;
}

/**
 * After a tree-changing mutation succeeds, send the Pages editor to the right page so the tree
 * is re-read: the new page after a create, the parent after deleting the open page, otherwise
 * the open page again with a canvas reload. Does nothing outside the Pages editor.
 */
export async function refreshEditorAfter(
  context: ToolExecutorContext,
  key: string,
  params: Params,
  result: Result,
  parentOfDeletedPage?: string
): Promise<EditorRefresh | undefined> {
  const change = TREE_CHANGES[key];
  const page = context.pagesContext?.pageInfo;
  if (!change || !page?.id) return undefined;

  const deletedOpenPage = change.kind === 'delete' && sameId(asId(change.itemId(params, result)), page.id);
  if (deletedOpenPage && !parentOfDeletedPage) {
    return {
      openedPageId: null,
      reason: 'The open page was deleted and its parent could not be found. Ask the user to pick a page in the tree.',
      canvasReloaded: false,
    };
  }

  const createdPage = change.kind === 'create' && change.isPage ? asId(change.itemId(params, result)) : undefined;
  const [target, reason] = createdPage
    ? [createdPage, 'Opened the new page.']
    : deletedOpenPage
      ? [parentOfDeletedPage, 'The open page was deleted, so its parent was opened.']
      : [page.id, 'Reopened the current page so the tree picks up the change.'];

  const opened = await callOperation(context, 'pages.context', 'mutation', {
    itemId: target,
    language: page.language ?? 'en',
  });
  if (opened.ok === false) return undefined;

  // Opening another page loads it fresh; reopening the same one needs an explicit reload.
  const sameAsOpen = sameId(target, page.id);
  const canvasReloaded = sameAsOpen ? (await callOperation(context, 'pages.reloadCanvas', 'mutation')).ok : false;

  return { openedPageId: target, reason, canvasReloaded };
}
