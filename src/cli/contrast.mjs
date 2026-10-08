/*
 * Every pairing the palette claims, and the arithmetic that checks it.
 *
 * `tokens.css` states a ratio for almost every pair it defines. Those comments
 * were written by hand, against values that have since moved, and there is no
 * way to look at `#51686e` on `#f4fafb` and know whether it is 5.6:1 or 4.1:1.
 * A number nobody can verify by eye is a number that drifts — the same lesson
 * the type contract taught, where `fonts.css` said "two weights" for a year
 * while twenty-three rules asked for a third.
 *
 * So the ratios are recomputed from the CSS itself. Both schemes are resolved
 * separately, because a token that clears in light can fail in dark and the
 * dark block only overrides part of the contract.
 *
 * Floors are WCAG 2.1: 4.5:1 for normal text, 3:1 for large text and for
 * non-text that carries meaning (a focus ring, a control boundary). Where a
 * pairing is decorative rather than informational — a tint against the page —
 * the floor states the *minimum perceptible* separation instead, and says so.
 *
 * Plain JavaScript, because two programs run it: `scripts/check-contrast.mjs`
 * under bare `node` before anything is built, and the `navigator-ux` CLI a
 * consumer runs out of `dist`. Types are in `contrast.d.mts`.
 */

/* ------------------------------------------------------------- parsing -- */

/** Comments out: a `/* ... #dc3545 ... *\/` note is prose, not a declaration. */
export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every `--nav-*: value` in a chunk of CSS, last declaration winning. */
function declarations(css) {
  const found = new Map()
  for (const [, name, value] of css.matchAll(/(--nav-[\w-]+)\s*:\s*([^;]+);/g)) {
    found.set(name, value.trim())
  }
  return found
}

/**
 * The library's own token file, as `{ light, dark }` maps.
 *
 * Everything ahead of the dark media block is the light contract; the dark
 * scheme is the light contract with the block's overrides on top.
 */
export function parseTokens(source) {
  const withoutComments = stripComments(source)
  const darkAt = withoutComments.indexOf('@media (prefers-color-scheme: dark)')
  if (darkAt === -1) throw new Error('tokens.css has no dark-scheme block; the parser expects one.')
  const light = declarations(withoutComments.slice(0, darkAt))
  const dark = new Map([...light, ...declarations(withoutComments.slice(darkAt))])
  return { light, dark }
}

/**
 * The custom properties a stylesheet declares on `:root:root`, by scheme.
 *
 * That doubled selector is what makes a sheet a brand layer: it wins on
 * specificity over the library's `:root`, inside the dark media block or out of
 * it. So a light-scope brand declaration also beats the library's *dark* value,
 * which is exactly how a brand that skips its dark block ends up illegible in
 * one scheme — and why `layer()` applies it there too.
 *
 * Every custom property is collected, not only `--nav-*`, so a brand's private
 * ramp (`--acme-500`) resolves when an alias points at it.
 */
export function parseBrandLayer(source) {
  const css = stripComments(source)
  const light = new Map()
  const dark = new Map()
  const stack = []
  let start = 0

  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i]
    if (ch === '{') {
      stack.push(css.slice(start, i).trim())
      start = i + 1
    } else if (ch === '}') {
      collect(css.slice(start, i))
      stack.pop()
      start = i + 1
    } else if (ch === ';') {
      collect(css.slice(start, i + 1))
      start = i + 1
    }
  }

  function collect(chunk) {
    if (!stack.some((prelude) => /(^|[\s,]):root:root(?![\w-])/.test(prelude))) return
    const target = stack.some((prelude) => /prefers-color-scheme\s*:\s*dark/.test(prelude))
      ? dark
      : light
    for (const [, name, value] of `${chunk};`.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      target.set(name, value.trim())
    }
  }

  return { light, dark }
}

/** True when a brand layer touches the palette rather than, say, only the font. */
export const declaresColor = ({ light, dark }) =>
  [...light.keys(), ...dark.keys()].some((name) => name.startsWith('--nav-color-'))

/** A brand layer resolved on top of the library's tokens, cascade order. */
export function layer(base, brand) {
  return {
    light: new Map([...base.light, ...brand.light]),
    dark: new Map([...base.dark, ...brand.light, ...brand.dark]),
  }
}

