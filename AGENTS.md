# neon-law-source-code/navigator-ux

Licensed **Apache-2.0** — see [LICENSE](./LICENSE), which is the Apache text and nothing else, so
GitHub and every scanner that reads a license file recognise it. The copyright line and the
relicensing history are in [NOTICE](./NOTICE). These are components, not the core of Navigator,
which is why they are permissive where `navigator` is not. Write for a public audience: a comment that
assumes the reader works here will confuse most of the people who read it.

The license has moved three times, each at the copyright holder's direction: dual MIT-or-Apache-2.0,
then AGPL-3.0-only, then BUSL-1.1, then Apache-2.0. Relicensing is forward-only — a published tarball
stays under the terms it shipped with — and choosing a license is Shook Law PLLC's call, not something
to re-litigate in a PR. Anything still describing BUSL, Affero, an Additional Use Grant, a commercial
licence, or a change date is stale.

## Layout

**The repository is the package.** `src/` is at the root, `package.json` at the root *is*
`@neon-law-source-code/navigator-ux`, and there is no `packages/` directory. `pnpm-workspace.yaml`
exists only so Cypress may run its install script — pnpm 12 keeps that allowlist there — and does
not declare a workspace.

| Path | What |
| --- | --- |
| `src/` | The library. `src/index.ts` is the published entry and is re-exports only; `src/testing/` is the separate `./testing` entry, and `src/cli/` the `navigator-ux` bin. |
| `gallery/` | The specimen page. A dev server, never published. |
| `scripts/` | The check scripts (tokens, type, contrast, api, bundle) and the font- and CLI-emit steps. Each resolves its root as `scripts/..`. The color, contrast, and bundle rules live in `src/cli/`, so the gates here and the consumer CLI run one implementation. |
| `fixtures/` | The specimen-data generators. Not published, and outside `src/` so coverage does not grade them. |
| `docs/` | Prose that does not belong in the README. |
| `.agents/skills/` | The agent skills, and the only copy of them. |

This was a pnpm workspace with a single package under `packages/ux` until shortly before the first
public release. The reasoning recorded for that arrangement — that a second *library* package was the
expected way to grow — never paid off, and it charged a real toll for the whole life of the
repository: every command needed
`--filter`, every path in CI and the docs carried the prefix, and the root `package.json` was a
second manifest that had to be kept in step with the one that actually shipped. One package in one
repository should look like one package. If a second library is ever genuinely wanted, it gets its
own repository and its own release cadence, which is what the applications already do.

Applications are **not** built here. They install a released tarball from the GitHub Release for a tag,
which is what keeps a component change from being live anywhere until a consumer chooses to bump. See
[docs/consuming-the-library.md](./docs/consuming-the-library.md).

**This file is the one instruction file, and `.agents/skills/` the one skill directory.** There was a
`CLAUDE.md` carrying everything below and an `AGENTS.md` that pointed at it, plus `.claude/skills/`
and `.codex/skills/`, each a directory of per-skill symlinks into `.agents/skills/`. Every agent that
reads this repository now reads `AGENTS.md` and `.agents/` directly, so the vendor copies bought
nothing but more things to keep in step — which is the same failure `packages/ux` was, one directory
up, and the symlink sets had already drifted: `.codex/skills/` was missing `once` and nothing
noticed. There are no symlinks in this repository now. Do not add a vendor-named instruction file or
skill directory back.

## Commands

Everything runs from the repository root, because there is nowhere else.

```bash
pnpm install
pnpm check              # lint + five gates + build + typecheck + bundle gate + coverage
pnpm gallery            # every component on one page at :5174, from src
pnpm dev                # build --watch, for a linked consumer
pnpm lint               # oxlint
pnpm check:tokens       # no literal color outside the token layer (source)
pnpm check:type         # two font weights, and no literal corner radius (source)
pnpm check:contrast     # every palette pairing clears its WCAG floor (source)
pnpm check:api          # generated types match the pinned OpenAPI snapshot
pnpm generate:api       # refresh src/api/schema.d.ts from spec/openapi.json
pnpm check:catalog      # the vendored marketing catalog matches its digest and its references
pnpm check:bundle       # no off-origin reference in the built bundle (needs dist)
pnpm test               # vitest, once
pnpm test:coverage      # coverage report + threshold gate
pnpm test:e2e           # Cypress: the fake OpenAPI backend, and the axe gate over the gallery (not in check)
```

`check` is what CI runs. Build precedes typecheck. That order is not load-bearing
here — nothing in this repository consumes the built `dist` — but it is kept
because it *is* load-bearing in a consuming app: those resolve the package
through its `dist`, which does not exist on a clean checkout, so typechecking
first fails with "cannot find module".

Adding a dependency: `pnpm add <pkg>`. There is one manifest, so there is no longer a question of
which one it belongs in.

