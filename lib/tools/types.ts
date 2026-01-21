import { z } from 'zod';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';

/**
 * Pages context from the Pages editor
 */
export interface PagesContext {
  pageInfo?: {
    id?: string;
    name?: string;
    path?: string;
    language?: string;
    templateId?: string;
    templateName?: string;
    version?: number;
  };
  siteInfo?: {
    id?: string;
    name?: string;
    language?: string;
    rootItemId?: string;
  };
}

/**
 * Context passed to client-side tool executors
 */
export interface ToolExecutorContext {
  /** Marketplace SDK client */
  client: ClientSDK;
  /** Sitecore context ID for API calls */
  contextId: string | undefined;
  /** Pages editor context (when running in Pages) */
  pagesContext?: PagesContext | null;
}

/**
 * Result from a tool executor
 */
export type ToolExecutorResult = 
  | { success: true; output: unknown }
  | { success: false; error: string };

/**
 * Client-side tool executor function
 */
export type ToolExecutor = (
  input: unknown,
  context: ToolExecutorContext
) => Promise<ToolExecutorResult>;

/**
 * Tool definition following MCP-like patterns
 */
export interface ToolDefinition {
  /** Unique name of the tool */
  name: string;
  /** Human-readable description for AI to understand when to use this tool */
  description: string;
  /** Category for grouping tools in the UI */
  category: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodTypeAny;
  /** Example inputs for AI guidance */
  examples?: {
    input: Record<string, unknown>;
    output: unknown;
    description?: string;
  }[];
  /** Whether this tool executes on the client (true) or server (false) */
  clientSide: boolean;
}

/**
 * Tool module that must be exported from each tool file
 */
export interface ToolModule {
  definition: ToolDefinition;
  /** AI SDK tool for use in streamText - using any to avoid complex generic issues */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiTool: any;
  /** Client-side executor function (required for clientSide: true tools) */
  execute?: ToolExecutor;
}

/**
 * Sample prompt suggestion
 */
export interface SamplePrompt {
  category: string;
  prompt: string;
  icon: string;
}

/**
 * Agent configuration loaded from agent.json
 */
export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt?: string;
  systemPromptFile?: string;
  tools: string[];
  samplePrompts?: SamplePrompt[];
}

/**
 * Loaded agent with resolved tools
 */
export interface LoadedAgent {
  config: AgentConfig;
  tools: Map<string, ToolModule>;
}