/** Follow `var(--x)` chains to the hex or rgba() underneath. */
function resolveToken(scheme, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`${name} resolves in a cycle.`)
  seen.add(name)
  const value = scheme.get(name)
  if (value === undefined) throw new Error(`${name} is not declared.`)
  const indirect = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)
  if (indirect) return resolveToken(scheme, indirect[1], seen)
  // A token faded toward transparent — the focus halo — is that color at an
  // alpha, which `channels` already composites.
  const faded = value.match(/^color-mix\(\s*in srgb\s*,\s*var\(\s*(--[\w-]+)\s*\)\s+([\d.]+)%\s*,\s*transparent\s*\)$/)
  if (faded) {
    const [r, g, b] = channels(resolveToken(scheme, faded[1], seen))
    return `rgba(${r}, ${g}, ${b}, ${Number(faded[2]) / 100})`
  }
  return value
}

/** #rgb, #rrggbb, and rgba() over an opaque backdrop, to [r, g, b] 0–255. */
function channels(value, backdrop) {
  const short = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (short) return short.slice(1).map((c) => parseInt(c + c, 16))

  const full = value.match(/^#([0-9a-f]{6})$/i)
  if (full) return [0, 2, 4].map((i) => parseInt(full[1].slice(i, i + 2), 16))

  const rgba = value.match(/^rgba?\(([^)]+)\)$/i)
  if (rgba) {
    const parts = rgba[1].split(/[,\s/]+/).filter(Boolean).map(Number)
    const [r, g, b, a = 1] = parts
    if (!backdrop) throw new Error(`${value} is translucent and needs a backdrop to measure.`)
    // Composite over the backdrop; a scrim's contrast is what you see through it.
    return [r, g, b].map((c, i) => Math.round(c * a + backdrop[i] * (1 - a)))
  }

  throw new Error(`cannot read "${value}" as a color.`)
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

function luminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((c) => toLinear(c / 255))
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

export function contrast(scheme, fg, bg) {
  // A translucent background is composited over the page, because that is what
  // it is drawn on. The scrim is the only one today, and its whole purpose is
  // to be partly transparent.
  const page = channels(resolveToken(scheme, '--nav-color-bg'))
  const bgChannels = channels(resolveToken(scheme, bg), page)
  const fgChannels = channels(resolveToken(scheme, fg), bgChannels)
  const [a, b] = [luminance(fgChannels), luminance(bgChannels)]
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/* -------------------------------------------------------------- the table -- */

const TEXT = 4.5 // WCAG AA, normal text
const NON_TEXT = 3.0 // WCAG AA, meaningful non-text: a focus ring, a control edge
const TINT = 1.03 // decorative only: a band has to be visible, not legible
const EDGE = 1.2 // a border against the surface it bounds

/** [foreground, background, floor]. */
export const PAIRS = [
  ['--nav-color-text', '--nav-color-bg', TEXT],
  ['--nav-color-text', '--nav-color-surface', TEXT],
  ['--nav-color-text', '--nav-color-surface-raised', TEXT],
  ['--nav-color-text', '--nav-color-surface-subtle', TEXT],
  ['--nav-color-text-muted', '--nav-color-bg', TEXT],
  ['--nav-color-text-muted', '--nav-color-surface-raised', TEXT],
  ['--nav-color-text-muted', '--nav-color-surface-subtle', TEXT],

  ['--nav-color-primary', '--nav-color-bg', TEXT],
  ['--nav-color-primary', '--nav-color-surface-raised', TEXT],
  ['--nav-color-primary', '--nav-color-surface-subtle', TEXT],
  ['--nav-color-primary-hover', '--nav-color-bg', TEXT],
  ['--nav-color-primary-active', '--nav-color-bg', TEXT],
  ['--nav-color-on-primary', '--nav-color-primary', TEXT],
  ['--nav-color-on-primary', '--nav-color-primary-hover', TEXT],
  ['--nav-color-on-primary', '--nav-color-primary-active', TEXT],

  ['--nav-color-link', '--nav-color-bg', TEXT],
  ['--nav-color-link', '--nav-color-surface-raised', TEXT],
  ['--nav-color-link-hover', '--nav-color-bg', TEXT],

  ['--nav-color-on-secondary', '--nav-color-secondary', TEXT],
  ['--nav-color-on-secondary', '--nav-color-secondary-hover', TEXT],

  ['--nav-color-selection', '--nav-color-on-selection', TEXT],

  // The status bands: ink has to be legible on its own band in both schemes.
  ['--nav-color-on-success-subtle', '--nav-color-success-subtle', TEXT],
  ['--nav-color-on-danger-subtle', '--nav-color-danger-subtle', TEXT],
  ['--nav-color-on-warning-subtle', '--nav-color-warning-subtle', TEXT],
  ['--nav-color-on-notice-subtle', '--nav-color-notice-subtle', TEXT],
  ['--nav-color-on-danger-solid', '--nav-color-danger-solid', TEXT],
  ['--nav-color-on-danger-solid', '--nav-color-danger-solid-hover', TEXT],
  // Status as ink, on every ground it is actually set on. Checking these
  // against `--nav-color-bg` alone is what hid a failing green for so long:
  // both cleared on pure white and neither cleared on the raised surface a
  // form message sits on.
  ['--nav-color-danger', '--nav-color-bg', TEXT],
  ['--nav-color-danger', '--nav-color-surface-raised', TEXT],
  ['--nav-color-danger', '--nav-color-surface-subtle', TEXT],
  ['--nav-color-success', '--nav-color-bg', TEXT],
  ['--nav-color-success', '--nav-color-surface-raised', TEXT],
  ['--nav-color-success', '--nav-color-surface-subtle', TEXT],

  // Non-text that carries meaning.
  ['--nav-color-focus', '--nav-color-bg', NON_TEXT],
  ['--nav-color-focus', '--nav-color-surface-raised', NON_TEXT],
  ['--nav-color-focus-halo', '--nav-color-bg', NON_TEXT],
  ['--nav-color-focus-halo', '--nav-color-surface-raised', NON_TEXT],
  ['--nav-color-success-border', '--nav-color-success-subtle', TINT],
  ['--nav-color-danger-border', '--nav-color-danger-subtle', TINT],
  ['--nav-color-warning-border', '--nav-color-warning-subtle', TINT],
  ['--nav-color-notice-border', '--nav-color-notice-subtle', TINT],

  // Structure: a border you cannot see is not a border.
  ['--nav-color-border', '--nav-color-bg', EDGE],
  ['--nav-color-border', '--nav-color-surface-raised', EDGE],
  ['--nav-color-surface-raised', '--nav-color-bg', TINT],
  ['--nav-color-surface-subtle', '--nav-color-bg', TINT],

  // The scrim's job is to put the dialog in front, so the pairing that matters
  // is the overlay's edge against the wash — not the wash against the page it
  // covers. Measuring it the latter way is meaningless: a dark scrim over a
  // dark page is *supposed* to be close to it, and the check would demand the
  // dialog's backdrop be legible against what it is hiding.
  ['--nav-color-overlay-edge', '--nav-color-scrim', NON_TEXT],

  // Chart series carry meaning, so they take the non-text floor rather than
  // the tint one — a bar nobody can distinguish from the card behind it is a
  // bar that reports nothing. Measured against `--nav-color-surface` because
  // that is what a chart sits on; a chart placed on the raw page has more
  // contrast, not less, so this is the tighter of the two.
  //
  // What this check cannot do is prove the six are distinguishable from *each
  // other*, which is the other half of a categorical palette. Contrast is a
  // ratio against one ground; hue separation is a different measurement, and
  // pretending this covers it would be the same mistake as the hand-written
  // ratios this gate replaced.
  ['--nav-chart-1', '--nav-color-surface', NON_TEXT],
  ['--nav-chart-2', '--nav-color-surface', NON_TEXT],
  ['--nav-chart-3', '--nav-color-surface', NON_TEXT],
  ['--nav-chart-4', '--nav-color-surface', NON_TEXT],
  ['--nav-chart-5', '--nav-color-surface', NON_TEXT],
  ['--nav-chart-6', '--nav-color-surface', NON_TEXT],
  ['--nav-chart-grid', '--nav-color-surface', TINT],
]

/* --------------------------------------------------------------- running -- */

/**
 * Every pairing in both schemes: a `--verbose` listing and the failures.
 *
 * A value the arithmetic cannot read — `oklch()`, a `color-mix()` other than a
 * fade toward transparent, an undeclared
 * alias — is a failure rather than a crash, because a brand layer is written by
 * someone else and a gate that throws reports nothing about the other pairs.
 */
export function measure(schemes) {
  const failures = []
  const lines = []

  for (const label of ['light', 'dark']) {
    const scheme = schemes[label]
    lines.push(`\n  ${label}`)
    for (const [fg, bg, floor] of PAIRS) {
      let measured
      try {
        measured = contrast(scheme, fg, bg)
      } catch (error) {
        failures.push(`${label}: ${fg} on ${bg} cannot be measured: ${error.message}`)
        lines.push(`    ! ${`${fg} on ${bg}`.padEnd(62)}      ?`)
        continue
      }
      const ok = measured + 1e-9 >= floor
      if (!ok) {
        failures.push(
          `${label}: ${fg} on ${bg} is ${measured.toFixed(2)}:1, under its ${floor}:1 floor.`,
        )
      }
      lines.push(
        `    ${ok ? ' ' : '!'} ${`${fg} on ${bg}`.padEnd(62)} ${measured.toFixed(2).padStart(6)}:1`,
      )
    }
  }

  return { failures, lines, count: PAIRS.length * 2 }
}
