import { searchPlugin } from '@payloadcms/plugin-search'
import type { BeforeSync } from '@payloadcms/plugin-search/types'
import type { CollectionSlug } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { hiddenFromEditors } from '../access/teamEditor'
import { collectionGroups } from '../collections/groups'
import type { SearchSubtitle } from './subtitle'

// One search across ilag (FS-01): teams, units, people (FO-03), roles and
// tools. Payload's search plugin keeps a document in `sok` for each of them,
// with the hooks it adds to these collections, and the web frontend searches
// that collection as the visitor.
//
// The index is a copy, so it has access rules of its own: only those signed in
// read it, as with the collections it is made from. It holds no more than a
// name, a line of context and whether the source is active, never contact
// details, memberships or allocation (AL-04, NF-09).

export const SEARCH_SLUG = 'sok'

// The collections, in the order their results are listed. The priority keeps
// each type's results together when sorted by it.
//
// Whoever may read a document must find it, and nobody else:
// tests/int/searchAccess.int.spec.ts checks every collection here against the
// read access of `sok`. Adding one needs test data for it there, and a change
// to `read` below if the collection's own read access differs. Its hits are
// titled by its `admin.useAsTitle`; for a line of context under the title,
// give it a `custom.searchSubtitle`.
export const SEARCHED_COLLECTIONS = ['team', 'enheter', 'personer', 'roller', 'verktoy'] as const satisfies CollectionSlug[]

export type SearchedCollection = (typeof SEARCHED_COLLECTIONS)[number]

// The name and the line of context the searched collection gives its
// documents (search/subtitle.ts), and whether the source is active. Teams,
// units and people can be inactive; their documents stay, so that they come
// back when the source does, and the search leaves them out.
const beforeSync: BeforeSync = async ({ collectionSlug, originalDoc: doc, payload, req, searchDoc }) => {
  const { admin, custom } = payload.collections[collectionSlug as SearchedCollection].config
  const subtitle = custom?.searchSubtitle as SearchSubtitle | undefined
  return {
    doc: searchDoc.doc,
    title: (admin.useAsTitle && doc[admin.useAsTitle]) || '',
    subtitle: (await subtitle?.(doc, req)) || null,
    active: typeof doc.active === 'boolean' ? doc.active : true,
  }
}

// Norwegian labels for the plugin's own fields.
const FIELD_LABELS: Record<string, string> = { title: 'Tittel', priority: 'Prioritet', doc: 'Kilde' }

export const search = searchPlugin({
  collections: [...SEARCHED_COLLECTIONS],
  defaultPriorities: Object.fromEntries(SEARCHED_COLLECTIONS.map((slug, i) => [slug, (i + 1) * 10])),
  beforeSync,
  searchOverrides: {
    slug: SEARCH_SLUG,
    dbName: 'search',
    labels: { singular: 'Søketreff', plural: 'Søk' },
    typescript: { interface: 'SearchResult' },
    admin: {
      group: collectionGroups.system,
      hidden: hiddenFromEditors,
      // The source shows in the sidebar of each document. In the list it
      // would only say «<Ingen Doc>», as the plugin keeps it unpopulated.
      defaultColumns: ['title', 'subtitle', 'active'],
      description:
        'Lages og oppdateres automatisk fra team, enheter, personer, roller og verktøy. Brukes av søket i ilag.',
    },
    access: {
      read: ({ req }) => isSignedIn(req.user),
      create: () => false,
      // The plugin writes past access control. Reindexing needs update and
      // delete, which keeps it to administrators.
      update: ({ req }) => isAdmin(req.user),
      delete: ({ req }) => isAdmin(req.user),
    },
    defaultSort: ['priority', 'title'],
    fields: ({ defaultFields }) => [
      ...defaultFields.map((field) =>
        'name' in field && field.name in FIELD_LABELS ? { ...field, label: FIELD_LABELS[field.name] } : field,
      ),
      {
        name: 'subtitle',
        label: 'Undertittel',
        type: 'text',
        admin: { readOnly: true },
      },
      {
        name: 'active',
        label: 'Aktiv',
        type: 'checkbox',
        defaultValue: true,
        admin: { readOnly: true, position: 'sidebar' },
      },
    ],
  },
})
