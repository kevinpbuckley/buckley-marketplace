import type { ToolModule, ToolDefinition, AgentConfig, LoadedAgent, ToolExecutor, ToolExecutorContext } from './types';

// Import all tool modules
import { definition as listLanguagesDefinition, aiTool as listLanguagesAiTool, execute as listLanguagesExecute } from './listLanguages';
import { definition as listSitesDefinition, aiTool as listSitesAiTool, execute as listSitesExecute } from './listSites';
import { definition as getSiteDetailsDefinition, aiTool as getSiteDetailsAiTool, execute as getSiteDetailsExecute } from './getSiteDetails';
import { definition as listAllPagesDefinition, aiTool as listAllPagesAiTool, execute as listAllPagesExecute } from './listAllPages';
import { definition as getWorkflowStatsDefinition, aiTool as getWorkflowStatsAiTool, execute as getWorkflowStatsExecute } from './getWorkflowStats';
import { definition as getLocalizationStatsDefinition, aiTool as getLocalizationStatsAiTool, execute as getLocalizationStatsExecute } from './getLocalizationStats';
import { definition as listComponentsDefinition, aiTool as listComponentsAiTool, execute as listComponentsExecute } from './listComponents';
import { definition as getContentItemDefinition, aiTool as getContentItemAiTool, execute as getContentItemExecute } from './getContentItem';
import { definition as getContentItemByPathDefinition, aiTool as getContentItemByPathAiTool, execute as getContentItemByPathExecute } from './getContentItemByPath';
import { definition as getPageTemplateDefinition, aiTool as getPageTemplateAiTool, execute as getPageTemplateExecute } from './getPageTemplate';
import { definition as getComponentDetailsDefinition, aiTool as getComponentDetailsAiTool, execute as getComponentDetailsExecute } from './getComponentDetails';
import { definition as getInsertOptionsDefinition, aiTool as getInsertOptionsAiTool, execute as getInsertOptionsExecute } from './getInsertOptions';
import { definition as getPageDetailsDefinition, aiTool as getPageDetailsAiTool, execute as getPageDetailsExecute } from './getPageDetails';
import { definition as getPageHierarchyDefinition, aiTool as getPageHierarchyAiTool, execute as getPageHierarchyExecute } from './getPageHierarchy';
import { definition as listPageChildrenDefinition, aiTool as listPageChildrenAiTool, execute as listPageChildrenExecute } from './listPageChildren';
import { definition as getSiteHierarchyDefinition, aiTool as getSiteHierarchyAiTool, execute as getSiteHierarchyExecute } from './getSiteHierarchy';
import { definition as getPageComponentsDefinition, aiTool as getPageComponentsAiTool, execute as getPageComponentsExecute } from './getPageComponents';
import { definition as searchPagesDefinition, aiTool as searchPagesAiTool, execute as searchPagesExecute } from './searchPages';
import { definition as getPlaceholderComponentsDefinition, aiTool as getPlaceholderComponentsAiTool, execute as getPlaceholderComponentsExecute } from './getPlaceholderComponents';
import { definition as searchDatasourcesDefinition, aiTool as searchDatasourcesAiTool, execute as searchDatasourcesExecute } from './searchDatasources';
import { definition as listRenderingHostsDefinition, aiTool as listRenderingHostsAiTool, execute as listRenderingHostsExecute } from './listRenderingHosts';
import { definition as listHostsDefinition, aiTool as listHostsAiTool, execute as listHostsExecute } from './listHosts';
import { definition as listTrackedSitesDefinition, aiTool as listTrackedSitesAiTool, execute as listTrackedSitesExecute } from './listTrackedSites';
import { definition as getPersonalizationVariantsDefinition, aiTool as getPersonalizationVariantsAiTool, execute as getPersonalizationVariantsExecute } from './getPersonalizationVariants';
import { definition as listConditionTemplatesDefinition, aiTool as listConditionTemplatesAiTool, execute as listConditionTemplatesExecute } from './listConditionTemplates';
import { definition as getConditionTemplateByIdDefinition, aiTool as getConditionTemplateByIdAiTool, execute as getConditionTemplateByIdExecute } from './getConditionTemplateById';
import { definition as createPersonalizationVersionDefinition, aiTool as createPersonalizationVersionAiTool, execute as createPersonalizationVersionExecute } from './createPersonalizationVersion';
import { definition as listCollectionsDefinition, aiTool as listCollectionsAiTool, execute as listCollectionsExecute } from './listCollections';
import { definition as listSiteTemplatesDefinition, aiTool as listSiteTemplatesAiTool, execute as listSiteTemplatesExecute } from './listSiteTemplates';
import { definition as searchAssetsDefinition, aiTool as searchAssetsAiTool, execute as searchAssetsExecute } from './searchAssets';
import { definition as getAssetInfoDefinition, aiTool as getAssetInfoAiTool, execute as getAssetInfoExecute } from './getAssetInfo';
import { definition as listJobsDefinition, aiTool as listJobsAiTool, execute as listJobsExecute } from './listJobs';
import { definition as listSupportedLanguagesDefinition, aiTool as listSupportedLanguagesAiTool, execute as listSupportedLanguagesExecute } from './listSupportedLanguages';
import { definition as getFieldValueDefinition, aiTool as getFieldValueAiTool, execute as getFieldValueExecute } from './getFieldValue';
import { definition as getPagePreviewUrlDefinition, aiTool as getPagePreviewUrlAiTool, execute as getPagePreviewUrlExecute } from './getPagePreviewUrl';
import { definition as getLivePageStateDefinition, aiTool as getLivePageStateAiTool, execute as getLivePageStateExecute } from './getLivePageState';
import { definition as listPageAncestorsDefinition, aiTool as listPageAncestorsAiTool, execute as listPageAncestorsExecute } from './listPageAncestors';
import { definition as listPageVariantsDefinition, aiTool as listPageVariantsAiTool, execute as listPageVariantsExecute } from './listPageVariants';
import { definition as getSiteFromItemDefinition, aiTool as getSiteFromItemAiTool, execute as getSiteFromItemExecute } from './getSiteFromItem';
import { definition as getJobDetailsDefinition, aiTool as getJobDetailsAiTool, execute as getJobDetailsExecute } from './getJobDetails';
import { definition as listJobOperationsDefinition, aiTool as listJobOperationsAiTool, execute as listJobOperationsExecute } from './listJobOperations';
import { definition as revertJobDefinition, aiTool as revertJobAiTool, execute as revertJobExecute } from './revertJob';
import { definition as getCollectionDetailsDefinition, aiTool as getCollectionDetailsAiTool, execute as getCollectionDetailsExecute } from './getCollectionDetails';
import { definition as getHostDetailsDefinition, aiTool as getHostDetailsAiTool, execute as getHostDetailsExecute } from './getHostDetails';
import { definition as analyzeChildItemCountDefinition, aiTool as analyzeChildItemCountAiTool, execute as analyzeChildItemCountExecute } from './analyzeChildItemCount';
import { definition as getPageHtmlDefinition, aiTool as getPageHtmlAiTool, execute as getPageHtmlExecute } from './getPageHtml';
import { definition as listCollectionSitesDefinition, aiTool as listCollectionSitesAiTool, execute as listCollectionSitesExecute } from './listCollectionSites';
import { definition as getWorkflowDetailsDefinition, aiTool as getWorkflowDetailsAiTool, execute as getWorkflowDetailsExecute } from './getWorkflowDetails';
import { definition as getLanguageDetailsDefinition, aiTool as getLanguageDetailsAiTool, execute as getLanguageDetailsExecute } from './getLanguageDetails';
import { definition as getSitemapDetailsDefinition, aiTool as getSitemapDetailsAiTool, execute as getSitemapDetailsExecute } from './getSitemapDetails';
import { definition as findNodesExceedingChildLimitDefinition, aiTool as findNodesExceedingChildLimitAiTool, execute as findNodesExceedingChildLimitExecute } from './findNodesExceedingChildLimit';

