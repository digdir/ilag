import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { hiddenUnlessAdmin } from '../access/adminMenu'
import { isSignedIn } from '../access/isSignedIn'
import { collectionGroups } from './groups'

// Offices. Administrators register them in the admin panel; the source has
// no list of locations. People come from the source with the location's
// code in locationCode, and the people import links them by it.
export const Locations: CollectionConfig = {
  slug: 'lokasjoner',
  dbName: 'locations',
  labels: {
    singular: 'Lokasjon',
    plural: 'Lokasjoner',
  },
  typescript: {
    interface: 'Location',
  },
  admin: {
    group: collectionGroups.organisation,
    // Only administrators see it in the admin panel's menu.
    hidden: hiddenUnlessAdmin,
    useAsTitle: 'name',
    defaultColumns: ['name', 'code'],
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
      // The abbreviation, such as «LEI».
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'people',
      type: 'join',
      collection: 'personer',
      on: 'location',
    },
  ],
}
