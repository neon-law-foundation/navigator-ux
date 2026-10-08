# Third-party notices

Navigator UX is licensed Apache-2.0 (see [LICENSE](./LICENSE) and [NOTICE](./NOTICE)). That license
covers the work Shook Law PLLC owns. It does not cover the third-party material listed here, which carries
its own terms and its own copyright holders.

There are two kinds of third-party material here, and the difference decides what has to travel.

**Material in this repository** — the sections immediately below. Two are MIT, one is the SIL Open
Font License, and one is the Natural Earth / world-atlas topology `WorldMap` draws. All four permit
reuse. MIT and ISC require the copyright and permission notice to travel with the work; the OFL
additionally forbids relicensing the font. That is what this file is for — a code comment naming the
source is courtesy, not compliance. The font notice travels twice: the build also copies `OFL.txt`
into `dist` beside the woff2 files, because consumers receive `dist` and never see this file.

**Runtime dependencies and optional peers** — listed under [Runtime dependencies](#runtime-dependencies).
None of their code is in this repository or in `dist`, so none of their notices travel with what we
publish. They are recorded anyway, because the question a reader has is what the package pulls in,
and answering "look at the lockfile" is not an answer.

The two MIT sources sit inside an Apache-2.0 whole without tension; the notices below are what
that costs. **The typeface is different.** The OFL requires the font software to be distributed
entirely under the OFL and forbids releasing it under any other license, so the woff2 files under
`src/assets/fonts/source-serif-4/` are **not** Apache-2.0 and the project's license does not reach
them. Do not "simplify" this by declaring the whole tree Apache-2.0.

---

## Bootstrap Icons

Path data for the icons in `src/components/icon-glyphs.tsx` is taken from Bootstrap Icons, with the
sole exception of `libra-scales`, which is original to this library.

- Upstream: <https://github.com/twbs/icons>
- License: MIT

```
Copyright (c) 2019-2024 The Bootstrap Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## shadcn/ui

The components in the shadcn-derived set — `Accordion`, `Collapsible`, `LinkTabs`, `Tabs`,
`Separator`, `Avatar`, `Skeleton`, `Progress`, `AspectRatio`, `Switch`, `ToggleGroup`, `Combobox`,
`Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`, `Toaster` — take shadcn/ui's component
semantics, ARIA roles, keyboard contracts, and prop shapes. The implementations are written against
platform primitives rather than copied, and no shadcn/ui source is vendored here, but the design owes
it enough to say so.

- Upstream: <https://github.com/shadcn-ui/ui>
- License: MIT

```
Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Source Serif 4

The typeface the library vendors and ships, at 400 and 700, under
`src/assets/fonts/source-serif-4/`. Designed by Frank Grießhammer at Adobe. These are the Google
Fonts latin-subset builds, taken from [`@fontsource/source-serif-4`](https://fontsource.org/fonts/source-serif-4).

The OFL permits bundling and redistribution outright, which is the reason a font can ship in this
package at all: `dist` carries the woff2 files, every consumer redistributes them again, and none of
them needs a licence of their own.

- Upstream: <https://github.com/adobe-fonts/source-serif>
- License: SIL Open Font License 1.1
- Reserved Font Name: **Source** — a modified version of this font may not be distributed under that
  name. The files here are redistributed unmodified.

```
Copyright 2014 The Source Serif 4 Project Authors (https://github.com/adobe-fonts/source-serif)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

---

## World atlas (Natural Earth 110m)

`src/assets/geo/countries-110m.json` is the 1:110m country topology from
[world-atlas](https://github.com/topojson/world-atlas), itself a TopoJSON encoding of
[Natural Earth](https://www.naturalearthdata.com/) admin-0 countries.

- Geometry: Natural Earth, public domain.
- Topology encoding: Copyright 2013-2019 Michael Bostock, ISC (same grant as the d3 modules).

The file is vendored so `WorldMap` never fetches an outline. A remote atlas would fail
`check:bundle` and would be a supply-chain dependency nobody reviewed. The project's license does not purport to relicense the Natural Earth geometry.

```
Copyright 2013-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

---

## Runtime dependencies

The packages in `dependencies` are **not** distributed by this project. Every one is
externalized in the library build, so `dist/index.js` carries a bare `from "d3-scale"` and an
`import("pdfjs-dist")` rather than a copy of either. A consumer's installer resolves them and places
each package, with its own `LICENSE` file, in their own tree — which is also the point of
externalizing: an application that already uses d3 gets one copy rather than two.

Nothing below therefore needs a notice inside `dist`. The obligations run with the packages
themselves, to whoever installs them.

| Package | License | Used by |
| --- | --- | --- |
| `d3-array`, `d3-scale`, `d3-shape`, `d3-geo`, `d3-force` | ISC | Charts, `WorldMap`, `GraphView` |
| `topojson-client` | ISC | `WorldMap` |
| `pdfjs-dist` | Apache-2.0 | `PdfViewer` |

The d3 modules pull in further d3 packages transitively — `internmap`, `d3-dispatch`, `d3-quadtree`,
`d3-timer`, `d3-format`, `d3-interpolate`, `d3-time`, `d3-time-format`, `d3-path` — and every one of
them is ISC as well. Mike Bostock's d3 family is uniformly ISC, which is why this table stays short
and why adding another d3 module is not a licensing decision.

### Optional peers of `./testing`

The `@neon-law-source-code/navigator-ux/testing` entry imports three packages it does not install.
They are optional `peerDependencies`, externalized like the runtime dependencies, so `dist/testing/`
carries a bare `import("axe-core")` and no copy.

| Package | License | Used by |
| --- | --- | --- |
| `axe-core` | MPL-2.0 | The accessibility check in `testing/setup`, and `expectNoAxeViolations` (and, as a devDependency, the browser gate, which injects the installed `axe.min.js` unmodified) |
| `vitest` | MIT | The `beforeEach`/`afterEach` hooks `testing/setup` registers |
| `@testing-library/react` | MIT | The cleanup `testing/setup` runs after its checks |

**axe-core is the one copyleft license anywhere in this package's graph, and it does not reach this
project.** MPL-2.0 is file-level copyleft: its obligations attach to the MPL-licensed files and to
modifications of them, and a work that merely combines with them — a Larger Work, in its terms — may
be under any license (MPL-2.0 §3.3). This package neither copies nor modifies an axe-core file: the
build externalizes it, and the consumer's installer places the unmodified package, with its own
license, in the consumer's tree. Were axe-core ever vendored or patched here, those files would stay
MPL-2.0 with the obligations §3 attaches to them, and this paragraph would need revisiting.

ISC, MIT, and Apache-2.0 sit inside an Apache-2.0 whole without question, and MPL-2.0 sits beside it
for the reason above, so nothing here constrains the project's license. It was not always so simple:
under the copyleft licenses this project carried before, Apache-2.0 code could enter an AGPLv3 work
but not a GPLv2 one, and nothing in CI would have noticed. If the license ever moves again, these
tables are the list to re-verify.

## Not covered here

**GORP Serif is not in this repository, and that is deliberate.** It is the recommended typeface for
this library and the one Neon Law uses, but it is a commercial licence from TrashType, LLC and is not
the Firm's to redistribute. A public package puts its binaries in front of everyone who
installs the library, which no commercial webfont licence contemplates — so it is named first in
`--nav-font-family` and shipped by nobody. A consumer who licenses it declares its `@font-face` and it
wins with no component touched. See the typography section of the [README](./README.md).

Nothing in `dist` reaches off-origin for a font or for anything else; `pnpm check:bundle` fails the
build on any reference that does.

**The house faces other than Source Serif 4 are gallery-only.** The brand switch and `/design`
load them from fontsource, all SIL OFL 1.1: Mukta, DM Sans, Barlow Condensed, Public Sans,
Source Sans 3, Libre Franklin, EB Garamond, Pirata One (400 only), Plus Jakarta Sans, and Tinos.
They are devDependencies, not in `src/` and not in the published `dist`. Pirata One ships at 400
only, so a bold rule synthesizes.
