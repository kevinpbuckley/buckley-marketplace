import type { ClientSDK, SDKModule } from '@sitecore-marketplace-sdk/client';

/**
 * A Marketplace SDK module for the Agent API's brand endpoints.
 *
 * These exist in the Agent API but not in `@sitecore-marketplace-sdk/xmc`, which is generated
 * from an older spec (35 of the API's 56 paths — see issue #10). Rather than calling them
 * outside the SDK, this registers them through the SDK's own extension point: `SDKModule` is
 * public, `ClientSDK.init({ modules })` accepts any module, and `client.query('brand.…')`
 * then dispatches here like any first-party operation.
 *
 * Requests go over the host's authenticated proxy, exactly as the generated xmc clients do —
 * see `xmc/src/client-sdk-fetch.ts`, which configures every hey-api client with
 * `fetch: clientSdkfetch`. The app holds no credentials of its own.
 *
 * Delete this module once Sitecore publishes an xmc release that includes these operations.
 */

const AGENT_API = '/stream/ai-agent-api';

/** Mirrors xmc's `clientSdkfetch`; the package does not export it. */
async function proxiedFetch(path: string): Promise<Response> {
  const clientSdk = (globalThis as unknown as Record<string, ClientSDK | undefined>)[
    'sitecore_marketplace__clientSdk'
  ];

  if (!clientSdk) throw new Error('ClientSDK is not available on the window object.');

  // The host keeps only the path, attaches the token and resolves the base URL.
  const request = new Request(`https://edge-platform.sitecorecloud.io${path}`);
  return (clientSdk as unknown as { _fetch: (input: Request) => Promise<Response> })._fetch(
    request
  );
}

async function get<T>(path: string): Promise<T> {
  const response = await proxiedFetch(path);

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Brand request denied (${response.status}). The Marketplace app registration lacks the brand read scope.`
    );
  }
  if (response.status === 404) {
    throw new Error(`Brand request returned 404 for ${path}.`);
  }
  if (!response.ok) throw new Error(`Brand request returned ${response.status}.`);

  return (await response.json()) as T;
}

type PathParams = { path?: Record<string, string>; query?: Record<string, string> } | undefined;

const kits = {
  list: () => get(`${AGENT_API}/api/v1/brandkits`),
  getById: (params: PathParams) =>
    get(`${AGENT_API}/api/v1/brandkits/${params?.path?.brandkitId ?? ''}`),
};

const contexts = {
  list: () => get(`${AGENT_API}/api/v1/brand-contexts`),
  getById: (params: PathParams) =>
    get(`${AGENT_API}/api/v1/brand-contexts/${params?.path?.brandContextId ?? ''}`),
  items: (params: PathParams) =>
    get(
      `${AGENT_API}/api/v1/brand-contexts/${params?.path?.brandContextId ?? ''}/items?ids=${
        params?.query?.ids ?? ''
      }`
    ),
};

const namespaceMap: Record<string, Record<string, (params: PathParams) => Promise<unknown>>> = {
  kits,
  contexts,
};

/** Same dispatch as the SDK's own `createSDKModule`, which ships unpublished. */
export const Brand: SDKModule = {
  namespace: 'brand',
  invokeOperation: (operationName: string, ...args: unknown[]) => {
    const [group, name] = operationName.split('.', 2);
    const sdk = namespaceMap[group];

    if (!sdk) throw new Error(`Namespace '${group}' not found`);
    if (!(name in sdk)) throw new Error(`Operation '${name}' not found in namespace '${group}'`);

    return sdk[name](args[0] as PathParams);
  },
};

export interface BrandKitField {
  id: string;
  name: string;
  type: string;
  value: unknown;
  intent?: string;
}

export interface BrandKitSection {
  id: string;
  name: string;
  fields?: BrandKitField[];
}

export interface BrandKitSummary {
  id: string;
  name: string;
  status?: string;
}

export interface BrandKitDetail extends BrandKitSummary {
  brandName?: string;
  sections?: BrandKitSection[];
}

export interface BrandContextNode {
  brandContextItemId: string;
  displayName: string;
  type: string;
  children?: BrandContextNode[];
}

export interface BrandContextSummary {
  brandContextId: string;
  displayName: string;
  runStatus?: string;
}

export interface BrandContextDetail extends BrandContextSummary {
  children?: BrandContextNode[];
}

export interface BrandContextItems {
  requested: number;
  succeeded: number;
  failed: number;
  data?: Array<{
    brandContextItemId: string;
    displayName: string;
    content?: string;
    fetchStatusMessage?: string;
  }>;
}

// Typed like any other module's augmentation, so `client.query('brand.…')` checks.
declare module '@sitecore-marketplace-sdk/client' {
  interface QueryMap {
    'brand.kits.list': {
      params: undefined;
      response: BrandKitSummary[];
      subscribe: false;
    };
    'brand.kits.getById': {
      params: { path: { brandkitId: string } };
      response: BrandKitDetail;
      subscribe: false;
    };
    'brand.contexts.list': {
      params: undefined;
      response: BrandContextSummary[];
      subscribe: false;
    };
    'brand.contexts.getById': {
      params: { path: { brandContextId: string } };
      response: BrandContextDetail;
      subscribe: false;
    };
    'brand.contexts.items': {
      params: { path: { brandContextId: string }; query: { ids: string } };
      response: BrandContextItems;
      subscribe: false;
    };
  }
}