**On a cloud VM the install has already happened.** The environment update script refreshes
dependencies on startup, so `pnpm install` is not normally a step. Start the gallery as a persistent
background process rather than a foreground command — it is a long-running server, and `strictPort`
means it fails rather than moving off 5174 when something already holds the port.

**Vitest's test glob is pinned to `src/`.** The package root is now the repository root, so the
default glob would also match any checkout sitting inside it — an agent worktree under `.claude/`,
whose copy of an older suite then runs and fails against today's source. That happened during the
flatten. `test.include` in `vite.config.ts` and a `.claude/**` entry in `.oxlintrc.json` are what
stop it, and they stay there now that nothing else in `.claude/` does: the harness still puts
worktrees at that path whether or not the repository keeps anything there.

**Neither Vite config is typechecked, deliberately.** They are Node programs — `node:path`,
`import.meta.dirname` — and putting them in `tsconfig.json`'s `include` would mean adding `node` to
`types`, which puts `process` and `Buffer` in scope for every component and every gallery page.
Browser code reaching for a Node global should fail to compile, so two unchecked config files is the
cheaper trade.

## Stack

Vite 8, React 19, TypeScript strict, Vitest with jsdom and Testing Library. No CRA — it was
deprecated in February 2025 and does not support React 19 cleanly.

## Conventions that are not obvious

**No real content lives here, and now it cannot.** This repository is public. The components in
`src/` render whatever they are handed and hold no content of their own — transcribed
correspondence, authority holdings, pin cites, and case facts belong in a consuming application's
`src/data`, never in a component. That was already the rule for a design reason: a component with
text baked into it ships one customer's content to every other one. Publishing the repository turns
it into a disclosure rule as well. The gallery's specimen data is invented for exactly this reason,
and anything you add to it should be too.

**Binary files never enter this repository.** No PDFs, no exhibits, no vendored images. Git keeps
binaries forever — the document directory in the static site this library replaced was 49 MB against
a 1.93 GB packed history — and a public repository makes that permanent for everyone. The two
vendored woff2 files are the deliberate exception, because a self-hosted font is the whole reason
`check:bundle` can forbid off-origin references.

**Components do not authenticate.** They read an already-verified session and render. A gateway
verifies the JWT; the browser never sees a signing key. A component that validated its own token
would be trusting a value the reader controls — which is why `SessionProvider` reads a
server-rendered endpoint rather than parsing anything itself.

**Design tokens are designed here, and every ratio is enforced.** `src/styles/tokens.css`
used to be a byte-for-byte transcription of a client's stylesheet, kept frozen because changing a
value moved live client pages. That constraint is gone. What replaced it is arithmetic: every pairing
carries its measured contrast ratio, and `pnpm check:contrast` recomputes all 106 of them from the file
— and again for each `gallery/brands/` sheet layered on it — and fails the build if one drops under
its floor.

That gate is not decoration. The first time it ran it found two status colors that had never cleared
WCAG AA in any release — `#dc3545` at 4.29:1 and `#198754` at 4.30:1 on the raised surface a form
message actually sits on. Both had a hand-written comment beside them claiming they were fine. Nobody
can look at two hex values and see 4.29, which is exactly why the numbers had drifted and exactly why
they are now computed.

Changing a token is still a visual regression rather than a refactor. Run the gallery and look at it
in both schemes.

**Every box is rounded, and a square corner now has to earn itself.** The `--nav-*` set was always
rounded; the surfaces ported from the static pages — panels, cards, callouts, the status strip, the
claim table, the source thread — were flat, so the two halves of the library did not read as one
system. They all take a `--nav-radius-*` token now. Three kinds of square corner are still correct
and are the only ones left: a band that meets its container's edge (`.panel__head`, `.draft-meta`,
the highlighted `.nav-card__header`), which stays square because the *container* clips it; full-bleed
page chrome (`.case-nav`, `.site-header`, `.impersonation-banner`), which has no corners on the page
to round; and a surface deliberately filling the viewport, which is what `.authority-dialog__panel`
resets to under the mobile breakpoint.

A container whose children run edge to edge gets `overflow: hidden` alongside its radius rather than
matching radii on each child, which is what `.nav-card` already did and what the rest now copy. Where
a sticky descendant must still stick, it is `overflow: clip` instead (`.panel`, `.nav-accordion__item`).
Rounding the parent and leaving the child square is the failure mode — it does not error, it just
puts a square band's corner outside a rounded border, and you only see it on the specimen page.
`.nav-sheet` is the one asymmetric case: it rounds the edge facing the page and stays square against
the viewport, so the radius lives on `--left` and `--right` rather than on the base rule.

