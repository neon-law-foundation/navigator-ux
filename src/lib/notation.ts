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
}

const romanMarker = /^[IVXLCDM]+$/

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section'
}

function heading(line: string): { marker: string; title: string; depth: number } | undefined {
  const markdown = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/)
  const content = markdown?.[2] ?? line.trim()
  const numbered = content.match(
    markdown
      ? /^([IVXLCDM]+|[A-Z]|\d+|[a-z])\.\s+(.+?)\s*$/
      : /^([IVXLCDM]+|[A-Z]|[a-z])\.\s+(.+?)\s*$/,
  )
  if (numbered) {
    const marker = numbered[1]!
    const depth = romanMarker.test(marker) ? 1 : /^[A-Z]$/.test(marker) ? 2 : /^\d+$/.test(marker) ? 3 : 4
    return { marker, title: numbered[2]!, depth }
  }
  if (!markdown) return undefined
  return { marker: '•', title: content, depth: markdown[1]!.length }
}

function inlineRuns(text: string, blockId: string): HarvardOutlineRun[] {
  const runs: HarvardOutlineRun[] = []
  const brackets = /\[([^\]]*)\]/g
  let cursor = 0
  for (const match of text.matchAll(brackets)) {
    const index = match.index ?? 0
    if (index > cursor) {
      runs.push({ id: `${blockId}-run-${cursor}`, type: 'text', text: text.slice(cursor, index) })
    }
    runs.push({ id: `${blockId}-run-${index}`, type: 'emphasis', text: match[1]!.trim() })
    cursor = index + match[0].length
  }
  if (cursor < text.length) {
    runs.push({ id: `${blockId}-run-${cursor}`, type: 'text', text: text.slice(cursor) })
  }
  if (runs.length === 0) runs.push({ id: `${blockId}-run-0`, type: 'text', text })
  return runs
}

function blockFrom(text: string, type: HarvardOutlineBlock['type'], section: MutableSection): void {
  const number = section.blocks.length + 1
  section.blocks.push({
    id: `${section.id}-${number}`,
    type,
    text,
    runs: inlineRuns(text, `${section.id}-${number}`),
  })
}

export function parseNotation(markdown: string): HarvardOutlineSection[] {
  const roots: MutableSection[] = []
  const stack: MutableSection[] = []
  const slugCounts = new Map<string, number>()
  let active: MutableSection | undefined
  let paragraph: PendingBlock | undefined

  const flushParagraph = () => {
    if (!paragraph || !active) return
    blockFrom(paragraph.text, paragraph.type, active)
    paragraph = undefined
  }

  const addSection = (parsed: { marker: string; title: string; depth: number }) => {
    flushParagraph()
    const base = slugify(parsed.title)
    const count = (slugCounts.get(base) ?? 0) + 1
    slugCounts.set(base, count)
    const section: MutableSection = {
      id: count === 1 ? base : `${base}-${count}`,
      marker: parsed.marker,
      title: parsed.title,
      sections: [],
      blocks: [],
    }
    while (stack.length >= parsed.depth) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) parent.sections.push(section)
    else roots.push(section)
    stack.push(section)
    active = section
  }

  const ensureSection = () => {
    if (!active) addSection({ marker: 'I', title: 'Notation', depth: 1 })
  }

  for (const sourceLine of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = sourceLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }
    const parsedHeading = heading(sourceLine)
    if (parsedHeading) {
      addSection(parsedHeading)
      continue
    }
    ensureSection()
    const hold = line.match(/^\[\s*(.*?)\s*\]$/)
    const blankOnly = Boolean(hold && /^(?:blank|\.{2,}|…+)?$/i.test(hold[1]!.trim()))
    if (hold && !blankOnly) {
      flushParagraph()
      blockFrom(hold[1]!, 'hold', active!)
      continue
    }
    const listItem = line.match(/^(?:[-+*]|\d+[.)])\s+(.+)$/)
    if (listItem) {
      flushParagraph()
      blockFrom(listItem[1]!, 'list-item', active!)
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

function blocksIn(sections: HarvardOutlineSection[]): HarvardOutlineBlock[] {
  return sections.flatMap((section) => [...(section.blocks ?? []), ...blocksIn(section.sections ?? [])])
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
