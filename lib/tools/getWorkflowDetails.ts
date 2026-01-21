import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import { normalizeGuid } from '../sitecore-utils';

export const definition: ToolDefinition = {
  name: 'getWorkflowDetails',
  description: 'Get detailed information about Sitecore workflows including states and commands. Workflows live under /sitecore/system/Workflows/. Each workflow should have at least one state with Final=true (Section 5.4). Use includeAll=true to check all workflows at once.',
  category: 'XMC SDK',
  inputSchema: z.object({
    workflowPath: z.string().optional().describe('Full path to the workflow (e.g., "/sitecore/system/Workflows/Sample Workflow"). If not provided, lists all workflows.'),
    workflowId: z.string().optional().describe('The ID of the workflow item. Use either path or ID.'),
    includeAll: z.boolean().optional().describe('If true, returns details for ALL workflows in the system. Useful for reviewing all workflows at once.'),
  }),
  examples: [
    {
      input: { workflowPath: '/sitecore/system/Workflows/Sample Workflow' },
      output: {
        workflow: {
          name: 'Sample Workflow',
          id: '{...}',
          states: [
            {
              name: 'Draft',
              id: '{...}',
              isFinal: false,
              commands: [
                { name: 'Submit', nextState: 'Awaiting Approval' }
              ]
            },
            {
              name: 'Approved',
              id: '{...}',
              isFinal: true,
              commands: []
            }
          ],
          hasFinalState: true,
          stateCount: 2,
        },
      },
      description: 'Returns workflow with states and commands',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

import { logDebug } from './debugLogger';

// Helper to check if field is truthy (handles "1", true, checkbox values)
function isFieldTrue(value: unknown): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true;
  return false;
}

// Type for workflow state
type WorkflowState = {
  name: string;
  id: string;
  path: string;
  isFinal: boolean;
  previewPublishingTargets: boolean;
  commands: Array<{
    name: string;
    id: string;
    nextStateId: string;
    nextStateName: string;
    suppressComment: boolean;
  }>;
};

// Type for workflow details result
type WorkflowDetailsResult = {
  workflow: {
    name: string;
    id: string;
    path: string;
    template: unknown;
  };
  states: WorkflowState[];
  summary: {
    stateCount: number;
    commandCount: number;
    hasFinalState: boolean;
    finalStateCount: number;
    finalStateNames: string[];
  };
  bestPractices: {
    hasFinalState: string;
    stateCount: string;
  };
};

export const execute: ToolExecutor = async (input, context) => {
  const { workflowPath, workflowId, includeAll } = input as { workflowPath?: string; workflowId?: string; includeAll?: boolean };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  // Known Sitecore IDs for workflow items
  const WORKFLOWS_FOLDER_ID = '05592656-56D7-4D85-AACF-30919EE494F9';
  const WORKFLOW_TEMPLATE_ID = '1C0ACC50-37BE-4742-B43C-96A07A7410A5';
  const WORKFLOW_STATE_TEMPLATE_ID = '4B7E2DA9-DE43-4C83-88C3-02F042031D04';
  const WORKFLOW_COMMAND_TEMPLATE_ID = 'CB01F9FC-C187-46B3-AB0B-97A8468D8303';

  // Helper function to build GraphQL query for getting children of an item by path with fields
  function buildChildrenQueryByPath(parentPath: string): string {
    return `
      query GetChildren($path: String!) {
        item(where: { path: $path }) {
          itemId
          name
          path
          children {
            nodes {
              itemId
              name
              path
              template {
                name
              }
              fields {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    `;
  }

  // Helper function to get children using GraphQL by path (preferred). Accepts an item path (e.g. '/sitecore/system/Workflows/...')
  async function getChildrenByGraphQL(parentPath: string): Promise<Array<{ id: string; name: string; path: string; templateId: string; templateName: string; fields: Record<string, string> }>> {
    try {
      // Use mutate with xmc.authoring.graphql - this is the correct approach per published-status-cb
      const query = buildChildrenQueryByPath(parentPath);
      console.log('Executing GraphQL query for parent path:', parentPath);
      logDebug('Executing GraphQL query for parent path:', parentPath);

      // Use SDK mutate signature: client.mutate(methodName, { params: { query: { sitecoreContextId }, body: { query, variables }}})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (context.client as any).mutate('xmc.authoring.graphql', {
        params: {
          query: {
            sitecoreContextId: context.contextId
          },
          body: {
            query: query.trim(),
            variables: { path: parentPath }
          }
        }
      });

      logDebug('GraphQL request:', query.trim());
      logDebug('GraphQL variables:', { path: parentPath });
      logDebug('GraphQL response:', response && typeof response === 'object' ? JSON.stringify(response, null, 2) : response);
      console.log('GraphQL response received for path:', parentPath);

      const data = response.data as Record<string, unknown> | undefined;
      const innerData = data?.data as Record<string, unknown> | undefined;
      const item = innerData?.item as Record<string, unknown> | undefined;
      const children = item?.children as Record<string, unknown> | undefined;
      const results = children?.nodes as Array<Record<string, unknown>> | undefined;

      if (!results) {
        console.log('No children nodes found. Item:', item);
        return [];
      }

      return results.map(child => {
        const template = child.template as Record<string, unknown> | undefined;
        const fields = child.fields as Record<string, unknown> | undefined;
        const fieldNodes = fields?.nodes as Array<Record<string, unknown>> | undefined;
        
        // Convert fields array to key-value map
        const fieldMap: Record<string, string> = {};
        if (fieldNodes) {
          fieldNodes.forEach(field => {
            const name = field.name as string;
            const value = field.value as string;
            if (name) fieldMap[name] = value || '';
          });
        }
        
        return {
          id: (child.itemId as string || '').replace(/[{}]/g, ''),
          name: child.name as string || '',
          path: child.path as string || '',
          templateId: '', // Template ID not available in this GraphQL schema
          templateName: template?.name as string || '',
          fields: fieldMap,
        };
      });
    } catch (err) {
      console.error('GraphQL error:', err);
      return [];
    }
  }

  // Helper function to get all valid workflows (direct children of /sitecore/system/Workflows)
  async function getValidWorkflows(): Promise<Array<{ name: string; id: string; path: string; templateId?: string }>> {
    console.log('Getting valid workflows from folder:', WORKFLOWS_FOLDER_ID);
    
    try {
      // Try GraphQL directly on the workflows folder path first (preferred)
      try {
        const directChildren = await getChildrenByGraphQL('/sitecore/system/Workflows');
        console.log('Direct GraphQL children count for /sitecore/system/Workflows:', directChildren.length);
        if (directChildren && directChildren.length > 0) {
          const workflows = directChildren
            .filter(child => {
              console.log('Child:', child.name, 'Template:', child.templateName);
              return child.templateName?.toLowerCase().includes('workflow') || child.templateName === 'Workflow';
            })
            .map(child => ({ name: child.name, id: child.id, path: child.path, templateId: child.templateId }));

          console.log('Filtered workflows (from direct GraphQL):', workflows.length);
          return workflows;
        }
      } catch (err) {
        console.error('Error querying workflows folder via GraphQL directly:', err);
      }

      // If GraphQL didn't return children, fall back to using the content API to locate the folder
      let folderResponse;
      try {
        folderResponse = await context.client.query("xmc.agent.contentGetContentItemByPath", {
          params: {
            query: { 
              sitecoreContextId: context.contextId,
              item_path: '/sitecore/system/Workflows',
            },
          },
        });
      } catch (err) {
        console.error('Error calling contentGetContentItemByPath:', err);
        logDebug('Error calling contentGetContentItemByPath:', err);
      }

      logDebug('folderResponse:', folderResponse && typeof folderResponse === 'object' ? JSON.stringify(folderResponse, null, 2) : folderResponse);

      const folderItem = folderResponse?.data?.data as Record<string, unknown> | undefined;
      if (folderItem) {
        console.log('Workflows folder found by path:', folderItem.name, folderItem.path);
        const folderId = (folderItem.itemId as string || '').replace(/[{}]/g, '');
        
        // Use GraphQL to get children (preferred) but fallback to content API children when GraphQL is unauthorized
        // Prefer path-based GraphQL queries (more reliable); use folderItem.path if available
        const folderPath = folderItem.path as string || '/sitecore/system/Workflows';
        let children = await getChildrenByGraphQL(folderPath);
        console.log('Found children via GraphQL:', children.length);
        if (!children || children.length === 0) {
          console.log('GraphQL returned no children — falling back to content API list children');
          let listResponse;
          try {
            listResponse = await context.client.query("xmc.agent.contentGetContentItemById", {
              params: {
                query: { sitecoreContextId: context.contextId },
                path: { itemId: folderId },
              },
            });
          } catch (err) {
            console.error('Error calling contentGetContentItemById (fallback):', err);
            logDebug('Error calling contentGetContentItemById (fallback):', err);
          }
          logDebug('listResponse (children fallback):', listResponse && typeof listResponse === 'object' ? JSON.stringify(listResponse, null, 2) : listResponse);
          const folderFull = listResponse?.data?.data as Record<string, unknown> | undefined;
          const folderChildren = folderFull?.children as Array<Record<string, unknown>> | undefined;
          children = (folderChildren || []).map(ch => ({
            id: (ch.itemId as string || '').replace(/[{}]/g, ''),
            name: ch.name as string || '',
            path: ch.path as string || '',
            templateId: '',
            templateName: (ch.template as Record<string, unknown>)?.name as string || '',
            fields: {},
          }));
        }

        // Filter to only include items with the Workflow template
        const workflows = children
          .filter(child => {
            console.log('Child:', child.name, 'Template:', child.templateName);
            return child.templateName?.toLowerCase().includes('workflow') || 
                   child.templateName === 'Workflow';
          })
          .map(child => ({
            name: child.name,
            id: child.id,
            path: child.path,
            templateId: child.templateId,
          }));
        
        console.log('Filtered workflows:', workflows.length);
        return workflows;
      } else {
        console.log('Workflows folder not found by path, trying by ID');
        
        // Fallback to ID-based approach
        let folderResponseById;
        try {
          folderResponseById = await context.client.query("xmc.agent.contentGetContentItemById", {
            params: {
              query: { sitecoreContextId: context.contextId },
              path: { itemId: WORKFLOWS_FOLDER_ID },
            },
          });
        } catch (err) {
          console.error('Error calling contentGetContentItemById (byId fallback):', err);
          logDebug('Error calling contentGetContentItemById (byId fallback):', err);
        }
        logDebug('folderResponseById:', folderResponseById && typeof folderResponseById === 'object' ? JSON.stringify(folderResponseById, null, 2) : folderResponseById);
        const folderItemById = folderResponseById?.data?.data as Record<string, unknown> | undefined;
        if (folderItemById) {
          console.log('Workflows folder found by ID:', folderItemById.name, folderItemById.path);
          
          // Use GraphQL to get children (preferred) but fallback to content API children when GraphQL is unauthorized
          // Use known folder path for GraphQL query
          let children = await getChildrenByGraphQL('/sitecore/system/Workflows');
          console.log('Found children via GraphQL:', children.length);
          if (!children || children.length === 0) {
            console.log('GraphQL returned no children for ID-based lookup — falling back to content API children');
            const folderFull = folderItemById;
            const folderChildren = folderFull?.children as Array<Record<string, unknown>> | undefined;
            children = (folderChildren || []).map(ch => ({
              id: (ch.itemId as string || '').replace(/[{}]/g, ''),
              name: ch.name as string || '',
              path: ch.path as string || '',
              templateId: '',
              templateName: (ch.template as Record<string, unknown>)?.name as string || '',
              fields: {},
            }));
          }

          // Filter to only include items with the Workflow template
          const workflows = children
            .filter(child => {
              console.log('Child:', child.name, 'Template:', child.templateName);
              return child.templateName?.toLowerCase().includes('workflow') || 
                     child.templateName === 'Workflow';
            })
            .map(child => ({
              name: child.name,
              id: child.id,
              path: child.path,
              templateId: child.templateId,
            }));
          
          console.log('Filtered workflows:', workflows.length);
          return workflows;
        }
      }
    } catch (error) {
      console.error('Error getting workflows:', error);
    }
    
    console.log('No workflows found');
    return [];
  }

  try {
    // Get valid workflows list (needed for all cases)
    const validWorkflows = await getValidWorkflows();

    // Helper function to get workflow details for a single workflow item
    async function getWorkflowDetailsForItem(workflowItem: Record<string, unknown>): Promise<WorkflowDetailsResult> {
      const states: WorkflowState[] = [];
      
      const workflowId = (workflowItem.itemId || workflowItem.id) as string || '';
      
      // Use a single authoring GraphQL details query to fetch the workflow, its states, and commands
      const workflowPathForQuery = String(workflowItem.path || workflowItem['path'] || '');
      const detailsQuery = `
        query GetWorkflowDetails($path: String!) {
          workflow: item(where: { path: $path }) {
            itemId
            name
            path
            template { name }
            children {
              nodes {
                itemId
                name
                path
                template { name }
                fields { nodes { name value } }
                children { nodes { itemId name path template { name } fields { nodes { name value } } } }
              }
            }
          }
        }
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let detailsResp: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detailsResp = await (context.client as any).mutate('xmc.authoring.graphql', {
          params: {
            query: { sitecoreContextId: context.contextId },
            body: { query: detailsQuery.trim(), variables: { path: workflowPathForQuery } }
          }
        });
      } catch (err) {
        logDebug('Workflow details GraphQL error:', err);
      }

      const wfData = detailsResp?.data?.data?.workflow;
      const stateNodes = (wfData?.children?.nodes) || [];

      for (const s of stateNodes) {
        const fieldMap = (s.fields && s.fields.nodes) ? (s.fields.nodes.reduce((acc: Record<string,string>, f: Record<string, unknown>) => { acc[f.name as string] = f.value as string; return acc; }, {} as Record<string,string>)) : {};
        const isFinal = isFieldTrue(fieldMap['Final']);
        const previewPublishingTargets = isFieldTrue(fieldMap['Preview publishing targets']);

        const commandNodes = (s.children && s.children.nodes) || [];
        const commands: WorkflowState['commands'] = [];

        // Helper to parse Sitecore security descriptor strings (e.g., "ar|sitecore\\Author|...")
        function parseSecurityDescriptor(desc: string): { roles: string[]; users: string[] } {
          const roles: string[] = [];
          const users: string[] = [];
          if (!desc || typeof desc !== 'string') return { roles, users };
          // Match role entries: ar|roleName| or ar|domain\\role| patterns
          const roleMatches = desc.match(/ar\|([^|]+)\|/g);
          if (roleMatches) {
            roleMatches.forEach(m => {
              const v = m.replace(/ar\|/, '').replace(/\|$/, '');
              if (v) roles.push(v);
            });
          }
          // Match user entries: au|username| patterns
          const userMatches = desc.match(/au\|([^|]+)\|/g);
          if (userMatches) {
            userMatches.forEach(m => {
              const v = m.replace(/au\|/, '').replace(/\|$/, '');
              if (v) users.push(v);
            });
          }
          return { roles, users };
        }

        for (const c of commandNodes) {
          const cmdFieldsMap = (c.fields && c.fields.nodes) ? (c.fields.nodes.reduce((acc: Record<string,string>, f: Record<string, unknown>) => { acc[f.name as string] = f.value as string; return acc; }, {} as Record<string,string>)) : {};
          const nextState = cmdFieldsMap['Next state'] || '';
          const suppressComment = isFieldTrue(cmdFieldsMap['Suppress Comment']);

          commands.push({
            name: c.name,
            id: (c.itemId || '') as string,
            nextStateId: nextState,
            nextStateName: '',
            suppressComment,
          });
        }

        states.push({
          name: s.name,
          id: (s.itemId || '') as string,
          path: s.path || '',
          isFinal,
          previewPublishingTargets,
          commands,
        });
      }

      // Resolve next state names
      const stateIdToName = new Map(states.map(s => [s.id, s.name]));
      for (const state of states) {
        for (const cmd of state.commands) {
          if (cmd.nextStateId) {
            cmd.nextStateName = stateIdToName.get(cmd.nextStateId) || cmd.nextStateId;
          }
        }
      }

      // Calculate summary stats
      const hasFinalState = states.some(s => s.isFinal);
      const finalStates = states.filter(s => s.isFinal);
      const totalCommands = states.reduce((sum, s) => sum + s.commands.length, 0);

      return {
        workflow: {
          name: workflowItem.name as string || '',
          id: workflowItem.itemId as string || '',
          path: workflowItem.path as string || '',
          template: workflowItem.template,
        },
        states,
        summary: {
          stateCount: states.length,
          commandCount: totalCommands,
          hasFinalState,
          finalStateCount: finalStates.length,
          finalStateNames: finalStates.map(s => s.name),
        },
        bestPractices: {
          hasFinalState: hasFinalState ? '✅ OK' : '❌ MISSING - Workflow should have at least one Final state',
          stateCount: states.length <= 5 ? '✅ OK' : '⚠️ Consider simplifying - workflow has many states',
        },
      };
    }

    // If includeAll flag is set, get summary for all workflows (not full details for efficiency)
    if (includeAll) {
      const allWorkflowDetails: WorkflowDetailsResult[] = [];
      let workflowsWithIssues = 0;

      // If no valid workflows found, return debug info
      if (validWorkflows.length === 0) {
        return {
          success: true,
          output: {
            workflows: [],
            overallSummary: {
              totalWorkflows: 0,
              workflowsWithFinalState: 0,
              workflowsMissingFinalState: 0,
              totalStates: 0,
              totalCommands: 0,
            },
            bestPractices: {
              allHaveFinalState: '✅ OK - All workflows have at least one Final state',
            },
            debug: {
              validWorkflowsFound: 0,
              message: 'No workflows found in /sitecore/system/Workflows folder. This may be normal if no workflows are configured in the XM Cloud instance.',
              workflowsFolderPath: '/sitecore/system/Workflows',
              workflowsFolderId: WORKFLOWS_FOLDER_ID,
            },
          },
        };
      }

      for (const wf of validWorkflows) {
        const response = await context.client.query("xmc.agent.contentGetContentItemById", {
          params: {
            query: { sitecoreContextId: context.contextId },
            path: { itemId: wf.id },
          },
        });
        const workflowItem = response.data?.data as Record<string, unknown> | undefined;
        if (workflowItem) {
          const details = await getWorkflowDetailsForItem(workflowItem);
          allWorkflowDetails.push(details);
          if (!details.summary.hasFinalState) {
            workflowsWithIssues++;
          }
        }
      }

      return {
        success: true,
        output: {
          workflows: allWorkflowDetails, // Return full details for each workflow
          overallSummary: {
            totalWorkflows: allWorkflowDetails.length,
            workflowsWithFinalState: allWorkflowDetails.filter(w => w.summary.hasFinalState).length,
            workflowsMissingFinalState: workflowsWithIssues,
            totalStates: allWorkflowDetails.reduce((sum, w) => sum + w.summary.stateCount, 0),
            totalCommands: allWorkflowDetails.reduce((sum, w) => sum + w.summary.commandCount, 0),
          },
          bestPractices: {
            allHaveFinalState: workflowsWithIssues === 0 
              ? '✅ OK - All workflows have at least one Final state' 
              : `❌ ${workflowsWithIssues} workflow(s) missing Final state`,
          },
          debug: {
            validWorkflowsFound: validWorkflows.length,
            workflowsProcessed: allWorkflowDetails.length,
            workflowsFolderPath: '/sitecore/system/Workflows',
            workflowsFolderId: WORKFLOWS_FOLDER_ID,
          },
        },
      };
    }

    // If no path or ID provided, list all workflows
    if (!workflowPath && !workflowId) {
      return {
        success: true,
        output: {
          message: 'Available workflows. Use workflowPath or workflowId to get details for a specific workflow, or set includeAll=true to get details for all workflows.',
          workflows: validWorkflows,
          count: validWorkflows.length,
        },
      };
    }

    // Get specific workflow
    let workflowItem: Record<string, unknown> | undefined;
    
    if (workflowPath) {
      const response = await context.client.query("xmc.agent.contentGetContentItemByPath", {
        params: {
          query: { 
            sitecoreContextId: context.contextId,
            item_path: workflowPath,
          },
        },
      });
      workflowItem = response.data?.data as Record<string, unknown> | undefined;
    } else if (workflowId) {
      const response = await context.client.query("xmc.agent.contentGetContentItemById", {
        params: {
          query: { sitecoreContextId: context.contextId },
          path: { itemId: workflowId },
        },
      });
      workflowItem = response.data?.data as Record<string, unknown> | undefined;
    }

    if (!workflowItem) {
      return { 
        success: false, 
        error: 'Workflow not found',
        availableWorkflows: validWorkflows,
      };
    }

    // Validate this is a valid workflow (direct child of /sitecore/system/Workflows)
    const workflowItemId = (workflowItem.itemId as string || '');
    const workflowItemPath = workflowItem.path as string || '';
    const normalizedItemId = workflowItemId ? normalizeGuid(workflowItemId) : '';
    const isValidWorkflow = validWorkflows.some(w => {
      const candidateId = w.id ? normalizeGuid(w.id as string) : '';
      const candidatePath = w.path as string || '';
      return (candidateId && normalizedItemId && candidateId === normalizedItemId) || candidatePath === workflowItemPath;
    });

    if (!isValidWorkflow) {
      return {
        success: false,
        error: `The item "${workflowItem.name}" is not a valid workflow. Workflows must be direct children of /sitecore/system/Workflows.`,
        itemPath: workflowItemPath,
        availableWorkflows: validWorkflows,
      };
    }

    // Use the helper function to get workflow details
    const details = await getWorkflowDetailsForItem(workflowItem);

    return {
      success: true,
      output: details,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get workflow details',
    };
  }
};
