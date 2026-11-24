import { searchPlugin } from '@payloadcms/plugin-search'
import type { BeforeSync } from '@payloadcms/plugin-search/types'
import type { CollectionSlug, Payload } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { hiddenFromEditors } from '../access/teamEditor'
import { collectionGroups } from '../collections/groups'

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
// to `read` below if the collection's own read access differs.
export const SEARCHED_COLLECTIONS = ['team', 'enheter', 'personer', 'roller', 'verktoy'] as const satisfies CollectionSlug[]

export type SearchedCollection = (typeof SEARCHED_COLLECTIONS)[number]

/** The label of a select field's value, as the admin panel shows it. */
const optionLabel = (payload: Payload, collection: CollectionSlug, field: string, value: unknown): string | null => {
  const config = payload.collections[collection]?.config.flattenedFields.find((f) => f.name === field)
  if (!config || config.type !== 'select' || typeof value !== 'string') return null
  const option = config.options.find((o) => (typeof o === 'string' ? o : o.value) === value)
  if (!option) return null
  if (typeof option === 'string') return option
  return typeof option.label === 'string' ? option.label : value
}

/** The team type's name, from the populated relationship or by looking it up. */
const teamTypeName = async (teamType: unknown, beforeSyncArgs: Parameters<BeforeSync>[0]): Promise<string | null> => {
  if (teamType && typeof teamType === 'object' && 'name' in teamType) return String(teamType.name)
  if (typeof teamType !== 'number' && typeof teamType !== 'string') return null
  const { payload, req } = beforeSyncArgs
  try {
    const type = await payload.findByID({ collection: 'teamtyper', id: teamType, depth: 0, req, select: { name: true } })
    return type.name
  } catch {
    return null
  }
}

/** The line under the name in a result, such as a person's title or a unit's level. */
const subtitleOf = async (args: Parameters<BeforeSync>[0]): Promise<string | null> => {
  const { collectionSlug, originalDoc: doc, payload } = args
  switch (collectionSlug) {
    case 'team':
      return teamTypeName(doc.teamType, args)
    case 'enheter':
      return optionLabel(payload, 'enheter', 'level', doc.level)
    case 'personer':
      return doc.title || null
    case 'verktoy':
      return optionLabel(payload, 'verktoy', 'toolType', doc.toolType)
    default:
      return null
  }
}

const beforeSync: BeforeSync = async (args) => {
  const { collectionSlug, originalDoc: doc, searchDoc } = args
  return {
    doc: searchDoc.doc,
    title: (collectionSlug === 'personer' ? doc.fullName : doc.name) || '',
    subtitle: await subtitleOf(args),
    // Teams, units and people can be inactive. Their documents stay, so that
    // they come back when the source does, and the search leaves them out.
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
        index: true,
        defaultValue: true,
        admin: { readOnly: true, position: 'sidebar' },
      },
    ],
  },
})
