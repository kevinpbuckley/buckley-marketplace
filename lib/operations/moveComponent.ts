import { z } from 'zod';
import type { LocalOperation } from './types';
import { moveRendering } from './layout';
import { reloadCanvasIfCurrent } from '../tools/operation-client';

const schema = z.object({
  pageId: z.string(),
  site: z.string(),
  language: z.string(),
  instanceId: z.string(),
  position: z.enum(['first', 'last', 'before', 'after']),
  relativeTo: z.string().optional(),
  placeholder: z.string().optional(),
});

/** Reads the layout, moves one rendering, saves it, and reloads the canvas if that page is open. */
export const moveComponent: LocalOperation<typeof schema> = {
  key: 'buckley.pages.moveComponent',
  kind: 'mutation',
  schema,
  execute: async (params, context) => {
    const moved = await moveRendering(context, params);
    if (moved.ok === false) {
      return {
        success: false,
        error: moved.error,
        ...(moved.componentsInLayout && { componentsInLayout: moved.componentsInLayout }),
      };
    }

    const canvasReloaded = await reloadCanvasIfCurrent(context, params.pageId);
    return {
      success: true,
      output: {
        placeholder: moved.placeholder,
        order: moved.order,
        ...(moved.warnings && { warnings: moved.warnings }),
        canvasReloaded,
      },
    };
  },
};
