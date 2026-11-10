import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

// The kinds of team in Digdir (TO-02), such as produktteam or fagnettverk.
// Administrators maintain them (2.3).
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
    defaultColumns: ['name', 'description'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
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
