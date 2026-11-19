import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { hiddenFromEditors } from '../access/teamEditor'
import { isSignedIn } from '../access/isSignedIn'
import { collectionGroups } from './groups'

// The questions in the team type wizard (TK-03). Each answer leads to another
// question, to a team type, which is the result, or nowhere, which ends the
// wizard with the answer itself as advice. VSU owns the content (Vedlegg 1)
// and administrators edit it; the frontend shows it at /verktoy/veiviser.
export const TeamTypeWizard: CollectionConfig = {
  slug: 'teamtype-veiviser',
  dbName: 'team_type_wizard_questions',
  labels: {
    singular: 'Spørsmål i veiviser for teamtype',
    plural: 'Veiviser for teamtype',
  },
  typescript: {
    interface: 'TeamTypeWizardQuestion',
  },
  admin: {
    group: collectionGroups.team,
    hidden: hiddenFromEditors,
    useAsTitle: 'title',
    defaultColumns: ['title', 'isStart'],
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'title', label: 'Spørsmål', type: 'text', required: true },
    {
      name: 'isStart',
      label: 'Startspørsmål',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Veiviseren begynner her.' },
    },
    { name: 'intro', label: 'Forklaring', type: 'textarea' },
    {
      name: 'considerations',
      label: 'Vurder',
      type: 'textarea',
      admin: { description: 'Ett punkt per linje.', rows: 5 },
    },
    {
      name: 'answers',
      label: 'Svar',
      labels: { singular: 'Svar', plural: 'Svar' },
      type: 'array',
      // At least one: a question without answers would be a dead end.
      required: true,
      fields: [
        { name: 'label', label: 'Svar', type: 'text', required: true },
        { name: 'hint', label: 'Forklaring', type: 'textarea' },
        {
          name: 'leadsTo',
          label: 'Leder til',
          type: 'relationship',
          relationTo: ['teamtype-veiviser', 'teamtyper'],
          admin: {
            description:
              'Et nytt spørsmål eller en teamtype. La stå tomt hvis svaret avslutter veiviseren; da vises svaret og forklaringen som råd.',
          },
        },
      ],
    },
  ],
}
