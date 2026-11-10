import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

// Roles a person can have in a team (RO-01), such as teamleder or produkteier.
// Administrators maintain them (RO-07). The RAMO description (RO-02) and which
// team types a role is relevant for (RO-03) come later.
export const Roles: CollectionConfig = {
  slug: 'roller',
  dbName: 'roles',
  labels: {
    singular: 'Rolle',
    plural: 'Roller',
  },
  typescript: {
    interface: 'Role',
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
