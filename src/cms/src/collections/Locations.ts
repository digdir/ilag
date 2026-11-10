import type { CollectionConfig } from 'payload'

// Offices, imported from Digdir's authoritative source (NF-07). The import
// writes through the Local API, which bypasses access control, so nobody can
// change locations through the admin panel or the REST/GraphQL API.
//
// The import matches locations on code, the abbreviation people's
// locationCode refers to.
export const Locations: CollectionConfig = {
  slug: 'lokasjoner',
  dbName: 'locations',
  labels: {
    singular: 'Lokasjon',
    plural: 'Lokasjoner',
  },
  typescript: {
    interface: 'Location',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: 'name',
  fields: [
    {
      // The abbreviation, such as «LEI».
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'people',
      type: 'join',
      collection: 'personer',
      on: 'location',
    },
  ],
}
