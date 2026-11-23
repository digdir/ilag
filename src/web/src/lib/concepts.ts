import type { ConceptSummary } from '../types/concept'

// Finding concepts in text from the CMS, to explain them where they are used
// (BG-06, ADR-0009). Pure functions: src/components/Prose.astro renders the
// result, and src/lib/cms/concepts.ts fetches the concepts.

/** The concepts to look for, and one pattern that finds any of their forms. */
export interface ConceptMatcher {
  /** Null when no concept is explained automatically. */
  pattern: RegExp | null
  /** Each form in lower case, to the concepts it belongs to, by name. */
  byForm: Map<string, ConceptSummary[]>
}

/** A piece of a paragraph: plain text, or a word that names one or more concepts. */
export interface Segment {
  text: string
  /** The concepts the word names, by name; more than one when they share the form. */
  concepts?: ConceptSummary[]
}

const normalise = (form: string) => form.trim().toLocaleLowerCase('nb')

const escape = (form: string) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * One pattern for the names and variants of the concepts that are explained
 * automatically. A form only matches as a whole word: not next to a letter,
 * digit or hyphen, so «team» isn't found in «teamleder» or «OKR-arbeid». The
 * longest form is tried first, so «tverrgående team» wins over «team». Two
 * concepts may share a form; the word then names both.
 */
export function conceptMatcher(concepts: ConceptSummary[]): ConceptMatcher {
  const byForm = new Map<string, ConceptSummary[]>()
  for (const concept of concepts.filter((c) => c.autoLink).sort(byName)) {
    for (const form of formsOf(concept)) byForm.set(form, [...(byForm.get(form) ?? []), concept])
  }
  return { byForm, pattern: byForm.size ? patternFor([...byForm.keys()]) : null }
}

const byName = (a: ConceptSummary, b: ConceptSummary) => a.name.localeCompare(b.name, 'nb')

/** The concept's name and variants, in lower case, each once. */
const formsOf = (c: ConceptSummary) => [...new Set([c.name, ...c.variants].map(normalise))].filter(Boolean)

/** Any of the forms as a whole word, the longest first. */
const patternFor = (forms: string[]) => {
  const alternatives = forms.sort((a, b) => b.length - a.length).map(escape)
  return new RegExp(`(?<![\\p{L}\\p{N}-])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}-])`, 'giu')
}

/**
 * Splits text into paragraphs at blank lines, as the admin panel's text
 * fields are written, and marks the first use of each concept in the whole
 * text. A word naming several concepts is marked while one of them is still
 * unexplained, and explains them all.
 */
export function markConcepts(
  text: string | null | undefined,
  { pattern, byForm }: ConceptMatcher,
): Segment[][] {
  const paragraphs = (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const used = new Set<number>()

  return paragraphs.map((paragraph) => {
    if (!pattern) return [{ text: paragraph }]
    const segments: Segment[] = []
    let at = 0
    for (const match of paragraph.matchAll(pattern)) {
      const concepts = byForm.get(normalise(match[0])) ?? []
      if (!concepts.some((c) => !used.has(c.id))) continue
      for (const c of concepts) used.add(c.id)
      if (match.index > at) segments.push({ text: paragraph.slice(at, match.index) })
      segments.push({ text: match[0], concepts })
      at = match.index + match[0].length
    }
    if (at < paragraph.length) segments.push({ text: paragraph.slice(at) })
    return segments
  })
}
