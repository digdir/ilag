import { describe, expect, it } from 'vitest'

import { conceptMatcher, markConcepts, type Segment } from '../src/lib/concepts'
import type { ConceptSummary } from '../src/types/concept'
import { concepts, okr, team, teammandat, tverrgaende } from './concepts'

const matcher = conceptMatcher(concepts)

// The marked words, as «text→concept names», in order.
const marked = (paragraphs: Segment[][]) =>
  paragraphs.flat().flatMap((s) => (s.concepts ? [`${s.text}→${s.concepts.map((c) => c.name).join('+')}`] : []))

// The text as it reads, to check nothing is lost or repeated.
const plain = (paragraphs: Segment[][]) => paragraphs.map((p) => p.map((s) => s.text).join(''))

describe('finding concepts in text', () => {
  it('BG-06: marks a concept by its name or one of its other forms, whatever the case', () => {
    const result = markConcepts('Vi bruker okr. Teammandatet er godkjent.', matcher)

    expect(marked(result)).toEqual(['okr→OKR', 'Teammandatet→Teammandat'])
    expect(plain(result)).toEqual(['Vi bruker okr. Teammandatet er godkjent.'])
  })

  it('BG-06: prefers the longest form, so a concept of two words wins', () => {
    const matcher = conceptMatcher([{ ...team, autoLink: true }, tverrgaende])

    expect(marked(markConcepts('Et tverrgående team med folk fra to divisjoner.', matcher))).toEqual([
      'tverrgående team→Tverrgående team',
    ])
  })

  it('BG-06: matches whole words only, with æ, ø and å counting as letters', () => {
    const matcher = conceptMatcher([
      okr,
      { id: 9, name: 'Mål', definition: 'Det vi vil oppnå.', variants: [], autoLink: true },
    ])

    expect(marked(markConcepts('OKR-arbeid, OKRene, måling og målå.', matcher))).toEqual([])
    expect(marked(markConcepts('Sett mål, og følg opp (OKR).', matcher))).toEqual(['mål→Mål', 'OKR→OKR'])
  })

  it('BG-06: marks only the first use of each concept in a text, across its paragraphs', () => {
    const result = markConcepts('OKR og OKR.\n\nMer om OKR og teammandatet.', matcher)

    expect(marked(result)).toEqual(['OKR→OKR', 'teammandatet→Teammandat'])
    expect(plain(result)).toEqual(['OKR og OKR.', 'Mer om OKR og teammandatet.'])
  })

  it('BG-06: leaves out concepts that aren’t explained automatically', () => {
    const result = markConcepts('Teamet skriver OKR.', matcher)

    expect(marked(result)).toEqual(['OKR→OKR'])
  })

  it('BG-06: explains every concept that shares a form, in one mark', () => {
    const enhetsmandat = { id: 6, name: 'Enhetsmandat', definition: 'Beskriver enheten.', variants: ['mandatet'], autoLink: true }
    const matcher = conceptMatcher([{ ...teammandat, variants: ['mandatet'] }, enhetsmandat])

    expect(marked(markConcepts('Mandatet er godkjent. Mandatet gjelder.', matcher))).toEqual([
      'Mandatet→Enhetsmandat+Teammandat',
    ])
  })

  it('BG-06: marks a shared form while one of its concepts is still unexplained', () => {
    const enhetsmandat = { id: 6, name: 'Enhetsmandat', definition: 'Beskriver enheten.', variants: ['mandatet'], autoLink: true }
    const matcher = conceptMatcher([{ ...teammandat, variants: ['mandatet'] }, enhetsmandat])

    expect(marked(markConcepts('Teammandat først, så mandatet.', matcher))).toEqual([
      'Teammandat→Teammandat',
      'mandatet→Enhetsmandat+Teammandat',
    ])
  })

  it('BG-06: treats characters in a concept’s name as text, not as a pattern', () => {
    const matcher = conceptMatcher([
      { id: 5, name: 'C++ (språk)', definition: 'Et programmeringsspråk.', variants: [], autoLink: true },
    ])

    expect(marked(markConcepts('Skrevet i C++ (språk) og C.', matcher))).toEqual(['C++ (språk)→C++ (språk)'])
  })

  it('splits text into paragraphs at blank lines, and takes paragraphs as a list', () => {
    expect(plain(markConcepts('Første.\n  \nAndre.\nSamme avsnitt.\n\n', matcher))).toEqual([
      'Første.',
      'Andre.\nSamme avsnitt.',
    ])
    expect(plain(markConcepts(['Én.', ' ', 'To.'], matcher))).toEqual(['Én.', 'To.'])
    expect(markConcepts(null, matcher)).toEqual([])
  })

  it('shows the text unmarked when no concept is explained automatically', () => {
    const none = conceptMatcher([team])

    expect(none.pattern).toBeNull()
    expect(markConcepts('Teamet bruker OKR.', none)).toEqual([[{ text: 'Teamet bruker OKR.' }]])
  })

  it('ADR-0009: finds 300 forms in 5 000 words in well under the time a page takes', () => {
    const many: ConceptSummary[] = Array.from({ length: 100 }, (_, i) => ({
      id: 100 + i,
      name: `begrep${i}`,
      definition: '',
      variants: [`begrep${i}et`, `begrep${i}ene`],
      autoLink: true,
    }))
    const matcher = conceptMatcher(many)
    const words = Array.from({ length: 5000 }, (_, i) => (i % 50 === 0 ? `begrep${i % 100}et` : 'tekst'))
    const text = words.join(' ')

    const start = performance.now()
    const result = markConcepts(text, matcher)
    const elapsed = performance.now() - start

    expect(marked(result)).toHaveLength(2)
    expect(elapsed).toBeLessThan(50)
  })
})
