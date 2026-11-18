import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { hiddenFromEditors } from '../access/teamEditor'
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
    // Team editors only see their teams in the admin panel.
    hidden: hiddenFromEditors,
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
    {
      // What must be in place for a team of this type (TK-04): mandate, team
      // contract and so on. Shown where the team type wizard ends.
      name: 'requirements',
      label: 'Dette må på plass',
      type: 'textarea',
      admin: { description: 'Vist som en punktliste. Ett punkt per linje.', rows: 5 },
    },
    {
      // The roles relevant for this type (RO-03), set on each role.
      name: 'roles',
      type: 'join',
      collection: 'roller',
      on: 'teamTypes',
      defaultLimit: 0,
    },
  ],
}
