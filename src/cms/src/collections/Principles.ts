import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { hiddenFromEditors } from '../access/teamEditor'
import { collectionGroups } from './groups'

// The areas a principle belongs to (PR-02, PR-06): a fixed list, like the
// tool types, which developers add to. The value is stored and stays the same
// if the label changes.
export const PRINCIPLE_AREAS = [
  { value: 'felles', label: 'Alle i Digdir' },
  { value: 'ledelse', label: 'Ledelse' },
  { value: 'arkitektur', label: 'Arkitektur' },
] as const

// Digdir's principles (PR-01, Vedlegg 6): the basic rules for how we organise
// and follow up teams. Administrators maintain them; everyone signed in reads
// them. A team's, unit's or project's own principles (PR-04, PR-05) come later.
export const Principles: CollectionConfig = {
  slug: 'prinsipper',
  dbName: 'principles',
  labels: {
    singular: 'Prinsipp',
    plural: 'Prinsipper',
  },
  typescript: {
    interface: 'Principle',
  },
  admin: {
    group: collectionGroups.governance,
    hidden: hiddenFromEditors,
    useAsTitle: 'title',
    defaultColumns: ['number', 'title', 'area'],
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  defaultSort: 'number',
  fields: [
    {
      // The principle's number, which also orders the list.
      name: 'number',
      label: 'Nummer',
      type: 'number',
      required: true,
      unique: true,
      min: 1,
      admin: {
        step: 1,
        description: 'Prinsippene vises i rekkefølge etter nummeret.',
      },
    },
    {
      name: 'title',
      label: 'Tittel',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      // PR-02.
      name: 'area',
      label: 'Område',
      type: 'select',
      required: true,
      options: [...PRINCIPLE_AREAS],
    },
    {
      name: 'description',
      label: 'Beskrivelse',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Hva prinsippet innebærer. Avsnitt skilles med en tom linje.',
      },
    },
  ],
}