**The three-layer token split is load-bearing.** `tokens.css` (the `--nav-*` contract at `:root`,
plus the Neon Law teal), a brand layer (an app's override at `:root:root`), and `theme.css` (every
component rule, reading `var(--nav-*)` and never a literal color). Collapsing them into one file is
the single refactor that would quietly destroy the reason the system exists: swapping the middle
layer is what restyles everything without touching a component. A brand layer wins on
**specificity**, not source order — a layer that depends on arriving last silently loses the day
something else is injected after it.

**No brand layer ships, and that is deliberate.** The library has one identity. Layer two is a
stylesheet a consumer writes. `gallery/brand-example-tokens.css` is the commented template;
`gallery/brands/` holds the compiled identities the gallery switch attaches. They live in `gallery/`
rather than `src/` so they cannot be mistaken for something published. The library used to ship a
client's orange as a second brand; shipping one adopter's color in an open-source package is how a
design system acquires identities nobody maintains.

**The neutrals are tinted, and that is the whole look.** Surfaces, borders, and text carry a trace of
the same teal, so a card, its border, and the button on it read as designed together. A pure-grey
ground with a teal button is what this deliberately is not. If you neutralise them you have not
simplified the palette, you have removed the design.

**The scheme follows the OS, and only the OS.** No toggle, no stored choice, no `data-theme`, and
therefore no pre-paint script and no flash to design around. `ThemeProvider` sets no styling; it
reports `prefers-color-scheme` so a component can branch where CSS cannot. Anything expressible in
CSS is a token, not a call to `useTheme()`.

**CSS ships as one file, and its name is pinned.** The library emits `dist/navigator-ux.css` — fonts,
tokens, components — which consumers import as
`@neon-law-source-code/navigator-ux/styles.css`. Vite library mode does not inject it.

In library mode Vite derives the stylesheet's filename from the **package name**, so renaming the
package silently renames the file while the `exports` map goes on pointing at the old one. Nothing
fails: the build succeeds, the package publishes, and every consumer's stylesheet import resolves to
nothing. That happened during the rename to `navigator-ux`. The name is now pinned in
`vite.config.ts` (`STYLESHEET`) and `scripts/emit-font-layer.mjs` asserts post-build that the file
`exports["./styles.css"]` promises is a file the build actually produced.

**The font is emitted, not inlined, and that takes a build step.** Vite's library mode inlines every
asset a stylesheet references as a data: URI and ignores `assetsInlineLimit` doing it, which turned
88 KB of woff2 into ~120 KB of base64 in a render-blocking stylesheet (it went 42 KB → 163 KB).
`scripts/emit-font-layer.mjs` therefore keeps `fonts.css` out of the Vite graph, copies it and the
two woff2 files into `dist`, and prepends the `@import` to the emitted stylesheet. Consumers still import one
stylesheet.

**The shadcn-derived set is built on platform primitives, and that is still the point.**
`Accordion`, `Dialog`, `Sheet`, `Switch`, `Combobox`, `AspectRatio`, `Table`, `Slider`, `InputOTP`,
`DatePicker`, `ScrollArea`, `Carousel`, `ButtonGroup`, and the rest take shadcn/ui's semantics and
rebuild them on the element that already carries them — `<details>`, `<dialog>`, a checkbox with
`role="switch"`, `<input list>`, `<input type=range>`, `<input type=date>`, `<table>`, CSS
`aspect-ratio`, CSS `scroll-snap`. This library loads on every page of every portal, so five Radix
packages is a cost imposed on all of them, and each platform primitive brings something Radix
cannot: `<details>` participates in in-page find, `<dialog>` gets the top layer and inertness from
the browser, a checkbox posts without JavaScript, a native date input is localized to the reader
rather than the app and can be autofilled. `Popover`, `DropdownMenu`, `Tooltip`, `HoverCard`,
`ContextMenu`, and `Menubar` are the exceptions — no platform primitive covers them, so they share
one `useDismissible` hook rather than six hand-rolled copies. Reach for Radix only when you can name
what the platform is missing.

**The focus set (`src/components/Focus.tsx`) is deliberately looser than the rest of the stylesheet,
and it is the first code to read the `--nav-space-*` scale.** Its reasoning lives in that file's
comments and nowhere else. The rest of the stylesheet predates the scale and writes its rems out; do
not convert it wholesale — a token swap across 3,000 lines is a visual regression nobody can review —
but anything new reads the scale.

**Say each thing once.** A fact about a component has one home: the *why* in the component file's
doc comment, the *what* in one README row, the *look* on the gallery with a one-sentence note, and in
this file only a decision the code cannot show. A CSS comment says what the CSS does that the markup
cannot. Agentic tooling drifts toward the same paragraph in four files, and every copy goes stale on
its own schedule. After adding anything, run the pass in
[`.agents/skills/once/SKILL.md`](./.agents/skills/once/SKILL.md) before opening the PR.

