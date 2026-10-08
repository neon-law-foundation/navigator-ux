/*
 * Types for `check.mjs`, written by hand: the implementation stays plain
 * JavaScript so the CLI runs under bare `node` out of `dist`, and this file is
 * what lets the Vitest suite import it under `strict`.
 */

export const PACKAGE: string
export const CHECKS: readonly string[]
export const USAGE: string

export class UsageError extends Error {}

export interface CheckOptions {
  command: string | undefined
  cwd: string
  src: string
  dist: string
  portal: boolean
  skip: Set<string>
  help: boolean
}

export interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  summary: string
  details: string[]
}

export interface CheckSettings {
  /** The library tokens a brand layer is resolved on. Defaults to the shipped copy. */
  tokensPath?: string
}

export interface CheckIO {
  out(line: string): void
  err(line: string): void
}

export function parseArgs(argv: string[]): CheckOptions
export function runChecks(options: CheckOptions, settings?: CheckSettings): Promise<CheckResult[]>
export function main(argv: string[], io: CheckIO, settings?: CheckSettings): Promise<number>
