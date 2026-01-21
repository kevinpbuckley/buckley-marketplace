import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { normalizeGuid } from '../sitecore-utils';

export const definition: ToolDefinition = {
  name: 'getLanguageDetails',
  description: 'Get detailed information about Sitecore languages including ISO codes, character sets, encodings, and fallback language configurations. Languages live under /sitecore/system/Languages/. Use includeAll=true to check all languages at once.',
  category: 'XMC SDK',
  inputSchema: z.object({
    languagePath: z.string().optional().describe('Full path to the language (e.g., "/sitecore/system/Languages/en"). If not provided, lists all languages.'),
    languageId: z.string().optional().describe('The ID of the language item. Use either path or ID.'),
    includeAll: z.boolean().optional().describe('If true, returns details for ALL languages in the system. Useful for reviewing all language configurations at once.'),
  }),
  examples: [
    {
      input: { languagePath: '/sitecore/system/Languages/en' },
      output: {
        language: {
          name: 'en',
          id: '{...}',
          path: '/sitecore/system/Languages/en',
          template: 'Language',
          fields: {
            'Iso': 'en',
            'Regional Iso Code': 'US',
            'Charset': '',
            'Encoding': '',
            'Fallback Language': '',
            'Dictionary': 'en-US.tdf'
          },
          fallbackLanguage: null
        },
        summary: {
          hasFallbackLanguage: false,
          isoCode: 'en',
          regionalIsoCode: 'US'
        }
      },
      description: 'Returns language details including ISO codes and fallback configuration',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

import { logDebug } from './debugLogger';

// Type for language details result
type LanguageDetailsResult = {
  language: {
    name: string;
    id: string;
    path: string;
    template: string;
    fields: Record<string, string>;
    fallbackLanguage: string | null;
  };
  summary: {
    hasFallbackLanguage: boolean;
    isoCode: string;
    regionalIsoCode: string;
    charset: string;
    encoding: string;
    dictionary: string;
  };
};

// Type for all languages result
type AllLanguagesResult = {
  languages: Array<{
    name: string;
    id: string;
    path: string;
    template: string;
    fields: Record<string, string>;
    fallbackLanguage: string | null;
  }>;
  count: number;
  summary: {
    totalLanguages: number;
    languagesWithFallback: number;
    languagesWithoutFallback: number;
  };
};

export const execute: ToolExecutor = async (input, context) => {
  const { languagePath, languageId, includeAll } = input as { languagePath?: string; languageId?: string; includeAll?: boolean };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  // Known Sitecore IDs for language items
  // Note: Template IDs are not used in this implementation as we rely on template names

  // Helper function to build GraphQL query for getting children of an item by path with fields
  function buildChildrenQueryByPath(): string {
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

  // Helper function to get children using GraphQL by path
  async function getChildrenByGraphQL(parentPath: string): Promise<Array<{ id: string; name: string; path: string; templateId: string; templateName: string; fields: Record<string, string> }>> {
    try {
      console.log('Executing GraphQL query for parent path:', parentPath);
      logDebug('Executing GraphQL query for parent path:', parentPath);

      const query = buildChildrenQueryByPath();

      // Use SDK mutate signature: client.mutate(methodName, { params: { query: { sitecoreContextId }, body: { query, variables }}})
      const response = await (context.client as ClientSDK).mutate('xmc.authoring.graphql', {
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

  // Helper function to get all valid languages (direct children of /sitecore/system/Languages)
  async function getValidLanguages(): Promise<Array<{ name: string; id: string; path: string; templateId?: string }>> {
    console.log('Getting valid languages from folder');

    try {
      // Try GraphQL directly on the languages folder path first (preferred)
      try {
        const directChildren = await getChildrenByGraphQL('/sitecore/system/Languages');
        console.log('Direct GraphQL children count for /sitecore/system/Languages:', directChildren.length);
        if (directChildren && directChildren.length > 0) {
          const languages = directChildren
            .filter(child => {
              console.log('Child:', child.name, 'Template:', child.templateName);
              return child.templateName?.toLowerCase().includes('language') || child.templateName === 'Language';
            })
            .map(child => ({ name: child.name, id: child.id, path: child.path, templateId: child.templateId }));

          console.log('Filtered languages (from direct GraphQL):', languages.length);
          return languages;
        }
      } catch (err) {
        console.error('Error querying languages folder via GraphQL directly:', err);
      }

      // If GraphQL didn't return children, fall back to using the content API to locate the folder
      let folderResponse;
      try {
        folderResponse = await context.client.query("xmc.agent.contentGetContentItemByPath", {
          params: {
            query: {
              sitecoreContextId: context.contextId,
              item_path: '/sitecore/system/Languages',
            },
          },
        });
      } catch (err) {
        console.error('Error calling contentGetContentItemByPath:', err);
        logDebug('Error calling contentGetContentItemByPath:', err);
        return [];
      }

      logDebug('folderResponse:', folderResponse && typeof folderResponse === 'object' ? JSON.stringify(folderResponse, null, 2) : folderResponse);

      const folderItem = folderResponse?.data?.data as Record<string, unknown> | undefined;
      if (folderItem) {
        console.log('Languages folder found by path:', folderItem.name, folderItem.path);
        const folderId = (folderItem.itemId as string || '').replace(/[{}]/g, '');
        
        // Use GraphQL to get children (preferred) but fallback to content API children when GraphQL is unauthorized
        // Prefer path-based GraphQL queries (more reliable); use folderItem.path if available
        const folderPath = folderItem.path as string || '/sitecore/system/Languages';
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

        // Filter to only include items with the Language template
        const languages = children
          .filter(child => {
            console.log('Child:', child.name, 'Template:', child.templateName);
            return child.templateName?.toLowerCase().includes('language') || 
                   child.templateName === 'Language';
          })
          .map(child => ({
            name: child.name,
            id: child.id,
            path: child.path,
            templateId: child.templateId,
          }));
        
        console.log('Filtered languages (from content API):', languages.length);
        return languages;
      } else {
        console.log('Languages folder not found by path');
        return [];
      }
    } catch (err) {
      console.error('Error getting valid languages:', err);
      return [];
    }
  }

  // Helper function to get language details for a specific item
  async function getLanguageDetailsForItem(languageItem: Record<string, unknown>): Promise<LanguageDetailsResult> {
    const languageName = languageItem.name as string || '';
    const languageId = (languageItem.itemId as string || '').replace(/[{}]/g, '');
    const languagePath = languageItem.path as string || '';
    const template = languageItem.template as Record<string, unknown> | undefined;
    const templateName = template?.name as string || '';

    // Get fields from the language item
    const fields = languageItem.fields as Record<string, unknown> | undefined;
    const fieldMap: Record<string, string> = {};

    if (fields && typeof fields === 'object') {
      Object.entries(fields).forEach(([key, value]) => {
        fieldMap[key] = String(value || '');
      });
    }

    // Extract fallback language information
    const fallbackLanguageField = fieldMap['Fallback Language'] || '';
    const fallbackLanguage = fallbackLanguageField ? fallbackLanguageField : null;

    // Extract other key fields
    const isoCode = fieldMap['Iso'] || '';
    const regionalIsoCode = fieldMap['Regional Iso Code'] || '';
    const charset = fieldMap['Charset'] || '';
    const encoding = fieldMap['Encoding'] || '';
    const dictionary = fieldMap['Dictionary'] || '';

    return {
      language: {
        name: languageName,
        id: languageId,
        path: languagePath,
        template: templateName,
        fields: fieldMap,
        fallbackLanguage: fallbackLanguage,
      },
      summary: {
        hasFallbackLanguage: !!fallbackLanguage,
        isoCode: isoCode,
        regionalIsoCode: regionalIsoCode,
        charset: charset,
        encoding: encoding,
        dictionary: dictionary,
      },
    };
  }

  try {
    // If includeAll is true, get all languages
    if (includeAll) {
      const validLanguages = await getValidLanguages();
      console.log('Found valid languages:', validLanguages.length);

      const allLanguageDetails: Array<{
        name: string;
        id: string;
        path: string;
        template: string;
        fields: Record<string, string>;
        fallbackLanguage: string | null;
      }> = [];

      for (const lang of validLanguages) {
        try {
          // Get full details for each language
          let languageItem: Record<string, unknown> | undefined;

          if (lang.path) {
            const response = await context.client.query("xmc.agent.contentGetContentItemByPath", {
              params: {
                query: {
                  sitecoreContextId: context.contextId,
                  item_path: lang.path,
                },
              },
            });
            languageItem = response.data?.data as Record<string, unknown> | undefined;
          } else if (lang.id) {
            const response = await context.client.query("xmc.agent.contentGetContentItemById", {
              params: {
                query: { sitecoreContextId: context.contextId },
                path: { itemId: lang.id },
              },
            });
            languageItem = response.data?.data as Record<string, unknown> | undefined;
          }

          if (languageItem) {
            const details = await getLanguageDetailsForItem(languageItem);
            allLanguageDetails.push({
              name: details.language.name,
              id: details.language.id,
              path: details.language.path,
              template: details.language.template,
              fields: details.language.fields,
              fallbackLanguage: details.language.fallbackLanguage,
            });
          }
        } catch (err) {
          console.error(`Error getting details for language ${lang.name}:`, err);
        }
      }

      const languagesWithFallback = allLanguageDetails.filter(lang => lang.fallbackLanguage).length;

      return {
        success: true,
        output: {
          languages: allLanguageDetails,
          count: allLanguageDetails.length,
          summary: {
            totalLanguages: allLanguageDetails.length,
            languagesWithFallback: languagesWithFallback,
            languagesWithoutFallback: allLanguageDetails.length - languagesWithFallback,
          },
        } as AllLanguagesResult,
      };
    }

    // Get valid languages for validation
    const validLanguages = await getValidLanguages();

    // Get specific language
    let languageItem: Record<string, unknown> | undefined;

    if (languagePath) {
      const response = await context.client.query("xmc.agent.contentGetContentItemByPath", {
        params: {
          query: {
            sitecoreContextId: context.contextId,
            item_path: languagePath,
          },
        },
      });
      languageItem = response.data?.data as Record<string, unknown> | undefined;
    } else if (languageId) {
      const response = await context.client.query("xmc.agent.contentGetContentItemById", {
        params: {
          query: { sitecoreContextId: context.contextId },
          path: { itemId: languageId },
        },
      });
      languageItem = response.data?.data as Record<string, unknown> | undefined;
    }

    if (!languageItem) {
      return {
        success: false,
        error: 'Language not found',
        availableLanguages: validLanguages,
      };
    }

    // Validate this is a valid language (direct child of /sitecore/system/Languages)
    const languageItemId = (languageItem.itemId as string || '');
    const languageItemPath = languageItem.path as string || '';
    const normalizedItemId = languageItemId ? normalizeGuid(languageItemId) : '';
    const isValidLanguage = validLanguages.some(l => {
      const candidateId = l.id ? normalizeGuid(l.id as string) : '';
      const candidatePath = l.path as string || '';
      return (candidateId && normalizedItemId && candidateId === normalizedItemId) || candidatePath === languageItemPath;
    });

    if (!isValidLanguage) {
      return {
        success: false,
        error: `The item "${languageItem.name}" is not a valid language. Languages must be direct children of /sitecore/system/Languages.`,
        itemPath: languageItemPath,
        availableLanguages: validLanguages,
      };
    }

    // Use the helper function to get language details
    const details = await getLanguageDetailsForItem(languageItem);

    return {
      success: true,
      output: details,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get language details',
    };
  }
};