import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { ownTeams } from '../access/teamEditor'

// A team's memberships mean nothing without the team, and point at it with a
// required relationship, so they go first.
const deleteMemberships: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'teammedlemskap',
    where: { team: { equals: id } },
    req,
  })
}

// Teams in Digdir (TO-01). Administrators create and delete them. A team's
// teameier and teamleder may change it (TO-08), and see only their own teams
// in the admin panel; everyone signed in still reads all teams.
export const Teams: CollectionConfig = {
  slug: 'team',
  dbName: 'teams',
  labels: {
    singular: 'Team',
    plural: 'Team',
  },
  typescript: {
    interface: 'Team',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'teamType', 'active'],
    // Only the list in the admin panel. Not access control: read is open to
    // everyone signed in.
    baseFilter: async ({ req }) => {
      const own = await ownTeams(req, 'id')
      return own === true ? null : own || { id: { in: [] } }
    },
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => ownTeams(req, 'id'),
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    beforeDelete: [deleteMemberships],
  },
  defaultSort: 'name',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      // TO-02.
      name: 'teamType',
      type: 'relationship',
      relationTo: 'teamtyper',
      required: true,
    },
    {
      // False once the team is closed. Kept rather than deleted, so its
      // history survives.
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      // The members and their roles (TO-03).
      name: 'members',
      type: 'join',
      collection: 'teammedlemskap',
      on: 'team',
      defaultLimit: 0,
      // On the team's own page the team column would repeat its name.
      admin: {
        defaultColumns: ['person', 'roles'],
      },
      // Lets the join fill in each membership's person and roles, and the
      // person's location and units, when the request's depth asks for it; a
      // join stops at the membership by default.
      maxDepth: 3,
    },
  ],
}
