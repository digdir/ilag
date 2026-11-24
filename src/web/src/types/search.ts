import type { SearchResult } from '@ilag/shared'

/** What a search hit is: the collection its page is made from. */
export type SearchKind = SearchResult['doc']['relationTo']

/** One hit in the search across ilag (FS-01). */
export interface SearchHit {
  title: string
  /** Such as a person's title or a unit's level. */
  subtitle: string | null
  /** «Team», «Teamtype», «Enhet», «Person», «Rolle» or «Verktøy». */
  kindLabel: string
  url: string
}
