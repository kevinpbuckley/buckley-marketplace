import type { ToolModule, ToolDefinition, AgentConfig, LoadedAgent, ToolExecutorContext } from './types';
import * as invokeOperation from './invokeOperation';
import * as invokeQueries from './invokeQueries';
import * as moveComponent from './moveComponent';
import * as addComponentWithContent from './addComponentWithContent';
import * as getCurrentPageContext from './getCurrentPageContext';
import * as getCurrentSiteContext from './getCurrentSiteContext';
import * as generateBrandReview from './generateBrandReview';

/**
 * The client-executable tools. Buckley has one mode: discovery and execution through the
 * operation catalog, plus the few things the catalog cannot do.
 *
 * - searchOperations, describeOperation and loadSkill run on the server (./server-tools), because
 *   they read the catalog and the skill playbooks. This module is imported by ChatWindow, so a
 *   server-only dependency here would break the client bundle.
 * - invokeOperation runs any of the SDK operations those tools find; invokeQueries batches reads.
 * - moveComponent and addComponentWithContent collapse multi-step layout edits into one call,
 *   since each step otherwise costs a model round trip.
 * - The Pages-editor context tools read what the host injected, which no API call returns.
 * - generateBrandReview pins the brand kit lookup and a longer timeout for the review.
 */
const toolRegistry: Map<string, ToolModule> = new Map(
  [
    invokeOperation,
    invokeQueries,
    moveComponent,
    addComponentWithContent,
    getCurrentPageContext,
    getCurrentSiteContext,
    generateBrandReview,
  ].map((module): [string, ToolModule] => [module.definition.name, module])
);

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
