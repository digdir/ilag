import type { Concept } from '@ilag/shared'

// The shapes the concept pages and Prose work with. src/lib/cms/concepts.ts
// builds them from Payload's generated types.

/** A concept as the list, its page and the popovers show it (BG-01, BG-02). */
export type ConceptSummary = Pick<Concept, 'id' | 'name' | 'definition' | 'autoLink'> & {
  /** The forms matched besides the name (BG-06), never null. */
  variants: string[]
}
