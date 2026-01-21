import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'uploadAsset',
  description: 'Upload an asset (image, file) to Sitecore XM Cloud Media Library. Use this when the user wants to upload media files.',
  category: 'XMC SDK',
  inputSchema: z.object({
    file: z.any().describe('The file to upload (Blob or File object)'),
    name: z.string().describe('The name of the asset'),
    itemPath: z.string().describe('The path in Media Library where the asset will be uploaded'),
    language: z.string().describe('The language for the asset'),
    extension: z.string().describe('The file extension'),
    siteName: z.string().describe('The site name'),
  }),
  examples: [
    {
      input: {
        file: 'file-blob',
        name: 'example.jpg',
        itemPath: '/sitecore/Media Library/Images',
        language: 'en',
        extension: 'jpg',
        siteName: 'MySite',
      },
      output: {
        success: true,
        mediaItem: {
          id: '{MEDIA-ITEM-ID}',
          embedUrl: 'https://...',
          size: 12345,
          dimensions: '800x600',
          extension: 'jpg',
        },
      },
      description: 'Uploads an image to the Media Library',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { file, name, itemPath, language, extension, siteName } = input as { file: Blob | File; name: string; itemPath: string; language: string; extension: string; siteName: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const uploadRequest = JSON.stringify({
      name,
      itemPath,
      language,
      extension,
      siteName,
    });

    const response = await context.client.mutate("xmc.agent.assetsUploadAsset", {
      params: {
        body: {
          file,
          upload_request: uploadRequest,
        },
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    return {
      success: true,
      output: response.data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload asset',
    };
  }
};
