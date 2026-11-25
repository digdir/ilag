import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { Cards } from '../blocks/Cards'
import { Documents } from '../blocks/Documents'
import { List } from '../blocks/List'
import { Statement } from '../blocks/Statement'
import { TextWithFiles } from '../blocks/TextWithFiles'
import { collectionGroups } from '../collections/groups'

// Digdir's styringsfundament (SF-01): vision, mission, goals, values, users
// and roles on one page, built from boxes the editor adds and orders.
// Administrators maintain it (SF-02); every change is kept as a version
// (SF-05), and readers see only the published one.
export const GovernanceFoundation: GlobalConfig = {
  slug: 'styringsfundament',
  dbName: 'governance_foundation',
  label: 'Styringsfundament',
  typescript: {
    interface: 'GovernanceFoundation',
  },
  admin: {
    group: collectionGroups.governance,
  },
  access: {
    // Administrators may read drafts; everyone else only what is published, also with `?draft=true`.
    read: ({ req }) => (isAdmin(req.user) ? true : isSignedIn(req.user) && { _status: { equals: 'published' } }),
    readVersions: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
  },
  versions: {
    drafts: true,
    max: 0,
  },
  fields: [
    { name: 'intro', label: 'Innledning', type: 'textarea' },
    {
      name: 'sections',
      label: 'Innhold',
      type: 'blocks',
      labels: { singular: 'Boks', plural: 'Bokser' },
      blocks: [Statement, Cards, List, TextWithFiles, Documents],
    },
    { name: 'footnote', label: 'Fotnote', type: 'textarea', admin: { description: 'Vises nederst på siden.' } },
  ],
}
