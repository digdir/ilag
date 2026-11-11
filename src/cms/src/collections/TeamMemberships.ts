import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'

// A person in a team, with their roles there (TO-03, RO-05). One membership
// per person and team; a person with several roles in the team has them all
// on the same membership. Allocation (AL-01) will belong here too.
export const TeamMemberships: CollectionConfig = {
  slug: 'teammedlemskap',
  dbName: 'team_memberships',
  labels: {
    singular: 'Teammedlemskap',
    plural: 'Teammedlemskap',
  },
  typescript: {
    interface: 'TeamMembership',
  },
  admin: {
    defaultColumns: ['team', 'person', 'roles'],
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  // Keeps every earlier version, so the admin panel shows who changed a
  // member's roles and when. Payload deletes the versions with the membership,
  // so this is a change log, not a record of who has been in the team.
  versions: true,
  indexes: [{ fields: ['team', 'person'], unique: true }],
  fields: [
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'team',
      required: true,
    },
    {
      name: 'person',
      type: 'relationship',
      relationTo: 'personer',
      required: true,
    },
    {
      // At least one, chosen by whoever adds the person to the team.
      name: 'roles',
      type: 'relationship',
      relationTo: 'roller',
      hasMany: true,
      required: true,
    },
  ],
}
