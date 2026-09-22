import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

const inputSchema = z.object({
  brandKitId: z
    .string()
    .describe('Brand kit identifier. Get it from getSiteContext — do not guess one.'),
  input: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .describe('The content to review, as named fields, e.g. { headline: "...", body: "..." }'),
  sections: z
    .array(
      z.object({
        sectionId: z.string().describe('Brand kit section identifier'),
        fieldIds: z.array(z.string()).optional().describe('Specific fields within the section'),
      })
    )
    .optional()
    .describe('Limit the review to specific brand kit sections. Omit to review against all.'),
});

export const definition: ToolDefinition = {
  name: 'generateBrandReview',
  description:
    'Review content against the site brand kit and return compliance scores, explanations and fix suggestions. Requires a brandKitId from getSiteContext. Report the findings — do not apply the fixes without asking.',
  category: 'Brand',
  inputSchema,
  examples: [
    {
      input: {
        brandKitId: 'b1f2c3d4',
        input: { headline: 'Buy now!!!', body: 'Our synergistic solution...' },
      },
      output: {
        score: 62,
        findings: [{ section: 'Tone of voice', issue: 'Excessive punctuation', suggestion: 'Buy now' }],
      },
      description: 'Returns compliance score with per-finding fixes',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { brandKitId, input: content, sections } = input as z.infer<typeof inputSchema>;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate('ai.skills.generateBrandReview', {
      params: {
        // The review API spells this `brandkitId`, while the host context uses `brandKitId`.
        body: {
          brandkitId: brandKitId,
          input: content,
          ...(sections?.length && { sections }),
        },
        query: { sitecoreContextId: context.contextId },
      },
    });

    return { success: true, output: response.data ?? null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate brand review',
      hint: 'Confirm the brandKitId came from getSiteContext — the site may have no brand kit associated.',
    };
  }
};