**The package is no longer dependency-free, and the line that said so is gone.** It had been true
since the first release and it was load-bearing prose, so removing it is worth recording rather than
quietly editing. Three things now come from outside:

| Dependency | Consumers | Why not hand-rolled |
| --- | --- | --- |
| `d3-array`, `d3-scale`, `d3-shape` | `BarChart`, `LineChart`, `AreaChart`, `PieChart` | Scale, tick, and path arithmetic. Correct axis ticks alone are more subtle than they look. |
| `d3-geo`, `topojson-client` | `WorldMap` | Projection and path generation from a spherical outline; a world map is not a component-library-sized geometry problem. |
| `d3-force` | `GraphView` | A force simulation is a physics engine; there is no version of writing one that is cheaper than importing it. |
| `pdfjs-dist` | `PdfViewer` | A PDF renderer is not a component-library-sized problem. |

The submodules matter: `d3` as a metapackage pulls in everything, and only the modules named above
are used. d3 here is a *math* library — it computes numbers and path strings and never touches the DOM.
React owns every element, which is why none of the chart components needs a ref or an effect, and
why d3 and React cannot fight over who holds a node.

All of them are **externalized in the library build**. They are real `dependencies`, so a consumer's
installer resolves them already; bundling a copy would ship two d3s to any app that also uses one.
That is also what keeps `check:bundle` readable — it reads `dist` for off-origin references, and a
megabyte of inlined vendor code would bury the signal.

What has *not* changed is the rule these replace. No Tailwind, no Radix, no CVA, no icon package,
and nothing at all for a problem the platform already solves. A dependency here has to be a thing
that would be irresponsible to write ourselves. `pdf.js` clears that bar; a dropdown menu does not.

**`./testing` imports three packages it does not install, and declaring them is load-bearing.**
`axe-core`, `vitest`, and `@testing-library/react` are optional `peerDependencies`, externalized like
the rest. Optional, so an app that never adopts the setup file never installs axe. Declared at all,
because pnpm links into this package's `node_modules` only what it declares: an undeclared `vitest`
import resolves in this repository and fails from inside a consumer's install. `check:packed-consumer`
is what would notice. axe-core is MPL-2.0; why that is compatible is in `THIRD-PARTY-NOTICES.md`.

**axe-core is pinned to exactly 4.10.2 because Navigator vendors 4.10.2.** The accessibility policy
— the tags, what fails, what is only reported — is Navigator's, ported into
`src/testing/axe-report.ts` so the jsdom hook, this repository's browser gate
(`cypress/e2e/accessibility.cy.ts`), and a consumer's own suite apply one rule. A newer axe adds and
sharpens rules, so a floating range would let a component pass here and fail there. Move the pin when
Navigator moves its vendored copy, not before. The optional peer range stays `>=4.10.2 <5`: a
consumer's own pin is theirs.

**The CLI is plain `.mjs` in `src/cli/`, not TypeScript, because two programs run it.** The gates in
`scripts/` import it under bare `node` before anything is built, and `emit-cli.mjs` copies it into
`dist` unchanged for the `navigator-ux` bin. Hand-written `.d.mts` files give the suite its types,
as `fixtures/` does, and coverage includes `src/**/*.mjs` so it is graded like everything else. Do
not write `new URL('…', import.meta.url)` in it: Vite rewrites that pattern into an asset URL under
Vitest, and the module stops loading in the suite while still working in `dist`.

**The shipped font is OFL, and the recommended one is not shipped at all.** `fonts.css` vendors
Source Serif 4 at 400 and 700 — the Google Fonts latin subset, from `@fontsource/source-serif-4`,
under SIL OFL 1.1. The OFL is the whole reason a font can be in a public package: it permits bundling
and redistribution outright, so `dist` carries the woff2 files and every consumer redistributes them
again without a licence of their own. `emit-font-layer.mjs` copies `OFL.txt` into `dist` beside them,
because the licence requires the notice to travel with the font and consumers receive `dist` and
nothing else.

This was GORP Serif until the last change before the first public release. Those files carried
`Copyright: TrashType, LLC`, `Trademark: TrashType, LLC`, designer Mark Johnson, terms at
<https://trashtype.com/legal> — readable out of the
binaries with `fontTools`, and stated nowhere in the repository, which is how it survived this long.
Two problems, both live the moment the repository went public: `files: ["dist"]` plus the `@font-face`
rules meant **the build shipped them and every consumer redistributed them too**, and the license file
of the day granted everyone MIT-or-Apache rights over "this software" under a
`Copyright (c) 2026 Neon Law Foundation` line, purporting to license files the holder does not
own. The same trap exists under Apache-2.0 — it is a sweeping grant — so scope it, do not widen it. Commercial
webfont licences are typically domain- or pageview-limited and forbid redistribution outright; a
public repository plus a public package is redistribution twice over.

