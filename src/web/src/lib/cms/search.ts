import { authHeaders, sdk } from '@ilag/shared'

import type { SearchHit, SearchKind } from '../../types/search'

// The search across ilag (FS-01): teams, units, people (FO-03), roles and
// tools, from the index Payload's search plugin keeps in `sok`. Reads as the
// visitor, so Payload's access control decides what comes back.

/** What a hit is, in the words of the menu, and where its page is. */
const KINDS: Record<SearchKind, { label: string; path: string }> = {
  team: { label: 'Team', path: '/organisering/team' },
  enheter: { label: 'Enhet', path: '/organisering/linjeorganisasjon' },
  personer: { label: 'Person', path: '/folk' },
  roller: { label: 'Rolle', path: '/organisering/roller' },
  verktoy: { label: 'Verktøy', path: '/verktoy/verktoykasse' },
}

/** The shortest search that is sent, so one letter doesn't list everything. */
export const MIN_QUERY_LENGTH = 2

/**
 * The active teams, units, people, roles and tools whose names contain every
 * word in `query`, in that order of types and by name within each.
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
    const kind = KINDS[doc.doc.relationTo]
    const id = typeof doc.doc.value === 'object' ? doc.doc.value.id : doc.doc.value
    if (!kind || !doc.title) return []
    return [
      {
        title: doc.title,
        // A tool of the type «Verktøy» would say it twice.
        subtitle: doc.subtitle && doc.subtitle !== kind.label ? doc.subtitle : null,
        kind: doc.doc.relationTo,
        kindLabel: kind.label,
        url: `${kind.path}/${id}`,
      },
    ]
  })
}
