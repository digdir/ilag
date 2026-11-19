import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { hiddenFromEditors } from '../access/teamEditor'
import { isSignedIn } from '../access/isSignedIn'
import { collectionGroups } from './groups'

export const Media: CollectionConfig = {
  slug: 'medier',
  dbName: 'media',
  labels: {
    singular: 'Media',
    plural: 'Medier',
  },
  typescript: {
    interface: 'Media',
  },
  // Media includes photos of employees (people.photo), so documents and files
  // are only for signed-in users. Everyone who works in Digdir can log in, so
  // only administrators change them.
  admin: {
    group: collectionGroups.system,
    // Team editors only see their teams in the admin panel.
    hidden: hiddenFromEditors,
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Defaults to the slug; keep the folder that .gitignore already covers.
    staticDir: 'media',
  },
}