// Import write tools
import { definition as createPageDefinition, aiTool as createPageAiTool, execute as createPageExecute } from './createPage';
import { definition as createContentItemDefinition, aiTool as createContentItemAiTool, execute as createContentItemExecute } from './createContentItem';
import { definition as updateContentDefinition, aiTool as updateContentAiTool, execute as updateContentExecute } from './updateContent';
import { definition as deleteContentDefinition, aiTool as deleteContentAiTool, execute as deleteContentExecute } from './deleteContent';
import { definition as addComponentToPageDefinition, aiTool as addComponentToPageAiTool, execute as addComponentToPageExecute } from './addComponentToPage';
import { definition as addLanguageToPageDefinition, aiTool as addLanguageToPageAiTool, execute as addLanguageToPageExecute } from './addLanguageToPage';
import { definition as uploadAssetDefinition, aiTool as uploadAssetAiTool, execute as uploadAssetExecute } from './uploadAsset';
import { definition as updateAssetDefinition, aiTool as updateAssetAiTool, execute as updateAssetExecute } from './updateAsset';
import { definition as setComponentDatasourceDefinition, aiTool as setComponentDatasourceAiTool, execute as setComponentDatasourceExecute } from './setComponentDatasource';
import { definition as createComponentDatasourceDefinition, aiTool as createComponentDatasourceAiTool, execute as createComponentDatasourceExecute } from './createComponentDatasource';

