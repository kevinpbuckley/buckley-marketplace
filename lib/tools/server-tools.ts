import 'server-only';
import { definition as searchOperationsDefinition, aiTool as searchOperationsAiTool } from './searchOperations';
import { definition as describeOperationDefinition, aiTool as describeOperationAiTool } from './describeOperation';
import { definition as loadSkillDefinition, aiTool as loadSkillAiTool } from './loadSkill';

/**
 * Tools that execute on the server because they read the operation catalog and the skill
 * playbooks. They are kept out of ./index.ts so the client bundle never pulls those in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serverAiTools: Record<string, any> = {
  searchOperations: searchOperationsAiTool,
  describeOperation: describeOperationAiTool,
  loadSkill: loadSkillAiTool,
};

export const serverToolDefinitions = [
  searchOperationsDefinition,
  describeOperationDefinition,
  loadSkillDefinition,
];
