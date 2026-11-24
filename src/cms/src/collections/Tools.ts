import type { CollectionConfig } from 'payload'

import { canEditSharedContent } from '../access/isEditor'
import { isSignedIn } from '../access/isSignedIn'
import { hiddenUnlessSharedContentEditor } from '../access/adminMenu'
import { validHttpUrl } from '../utils/links'
import { collectionGroups } from './groups'

// The tool types in the toolbox (VK-02). Only the tools use them, so they are
// a fixed list rather than a collection. The value is stored and stays the
// same if the label changes.
export const TOOL_TYPES = [
  { value: 'mal', label: 'Mal' },
  { value: 'metode', label: 'Metode' },
  { value: 'veileder', label: 'Veileder' },
  { value: 'verktoy', label: 'Verktøy' },
] as const

// The toolbox (VK-01): recommended methods, templates, guides and tools for
// working in teams and projects. Administrators and redaktører maintain it; a team's
// teameier and teamleder choose the tools the team uses on the team (VK-06).
export const Tools: CollectionConfig = {
  slug: 'verktoy',
  dbName: 'tools',
  labels: {
    singular: 'Verktøy',
    plural: 'Verktøy',
  },
  typescript: {
    interface: 'Tool',
  },
  admin: {
    group: collectionGroups.team,
    // Team editors pick tools on their team, which reads them; they don't
    // need the collection in the menu. Redaktører maintain it.
    hidden: hiddenUnlessSharedContentEditor,
    useAsTitle: 'name',
    defaultColumns: ['name', 'toolType', 'teamTypes'],
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => canEditSharedContent(req.user),
    update: ({ req }) => canEditSharedContent(req.user),
    delete: ({ req }) => canEditSharedContent(req.user),
  },
  defaultSort: 'name',
  fields: [
    {
      name: 'name',
      label: 'Navn',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      // VK-02.
      name: 'toolType',
      label: 'Verktøytype',
      type: 'select',
      required: true,
      options: [...TOOL_TYPES],
    },
    {
      // VK-03: one field for the short description and the purpose.
      name: 'description',
      label: 'Beskrivelse',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Hva verktøyet er og hva det brukes til, i noen få setninger.',
      },
    },
    {
      // VK-05. A tool every type of team can use is linked to each of them,
      // as roles are (RO-03); one linked to none suits none.
      name: 'teamTypes',
      label: 'Teamtyper',
      type: 'relationship',
      relationTo: 'teamtyper',
      hasMany: true,
      admin: {
        description: 'Teamtypene verktøyet passer for. Velg alle hvis det passer for alle team.',
      },
    },
    {
      // VK-08.
      name: 'toolUrl',
      label: 'Lenke til verktøyet',
      type: 'text',
      validate: validHttpUrl,
      admin: {
        description: 'Bare for verktøy Digdir har lisens på, som Figma.',
      },
    },
    {
      // VK-07.
      name: 'resources',
      label: 'Ressurser',
      labels: { singular: 'Ressurs', plural: 'Ressurser' },
      type: 'array',
      admin: {
        description: 'Lenker til veiledning, maler og anbefalinger om bruk.',
      },
      fields: [
        {
          name: 'label',
          label: 'Tekst',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          label: 'Lenke',
          type: 'text',
          required: true,
          validate: validHttpUrl,
        },
      ],
    },
    {
      // The teams that use the tool, for the admin panel.
      name: 'teams',
      label: 'Team som bruker verktøyet',
      type: 'join',
      collection: 'team',
      on: 'tools',
      defaultLimit: 0,
      admin: {
        defaultColumns: ['name', 'teamType'],
      },
    },
  ],
}