The swap was made rather than the licence read, because publication was not going to wait on it, and
the binaries were removed from the commit rather than deleted in a later one — git keeps binaries
forever, so deleting them going forward would have left them public anyway.

**GORP is still the recommended face, and recommending is all we do.** It is named *first* in
`--nav-font-family`, ahead of Source Serif: a consumer who buys a licence from TrashType declares its
`@font-face` and it wins, with no component touched and no fork. That fallback chain is the whole
mechanism, and the README documents it. Do not ship the files to make it more convenient, and do not
serve them from a CDN either — the transport is not what makes it redistribution, and a remote font
fails `check:bundle` for a separate and equally good reason.

Two consequences worth knowing, and both were measured rather than assumed.

`check:type`'s two-weight ceiling is a *design* decision and never was a limitation. GORP ships at
least six weights, 200 through 700 — the desktop family is sitting in `~/Library/Fonts` on the
machines here — and only two were ever vendored. Source Serif has eight and two are vendored. Adding
a third is a design argument, not a bug fix.

**Figures are the one thing the swap changed under the hood, and it changed them for the better.**
The two faces default *opposite* ways: GORP's figures are proportional, Source Serif 4's are tabular.
`theme.css` therefore declares `proportional-nums` on `html` and `matter.css` takes it back with
`tabular-nums` in columns, so the rule holds whichever face is active instead of riding on a default.
Without that, the swap would have put tabular figures into every sentence in the library and nothing
would have failed.

The sharper finding: **GORP carries no `tnum` at all**, in any of its six weights. The
`font-variant-numeric` block at the top of `matter.css` was therefore inert for its entire life — the
docket never aligned, and the comment above it claimed the opposite for a year. `tabular-nums` fails
silently in a face without the feature, which is exactly how it went unnoticed. Source Serif 4 is the
first face here it has actually worked under. Two things follow: check `tnum` with `fontTools` before
vendoring any face, and expect the ragged column back for a consumer who licenses GORP, because that
is the typeface's property and not something to paper over here.

**Verifying type on a Neon Law machine needs care, because GORP is installed locally.** It is named
first in `--nav-font-family`, so the gallery on a firm laptop renders GORP and a public consumer sees
Source Serif 4 — the same page, two different typefaces, and the local one is the one nobody else
gets. Drop GORP from the stack before you judge how a release looks:

```js
document.documentElement.style.setProperty('--nav-font-family', '"Source Serif 4", Georgia, serif')
```

**`LICENSE` is the Apache text and nothing else.** No header, no preamble, no Firm commentary: that
is what makes it detectable as Apache-2.0 by GitHub, npm, and every license scanner a consumer's legal
review runs. The copyright line lives in `NOTICE`, which Apache §4(d) requires every redistributor to
carry, so keep it short — each sentence in it is a sentence every downstream has to ship. Keep the
README's `## License` section, `NOTICE`, and `THIRD-PARTY-NOTICES.md` in step: a notice added to one
and not the others is how a license story starts describing a package that no longer exists.

**Adding a runtime dependency means editing the notices file too.** That file now has two halves, and
they carry different obligations. Material *in* the repository (the icons, the shadcn derivations, the
typeface) has to have its notice travel with what we publish. A `dependency` does not: everything in
`dependencies` is externalized in the build, so `dist` carries a bare `from "d3-scale"` rather than a
copy of it, and the consumer's installer places the real package with its own `LICENSE`. It is
recorded anyway, because "look at the lockfile" is not an answer to what the package pulls in.

The compatibility check is short now and was not always. Every d3 module is ISC and `pdfjs-dist` is
Apache-2.0; both sit inside an Apache-2.0 whole without question. Under the copyleft licenses this
project carried before, the direction mattered — Apache code may enter an AGPLv3 work but not a GPLv2
one — and nothing in CI checked it. If the license ever moves again, the dependency table in the
notices file is the list to re-verify, and `PdfViewer` is the first thing that breaks — as a legal
problem, silently, with a green build.

The font is the one piece the license must not swallow: the OFL forbids releasing it under another
license, so the two woff2 files are not Apache-2.0, and `THIRD-PARTY-NOTICES.md` is where that is
recorded. Declaring the whole tree Apache-2.0 would be a license violation dressed up as a
simplification.

**Specimen data is generated, and no name is written by hand anywhere.** Every name, address,
company, caption, and matter code in the tests, the gallery, the e2e seed, and the specimen PDF is
drawn from `fixtures/fake.mjs`, which wraps `@faker-js/faker` (a devDependency — nothing here ships
it). The one invented dispute they all share lives in `fixtures/matter.mjs`, so the gallery, the
chat transcripts, and the complaint PDF show the same file rather than ten unrelated fragments.

