import 'server-only';
import type { AgentConfig, LoadedAgent } from '../tools';
import { loadAgent, getAgentToolDefinitions as getToolDefs, getAgentAiTools as getAiTools } from '../tools';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import agent configurations
import buckleyConfigJson from './agent.json';

// Load system prompt from markdown file
const systemPromptPath = join(process.cwd(), 'lib', 'agents', 'system-prompt.md');
const systemPrompt = readFileSync(systemPromptPath, 'utf-8');

// Merge config with system prompt
const buckleyConfig: AgentConfig = {
  ...buckleyConfigJson as AgentConfig,
  systemPrompt
};

/**
 * Registry of all available agents
 */
const agentRegistry: Map<string, AgentConfig> = new Map([
  ['Buckley', buckleyConfig],
]);

/**
 * Get an agent configuration by name
 */
export function getAgentConfig(name: string): AgentConfig | undefined {
  return agentRegistry.get(name);
}

/**
 * Load an agent by name with resolved tools
 */
export function getAgent(name: string): LoadedAgent | undefined {
  const config = getAgentConfig(name);
  if (!config) return undefined;
  return loadAgent(config);
}

/**
 * Get the default agent (Buckley)
 */
export function getDefaultAgent(): LoadedAgent {
  const agent = getAgent('Buckley');
  if (!agent) {
    throw new Error('Default agent "Buckley" not found');
  }
  return agent;
}

/**
 * Get tool definitions for an agent
 */
export function getAgentToolDefinitions(agent: LoadedAgent) {
  return getToolDefs(agent);
}

/**
 * Get AI SDK tools for an agent
 */
export function getAgentAiTools(agent: LoadedAgent) {
  return getAiTools(agent);
}

/**
 * List all available agent names
 */
export function listAgents(): string[] {
  return Array.from(agentRegistry.keys());
}

// Re-export types
export type { AgentConfig, LoadedAgent } from '../tools';
