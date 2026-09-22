import 'server-only';

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

export function resolveActiveTools(
  allToolNames: string[],
  calledToolNames: Iterable<string>
): string[] {
  if (shouldUnlockAllTools(calledToolNames)) return allToolNames;

  const core = new Set<string>(CORE_TOOLS);
  return allToolNames.filter((name) => core.has(name));
}
