import { APIError, type CollectionBeforeDeleteHook, type CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

// Every team has a type, so a type in use cannot be deleted.
const refuseWhileInUse: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'team',
    where: { teamType: { equals: id } },
    req,
  })
  if (totalDocs > 0) {
    throw new APIError(
      `Teamtypen brukes av ${totalDocs} team og kan ikke slettes.`,
      400,
      null,
      true,
    )
  }
}

// The kinds of team in Digdir (TO-02), such as produktteam or fagnettverk.
// Administrators maintain them (2.3); the ones in Vedlegg 2 are created in a
// database without any (see seed.ts).
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
  hooks: {
    beforeDelete: [refuseWhileInUse],
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
