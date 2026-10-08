/*
 * Nothing in a built bundle reaches off-origin.
 *
 * The library's counterpart to the portals' `no-external-references.py`. A CDN
 * script, a remote font, or an icon package fetched at runtime is a third party
 * inserted into an authenticated legal portal — it sees every URL it is loaded
 * from, and it can change under us without a deploy. It is also a hard
 * dependency on someone else's uptime for a page a client is trying to read.
 *
 * It reads a build's output, not its source, because the bundler is where a
 * remote URL would sneak in: an `@import url(...)` that looked local in source,
 * or a dependency that inlines one. Types are in `external-references.d.mts`.
 */

import { readFile } from 'node:fs/promises'
import { extname, relative } from 'node:path'
import { walk } from './literal-colors.mjs'

/*
 * XML namespaces are identifiers, not addresses — nothing fetches them, and an
 * SVG without `xmlns` is an SVG that does not render when served standalone.
 * They are matched as whole strings rather than by host so that a genuine
 * request to w3.org would still fail the gate.
 */
export const ALLOWED = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/XML/1998/namespace',
  // LocationMap's explicit attribution and “Open in OpenStreetMap” links use
  // this origin only for user-clicked navigation; the component fetches no map data.
  'https://www.openstreetmap.org',
  // The release-URL shape the CLI's `manifest` check names in its message. It
  // is printed, never fetched.
  'https://github.com/neon-law-source-code/navigator-ux/releases/download/v',
])

/*
 * A URL, not a comment. The host must contain a dot, which is what separates a
 * protocol-relative reference from the `//# sourceMappingURL=` pragma and from
 * any ordinary `// note` a bundler passes through.
 */
const URL_RE = /(?:https?:)?\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?[^\s'"`)<>\\]*/gi

/** Text formats worth scanning. A woff2 is binary and cannot carry a URL. */
const SCANNED = new Set(['.js', '.cjs', '.mjs', '.css', '.html', '.json', '.ts'])

/**
 * Every off-origin reference under `dir`, as `<rel>:<line>  <url>`, with `rel`
 * relative to `root`.
 */
export async function findExternalReferences(dir, root) {
  const failures = []
  let scanned = 0

  for await (const file of walk(dir)) {
    // Source maps embed the original sources, so a URL in a comment in `src`
    // would trip the gate from inside a file nothing ever serves.
    if (file.endsWith('.map')) continue
    if (!SCANNED.has(extname(file))) continue

    scanned += 1
    const text = await readFile(file, 'utf8')
    const rel = relative(root, file).split('\\').join('/')

    for (const match of text.matchAll(URL_RE)) {
      const url = match[0]
      if (ALLOWED.has(url)) continue
      // Comments are scanned too, and that is on purpose rather than an
      // oversight. A URL in a comment is inert today and one edit away from
      // being a request, and stripping comments first is not free: blanking
      // `//…` in a `.js` file also blanks a protocol-relative URL sitting in a
      // string literal, which is exactly the reference this gate exists to
      // catch.
      //
      // The cost is that a license header cannot carry a bare URL either — see
      // the note at the bottom of `src/styles/fonts.css`, which spells one out
      // instead. That is a small price for a gate with no blind spot, and the
      // full notice travels in `dist/OFL.txt` where the license requires it.
      const line = text.slice(0, match.index).split('\n').length
      failures.push(`${rel}:${line}  ${url}`)
    }
  }

  return { failures, scanned }
}
