import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'

// Roles a person can have in a team (RO-01), such as teamleder or produkteier,
// described after RAMO: rolle, ansvar, myndighet og oppgaver (RO-02).
// Administrators maintain them (RO-07), and link each role to the team types
// it is relevant for (RO-03).
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
    // RAMO. Not required, so a role can be created first and described later.
    {
      name: 'role',
      label: 'Rolle',
      type: 'textarea',
    },
    {
      name: 'responsibility',
      label: 'Ansvar',
      type: 'textarea',
    },
    {
      name: 'authority',
      label: 'Myndighet',
      type: 'textarea',
    },
    {
      name: 'tasks',
      label: 'Oppgaver',
      type: 'textarea',
    },
    {
      // RO-03. Every type the role applies to, also for roles all teams have;
      // a new team type is added here by hand. Empty for the roles teams work
      // with that aren't roles in a team, such as linjeleder.
      name: 'teamTypes',
      type: 'relationship',
      relationTo: 'teamtyper',
      hasMany: true,
    },
  ],
}
