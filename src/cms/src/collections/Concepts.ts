import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { hiddenFromEditors } from '../access/teamEditor'
import { collectionGroups } from './groups'

// The concept list (BG-01, BG-02). Administrators maintain it. The frontend
// marks a concept where its name or one of its variants is used in text from
// the CMS, and explains it in a popover (BG-06, ADR-0009). Two concepts may
// share a form; the popover then explains both.

export const Concepts: CollectionConfig = {
  slug: 'begreper',
  dbName: 'concepts',
  labels: {
    singular: 'Begrep',
    plural: 'Begreper',
  },
  typescript: {
    interface: 'Concept',
  },
  admin: {
    group: collectionGroups.team,
    hidden: hiddenFromEditors,
    useAsTitle: 'name',
    defaultColumns: ['name', 'variants', 'autoLink'],
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
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
      // BG-02.
      name: 'definition',
      label: 'Definisjon',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Kort og tydelig, i noen få setninger. Vises også når begrepet forklares i teksten.',
      },
    },
    {
      // The forms the frontend matches besides the name (BG-06). Norwegian
      // inflects nouns, so «team» alone would miss «teamet» and «teamene».
      name: 'variants',
      label: 'Andre former',
      type: 'text',
      hasMany: true,
      admin: {
        description:
          'Bøyningsformer og andre skrivemåter som skal forklares som dette begrepet, som «teamet» og «teamene». Navnet er alltid med.',
      },
    },
    {
      // ADR-0009: only the concepts VSU chooses are marked. Even once per
      // text, a common word like «team» would be marked in almost every text.
      name: 'autoLink',
      label: 'Forklar begrepet automatisk der det brukes',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      admin: {
        description: 'Slå av for vanlige ord, som «team», som ellers blir markert i nesten hver tekst.',
      },
    },
  ],
}
