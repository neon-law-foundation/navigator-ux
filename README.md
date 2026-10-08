# @neon-law-source-code/navigator-ux

[Open the Navigator UX gallery](https://neon-law-source-code.github.io/navigator-ux/pages)

A React component library on the Neon Law teal, from Shook Law PLLC. No Tailwind, no Radix,
no CVA, no icon package — every component that can be is built on the platform primitive that already
carries its semantics, and every color resolves through a CSS custom property you can override in one
file.

Licensed under the [Apache License 2.0](./LICENSE).

## Install

Each release is a tarball attached to its
[GitHub Release](https://github.com/neon-law-source-code/navigator-ux/releases). Install from the
download URL — no registry account, no token, and no `.npmrc`:

```bash
pnpm add https://github.com/neon-law-source-code/navigator-ux/releases/download/v0.7.0/navigator-ux-v0.7.0.tgz
```

React 19 is the only required peer dependency; `./testing` has optional ones. Runtime dependencies come with the package and your
installer resolves them: `d3-array`, `d3-scale`, and `d3-shape` for the charts, `d3-geo` and
`topojson-client` for `WorldMap`, `d3-force` for `GraphView`, and `pdfjs-dist` for `PdfViewer`. They
are externalized in the build rather than bundled, so an app that already uses one of them resolves a
single copy. The world outline is vendored (Natural Earth 110m) rather than fetched. Nothing else is
drawn from outside.

The URL pins one exact version, so upgrading is an edit to the URL rather than a range that widens on
its own. See [docs/consuming-the-library.md](./docs/consuming-the-library.md) for the dependency form
this records and how to move between versions.

> **Do not install from the repository's git URL.** `dist` is not committed and there is no `prepare`
> script, so `pnpm add github:neon-law-source-code/navigator-ux` resolves, reports success, and leaves
> you a package containing the license, the notices, and the README, and no code at all. The failure
> surfaces later,
> as `Cannot find module …/dist/index.js` at your first import.

## Public gallery

The component gallery, the thirty-two-page legal-work specimen, and a Neon Law public-site
specimen are built as a static GitHub Pages site on every push to `main`. The same header and
navigation run on the gallery views, including the side-by-side
[verify-the-record](https://neon-law-source-code.github.io/navigator-ux/pages/verify-the-record)
page. The public-site specimen uses its own marketing chrome.

The root opens the public-site home; `/components` opens the component gallery. Existing `/neon`
links still reach the public home, with its service and plan pages under `/neon/`.

The sample site includes twelve Client Council voices, twelve Legal Council voices, and addressable
pages covering discovery, enforcement, company formation, immigration forms, and planning. It is
fictional sample data, not legal advice. The GitHub Pages workflow builds `gallery/` into the static
`gallery-dist/` artifact; the npm/library build remains separate and still emits only `dist/`.

## Use

Import the stylesheet once, at your app entry:

```tsx
import '@neon-law-source-code/navigator-ux/styles.css'

import { PublicShell, SiteHeader, SiteFooter, PageHeader, Card } from '@neon-law-source-code/navigator-ux'

export function App() {
  return (
    <PublicShell
      header={<SiteHeader brand="Your Org" links={[{ label: 'Team', href: '/team' }]} />}
      footer={<SiteFooter legal={<p>© 2026 Your Org</p>} />}
    >
      <PageHeader title="Matters" />
      <Card header="Recommended" highlighted>…</Card>
    </PublicShell>
  )
}
```

That stylesheet carries the fonts, the tokens, and every component rule. Nothing else is required and
nothing is fetched at runtime.

`Hero` also accepts an optional responsive `image` with `sources`, fallback `src`, `alt`, and `sizes`;
when omitted, it remains the text-only hero. `Card` accepts an optional local `icon` name or glyph
element, and hides that decoration from assistive technology.

`ThemeProvider` is **optional** and sets no styling — see *Color scheme* below. An app served behind
the Navigator gateway also wraps in `SessionProvider`; a static bundle omits it.

## The three token layers

Three stylesheets carry the whole system, and the split is the point: swapping the middle layer
restyles everything and touches no component.

| Layer | What it is | Who owns it |
| --- | --- | --- |
| 1 | The `--nav-*` contract at `:root`, and the Neon Law teal behind it. | The library — `src/styles/tokens.css`. |
| 2 | A brand override at `:root:root`. **None ships.** | You. |
| 3 | Every component rule, reading `var(--nav-*)` and never a literal color. | The library — `src/styles/theme.css`. |

The library ships one identity. If you want your own, layer 2 is a stylesheet you write and import
after ours — there is no build step, no config, and no fork:

```css
/* your-brand.css, imported after the library stylesheet */
:root:root {
  --nav-color-primary: #6d28d9;
  --nav-color-primary-hover: #5b21b6;
  --nav-color-primary-active: #4c1d95;
  --nav-color-on-primary: #ffffff;
  --nav-color-on-brand: #ffffff;
  --nav-color-link: #6d28d9;
  --nav-color-link-hover: #4c1d95;
  --nav-color-surface-subtle: #ede9fe;
  --nav-color-focus: #6d28d9;
}

@media (prefers-color-scheme: dark) {
  :root:root {
    /* A ramp that reads on white will not read on a near-black ground.
       Primary climbs to a lighter stop; its ink drops to a darker one. */
    --nav-color-primary: #c4b5fd;
    --nav-color-on-primary: #2e1065;
    /* …and the rest */
  }
}
```

Three rules make this work, and `gallery/brand-example-tokens.css` is a complete, commented template:

1. **`:root:root`, not `:root`.** Specificity is what makes a brand layer win, not source order. A
   layer that depends on arriving last silently loses the day something is injected after it. It is a
   doubled selector rather than `!important` so you keep the option of overriding again.
2. **Move the aliases, not the ground.** Surfaces, borders, text, radii, and the status colors stay
   single-sourced, so every brand inherits the same contrast work and geometry. Needing your own
   `--nav-color-border` is a design decision worth arguing for, not a default.
3. **Redeclare in dark too.** Skipping the dark block is how a brand ends up invisible in exactly one
   scheme.

`pnpm check:tokens` fails on any literal color outside layer 1 — including a *named* one, which is
why `FeedAccent` is `'brand' | 'link' | 'danger'` and not `'blue' | 'red'`.

Given a resolved Firm brand row rather than a colour you picked by hand, see
[docs/brand-theming.md](./docs/brand-theming.md) for the exact field-by-field mapping onto this layer —
including the one field (`accent_color`) the current token contract has no target for.

## Color and contrast

Every pairing the palette defines carries a measured WCAG ratio, and `pnpm check:contrast` recomputes
all 88 of them from `tokens.css` on every CI run. A ratio nobody can verify by eye is a ratio that
drifts: the first run of that gate found two status colors that had never cleared AA in any release.

The neutrals are tinted, not grey. They carry a trace of the same teal, so a card, its border, and
the button on it look designed together rather than assembled. If you swap layer 2 for a brand of a
different hue, the ground stays teal-tinted — override `--nav-color-*` surfaces too if that reads
wrong to you, but measure it.

## Color scheme

The scheme follows the operating system. There is no toggle, no stored choice, and no `data-theme`
attribute — `tokens.css` does all of it inside `@media (prefers-color-scheme: dark)`.

That buys three things: the media query resolves before first paint, so there is no flash and no need
for a pre-paint inline script; there is no stored state to disagree with the OS after the reader
changes it; and an app under a strict CSP needs no exception.

`ThemeProvider` therefore owns no styling. It exists so a component can *branch* on the scheme where
CSS cannot express the difference — picking a light or dark raster asset, say. `useTheme()` works
without it, reading the media query directly. Anything expressible in CSS should be a token.

## What's in it

The public surface:

| Area | Components |
| --- | --- |
| Surfaces | `Card`, `PricingCard`, `PricingGrid`, `TestimonialCard`, `TestimonialGrid`, `TestimonialSection` |
| Feedback | `Toast`, `Flash`, `Alert`, `LegalDisclaimer`, `ImpersonationBanner` |
| Data | `DataTable`, `Pagination`, `RowActions`, `ConfirmDelete` |
| Forms | `FormCard`, `TextField`, `SelectField`, `TextareaField`, `CheckboxField`, `RadioGroup`, `PeopleList` |
| Chrome | `PublicShell`, `SiteHeader`, `SiteFooter`, `NavigatorShell`, `NavigatorNavbar`, `NavigatorFooter`, `PageHeader` |
| Brand editing | `BrandColorField`, `BrandFontUploadField`, `BrandLogoUploadField`, `BrandEditorPanel` — a gallery/dev-tool composition, not a runtime portal surface; see [docs/brand-theming.md](./docs/brand-theming.md) |
| Navigation | `Breadcrumb`, `ExternalLink`, `NavButton`, `NavLinkButton`, `NavBadge` |
| Prose | `Prose`, `Runs` |
| Icons | `Icon`, `ICON_NAMES` |

The shadcn-derived set:

| Area | Components |
| --- | --- |
| Disclosure | `Accordion`, `Collapsible` |
| Tabs | `LinkTabs`, `Tabs` |
| Charts | `BarChart`, `LineChart`, `AreaChart`, `PieChart`, `WorldMap`, `LocationMap`, `ChartLegend` |
| Controls | `Switch`, `ToggleGroup`, `Combobox` |
| Fields | `DatePicker`, `CalendarPicker`, `Calendar`, `Slider`, `InputOTP` |
| Overlays | `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip` |
| Notifications | `Toaster`, `useToasts` |
| Focus | `Stage`, `Hero`, `ChoiceGroup`, `Stepper`, `StepList` |

Each is shadcn/ui's component — its semantics, its ARIA, its keyboard contract — rebuilt on the
platform primitive that already carries them and styled in the same `--nav-*` vocabulary. That is not
minimalism for its own sake; each primitive brings something a JS reimplementation cannot:

| Component | Built on | Instead of |
| --- | --- | --- |
| `Accordion` | `<details>`/`<summary>` | Radix reimplementing state, ARIA, and keys in JS — and losing in-page find, so Ctrl+F cannot open a collapsed section |
| `Dialog`, `Sheet`, `ConfirmDelete` | `<dialog>` | A hand-rolled modal that gets the focus trap, the top layer, the inertness, and Esc wrong in four separate ways |
| `Switch` | checkbox + `role="switch"` | A `<button>` that does not post, does not autofill, and needs JS |
| `Combobox` | `<input list>` + `<datalist>` | Popover + Command + a virtualized list, ~300 lines and three packages, that stops working when JS fails |
| `AspectRatio` | CSS `aspect-ratio` | The padding-top percentage trick in a Radix wrapper |
| `LinkTabs` | anchors + `?tab=` | Client state only — Radix Tabs cannot be bookmarked, refreshed, or opened in a new tab |
| `DatePicker` | `<input type="date">` | `react-day-picker` + `date-fns`, ~60 KB to collect a date the platform already collects — localized to the reader, autofillable, and bounded by `min`/`max` the browser enforces |

`Popover`, `DropdownMenu`, and `Tooltip` are the exception: no platform primitive covers them, so they
share one `useDismissible` hook rather than three hand-rolled copies. Esc closes, an outside click
closes, focus returns to the trigger, and the trigger reports its own state. Reach for Radix only when
you can name what the platform is missing.

The matter surfaces, on the same tokens:

| Area | Components |
| --- | --- |
| Chrome | `CaseNav`, `Shell`, `CaseHead`, `Layout`, `Stack`, `ReviewNav` |
| Primitives | `Panel`, `Badge`, `Button`, `LinkButton`, `ButtonRow`, `Callout` |
| Review | `Decision`, `DecisionGrid`, `DraftCard`, `AuthorityList`, `AuthorityDialog`, `HarvardOutlineViewer` |
| Notation | `Notation` renders a notation — Markdown with optional frontmatter, a `#` title, and outline headings such as `## I. Services` or a bare `## 1.` — as one collapsible document with a rail, from `import source from './x.md?raw'`; every unit is anchored (`section-ii`, `section-1-a`) and a link into it opens it. `NotationViewer` renders the same source as the whole page, title and open terms included; `parseNotation` turns Markdown into outline blocks; `deriveNotationChecklist` creates review steps from holds and blanks |
| Record | `SourceThread`, `CiteTheRecord`, `RecordCite`, `ClaimTable`, `FactGrid`, `DownloadGrid`, `ActionList`, `Record`, `StatusStrip` |
| Chat | `Chat`, `ChatComposer` |
| Platform | `ThemeProvider`/`useTheme`, `SessionProvider`/`useSession`, `apiFetch` |
| Testing | `@neon-law-source-code/navigator-ux/testing` — a Vitest setup file that fails a test on an axe violation, a `console.error`, or a request outside `/app/api`; the same axe policy for a browser suite (`auditWithAxe`, `formatAxeReport`); and a `navigator-ux check` CLI for a consumer's CI; see [docs/consuming-the-library.md](./docs/consuming-the-library.md#default-tests-two-lines) |

### The page that shows one thing

Everything above sits in a 72rem column beside other things. `Stage`, `Hero`, `ChoiceGroup`,
`Stepper`, and `StepList` are for a page with one thing on it — a sign-in, one intake question, a
decision — after shadcn's login and onboarding blocks: a card no wider than it needs, centered in the
viewport, with more space around it than inside it.

```tsx
<Stage width="md" header={<b>Your firm</b>} footer={<p>Nothing here is legal advice.</p>}>
  <Stepper
    label="Intake progress"
    finishType="submit"
    steps={[
      { id: 'need', title: 'What do you need?', children: <ChoiceGroup legend="What do you need?" legendHidden name="need" choices={NEEDS} /> },
      { id: 'you', title: 'How do we reach you?', children: <TextField label="Email" name="email" /> },
    ]}
  />
</Stage>
```

They read a spacing scale, `--nav-space-1` through `--nav-space-24` on a 0.25rem step, and three
measures a brand layer can move: `--nav-measure-sm` (24rem), `-md` (36rem), `-lg` (48rem). A stage
claims `100svh`; set `--nav-stage-min-height` to fit one under a fixed header. `NavButton` and
`NavLinkButton` take `size="lg"` and `block` for the same pages.

## The three contracts

Every component obeys all three. Each is enforced, not just documented — a boundary that lives only
in a document erodes on the first deadline.

1. **The leaf rule.** A themed component imports no application module: no router, no session, no
   application state, no data access. It takes data and callbacks as props.
2. **Injected links.** A navigable component takes an `href` and renders a plain anchor. Nothing
   imports a router. A client that wants client-side navigation supplies it at the call site — which
   is what lets these render a server-only page that ships no hydration bundle.
3. **Brand tokens.** Components emit semantic class names, and every color resolves through a
   `--nav-*` custom property. Enforced by `pnpm check:tokens`.

## Typography

One family, self-hosted, two weights at 400 and 700. There is no medium and no semibold, so
weight-based hierarchy is binary and everything else is size and color. `pnpm check:type` fails on any
other weight — the rule was documented for a year while forty-one rules quietly asked for a
synthesized 600 or 800, which is why it is now a gate.

**We recommend GORP Serif, and we do not ship it.** GORP is the face this library was designed on and
the one Neon Law uses; it is a commercial typeface from [TrashType](https://trashtype.com/), and
buying a licence is the way to get it. It is not the Firm's to redistribute, and a public
npm package would hand its binaries to everyone who runs `pnpm add` — so it is not in this repository,
not in `dist`, and not in the git history.

What ships instead is **Source Serif 4**, under the SIL Open Font License, vendored as two
latin-subset woff2 files totalling 44 KB. It is a genuine typeface rather than a placeholder, and if
you never think about this section again the library looks finished.

If you do license GORP, wiring it up is one stylesheet and no fork. `--nav-font-family` already names
it first, so declaring the `@font-face` is the whole of it:

```css
/* your-fonts.css, imported after the library stylesheet */
@font-face {
  font-family: 'GORP Serif';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/GORPSerif-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'GORP Serif';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/GORPSerif-Bold.woff2') format('woff2');
}
```

Serve the files from your own origin, as your licence almost certainly requires and as the bundle gate
below assumes. Any other face works the same way — override `--nav-font-family` in your brand layer.

One thing to know before you do. The matter surfaces set `font-variant-numeric: tabular-nums` so that
columns of currency line up, and that property is inert in a face with no `tnum` feature — it fails
silently, leaving the column ragged with nothing to report it. Source Serif 4 carries `tnum` and
`pnum` in both shipped weights. **GORP does not carry `tnum` at all**, in any weight, so a docket or a
table of figures will not align under it. That is a property of the typeface rather than of this
library, and it is the one thing you give up by using the recommended face.

The woff2 files are vendored and emitted beside the stylesheet; nothing is fetched from a CDN, and a
CDN would not be an option — a remote font in a library that loads on every page of an authenticated
portal is a third party watching every one of them. `pnpm check:bundle` fails the build on any
off-origin reference in `dist`.

## Authentication

Components never verify a JWT. They read an already-verified session and render. The Pingora gateway
in front of each app validates the Navigator `navigator_session` token and exposes the verified claims
at `/__session`; `SessionProvider` reads that endpoint, counts the 8-hour expiry down, and warns
before it lapses. See [docs/gateway.md](./docs/gateway.md).

A component that validated its own token would be trusting a value the reader controls.

`apiFetch` is the same idea for `/app/api`: a typed caller of the pinned OpenAPI snapshot, relative
paths only, `credentials: 'same-origin'`. Components still take props; the app fetches and hands the
result in. Refresh the snapshot with `pnpm generate:api`.

## Develop

The repository *is* the package — `src/` at the root, no workspace, no `packages/` directory. Clone it
and every command runs from where you are.

```bash
pnpm install
pnpm gallery            # every component on one page at :5174, from src
pnpm check              # what CI runs
```

`pnpm check` is lint, five source gates, the build, typecheck, the bundle gate, and tests with
coverage:

| Gate | Fails on |
| --- | --- |
| `pnpm lint` | oxlint errors. Warnings do not fail; the expected count is three. |
| `pnpm check:tokens` | Any literal color outside the token layer — including a named one. |
| `pnpm check:type` | A font weight that is not 400 or 700, or a radius that is neither a token nor geometry. |
| `pnpm check:contrast` | Any palette pairing under its WCAG floor, recomputed from `tokens.css` and from each `gallery/brands/` sheet layered on it. |
| `pnpm check:api` | A stale generated schema, or a path in `spec/openapi.json` that leaves `/app/api`. |
| `pnpm check:bundle` | Any off-origin reference in `dist`. Runs after the build, where a remote URL would appear. |
| `pnpm test:coverage` | Coverage under 90% on statements, lines, functions, or branches. |

`pnpm test:e2e` is Cypress against a fake OpenAPI backend. It is a CI job of its own, not part of
`pnpm check`.

### The gallery

`pnpm gallery` serves <http://localhost:5174>. Every block on it is the real component, imported from
`src` rather than `dist`, so a component edit shows up without a build and the page cannot drift from
the library the way a hand-written specimen page does.

It also carries the one control an app does not: a **brand-layer switch**. That is not a theme toggle
— the color scheme still follows the OS and has no control anywhere. It attaches a sheet from
`gallery/brands/`. Neon Law is the library with no extra sheet. The other sheets are the house
brands, and `/design` is where they are shown. The violet file
`gallery/brand-example-tokens.css` stays the copy-paste template. The same components re-tone, and
no component is touched.

The gallery is a dev server, not a build target, and has its own `vite.gallery.config.ts` because
`vite.config.ts` is a library build — one config trying to be both would emit the gallery into `dist`
and ship it to every consumer. It is typechecked, linted, and covered by the token gate: the gallery
should not be the one place that models bad habits.

## Releasing

The cadence is the same as Neon Law Navigator: **`YY.M.D`**, year, month, and day in UTC, with no
leading zeros (`26.8.31`, not `26.08.31`). `/cut-release` is the operator procedure; the detail lives in
[docs/releasing.md](./docs/releasing.md).

CI releases on a `v*` tag and on nothing else, so a merge to `main` ships nothing on its own. Bump the
version in `package.json`, merge, then tag:

```bash
git tag -s v26.8.31 -m "navigator-ux 26.8.31"
git push origin v26.8.31
```

The tag and `package.json` have to agree (`v26.8.31` ↔ `26.8.31`). CI asserts it before anything else
runs and fails the release if they differ, because nothing else would catch the mismatch: the tarball
is named from the manifest regardless of the tag it was built from, so tagging `v26.8.31` without
bumping would attach yesterday's tarball to a release called `v26.8.31`.

The release job then builds, runs `pnpm pack`, and attaches the tarball to the GitHub Release for the
tag. That tarball is the distribution channel; the filename is pinned rather than derived, because
consumers paste the URL into a manifest by hand.

**Nothing is published to npmjs.com.** The GitHub Release tarball is the only channel — there is no
registry publish step in CI, no package under the `@neon-law-source-code` scope, and no token that
would create one. If you are looking for `pnpm add @neon-law-source-code/navigator-ux`, it does not
exist; use the release URL above.

## Contributing

Issues and pull requests are welcome. Two things worth knowing before you open one:

- **Run `pnpm check`.** It is exactly what CI runs, and the gates are cheap to trip — a named color
  in a component or a `font-weight: 600` will fail the build.
- **Contributions are Apache-2.0**, like the rest of the work. §5 of the license covers it, so there is
  no separate agreement to sign.

The conventions that are not obvious from the code — and the reasons behind them — are in
[AGENTS.md](./AGENTS.md). It is written for coding agents and is just as useful to people.

## License

Copyright 2026 Shook Law PLLC. Licensed under the [Apache License, Version 2.0](./LICENSE) —
`SPDX-License-Identifier: Apache-2.0`.

These are components, not the core of Navigator, so they carry a permissive license: use them in
anything, a product included, with the license text and [`NOTICE`](./NOTICE) travelling along.
`LICENSE` is the Apache text and nothing else, so license scanners name it; the copyright line is in
`NOTICE`. Versions published before this change shipped as dual MIT-or-Apache-2.0, then
AGPL-3.0-only, then BUSL-1.1, and each stays under the terms it shipped with.

The recommended typeface is not part of this license. GORP Serif is a commercial face from
[TrashType](https://trashtype.com/); you need your own license for it, and it is not in this
repository or the package. What ships is Source Serif 4 — see [Typography](#typography).

### Third-party material

The bundled typeface stays under the SIL Open Font License 1.1, two sources are MIT, the world
outline is Natural Earth, and the runtime dependencies — and the optional peers of `./testing`, one of
them MPL-2.0 — are externalized rather than bundled. Each is
listed with its notice in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md), which also records what
the project's license does not reach.
