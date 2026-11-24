import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor, ToolExecutorContext } from './types';
import { moveRendering, type PlacedComponent } from './layout';
import { callOperation, describeFailure, reloadCanvasIfCurrent } from './operation-client';

const inputSchema = z.object({
  pageId: z.string().describe('The page item id'),
  language: z.string().describe('The page language, e.g. "en"'),
  componentRenderingId: z
    .string()
    .describe('Rendering id of the component, from xmc.agent.pagesGetAllowedComponentsByPlaceholder'),
  placeholderPath: z.string().describe('Placeholder to add it to, e.g. "headless-main"'),
  componentItemName: z
    .string()
    .describe('Name for the datasource item, e.g. "Clean Energy Quote". A suffix is added if the name is taken.'),
  fields: z
    .record(z.string(), z.string())
    .describe(
      'Datasource field values by exact field name, from datasourceFields of xmc.agent.componentsGetComponent. Rich text as clean HTML, other fields plain text.'
    ),
  position: z
    .enum(['first', 'last', 'before', 'after'])
    .optional()
    .describe('Where to place it in the placeholder. Omit to append at the end.'),
  relativeTo: z
    .string()
    .optional()
    .describe('Required for before/after: instance id of the neighbouring component'),
  site: z.string().optional().describe('The site name. Required when position is first, before or after.'),
});

type Input = z.infer<typeof inputSchema>;

export const definition: ToolDefinition = {
  name: 'addComponentWithContent',
  description:
    'Add a component to a page with its datasource content in one call, then check the content was stored. Picks a unique datasource name, creates the datasource inline with the field values, optionally places the component (first, or before/after another), flags existing components on the page whose datasource is empty, and reloads the Pages canvas when that page is open. Check the placeholder allows the component first (xmc.agent.pagesGetAllowedComponentsByPlaceholder).',
  category: 'Components',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

interface FieldNode {
  name: string;
  value: string;
}

interface PageComponent {
  id: string;
  componentName: string;
  dataSource?: string | null;
  componentDetails?: { name: string; path: string; fields?: { nodes?: FieldNode[] } } | null;
}

interface AddComponentResponse {
  componentId: string;
  datasourceId?: string | null;
}

const MAX_NAME_ATTEMPTS = 3;

const isBlank = (value: string) => !value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/** Content item fields come back as plain strings or `{ value }` objects depending on type. */
function fieldText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'value' in value) return fieldText((value as { value: unknown }).value);
  return JSON.stringify(value);
}

function uniqueName(base: string, taken: Set<string>): string {
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base}_${n}`;
  return name;
}

async function readComponents(context: ToolExecutorContext, pageId: string, language: string) {
  const result = await callOperation(context, 'xmc.agent.pagesGetComponentsOnPage', 'query', {
    path: { pageId },
    query: { language },
  });
  if (result.ok === false) return null;
  return ((result.data as { components?: PageComponent[] | null })?.components ?? []) as PageComponent[];
}

async function verifyDatasource(
  context: ToolExecutorContext,
  datasourceId: string,
  language: string,
  expected: Record<string, string>
) {
  const item = await callOperation(context, 'xmc.agent.contentGetContentItemById', 'query', {
    path: { itemId: datasourceId },
    query: { language },
  });
  if (item.ok === false) return { checked: false, reason: describeFailure(item) };

  const stored = (item.data as { fields?: Record<string, unknown> | null })?.fields ?? {};
  const byName = new Map(Object.entries(stored).map(([k, v]) => [k.toLowerCase(), fieldText(v)]));
  const emptyFields = Object.entries(expected)
    .filter(([, value]) => !isBlank(value))
    .filter(([name]) => isBlank(byName.get(name.toLowerCase()) ?? ''))
    .map(([name]) => name);

  return { checked: true, emptyFields };
}

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, language, componentRenderingId, placeholderPath, componentItemName, fields, position, relativeTo, site } =
    input as Input;

  if (position && position !== 'last' && !site) {
    return { success: false, error: `position "${position}" needs the site name.` };
  }

  const warnings: string[] = [];
  const existing = await readComponents(context, pageId, language);

  // A component left with an empty datasource renders as a blank block; surface it now
  // rather than after the user spots it on the page.
  for (const component of existing ?? []) {
    const nodes = component.componentDetails?.fields?.nodes;
    if (nodes?.length && nodes.every((node) => isBlank(node.value ?? ''))) {
      warnings.push(
        `Existing ${component.componentName} (instance ${component.id}, datasource ${component.componentDetails?.path}) has no content. Ask the user whether to fill it or remove it.`
      );
    }
  }

  const taken = new Set(
    (existing ?? []).map((c) => c.componentDetails?.name?.toLowerCase()).filter((n): n is string => Boolean(n))
  );

  let name = uniqueName(componentItemName, taken);
  let added: AddComponentResponse | null = null;
  let lastError = '';

  for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS && !added; attempt++) {
    const result = await callOperation(context, 'xmc.agent.pagesAddComponentOnPage', 'mutation', {
      path: { pageId },
      body: { componentRenderingId, placeholderPath, componentItemName: name, language, fields },
    });
    if (result.ok === true) {
      added = result.data as AddComponentResponse;
      break;
    }
    lastError = describeFailure(result);
    // Datasource names must be unique under the page's Data folder; the precheck cannot see
    // items that are not on the layout, so retry with the next suffix on a name clash.
    if (!/already|exist|duplicate|unique|in use/i.test(lastError)) break;
    taken.add(name.toLowerCase());
    name = uniqueName(componentItemName, taken);
  }

  if (!added) return { success: false, error: `Adding the component failed: ${lastError}` };

  let verification: { checked: boolean; emptyFields?: string[]; reason?: string } = { checked: false };
  if (added.datasourceId) {
    verification = await verifyDatasource(context, added.datasourceId, language, fields);
    if (verification.emptyFields?.length) {
      warnings.push(
        `These fields are empty on the new datasource: ${verification.emptyFields.join(', ')}. Check the exact field names in datasourceFields of xmc.agent.componentsGetComponent and set them with xmc.agent.contentUpdateContent on ${added.datasourceId}.`
      );
    }
  } else if (Object.keys(fields).length) {
    warnings.push(
      'The component was added without a datasource, so the field values were not stored. Find or create one and attach it with xmc.agent.pagesSetComponentDatasource.'
    );
  }

  let order: PlacedComponent[] | undefined;
  if (position && position !== 'last' && site) {
    const moved = await moveRendering(context, {
      pageId,
      site,
      language,
      instanceId: added.componentId,
      datasourceId: added.datasourceId ?? undefined,
      position,
      relativeTo,
    });
    if (moved.ok === true) order = moved.order;
    else warnings.push(`The component was added at the end of ${placeholderPath} but could not be moved: ${moved.error}`);
  }

  const canvasReloaded = await reloadCanvasIfCurrent(context, pageId);

  return {
    success: true,
    output: {
      componentId: added.componentId,
      datasourceId: added.datasourceId ?? null,
      componentItemName: name,
      placeholder: placeholderPath,
      contentVerified: verification.checked && !verification.emptyFields?.length,
      ...(verification.reason && { verificationError: verification.reason }),
      ...(order && { order }),
      ...(warnings.length && { warnings }),
      canvasReloaded,
    },
  };
};
