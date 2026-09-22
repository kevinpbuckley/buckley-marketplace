import 'server-only';
import catalog from './catalog.json';

export interface CatalogOperation {
  key: string;
  namespace: string;
  kind: 'query' | 'mutation' | 'subscribe';
  package: string;
  deprecated: boolean;
  summary: string;
  operation: string | null;
  params: string | null;
  /** Name of the 2xx payload type, e.g. `SiteInformationResponse`. */
  responseType?: string;
  /** The payload's fields, when the SDK types it. Absent means the SDK returns `unknown`. */
  response?: string;
  referencedTypes?: Record<string, string>;
}

const operations = catalog.operations as CatalogOperation[];

export const catalogMeta = {
  count: operations.length,
  generatedAt: catalog.generatedAt,
  sdkVersions: catalog.sdkVersions,
};

/**
 * Filler words carry no signal and, because matching is substring-based, short ones match
 * almost every key ("a" is in half the catalog). Dropping them keeps ranking meaningful.
 */
const STOPWORDS = new Set([
  'a', 'all', 'an', 'and', 'any', 'are', 'can', 'do', 'does', 'entire', 'find', 'for', 'from',
  'get', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'please', 'show',
  'some', 'the', 'their', 'them', 'to', 'want', 'what', 'whole', 'with', 'you', 'your',
]);

function terms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));
}

/**
 * Terms are scored independently rather than required together: a query like "translate the
 * whole site" must not return nothing just because one word matches no operation.
 * `xmc.xmapp.*` is deprecated in favour of `xmc.sites.*` / `xmc.pages.*`, so it ranks last.
 */
function score(op: CatalogOperation, searchTerms: string[]): number {
  const key = op.key.toLowerCase();
  const operationName = op.key.split('.').pop()!;
  const name = operationName.toLowerCase();
  // `translateSite` -> ['translate', 'site'], so a whole-word hit outranks a substring one.
  const words = operationName.split(/(?=[A-Z])/).map((w) => w.toLowerCase());
  const summary = op.summary.toLowerCase();

  let total = 0;
  let keyHits = 0;

  for (const term of searchTerms) {
    if (words.includes(term)) {
      total += 12;
      keyHits++;
    } else if (name.includes(term)) {
      total += 10;
      keyHits++;
    } else if (words.some((w) => w.length >= 4 && term.includes(w))) {
      // "website" should still reach `translateSite`.
      total += 7;
      keyHits++;
    } else if (key.includes(term)) {
      total += 6;
      keyHits++;
    } else if (summary.includes(term)) {
      total += 2;
    }
  }

  // Summary-only matches are weak signal; require more than one before surfacing.
  if (keyHits === 0 && total < 4) return 0;

  if (op.deprecated) total -= 8;

  // Tie-break toward the more specific operation: `listSites` over `sitesGetAllPagesBySite`.
  return total - words.length * 0.1;
}

export function searchOperations(
  query: string,
  options: { namespace?: string; kind?: string; includeDeprecated?: boolean; limit?: number } = {}
): Array<Pick<CatalogOperation, 'key' | 'kind' | 'summary' | 'deprecated'>> {
  const searchTerms = terms(query);
  const limit = options.limit ?? 15;

  return operations
    .filter((op) => {
      if (!options.includeDeprecated && op.deprecated) return false;
      if (options.namespace && !op.namespace.startsWith(options.namespace)) return false;
      if (options.kind && op.kind !== options.kind) return false;
      return true;
    })
    .map((op) => ({ op, rank: searchTerms.length ? score(op, searchTerms) : 1 }))
    .filter((entry) => entry.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ op }) => ({
      key: op.key,
      kind: op.kind,
      summary: op.summary,
      deprecated: op.deprecated,
    }));
}

export function describeOperation(key: string): CatalogOperation | undefined {
  return operations.find((op) => op.key === key);
}

export function listNamespaces(): Array<{ namespace: string; count: number }> {
  const counts = new Map<string, number>();
  for (const op of operations) {
    if (op.deprecated) continue;
    counts.set(op.namespace, (counts.get(op.namespace) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((a, b) => a.namespace.localeCompare(b.namespace));
}

/** Suggests the supported replacement when the agent lands on a deprecated key. */
export function replacementFor(key: string): string | undefined {
  if (!key.startsWith('xmc.xmapp.')) return undefined;
  const op = key.slice('xmc.xmapp.'.length);
  for (const candidate of [`xmc.sites.${op}`, `xmc.pages.${op}`]) {
    if (operations.some((entry) => entry.key === candidate)) return candidate;
  }
  return undefined;
}
