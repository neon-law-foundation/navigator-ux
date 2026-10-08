import type {
  HarvardOutlineBlock,
  HarvardOutlineRun,
  HarvardOutlineSection,
} from '../components/HarvardOutline'

export interface NotationChecklistStep {
  id: string
  sourceId: string
  title: string
  detail?: string
  checked: boolean
}

interface MutableSection extends HarvardOutlineSection {
  sections: MutableSection[]
  blocks: HarvardOutlineBlock[]
}

interface PendingBlock {
  type: HarvardOutlineBlock['type']
  text: string
  number?: number
}

const LIST_TYPES = new Set<HarvardOutlineBlock['type']>(['list-item', 'ordered-list-item'])

const romanMarker = /^[IVXLCDM]+$/

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section'
}

interface ParsedHeading {
  marker: string
  /** Absent for a Markdown heading that carries only its marker (`## 1.`). */
  title?: string
  depth: number
}

function heading(line: string): ParsedHeading | undefined {
  const markdown = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/)
  const content = markdown?.[2] ?? line.trim()
  const numbered = content.match(
    markdown
      ? /^([IVXLCDM]+|[A-Z]|\d+|[a-z])(?:\.\s+(.+?)|\.?)\s*$/
      : /^([IVXLCDM]+|[A-Z]|[a-z])\.\s+(.+?)\s*$/,
  )
  if (numbered) {
    const marker = numbered[1]!
    const depth = romanMarker.test(marker) ? 1 : /^[A-Z]$/.test(marker) ? 2 : /^\d+$/.test(marker) ? 3 : 4
    return numbered[2] ? { marker, title: numbered[2], depth } : { marker, depth }
  }
  if (!markdown) return undefined
  return { marker: '•', title: content, depth: markdown[1]!.length }
}

function inlineRuns(text: string, blockId: string): HarvardOutlineRun[] {
  const runs: HarvardOutlineRun[] = []
  const brackets = /\{\{([^}]+)\}\}|\[([^\]]*)\]/g
  let cursor = 0
  for (const match of text.matchAll(brackets)) {
    const index = match.index ?? 0
    if (index > cursor) {
      runs.push({ id: `${blockId}-run-${cursor}`, type: 'text', text: text.slice(cursor, index) })
    }
    const openTerm = match[1]
    runs.push({
      id: `${blockId}-run-${index}`,
      type: openTerm ? 'open-term' : 'emphasis',
      text: (openTerm ?? match[2] ?? '').trim(),
    })
    cursor = index + match[0].length
  }
  if (cursor < text.length) {
    runs.push({ id: `${blockId}-run-${cursor}`, type: 'text', text: text.slice(cursor) })
  }
  if (runs.length === 0) runs.push({ id: `${blockId}-run-0`, type: 'text', text })
  return runs
}

function blockFrom(
  text: string,
  type: HarvardOutlineBlock['type'],
  section: MutableSection,
  sourceNumber?: number,
): void {
  const number = section.blocks.length + 1
  section.blocks.push({
    id: `${section.id}-${number}`,
    type,
    text,
    runs: inlineRuns(text, `${section.id}-${number}`),
    ...(sourceNumber === undefined ? {} : { number: sourceNumber }),
  })
}