Each generator takes a **key** and reseeds from a hash of it rather than the module seeding faker
once, which is what makes a value the same in every process and a failure reproducible. Why that is
not the obvious `faker.seed(1)` is in `fixtures/fake.mjs`, and is worth reading before changing it.

Tests assert against the generators, never against a literal: `expect(screen.getByText(JUDGE.name))`,
not the string. Writing the string back in is what re-couples a spec to a draw.

This replaced a hand-written identity — `Northwind`, `Vance v. Northwind` — that had itself replaced
a real client's. Both rounds were needed, and the second is why: `src/test/feed.test.tsx` was still
carrying a sitting judge and a practicing attorney, lifted from a real docket, because `Feed` then had
no gallery specimen and nobody ever reviewed its fixture. (Every export has one now, and
`src/test/gallery-coverage.test.ts` keeps it that way.) Hand-written fictional
data does not stay fictional — a fixture is a place a real docket can be pasted, and it was.

What generating a name **does not** buy is a guarantee it belongs to nobody: faker composes from real
given and family names, and at this many draws a collision is expected. That is tolerable because the
datum carries no facts. `example.com` is the part that is actually reserved — RFC 2606 — which is why
every address is forced onto it rather than taking faker's default of a live consumer domain. A
fixture is read by everyone who clones the repository; it is not a scratch pad. **Public copy does
not name other vendors** — the pass is
[`.agents/skills/specimen-copy/SKILL.md`](./.agents/skills/specimen-copy/SKILL.md).

**The provenance is neonlaw.com, and that is settled.** `theme.css`, `matter.css`, and
`icon-glyphs.tsx` used to cite a client's domain as the source of the ported stylesheet and the icon
markup. Those comments were held back through the IP pass rather than genericised, because a
provenance note is the trail that answers who owns the code and rewriting one to remove a name is not
a confidentiality fix. The question went to the Foundation and was answered: the source is Neon Law's
own, the comments now say `neonlaw.com`, and the legacy per-matter paths are described by what they
were rather than by matter name.

Two things follow. Cite `neonlaw.com` and nothing else if you add a provenance note. And if a future
comment needs to name a specific matter or client to make sense, that is a sign the comment belongs
in the application repository, not here.

**American spelling, including in comments.** `color`, not `colour`. The one exception is not house
style: `LICENSE` is the Apache Software Foundation's text, and its spelling, its line breaks, and its
every word are not ours to touch. A typo fix in it is a license violation, not a typo fix.

**The gallery imports `src`, not `dist`.** `gallery/` is the specimen page, served by
`pnpm gallery` on :5174. Importing source is what stops it drifting from the library — a specimen page
built against `dist` is a page that silently shows you last build's components. It has its own
`vite.gallery.config.ts` because `vite.config.ts` is a library build (`build.lib`, externalized React,
`vite-plugin-dts`); one config doing both would emit the gallery into `dist` and publish it. Its
brand-layer switch is **not** a theme toggle — it attaches a sheet from `gallery/brands/`.
Addresses are paths (`/pages`, `/components/<id>`, `/neon/<id>`); `?brand=` and `?sku=` are the
filters. GitHub Pages has no rewrite, so the Pages build copies `index.html` to `404.html`.

**pdf.js's worker cannot be resolved the same way in both builds.** The package emits ESM *and* CJS.
`import.meta.url` is how a bundler is told to emit the worker as a same-origin asset — but in the CJS
output Vite replaces `import.meta` with `{}`, so `import.meta.url` is `undefined` and `new URL()`
throws. That is a crash instead of a document, for exactly the consumers least likely to be testing
the ESM path. `defaultWorkerSrc()` therefore returns `null` rather than throwing, pdf.js falls back
to its own default, and `PdfViewer` takes a `workerSrc` prop for a bundler that needs telling. The
build warns about this — `This 'import.meta' will be replaced with an empty object` — and the warning
is worth reading rather than silencing.

**pdf.js's worker is resolved through `import.meta.url`, never a CDN.** Every pdf.js tutorial sets
`workerSrc` to a `cdnjs` URL, and it works immediately — which is exactly why it is worth stating.
The bundler has to emit the worker as a same-origin asset instead, or `check:bundle` fails, and it
would be right to: a component library that quietly fetches a megabyte of script from someone else's
origin is a supply-chain dependency nobody reviewed.

**The text layer is the point of the PDF viewer, not a nicety.** These documents come out of
`navigator template render` — Typst on court-paper geometry, from a validated notation template. A
lawyer reading one needs to quote from it and cite a page, so a canvas-only viewer fails at the job.
The text layer is what makes the document selectable, findable by the browser's own find, and
copyable into a brief without retyping.

