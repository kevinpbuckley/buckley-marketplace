/**
 * Shared utilities for Sitecore XM Cloud operations
 */

/**
 * Normalizes a GUID by removing braces and converting to lowercase
 * @param guid - The GUID to normalize
 * @returns The normalized GUID without braces and in lowercase
 */
export function normalizeGuid(guid: string): string {
  return (guid || '').replace(/[{}]/g, '').toLowerCase();
}

/**
 * Formats a GUID for use in Sitecore GraphQL item queries by removing braces
 * @param guid - The GUID to format (can be with or without braces)
 * @returns The GUID formatted without braces for GraphQL item queries
 */
export function formatGuidForGraphQL(guid: string): string {
  return normalizeGuid(guid);
}

/**
 * Formats a GUID with braces for cases where the field value already contains a braced GUID
 * @param guid - The GUID to format (can be with or without braces)
 * @returns The GUID formatted with braces
 */
export function formatGuidWithBraces(guid: string): string {
  const normalized = normalizeGuid(guid);
  return `{${normalized}}`;
}

/**
 * Validates if a string is a valid GUID format (with or without braces)
 * @param guid - The string to validate
 * @returns True if the string is a valid GUID format
 */
export function isValidGuid(guid: string): boolean {
  if (!guid) return false;

  // Remove braces if present
  const cleanGuid = guid.replace(/[{}]/g, '');

  // Check if it's a valid GUID format (8-4-4-4-12 hex digits)
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(cleanGuid);
}

/**
 * Extracts a GUID from various input formats (direct GUID, path with GUID, etc.)
 * @param input - The input string that may contain a GUID
 * @returns The extracted GUID or null if not found
 */
export function extractGuid(input: string): string | null {
  if (!input) return null;

  // First check if the entire input is a GUID
  if (isValidGuid(input)) {
    return normalizeGuid(input);
  }

  // Look for GUID patterns in the string (with or without braces)
  const guidPatterns = [
    /\{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\}/i, // {guid}
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,     // guid
  ];

  for (const pattern of guidPatterns) {
    const match = input.match(pattern);
    if (match) {
      return normalizeGuid(match[1] || match[0]);
    }
  }

  return null;
}