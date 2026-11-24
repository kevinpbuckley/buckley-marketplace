import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import { moveRendering } from './layout';
import { reloadCanvasIfCurrent } from './operation-client';

const inputSchema = z.object({
  pageId: z.string().describe('The page item id'),
  site: z.string().describe('The site name, e.g. "solterra"'),
  language: z.string().describe('The page language, e.g. "en"'),
  instanceId: z
    .string()
    .describe('The component to move: its `id` from xmc.agent.pagesGetComponentsOnPage (the layout instance id)'),
  position: z
    .enum(['first', 'last', 'before', 'after'])
    .describe('first/last within the placeholder, or before/after the component in relativeTo'),
  relativeTo: z
    .string()
    .optional()
    .describe('Required for before/after: the instance id of the neighbouring component'),
  placeholder: z
    .string()
    .optional()
    .describe('Target placeholder key, only when moving to a different placeholder, e.g. "headless-main"'),
});

export const definition: ToolDefinition = {
  name: 'moveComponent',
  description:
    'Reorder a component on a page, or move it to another placeholder, in one call. Reads the layout, moves the component, saves it with xmc.pages.saveLayout and reloads the Pages canvas when that page is open. Use this instead of calling xmc.pages.saveLayout yourself. Returns the new order of the placeholder.',
  category: 'Components',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const request = input as z.infer<typeof inputSchema>;

  const moved = await moveRendering(context, request);
  if (moved.ok === false) {
    return { success: false, error: moved.error, ...(moved.componentsInLayout && { componentsInLayout: moved.componentsInLayout }) };
  }

  const canvasReloaded = await reloadCanvasIfCurrent(context, request.pageId);
  return {
    success: true,
    output: {
      placeholder: moved.placeholder,
      order: moved.order,
      ...(moved.warnings && { warnings: moved.warnings }),
      canvasReloaded,
    },
  };
};