// Import context tools
import { definition as getCurrentPageContextDefinition, aiTool as getCurrentPageContextAiTool, execute as getCurrentPageContextExecute } from './getCurrentPageContext';
import { definition as getCurrentSiteContextDefinition, aiTool as getCurrentSiteContextAiTool, execute as getCurrentSiteContextExecute } from './getCurrentSiteContext';
import { definition as refreshPageViewDefinition, aiTool as refreshPageViewAiTool, execute as refreshPageViewExecute } from './refreshPageView';

/**
 * Registry of all available tools
 * Each tool is imported from its own file for modularity
 */
const toolRegistry: Map<string, ToolModule> = new Map([
  // Context tools (Pages editor)
  ['getCurrentPageContext', { definition: getCurrentPageContextDefinition, aiTool: getCurrentPageContextAiTool, execute: getCurrentPageContextExecute }],
  ['getCurrentSiteContext', { definition: getCurrentSiteContextDefinition, aiTool: getCurrentSiteContextAiTool, execute: getCurrentSiteContextExecute }],
  ['refreshPageView', { definition: refreshPageViewDefinition, aiTool: refreshPageViewAiTool, execute: refreshPageViewExecute }],
  
  // Core tools
  ['listLanguages', { definition: listLanguagesDefinition, aiTool: listLanguagesAiTool, execute: listLanguagesExecute }],
  ['listSites', { definition: listSitesDefinition, aiTool: listSitesAiTool, execute: listSitesExecute }],
  ['getSiteDetails', { definition: getSiteDetailsDefinition, aiTool: getSiteDetailsAiTool, execute: getSiteDetailsExecute }],
  ['listAllPages', { definition: listAllPagesDefinition, aiTool: listAllPagesAiTool, execute: listAllPagesExecute }],
  ['getWorkflowStats', { definition: getWorkflowStatsDefinition, aiTool: getWorkflowStatsAiTool, execute: getWorkflowStatsExecute }],
  ['getLocalizationStats', { definition: getLocalizationStatsDefinition, aiTool: getLocalizationStatsAiTool, execute: getLocalizationStatsExecute }],
  ['listComponents', { definition: listComponentsDefinition, aiTool: listComponentsAiTool, execute: listComponentsExecute }],
  
  // Content item tools
  ['getContentItem', { definition: getContentItemDefinition, aiTool: getContentItemAiTool, execute: getContentItemExecute }],
  ['getContentItemByPath', { definition: getContentItemByPathDefinition, aiTool: getContentItemByPathAiTool, execute: getContentItemByPathExecute }],
  ['getFieldValue', { definition: getFieldValueDefinition, aiTool: getFieldValueAiTool, execute: getFieldValueExecute }],
  ['getPageTemplate', { definition: getPageTemplateDefinition, aiTool: getPageTemplateAiTool, execute: getPageTemplateExecute }],
  ['getComponentDetails', { definition: getComponentDetailsDefinition, aiTool: getComponentDetailsAiTool, execute: getComponentDetailsExecute }],
  ['getInsertOptions', { definition: getInsertOptionsDefinition, aiTool: getInsertOptionsAiTool, execute: getInsertOptionsExecute }],
  
  // Page & hierarchy tools
  ['getPageDetails', { definition: getPageDetailsDefinition, aiTool: getPageDetailsAiTool, execute: getPageDetailsExecute }],
  ['getPageHierarchy', { definition: getPageHierarchyDefinition, aiTool: getPageHierarchyAiTool, execute: getPageHierarchyExecute }],
  ['listPageChildren', { definition: listPageChildrenDefinition, aiTool: listPageChildrenAiTool, execute: listPageChildrenExecute }],
  ['getSiteHierarchy', { definition: getSiteHierarchyDefinition, aiTool: getSiteHierarchyAiTool, execute: getSiteHierarchyExecute }],
  ['getPageComponents', { definition: getPageComponentsDefinition, aiTool: getPageComponentsAiTool, execute: getPageComponentsExecute }],
  
  // Search tools
  ['searchPages', { definition: searchPagesDefinition, aiTool: searchPagesAiTool, execute: searchPagesExecute }],
  ['getPlaceholderComponents', { definition: getPlaceholderComponentsDefinition, aiTool: getPlaceholderComponentsAiTool, execute: getPlaceholderComponentsExecute }],
  ['searchDatasources', { definition: searchDatasourcesDefinition, aiTool: searchDatasourcesAiTool, execute: searchDatasourcesExecute }],
  
  // Hosting tools
  ['listRenderingHosts', { definition: listRenderingHostsDefinition, aiTool: listRenderingHostsAiTool, execute: listRenderingHostsExecute }],
  ['listHosts', { definition: listHostsDefinition, aiTool: listHostsAiTool, execute: listHostsExecute }],
  
  // Personalization & analytics tools
  ['listTrackedSites', { definition: listTrackedSitesDefinition, aiTool: listTrackedSitesAiTool, execute: listTrackedSitesExecute }],
  ['getPersonalizationVariants', { definition: getPersonalizationVariantsDefinition, aiTool: getPersonalizationVariantsAiTool, execute: getPersonalizationVariantsExecute }],
  ['listConditionTemplates', { definition: listConditionTemplatesDefinition, aiTool: listConditionTemplatesAiTool, execute: listConditionTemplatesExecute }],
  ['getConditionTemplateById', { definition: getConditionTemplateByIdDefinition, aiTool: getConditionTemplateByIdAiTool, execute: getConditionTemplateByIdExecute }],
  ['createPersonalizationVersion', { definition: createPersonalizationVersionDefinition, aiTool: createPersonalizationVersionAiTool, execute: createPersonalizationVersionExecute }],
  
  // Site organization tools
  ['listCollections', { definition: listCollectionsDefinition, aiTool: listCollectionsAiTool, execute: listCollectionsExecute }],
  ['listSiteTemplates', { definition: listSiteTemplatesDefinition, aiTool: listSiteTemplatesAiTool, execute: listSiteTemplatesExecute }],
  
  // Asset tools
  ['searchAssets', { definition: searchAssetsDefinition, aiTool: searchAssetsAiTool, execute: searchAssetsExecute }],
  ['getAssetInfo', { definition: getAssetInfoDefinition, aiTool: getAssetInfoAiTool, execute: getAssetInfoExecute }],
  
  // System tools
  ['listJobs', { definition: listJobsDefinition, aiTool: listJobsAiTool, execute: listJobsExecute }],
  ['listSupportedLanguages', { definition: listSupportedLanguagesDefinition, aiTool: listSupportedLanguagesAiTool, execute: listSupportedLanguagesExecute }],
  ['getJobDetails', { definition: getJobDetailsDefinition, aiTool: getJobDetailsAiTool, execute: getJobDetailsExecute }],
  ['listJobOperations', { definition: listJobOperationsDefinition, aiTool: listJobOperationsAiTool, execute: listJobOperationsExecute }],
  ['revertJob', { definition: revertJobDefinition, aiTool: revertJobAiTool, execute: revertJobExecute }],
  
  // Page analysis & preview tools
  ['getPagePreviewUrl', { definition: getPagePreviewUrlDefinition, aiTool: getPagePreviewUrlAiTool, execute: getPagePreviewUrlExecute }],
  ['getLivePageState', { definition: getLivePageStateDefinition, aiTool: getLivePageStateAiTool, execute: getLivePageStateExecute }],
  ['listPageAncestors', { definition: listPageAncestorsDefinition, aiTool: listPageAncestorsAiTool, execute: listPageAncestorsExecute }],
  ['listPageVariants', { definition: listPageVariantsDefinition, aiTool: listPageVariantsAiTool, execute: listPageVariantsExecute }],
  ['getPageHtml', { definition: getPageHtmlDefinition, aiTool: getPageHtmlAiTool, execute: getPageHtmlExecute }],
  ['analyzeChildItemCount', { definition: analyzeChildItemCountDefinition, aiTool: analyzeChildItemCountAiTool, execute: analyzeChildItemCountExecute }],
  ['findNodesExceedingChildLimit', { definition: findNodesExceedingChildLimitDefinition, aiTool: findNodesExceedingChildLimitAiTool, execute: findNodesExceedingChildLimitExecute }],
  
  // Site context tools
  ['getSiteFromItem', { definition: getSiteFromItemDefinition, aiTool: getSiteFromItemAiTool, execute: getSiteFromItemExecute }],
  ['getCollectionDetails', { definition: getCollectionDetailsDefinition, aiTool: getCollectionDetailsAiTool, execute: getCollectionDetailsExecute }],
  ['getHostDetails', { definition: getHostDetailsDefinition, aiTool: getHostDetailsAiTool, execute: getHostDetailsExecute }],
  ['listCollectionSites', { definition: listCollectionSitesDefinition, aiTool: listCollectionSitesAiTool, execute: listCollectionSitesExecute }],
  
  // Workflow tools
  ['getWorkflowDetails', { definition: getWorkflowDetailsDefinition, aiTool: getWorkflowDetailsAiTool, execute: getWorkflowDetailsExecute }],
  ['getLanguageDetails', { definition: getLanguageDetailsDefinition, aiTool: getLanguageDetailsAiTool, execute: getLanguageDetailsExecute }],
  ['getSitemapDetails', { definition: getSitemapDetailsDefinition, aiTool: getSitemapDetailsAiTool, execute: getSitemapDetailsExecute }],
  
  // Write tools - Pages
  ['createPage', { definition: createPageDefinition, aiTool: createPageAiTool, execute: createPageExecute }],
  ['addLanguageToPage', { definition: addLanguageToPageDefinition, aiTool: addLanguageToPageAiTool, execute: addLanguageToPageExecute }],
  ['addComponentToPage', { definition: addComponentToPageDefinition, aiTool: addComponentToPageAiTool, execute: addComponentToPageExecute }],
  
  // Write tools - Content
  ['createContentItem', { definition: createContentItemDefinition, aiTool: createContentItemAiTool, execute: createContentItemExecute }],
  ['updateContent', { definition: updateContentDefinition, aiTool: updateContentAiTool, execute: updateContentExecute }],
  ['deleteContent', { definition: deleteContentDefinition, aiTool: deleteContentAiTool, execute: deleteContentExecute }],
  
  // Write tools - Components
  ['setComponentDatasource', { definition: setComponentDatasourceDefinition, aiTool: setComponentDatasourceAiTool, execute: setComponentDatasourceExecute }],
  ['createComponentDatasource', { definition: createComponentDatasourceDefinition, aiTool: createComponentDatasourceAiTool, execute: createComponentDatasourceExecute }],
  
  // Write tools - Assets
  ['uploadAsset', { definition: uploadAssetDefinition, aiTool: uploadAssetAiTool, execute: uploadAssetExecute }],
  ['updateAsset', { definition: updateAssetDefinition, aiTool: updateAssetAiTool, execute: updateAssetExecute }],
]);

