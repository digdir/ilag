import { authHeaders, type Concept, sdk } from '@ilag/shared'

import type { ConceptSummary } from '../../types/concept'
import { conceptMatcher, type ConceptMatcher } from '../concepts'

// The concept queries (BG-01, BG-02, BG-06). Reads as the visitor, so
// Payload's access control decides what comes back.

const select = { name: true, definition: true, variants: true, autoLink: true } as const

/** All concepts by name (BG-01). */
export async function getConcepts(cookie: string | null): Promise<ConceptSummary[]> {
  const { docs } = await sdk.find(
    { collection: 'begreper', sort: 'name', pagination: false, select },
    { headers: authHeaders(cookie) },
  )
  return docs.map(summary)
}

/**
 * The matcher for the concepts explained where they are used (BG-06), for the
 * page to pass to every Prose it renders. Explaining concepts is extra: if
 * the concepts can't be read, the page shows its text unmarked rather than
 * failing.
 */
export async function getConceptMatcher(cookie: string | null): Promise<ConceptMatcher> {
  try {
    return conceptMatcher(await getConcepts(cookie))
  } catch (err) {
    console.warn('Could not read the concepts; showing the text without them.', err)
    return conceptMatcher([])
  }
}

const summary = (concept: Pick<Concept, 'id' | 'name' | 'definition' | 'variants' | 'autoLink'>): ConceptSummary => ({
  id: concept.id,
  name: concept.name,
  definition: concept.definition,
  variants: concept.variants ?? [],
  autoLink: concept.autoLink,
})
