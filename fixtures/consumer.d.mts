/* Types for `consumer.mjs`, written by hand; see `fake.d.mts` for why. */

export function makeConsumer(files: Record<string, string>): Promise<string>
export function removeConsumer(root: string): Promise<void>
export function manifestWith(spec: unknown, field?: string): string
export const RELEASE_SPEC: string
