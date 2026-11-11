import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'

// The team types in Digdir (TK-01), such as produktteam or fagnettverk, with
// what characterises each. Every team has one (TO-02). Administrators
// maintain them.
export const TeamTypes: CollectionConfig = {
  slug: 'teamtyper',
  dbName: 'team_types',
  labels: {
    singular: 'Teamtype',
    plural: 'Teamtyper',
  },
  typescript: {
    interface: 'TeamType',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name'],
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
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
