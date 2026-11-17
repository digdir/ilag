import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'

// A team's memberships and mandate mean nothing without the team, and point
// at it, so they go first. Deleting the mandate deletes its history too;
// teams are normally closed (`active`) rather than deleted.
const deleteMembershipsAndMandate: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'teammedlemskap',
    where: { team: { equals: id } },
    req,
  })
  await req.payload.delete({
    collection: 'mandater',
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
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    beforeDelete: [deleteMembershipsAndMandate],
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
      // Lets the join fill in each membership's person and roles, and the
      // person's location and units, when the request's depth asks for it; a
      // join stops at the membership by default.
      maxDepth: 3,
    },
    {
      // The team's mandate (TO-04), at most one. Read access on mandates
      // applies: drafts only reach those who may edit them (ADR-0006).
      name: 'mandate',
      type: 'join',
      collection: 'mandater',
      on: 'team',
      defaultLimit: 1,
    },
  ],
}
