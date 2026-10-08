/*
 * No literal color outside the token layer.
 *
 * The JavaScript counterpart of the Rust build's
 * `components_declare_no_literal_colors`. A literal color in a component pins
 * one brand's identity into code all three brands consume — and it does it
 * invisibly, because the component looks right in whichever brand the author
 * happened to be running.
 *
 * Two populations, one rule each:
 *
 *   Component source   No color at all. Components emit semantic class names;
 *                      color is the stylesheet's job.
 *   Stylesheets        No color except in the token layer. `tokens.css` and
 *                      any brand layer are where color is *defined*; every
 *                      other rule resolves it through `var(--nav-*)`.
 *
 * Which files are the token layer is the caller's decision —
 * `scripts/check-no-literal-colors.mjs` for this repository, the
 * `navigator-ux` CLI for a consumer's. Types are in `literal-colors.d.mts`.
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.css']

const PATTERNS = [
  { name: 'hex color', re: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g },
  { name: 'rgb()/rgba()', re: /\brgba?\s*\(/g },
  { name: 'hsl()/hsla()', re: /\bhsla?\s*\(/g },
  { name: 'oklch()/oklab()', re: /\bokl(?:ch|ab)\s*\(/g },
  // The handful of named colors someone actually reaches for. `currentColor`,
  // `transparent`, and `inherit` are keywords, not colors, and stay legal.
  {
    name: 'named color',
    re: /(?<![\w-])(?:white|black|red|blue|green|yellow|orange|purple|gray|grey|silver|navy|teal|cyan|magenta)(?![\w-])/gi,
  },
]

/**
 * Blank comments out so prose about a color is not a color.
 *
 * Every character becomes a space and every newline is kept, rather than the
 * comment collapsing to a single space. That is what makes the reported line
 * numbers exact: they are computed by counting newlines up to the match
 * offset, so a collapsing replacement shifts every offset after the first
 * comment — and in a file that opens with a header comment, that is all of them.
 */
function blankComments(text, ext) {
  const blank = (match) => match.replace(/[^\n]/g, ' ')
  const withoutBlock = text.replace(/\/\*[\s\S]*?\*\//g, blank)
  // CSS has no line comments; stripping `//` there would eat a
  // protocol-relative `url()`, which the bundle gate needs to see.
  return ext === '.css' ? withoutBlock : withoutBlock.replace(/\/\/[^\n]*/g, blank)
}

/*
 * Numeric character references are not colors.
 *
 * `&#8249;` is a single left angle quote, and `&#8722;` a minus sign — both
 * routine in a control that draws its own chevrons. The hex pattern reads the
 * `#8249` inside them as a four-digit color and fails the build, which is a
 * false positive that costs an afternoon to recognize: the reported "color"
 * does not appear anywhere in the file you are told to look at.
 *
 * Blanked to spaces rather than removed, so byte offsets — and therefore the
 * reported line numbers — stay true to the original text.
 */
function blankNumericEntities(text) {
  return text.replace(/&#(?:x[0-9a-fA-F]+|\d+);/g, (entity) => ' '.repeat(entity.length))
}

/** Each literal color in one file's text, as `<rel>:<line>  <kind>: <match>`. */
export function findLiteralColors(raw, ext, rel) {
  const text = blankNumericEntities(blankComments(raw, ext))
  const found = []
  for (const { name, re } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      // Report the line from the original text so the number is navigable.
      const line = raw.slice(0, match.index).split('\n').length
      found.push(`${rel}:${line}  ${name}: ${match[0].trim()}`)
    }
  }
  return found
}

/** Every file under `dir`, depth first, skipping `node_modules`. */
export async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}