**Five gates run in CI, and all of them are cheap to break.** `pnpm check:tokens` fails on any
literal color outside the token layer — including a *named* color, which is why `FeedAccent` is
`'brand' | 'link' | 'danger' | …` and not `'blue' | 'red' | …`. `pnpm check:type` fails on a font
weight that is not 400 or 700, and on a corner radius that is neither a `--nav-radius-*` token nor
geometry (`999px`, `50%`, `0`). `pnpm check:contrast` recomputes every pairing in `tokens.css` and
fails any that drops under its WCAG floor. `pnpm check:api` fails if `src/api/schema.d.ts` is stale
against `spec/openapi.json`, or if a path in that snapshot leaves `/app/api`. `pnpm check:bundle`
fails on any off-origin reference in `dist`; it runs after the build because that is where a remote
URL would appear.

The first four are source-level, so they run in the `lint` job and report in seconds rather than
behind a full build. `check:api` needs `openapi-typescript` (a devDependency) to regenerate and
diff; it does not fetch the live origin.

**`pnpm check:catalog` guards the shared marketing copy.** The public pages' shared sentences are
authored in Navigator and vendored here as `gallery/content/marketing-catalog.json`, pinned to one
immutable revision. The gate recomputes the exporter's SHA-256 over the canonical payload, so an
artifact someone edited by hand fails rather than quietly publishing different words; it also
refuses an unsupported catalog version, a pin that is not a commit, and a `{shared:…}` reference
naming a key the catalog does not define. See [docs/marketing-catalog.md](./docs/marketing-catalog.md).

`check:tokens` blanks numeric character references before it scans. `&#8249;` is a left angle quote
and `&#8722;` a minus sign — both routine in a control that draws its own chevrons — and the hex
pattern read the `#8249` inside them as a four-digit color. That false positive costs an afternoon
to recognise, because the reported color does not appear anywhere in the file you are sent to.

**The type contract had to be enforced because documenting it did not work.** `fonts.css` has said
"two weights, 400 and 700" since the font was vendored, and `theme.css` still asked for 600 in
twenty-three rules while `matter.css` asked for 800 in eighteen — every one of them a synthesized
face. It was undetectable by eye for as long as `matter.css` was monospace, because a system mono
has every weight, and it became obvious the moment those rules took the brand typeface. A rule that
wants "a bit bolder than body" does not have that option and changes size or color instead.

**Figures in columns take `tabular-nums`, not a monospace.** The serif's default figures are
proportional, so a column of currency stops aligning the moment a table is not monospace. The
`font-variant-numeric` block at the top of `matter.css` is scoped to where digits are read against
each other — the docket, table bodies, record and feed dates, the status strip, and the transcribed
record. Prose keeps proportional figures, which is correct in a sentence. `--nav-font-mono` has
exactly one consumer, `.nav-code`, where a reader goes character by character.

## Coverage

**90% is a gate, not a target.** Statements, lines, functions, and branches all
have to clear it or the run fails. Thresholds live in `vite.config.ts`;
`pnpm test:coverage` writes an HTML report to `coverage/index.html` and CI
keeps it as an artifact for 14 days.

One file is excluded, because counting it would be noise rather than signal:
`src/index.ts` is re-exports only. Do not add exclusions to
make a number go up — write the test, or say plainly that the code is untested.

## Linting

oxlint, configured once at the root. Errors fail CI; warnings do not.

`react/react-in-jsx-scope` is off because the whole repo uses the modern JSX
transform, and `import/no-unassigned-import` is off because side-effect imports
are load-bearing here — the library imports its own stylesheet and the test
setup installs environment shims.

Three warnings are expected and intentional: `only-export-components` on the two
providers (a provider and its hook belong in one file) and `no-array-index-key`
in `StatusStrip`, which lives in `src/components/Cards.tsx` (status cells have
no stable id). If you add a fourth, either
fix it or record it here with the reason — the count is the point.

It has already done its job once. The second shadcn wave added four, and all four
were worth fixing rather than recording: `seriesColor` and the month helpers moved
to `src/lib/` (a module exporting a plain function beside a component breaks fast
refresh, and the rule is right about that), and `Calendar`'s `days = []` default
became a module constant, because an inline literal is a new array every render
and re-runs every `useMemo` below it.

`no-console` is off under `scripts/**`: a build script reports what it
emitted through stdout, which is its interface rather than a stray debug line.

