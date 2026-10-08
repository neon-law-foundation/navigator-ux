/* Types for `external-references.mjs`, written by hand; see `check.d.mts` for why. */

export const ALLOWED: Set<string>
export function findExternalReferences(
  dir: string,
  root: string,
): Promise<{ failures: string[]; scanned: number }>