export function parseNotation(markdown: string): HarvardOutlineSection[] {
  const roots: MutableSection[] = []
  const stack: { section: MutableSection; depth: number }[] = []
  const slugCounts = new Map<string, number>()
  let active: MutableSection | undefined
  let paragraph: PendingBlock | undefined

  // A list item stays pending like a paragraph, so the lines that continue it
  // join it: a lazy line straight after it, or an indented one after a blank.
  let blankAfterItem = false

  const flushParagraph = () => {
    blankAfterItem = false
    if (!paragraph || !active) return
    blockFrom(paragraph.text, paragraph.type, active, paragraph.number)
    paragraph = undefined
  }

  const addSection = (found: ParsedHeading) => {
    flushParagraph()
    // A lone C, D, I, L, M, V, or X reads as a Roman numeral, unless it is the
    // letter after an open capital-letter unit's: C after B is a subsection.
    const capital = [...stack].reverse().find((open) => open.depth === 2)?.section.marker
    const follows =
      found.depth === 1 &&
      found.marker.length === 1 &&
      capital?.length === 1 &&
      capital.charCodeAt(0) + 1 === found.marker.charCodeAt(0)
    const parsed = follows ? { ...found, depth: 2 } : found
    const base = slugify(parsed.title ?? parsed.marker)
    const count = (slugCounts.get(base) ?? 0) + 1
    slugCounts.set(base, count)
    const section: MutableSection = {
      id: count === 1 ? base : `${base}-${count}`,
      marker: parsed.marker,
      ...(parsed.title === undefined ? {} : { title: parsed.title }),
      sections: [],
      blocks: [],
    }
    // A unit nests under the nearest open unit of a shallower depth, so a
    // skipped level (an Arabic clause with no Roman section above it) still
    // nests by its marker rather than by how many units are open.
    while ((stack[stack.length - 1]?.depth ?? 0) >= parsed.depth) stack.pop()
    const parent = stack[stack.length - 1]?.section
    if (parent) parent.sections.push(section)
    else roots.push(section)
    stack.push({ section, depth: parsed.depth })
    active = section
  }

  const ensureSection = () => {
    if (!active) addSection({ marker: 'I', title: 'Notation', depth: 1 })
  }

  for (const sourceLine of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = sourceLine.trim()
    const item = paragraph && LIST_TYPES.has(paragraph.type)
    if (!line) {
      if (item) blankAfterItem = true
      else flushParagraph()
      continue
    }
    const starts = /^(?:\d+[.)]\s|[-+*]\s|>)/.test(line) || /^\[.*\]$/.test(line)
    if (item && !starts && (blankAfterItem ? /^\s{2,}/.test(sourceLine) : !heading(sourceLine))) {
      paragraph!.text += ` ${line}`
      blankAfterItem = false
      continue
    }
    if (blankAfterItem) flushParagraph()
    const parsedHeading = heading(sourceLine)
    if (parsedHeading) {
      addSection(parsedHeading)
      continue
    }
    ensureSection()
    const hold = line.match(/^\[\s*(.*?)\s*\]$/)
    const blankOnly = Boolean(hold && /^(?:blank|\.{2,}|…+)?$/i.test(hold[1]!.trim()))
    if (line.startsWith('>')) {
      const quote = line.replace(/^>\s?/, '')
      if (paragraph?.type === 'quotation') paragraph.text += ` ${quote}`
      else {
        flushParagraph()
        paragraph = { type: 'quotation', text: quote }
      }
      continue
    }
    if (hold && !blankOnly) {
      flushParagraph()
      blockFrom(hold[1]!, 'hold', active!)
      continue
    }
    const orderedItem = line.match(/^(\d+)[.)]\s+(.+)$/)
    const listItem = line.match(/^[-+*]\s+(.+)$/)
    if (orderedItem) {
      flushParagraph()
      paragraph = { type: 'ordered-list-item', text: orderedItem[2]!, number: Number(orderedItem[1]) }
      continue
    }
    if (listItem) {
      flushParagraph()
      paragraph = { type: 'list-item', text: listItem[1]! }
      continue
    }
    if (paragraph?.type === 'paragraph') paragraph.text += ` ${line}`
    else {
      flushParagraph()
      paragraph = { type: 'paragraph', text: line }
    }
  }
  flushParagraph()
  return roots
}

export interface NotationOpenTerm {
  id: string
  label: string
}

export interface ParsedNotationDocument {
  title: string
  preamble: HarvardOutlineBlock[]
  sections: HarvardOutlineSection[]
  openTerms: NotationOpenTerm[]
}

function stripFrontmatter(source: string): string {
  const lines = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
  if (lines[0]?.trim() !== '---') return lines.join('\n')
  const end = lines.findIndex((line, index) => index > 0 && /^(?:---|\.\.\.)\s*$/.test(line.trim()))
  return end < 0 ? lines.join('\n') : lines.slice(end + 1).join('\n')
}

