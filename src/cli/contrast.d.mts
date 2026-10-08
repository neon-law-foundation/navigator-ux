/* Types for `contrast.mjs`, written by hand; see `check.d.mts` for why. */

export type Scheme = Map<string, string>

export interface Schemes {
  light: Scheme
  dark: Scheme
}

export interface Measurement {
  failures: string[]
  lines: string[]
  count: number
}

export const PAIRS: ReadonlyArray<readonly [string, string, number]>

export function stripComments(css: string): string
export function parseTokens(source: string): Schemes
export function parseBrandLayer(source: string): Schemes
export function declaresColor(layer: Schemes): boolean
export function layer(base: Schemes, brand: Schemes): Schemes
export function contrast(scheme: Scheme, fg: string, bg: string): number
export function measure(schemes: Schemes): Measurement
