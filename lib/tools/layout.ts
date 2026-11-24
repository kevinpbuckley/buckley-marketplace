import type { ToolExecutorContext } from './types';
import { callOperation, describeFailure, sameId } from './operation-client';

interface LayoutRendering {
  id: string;
  instanceId: string;
  placeholderKey: string;
  dataSource?: string;
  parameters?: Record<string, string>;
  [key: string]: unknown;
}

interface LayoutDevice {
  id: string;
  layoutId?: string;
  placeholders?: unknown[];
  renderings?: LayoutRendering[];
  [key: string]: unknown;
}

interface PageLayoutBody {
  devices: LayoutDevice[];
  [key: string]: unknown;
}

interface PageState {
  revision?: string | null;
  finalLayout?: string | null;
  sharedLayout?: string | null;
  layoutEditingKind?: string | null;
}

interface SavePageResult {
  errors?: Array<{ errorCode?: string | null; message?: string | null }> | null;
  validationErrors?: Array<{ errorMessage?: string | null }> | null;
  warnings?: string[] | null;
}

export type MovePosition = 'first' | 'last' | 'before' | 'after';

export interface MoveRequest {
  pageId: string;
  site: string;
  language: string;
  instanceId: string;
  /** Fallback match on the rendering's datasource, for ids that are not the layout instance id. */
  datasourceId?: string;
  position: MovePosition;
  /** Required for before/after: the instance id of the component to sit next to. */
  relativeTo?: string;
  /** Target placeholder key. Defaults to relativeTo's placeholder, else the current one. */
  placeholder?: string;
}

export interface PlacedComponent {
  instanceId: string;
  renderingId: string;
  dataSource?: string;
}

export type MoveResult =
  | { ok: true; placeholder: string; order: PlacedComponent[]; warnings?: string[] }
  | { ok: false; error: string; componentsInLayout?: Array<PlacedComponent & { placeholder: string }> };

function describeLayout(layout: PageLayoutBody) {
  return layout.devices.flatMap((d) =>
    (d.renderings ?? []).map((r) => ({
      instanceId: r.instanceId,
      renderingId: r.id,
      placeholder: r.placeholderKey,
      dataSource: r.dataSource,
    }))
  );
}

function matches(rendering: LayoutRendering, instanceId: string, datasourceId?: string): boolean {
  return sameId(rendering.instanceId, instanceId) || Boolean(datasourceId && sameId(rendering.dataSource, datasourceId));
}

/**
 * Moves a rendering within the page layout. The Agent API has no move operation, so this
 * reads the layout from `xmc.pages.retrievePageState`, reorders the renderings array (order in
 * the array is render order within a placeholder) and writes it back with `xmc.pages.saveLayout`.
 */
export async function moveRendering(context: ToolExecutorContext, request: MoveRequest): Promise<MoveResult> {
  const { pageId, site, language, instanceId, datasourceId, position, relativeTo, placeholder } = request;

  if ((position === 'before' || position === 'after') && !relativeTo) {
    return { ok: false, error: `position "${position}" needs relativeTo, the instance id of the neighbouring component.` };
  }

  const state = await callOperation(context, 'xmc.pages.retrievePageState', 'query', {
    path: { pageId },
    query: { Site: site, Language: language, WithLayout: true },
  });
  if (state.ok === false) return { ok: false, error: `Could not read the page layout: ${describeFailure(state)}` };

  const page = state.data as PageState;
  const kind = page.layoutEditingKind === 'Shared' ? 'Shared' : 'Final';
  const raw = kind === 'Shared' ? page.sharedLayout : page.finalLayout;
  if (!raw) return { ok: false, error: `The page has no ${kind.toLowerCase()} layout to edit.` };

  let layout: PageLayoutBody;
  try {
    layout = JSON.parse(raw) as PageLayoutBody;
  } catch {
    return { ok: false, error: 'The page layout is not valid JSON, so it was left untouched.' };
  }

  const device = layout.devices?.find((d) => d.renderings?.some((r) => matches(r, instanceId, datasourceId)));
  if (!device?.renderings) {
    return {
      ok: false,
      error: `No component with instance id ${instanceId} is in the page layout. Retry with an instanceId from componentsInLayout.`,
      componentsInLayout: describeLayout(layout),
    };
  }

  const renderings = device.renderings;
  const moving = renderings.splice(renderings.findIndex((r) => matches(r, instanceId, datasourceId)), 1)[0];

  let insertAt: number;
  if (position === 'before' || position === 'after') {
    const anchor = renderings.findIndex((r) => sameId(r.instanceId, relativeTo));
    if (anchor === -1) {
      return {
        ok: false,
        error: `No component with instance id ${relativeTo} is in the page layout. Retry with an instanceId from componentsInLayout.`,
        componentsInLayout: describeLayout(layout),
      };
    }
    moving.placeholderKey = placeholder ?? renderings[anchor].placeholderKey;
    insertAt = position === 'before' ? anchor : anchor + 1;
  } else {
    const target = placeholder ?? moving.placeholderKey;
    moving.placeholderKey = target;
    const inTarget = renderings.map((r, i) => (r.placeholderKey === target ? i : -1)).filter((i) => i !== -1);
    insertAt =
      inTarget.length === 0
        ? renderings.length
        : position === 'first'
          ? inTarget[0]
          : inTarget[inTarget.length - 1] + 1;
  }
  renderings.splice(insertAt, 0, moving);

  const saved = await callOperation(context, 'xmc.pages.saveLayout', 'mutation', {
    path: { pageId },
    body: {
      layout: { kind, body: JSON.stringify(layout) },
      language,
      site,
      ...(page.revision && { revision: page.revision }),
    },
  });
  if (saved.ok === false) return { ok: false, error: `Saving the layout failed: ${describeFailure(saved)}` };

  const result = (saved.data ?? {}) as SavePageResult;
  const problems = [
    ...(result.errors ?? []).map((e) => e.message ?? e.errorCode ?? 'Unknown error'),
    ...(result.validationErrors ?? []).map((e) => e.errorMessage ?? 'Validation error'),
  ];
  if (problems.length) return { ok: false, error: `Saving the layout failed: ${problems.join('; ')}` };

  return {
    ok: true,
    placeholder: moving.placeholderKey,
    order: renderings
      .filter((r) => r.placeholderKey === moving.placeholderKey)
      .map((r) => ({ instanceId: r.instanceId, renderingId: r.id, dataSource: r.dataSource })),
    ...(result.warnings?.length && { warnings: result.warnings }),
  };
}