/**
 * Get a tool by name
 */
export function getTool(name: string): ToolModule | undefined {
  return toolRegistry.get(name);
}

/**
 * Get all registered tools
 */
export function getAllTools(): ToolModule[] {
  return Array.from(toolRegistry.values());
}

/**
 * Get tool definitions for UI display
 */
export function getToolDefinitions(): ToolDefinition[] {
  return getAllTools().map(t => t.definition);
}

/**
 * Load an agent configuration and resolve its tools
 */
export function loadAgent(config: AgentConfig): LoadedAgent {
  const tools = new Map<string, ToolModule>();
  
  for (const toolName of config.tools) {
    const tool = getTool(toolName);
    if (tool) {
      tools.set(toolName, tool);
    } else {
      console.warn(`Tool "${toolName}" not found in registry`);
    }
  }
  
  return { config, tools };
}

/**
 * Get tool definitions for a specific agent
 */
export function getAgentToolDefinitions(agent: LoadedAgent): ToolDefinition[] {
  return Array.from(agent.tools.values()).map(t => t.definition);
}

/**
 * Get AI SDK tools object for a specific agent
 */
export function getAgentAiTools(agent: LoadedAgent): Record<string, ToolModule['aiTool']> {
  const aiTools: Record<string, ToolModule['aiTool']> = {};
  for (const [name, module] of agent.tools) {
    aiTools[name] = module.aiTool;
  }
  return aiTools;
}

/**
 * Execute a tool by name with the given context
 */
export async function executeToolByName(
  toolName: string,
  input: unknown,
  context: ToolExecutorContext
): Promise<{ success: true; output: unknown } | { success: false; error: string }> {
  const tool = getTool(toolName);
  if (!tool) {
    return { success: false, error: `Tool "${toolName}" not found` };
  }
  if (!tool.definition.clientSide) {
    return { success: false, error: `Tool "${toolName}" is not a client-side tool` };
  }
  if (!tool.execute) {
    return { success: false, error: `Tool "${toolName}" has no executor` };
  }
  return tool.execute(input, context);
}

// Re-export types
export type { ToolModule, ToolDefinition, AgentConfig, LoadedAgent, ToolExecutor, ToolExecutorContext } from './types';
