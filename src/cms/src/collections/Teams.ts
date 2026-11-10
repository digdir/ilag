import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { teamTypeField } from '../fields/teamType'

// A team's memberships mean nothing without the team, and point at it with a
// required relationship, so they go first.
const deleteMemberships: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'teammedlemskap',
    where: { team: { equals: id } },
    req,
  })
}

// Teams in Digdir (TO-01). Only administrators change them for now; leaders
// and team leads editing their own team (TO-08, RO-06) needs users to be
// linked to people first.
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
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
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
    // TO-02.
    teamTypeField({ required: true }),
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
    },
  ],
}
