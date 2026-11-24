import type { CollectionConfig } from 'payload'

import { canEditSharedContent } from '../access/isEditor'
import { isSignedIn } from '../access/isSignedIn'
import { hiddenUnlessSharedContentEditor } from '../access/adminMenu'
import { collectionGroups } from './groups'

// The areas a principle belongs to (PR-02). For now a fixed list, like the
// tool types, which developers add to. PR-06, letting users define the areas,
// isn't built yet. The value is stored and stays the same
// if the label changes.
export const PRINCIPLE_AREAS = [
  { value: 'felles', label: 'Alle i Digdir' },
  { value: 'ledelse', label: 'Ledelse' },
  { value: 'arkitektur', label: 'Arkitektur' },
] as const

// Digdir's principles (PR-01, Vedlegg 6): the basic rules for how we organise
// and follow up teams. Administrators and redaktører maintain them; everyone signed in reads
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
    hidden: hiddenUnlessSharedContentEditor,
    useAsTitle: 'title',
    defaultColumns: ['number', 'title', 'area'],
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => canEditSharedContent(req.user),
    update: ({ req }) => canEditSharedContent(req.user),
    delete: ({ req }) => canEditSharedContent(req.user),
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
