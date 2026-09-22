import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import { isBrandFailure } from '../sdk/brand-module';
import type { BrandKitDetail, BrandKitSummary } from '../sdk/brand-module';

/**
 * ClientSDK wraps the module's return value in `data`, and the Agent API wraps some payloads
 * in a `data` of their own, so the depth varies by endpoint. Unwrap whichever we got.
 */
function unwrap<T>(payload: unknown): T | undefined {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data?: unknown }).data;
    if (inner !== undefined && inner !== null) return inner as T;
  }
  return payload as T | undefined;
}

const inputSchema = z.object({
  brandKitId: z
    .string()
    .optional()
    .describe('Brand kit id. Omit to list the brand kits in this organization.'),
  section: z
    .string()
    .optional()
    .describe('Section name, e.g. "Tone of Voice". Omit to get the kit summary and its sections.'),
});

export const definition: ToolDefinition = {
  name: 'readBrandKit',
  description:
    "Read a brand kit — the structured brand rules attached to a site: Tone of Voice, Visual Guidelines, Image Style, Glossary, Dos and Don'ts. Call with a brandKitId to see its sections, then add `section` to read that section's field values.",
  category: 'Brand',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { brandKitId, section } = input as z.infer<typeof inputSchema>;

  try {
    if (!brandKitId) {
      const response = await context.client.query('brand.kits.list');
      const listed = unwrap<BrandKitSummary[] | unknown>(response.data);
      if (isBrandFailure(listed)) return { success: false, error: listed.message };
      const kits = (Array.isArray(listed) ? listed : []) as BrandKitSummary[];
      return {
        success: true,
        output: {
          brandKits: kits.map((k) => ({ id: k.id, name: k.name, status: k.status })),
          next: 'Call again with a brandKitId to see its sections.',
        },
      };
    }

    // One call returns the whole kit: sections and their field values come back inline.
    const response = await context.client.query('brand.kits.getById', {
      params: { path: { brandkitId: brandKitId } },
    });
    const kit = unwrap<BrandKitDetail>(response.data);
    const sections = kit?.sections ?? [];

    if (isBrandFailure(kit)) {
      return { success: false, error: kit.message };
    }

    if (!section) {
      return {
        success: true,
        output: {
          brandKitId,
          name: kit?.name,
          brandName: kit?.brandName,
          sections: sections.map((s) => s.name),
          next: 'Call again with `section` to read one.',
        },
      };
    }

    const needle = section.trim().toLowerCase();
    const match =
      sections.find((s) => s.name.toLowerCase() === needle) ??
      sections.find((s) => s.name.toLowerCase().includes(needle));

    if (!match) {
      return {
        success: false,
        error: `No section matching "${section}".`,
        availableSections: sections.map((s) => s.name),
      };
    }

    return {
      success: true,
      output: {
        brandKitId,
        section: match.name,
        fields: (match.fields ?? []).map((f) => ({
          name: f.name,
          type: f.type,
          value: f.value,
          ...(f.intent ? { intent: f.intent } : {}),
        })),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to read the brand kit',
    };
  }
};
