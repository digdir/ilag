import { authHeaders, sdk } from '@ilag/shared'

import type { SearchHit, SearchKind } from '../../types/search'
import { teamTypeHref } from '../teamTypes'
import { toolHref } from '../tools'

// The search across ilag (FS-01): teams, team types, units, people (FO-03),
// roles and tools, from the index Payload's search plugin keeps in `sok`.
// Reads as the visitor, so Payload's access control decides what comes back.

/** What a hit is, in the words of the menu, and the address of its page. */
const KINDS: Record<SearchKind, { label: string; href: (id: number) => string }> = {
  team: { label: 'Team', href: (id) => `/organisering/team/${id}` },
  teamtyper: { label: 'Teamtype', href: teamTypeHref },
  enheter: { label: 'Enhet', href: (id) => `/organisering/linjeorganisasjon/${id}` },
  personer: { label: 'Person', href: (id) => `/folk/${id}` },
  roller: { label: 'Rolle', href: (id) => `/organisering/roller/${id}` },
  verktoy: { label: 'Verktøy', href: toolHref },
}

/** The shortest search that is sent, so one letter doesn't list everything. */
export const MIN_QUERY_LENGTH = 2

/**
 * The active teams, team types, units, people, roles and tools whose names
 * contain every word in `query`, in that order of types and by name within
 * each.
 */
export async function search(query: string, cookie: string | null, limit = 15): Promise<SearchHit[]> {
  const q = query.trim()
  if (q.length < MIN_QUERY_LENGTH) return []
  const { docs } = await sdk.find(
    {
      collection: 'sok',
      where: { title: { like: q }, active: { equals: true } },
      sort: ['priority', 'title'],
      limit,
      depth: 0,
    },
    { headers: authHeaders(cookie) },
  )
  return docs.flatMap((doc) => {
    if (!doc.title) return []
    const kind = KINDS[doc.doc.relationTo]
    const id = typeof doc.doc.value === 'object' ? doc.doc.value.id : doc.doc.value
    return [
      {
        title: doc.title,
        // Left out when it only repeats the type, as for a tool of the type «Verktøy».
        subtitle: doc.subtitle && doc.subtitle !== kind.label ? doc.subtitle : null,
        kindLabel: kind.label,
        url: kind.href(id),
      },
    ]
  })
}
