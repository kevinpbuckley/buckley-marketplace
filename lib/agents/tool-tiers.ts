import 'server-only';

export type ToolMode = 'minimal' | 'core' | 'full';

/**
 * The smallest set that still reaches everything.
 *
 * All 189 SDK operations go through the catalog, so the only tools that genuinely cannot be
 * expressed as `invokeOperation` are the two that read Pages-editor context injected by the
 * host rather than calling an API. Skills carry the knowledge of which operation to use for
 * a given task, loaded on demand instead of encoded as 70-odd tool schemas.
 */
export const MINIMAL_TOOLS = [
  'searchOperations',
  'describeOperation',
  'invokeOperation',
  'loadSkill',
  'readBrandKit',
  'readBrandContext',
  'getCurrentPageContext',
  'getCurrentSiteContext',
] as const;

/**
 * Tool definitions are billed on every request, so only a core set stays active.
 *
 * Everything outside this list is still reachable: `invokeOperation` covers all 189 SDK
 * operations. The dedicated tools are ergonomic shortcuts, so they are unlocked once the
 * agent signals it needs more than the core by reaching for the catalog or a skill.
 */
export const CORE_TOOLS = [
  // Catalog & skills — the route out of the core set
  'searchOperations',
  'describeOperation',
  'invokeOperation',
  'loadSkill',

  // Host context
  'getCurrentPageContext',
  'getCurrentSiteContext',
  'getSiteContext',
  'getCurrentUser',
  'refreshPageView',

  // Sites
  'listSites',
  'getSiteDetails',
  'listAllPages',

  // Pages
  'getPageDetails',
  'getPageComponents',
  'getPageHtml',
  'getPageScreenshot',
  'getPagePreviewUrl',
  'searchPages',
  'listPageChildren',
  'checkPageLive',

  // Content
  'getContentItem',
  'getContentItemByPath',
  'getFieldValue',
  'createContentItem',
  'updateContent',

  // Components
  'listComponents',
  'getComponentDetails',
  'addComponentToPage',

  // Assets & workflow
  'searchAssets',
  'getPageWorkflow',

  // Brand review — the one AI skill the SDK exposes
  'generateBrandReview',
  'readBrandKit',

  // Jobs — revertJob matters because Agent API writes are reversible by job
  'listJobs',
  'revertJob',
] as const;

/** Reaching for the catalog or a skill means the core set was not enough. */
const UNLOCK_TRIGGERS = new Set(['searchOperations', 'describeOperation', 'loadSkill']);

export function shouldUnlockAllTools(calledToolNames: Iterable<string>): boolean {
  for (const name of calledToolNames) {
    if (UNLOCK_TRIGGERS.has(name)) return true;
  }
  return false;
}

export function getToolMode(): ToolMode {
  const mode = process.env.BUCKLEY_TOOL_MODE?.toLowerCase();
  return mode === 'core' || mode === 'full' ? mode : 'minimal';
}

export function resolveActiveTools(
  allToolNames: string[],
  calledToolNames: Iterable<string>,
  mode: ToolMode = getToolMode()
): string[] {
  if (mode === 'full') return allToolNames;

  // Minimal never widens: unlocking into the full set would defeat the point of it.
  if (mode === 'minimal') {
    const minimal = new Set<string>(MINIMAL_TOOLS);
    return allToolNames.filter((name) => minimal.has(name));
  }

  if (shouldUnlockAllTools(calledToolNames)) return allToolNames;

  const core = new Set<string>(CORE_TOOLS);
  return allToolNames.filter((name) => core.has(name));
}
