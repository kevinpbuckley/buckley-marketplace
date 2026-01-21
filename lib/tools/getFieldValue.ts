import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getFieldValue',
  description: 'Get the value of a specific field from a content item. You can specify the item by ID or path, and the field by name. Use this for targeted field value lookups.',
  category: 'XMC SDK',
  inputSchema: z.object({
    itemId: z.string().optional().describe('The ID of the content item (provide either itemId or itemPath)'),
    itemPath: z.string().optional().describe('The path of the content item (provide either itemId or itemPath)'),
    fieldName: z.string().describe('The name of the field to retrieve'),
    language: z.string().optional().describe('Language code (e.g., "en"). Defaults to default language.'),
  }),
  examples: [
    {
      input: { itemId: 'item-123', fieldName: 'Title' },
      output: {
        itemId: 'item-123',
        fieldName: 'Title',
        fieldValue: 'Welcome to Our Site',
        found: true,
      },
      description: 'Returns the value of a specific field by item ID',
    },
    {
      input: { itemPath: '/sitecore/content/Home', fieldName: 'Body' },
      output: {
        itemPath: '/sitecore/content/Home',
        fieldName: 'Body',
        fieldValue: '<p>This is the body content...</p>',
        found: true,
      },
      description: 'Returns the value of a specific field by item path',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { itemId, itemPath, fieldName, language } = input as { 
    itemId?: string; 
    itemPath?: string; 
    fieldName: string; 
    language?: string;
  };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  if (!itemId && !itemPath) {
    return { success: false, error: 'You must provide either itemId or itemPath' };
  }

  try {
    let itemData: { fields?: { [key: string]: unknown } | null; itemId?: string; path?: string } | null = null;

    if (itemId) {
      // Get item by ID
      const response = await context.client.query("xmc.agent.contentGetContentItemById", {
        params: {
          query: { 
            sitecoreContextId: context.contextId,
            language: language,
          },
          path: { itemId: itemId },
        },
      });
      itemData = response.data?.data ?? null;
    } else if (itemPath) {
      // Get item by path
      const response = await context.client.query("xmc.agent.contentGetContentItemByPath", {
        params: {
          query: { 
            sitecoreContextId: context.contextId,
            language: language,
            item_path: itemPath,
          },
        },
      });
      itemData = response.data?.data ?? null;
    }

    if (!itemData) {
      return { 
        success: false, 
        error: itemId ? `Item not found with ID: ${itemId}` : `Item not found at path: ${itemPath}` 
      };
    }

    const fields = itemData.fields ?? {};
    
    // Try to find the field (case-insensitive search)
    let fieldValue: unknown = undefined;
    let actualFieldName: string | null = null;
    
    for (const [key, value] of Object.entries(fields)) {
      if (key.toLowerCase() === fieldName.toLowerCase()) {
        fieldValue = value;
        actualFieldName = key;
        break;
      }
    }

    if (actualFieldName === null) {
      // Field not found - return available fields for reference
      const availableFields = Object.keys(fields);
      return {
        success: true,
        output: {
          itemId: itemData.itemId ?? itemId,
          itemPath: itemData.path ?? itemPath,
          fieldName: fieldName,
          found: false,
          message: `Field '${fieldName}' not found on this item`,
          availableFields: availableFields,
        },
      };
    }

    return {
      success: true,
      output: {
        itemId: itemData.itemId ?? itemId,
        itemPath: itemData.path ?? itemPath,
        fieldName: actualFieldName,
        fieldValue: fieldValue,
        fieldType: typeof fieldValue,
        found: true,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get field value',
    };
  }
};