function remapSectionIds(sections: HarvardOutlineSection[], parentId = ''): void {
  const counts = new Map<string, number>()
  sections.forEach((section, index) => {
    const marker = /^[IVXLCDM]+$/.test(section.marker) || /^[A-Za-z0-9]+$/.test(section.marker)
      ? section.marker.toLowerCase()
      : `${index + 1}`
    const key = `${parentId ? `${parentId}-` : 'section-'}${marker}`
    const count = (counts.get(key) ?? 0) + 1
    counts.set(key, count)
    const id = count === 1 ? key : `${key}-${count}`
    section.id = id
    section.blocks?.forEach((block, blockIndex) => {
      const blockId = `${id}-${blockIndex + 1}`
      block.id = blockId
      block.runs = block.runs.map((run, runIndex) => ({ ...run, id: `${blockId}-run-${runIndex}` }))
    })
    remapSectionIds(section.sections ?? [], id)
  })
}

function blocksIn(sections: HarvardOutlineSection[]): HarvardOutlineBlock[] {
  return sections.flatMap((section) => [...(section.blocks ?? []), ...blocksIn(section.sections ?? [])])
}

export function parseNotationDocument(source: string): ParsedNotationDocument {
  const lines = stripFrontmatter(source).split('\n')
  const titleIndex = lines.findIndex((line) => /^\s*#\s+/.test(line))
  const title = titleIndex < 0 ? '' : lines[titleIndex]!.replace(/^\s*#\s+/, '').replace(/\s+#+\s*$/, '').trim()
  const content = titleIndex < 0 ? lines : lines.slice(titleIndex + 1)
  const firstSection = content.findIndex((line) => {
    if (/^\s*#{2,6}\s+/.test(line)) return true
    return heading(line)?.depth === 1
  })
  const preambleSource = (firstSection < 0 ? content : content.slice(0, firstSection)).join('\n').trim()
  const sectionSource = (firstSection < 0 ? [] : content.slice(firstSection)).join('\n')
  const preamble = preambleSource ? (parseNotation(preambleSource)[0]?.blocks ?? []) : []
  const sections = parseNotation(sectionSource)
  remapSectionIds(sections)
  const openTerms = new Map<string, NotationOpenTerm>()
  for (const block of [...preamble, ...blocksIn(sections)]) {
    for (const run of block.runs) {
      if (run.type !== 'open-term') continue
      const label = run.text.trim()
      const id = slugify(label)
      if (!openTerms.has(id)) openTerms.set(id, { id: `open-term-${id}`, label })
    }
  }
  return { title, preamble, sections, openTerms: [...openTerms.values()] }
}

function sentenceCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Complete this blank'
  if (trimmed === trimmed.toUpperCase()) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function firstSentence(value: string): { title: string; detail?: string } {
  const text = value.trim()
  const match = text.match(/^(.+?[.!?])(?:\s+|$)(.*)$/)
  return match
    ? { title: sentenceCase(match[1]!), ...(match[2] ? { detail: match[2] } : {}) }
    : { title: sentenceCase(text) }
}

export function deriveNotationChecklist(sections: HarvardOutlineSection[]): NotationChecklistStep[] {
  const steps: NotationChecklistStep[] = []
  for (const block of blocksIn(sections)) {
    if (block.type === 'hold') {
      const label = block.text.match(/^(.+?)\s+[—–-]\s+(.+)$/)
      const content = label?.[2] ?? block.text
      const resolved = /^resolved\./i.test(content.trim())
      const split = firstSentence(content)
      steps.push({
        id: `${block.id}-check-1`,
        sourceId: block.id,
        title: label ? sentenceCase(label[1]!) : split.title,
        ...(label ? { detail: content } : split.detail ? { detail: split.detail } : {}),
        checked: resolved,
      })
      continue
    }

    const blanks = block.runs.filter((run) => run.type === 'emphasis')
    blanks.forEach((blank, index) => {
      const lead = block.text.slice(0, block.text.indexOf('[')).trim().replace(/[:—–-]+$/, '').trim()
      const blankText = blank.text.replace(/^[.…\s]+|[.…\s]+$/g, '')
      let title = 'Complete this blank'
      if (lead) title = sentenceCase(lead)
      else if (blankText && !/^blank$/i.test(blankText)) title = sentenceCase(blankText)
      steps.push({
        id: `${block.id}-check-${index + 1}`,
        sourceId: block.id,
        title,
        checked: false,
      })
    })
  }
  return steps
}
