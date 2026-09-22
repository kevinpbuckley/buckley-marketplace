/**
 * Requests to Sitecore services that the Marketplace SDK does not model.
 *
 * The app holds no credentials of its own, so these go through the host's authenticated
 * proxy: `_fetch` keeps only the path and lets the host attach the token and pick the base
 * URL. That also means a path outside the registered modules may simply not resolve, which
 * the callers surface rather than swallow.
 */
/**
 * Services are addressed by path prefix under the edge platform, the same way the SDK's own
 * modules are. Brand kits and brand contexts are part of the Agent API, which the host
 * already proxies — they are simply newer than the SDK's generated operation list.
 */
export const AGENT_API = '/stream/ai-agent-api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hostFetch(client: any, path: string): Promise<unknown> {
  const proxy = client?.['_fetch']?.bind(client);
  if (typeof proxy !== 'function') {
    throw new Error('The Marketplace host does not expose a request proxy in this SDK version.');
  }

  const response: Response = await proxy(
    new Request(`https://edge-platform.sitecorecloud.io${path}`)
  );

  if (response.status === 404) {
    throw new Error(
      `The host did not route ${path} (404). This service is not exposed through the Marketplace host.`
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `The host token lacks access to ${path} (${response.status}). The app registration needs the matching brand scope.`
    );
  }
  if (!response.ok) throw new Error(`Request to ${path} returned ${response.status}.`);

  return response.json();
}