**Two React Compiler rules are off per file, not repo-wide, and the list of files is the record.**
oxlint 1.83 moved `react/set-state-in-effect`, `react/refs`, and `react/use-memo` into `correctness`,
which this config sets to `error`, and fourteen existing sites lit up at once. One was a real fix —
`WorldMap` passed `countryFeatures` to `useMemo` by reference instead of wrapping it, so the memo was
re-running. The other thirteen are the two patterns this library is built on: a provider seeding state
from `matchMedia`, a fetched session, or a pdf.js document on mount, which is the external-system sync
the rule's own help text carves out and cannot see; and `GraphView` reading `d3-force`'s nodes during
render, because the simulation mutates them in place and the ref is where the laid-out coordinates
live. Both are silenced through `overrides` naming the exact files, so the rules still fire on
anything new. Turning them off in `rules` instead would retire them for the whole repository, which
is how a rule stops being a rule.

## Testing notes

**Node 26 ships its own `localStorage` global** that shadows jsdom's and is inert without
`--localstorage-file`. The test setup shims it. If a storage-backed test fails with "Cannot read
properties of undefined", that is the cause.

**That shim means local and CI do not run the same storage implementation.** CI is on Node 22, where
jsdom's real `Storage` is present and the shim stays inert; a modern local Node gets the shim. A
method spy on `window.localStorage` takes on the shim and not on jsdom's `Storage`, so a test doing
that passes locally and fails in CI. Replace the whole `window.localStorage` property instead — it
behaves identically in both.

**`userEvent.setup()` installs its own clipboard stub.** Override `navigator.clipboard` *after*
calling it, and with `defineProperty` — the property is getter-only in jsdom.

**Use `vitest/config`, not `vite`**, for `defineConfig` in any config carrying a `test` block. Vite's
own type does not know the field, so it goes silently untyped.

## Publishing

**The channel is a tarball attached to the GitHub Release. There is no registry publish, and that is
the policy rather than a gap.** Nothing is on npmjs.com under the `@neon-law-source-code` scope, the
scope does not exist, and no step in CI would create it. Consumers install from the release download
URL, which needs no token, no registry configuration, and no `.npmrc` because the repository is
public.

The cadence is Navigator's: **`YY.M.D`** (`26.8.31`), documented in [docs/releasing.md](./docs/releasing.md)
and operated through [`.agents/skills/cut-release/SKILL.md`](./.agents/skills/cut-release/SKILL.md).
`package.json` holds the bare version; the GitHub tag keeps the `v` prefix this job already matches.

CI releases on a `v*` tag and on nothing else, so a merge to `main` ships nothing on its own. Bump
`package.json`, merge, then tag.

**The `release` job asserts the tag matches `package.json` before it does anything else.** Nothing else
would: `pnpm pack` names the tarball from the manifest regardless of the tag it was built from, so
tagging `v26.8.31` without bumping would attach yesterday's tarball to a release called `v26.8.31`. The
guard runs ahead of `pnpm install`
because a mismatch is a re-tag either way and should report in seconds rather than behind the build.

The tarball filename is **pinned to a literal** (`navigator-ux-<tag>.tgz`) rather than left to pnpm's
default, which flattens the scope to `neon-law-source-code-navigator-ux-<version>.tgz`. Consumers paste
the URL into a manifest by hand, so the name is part of the contract and has to be predictable from the
tag. The upload step is idempotent — it clobbers an existing asset rather than failing — so re-running
a release job is safe.

**Why not the git URL, which is the obvious thing to reach for.** `dist` is gitignored and `files`
ships only `dist` and the notices, so `pnpm add github:neon-law-source-code/navigator-ux` resolves
in about a second, reports success, and installs a package with no code in it — `LICENSE`, the
third-party notices, README, manifest. The consumer's build then fails with `Cannot find module …/dist/index.js`, pointing into
`node_modules` rather than at anything they did. A `prepare` script is not the fix: pnpm refuses to run
build scripts for a git-hosted dependency unless the consumer allowlists it in `pnpm-workspace.yaml`
under a key containing the resolved commit SHA, which changes on every bump. Do not re-litigate this
without reading [docs/consuming-the-library.md](./docs/consuming-the-library.md) first.

**There was an npm publish step, and it is gone.** It sat in the `release` job guarded on `NPM_TOKEN`,
skipping with a log line because this repository has no secrets — kept on the theory that adding the
secret would be the only step needed to start publishing. That theory is what made it a trap: a
release job that publishes to a registry the moment someone adds a secret is a release job whose
behavior nobody has decided. The `id-token: write` permission and the `registry-url` on `setup-node`
went with it; both existed only to let npm attach build provenance.

If a registry publish is ever wanted, add it deliberately along with the decision about who owns the
scope — do not restore an inert step and wait to be surprised by it.

This package releases from one place: <https://github.com/neon-law-source-code/navigator-ux>, on a `v*`
tag. There is no second registry and no scope mapping.

## Before you commit

Run `pnpm check`. It is exactly what CI runs.

This repository is public. Nothing in a commit, a comment, or a test fixture may be a client's name,
a matter's facts, or anything else that is not ours to publish — the specimen data in the gallery is
invented for that reason. See the note above about the quoted record.
