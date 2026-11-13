import type { CollectionConfig, FieldAccess } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { importEndpoints } from '../imports/endpoints'

// The directorate, its divisions, departments and sections, imported from
// their own file from Digdir's authoritative source (NF-07). The import writes
// through the Local API, which bypasses access control. Nobody can create or
// delete units through the admin panel or the REST/GraphQL API, or change what
// the import sets. Administrators set the leader, which the file doesn't have.
// What a unit leader maintains in ilag (LO-03) will live elsewhere.
//
// The import matches units on externalUnitId, and sets `parent` from the
// codes in the file. The field mapping is in docs/integrations/unit-import.md.

// For the fields the import sets.
const importOnly: FieldAccess = () => false

export const Units: CollectionConfig = {
  slug: 'enheter',
  dbName: 'units',
  labels: {
    singular: 'Enhet',
    plural: 'Enheter',
  },
  typescript: {
    interface: 'Unit',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'level', 'parent', 'leader', 'active'],
  },
  endpoints: importEndpoints('units'),
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: () => false,
    update: ({ req }) => isAdmin(req.user),
    delete: () => false,
  },
  defaultSort: 'name',
  fields: [
    {
      // The source's own ID for the unit; the import matches on it.
      name: 'externalUnitId',
      type: 'text',
      required: true,
      unique: true,
      access: { update: importOnly },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      access: { update: importOnly },
    },
    {
      // A short code such as «FEL». The directorate has none.
      name: 'code',
      type: 'text',
      access: { update: importOnly },
    },
    {
      // The levels of the organisation chart (LO-01), with the directorate
      // at the top.
      name: 'level',
      type: 'select',
      required: true,
      options: [
        { label: 'Direktorat', value: 'directorate' },
        { label: 'Divisjon', value: 'division' },
        { label: 'Avdeling', value: 'department' },
        { label: 'Seksjon', value: 'section' },
      ],
      access: { update: importOnly },
    },
    {
      // A unit has at most one parent. Empty for the directorate.
      name: 'parent',
      type: 'relationship',
      relationTo: 'enheter',
      access: { update: importOnly },
    },
    {
      // Enhetsleder (LO-02), set by an administrator. The import never
      // changes it.
      name: 'leader',
      type: 'relationship',
      relationTo: 'personer',
    },
    {
      // The unit advises and supports all of Digdir, not just its own
      // division (LO-06), such as a section for user experience that every
      // division uses. Set by an administrator; the import never changes it.
      name: 'advisesAllOfDigdir',
      type: 'checkbox',
      label: 'Bistår og rådgir hele Digdir',
      required: true,
      defaultValue: false,
      admin: {
        description: 'Enheten bistår og rådgir hele Digdir, ikke bare sin egen divisjon.',
      },
    },
    {
      // False once the unit is closed. Kept rather than deleted, so what is
      // linked to it, such as teams and OKR, keeps its history.
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      access: { update: importOnly },
    },
    {
      // Sub-units (LO-02).
      name: 'children',
      type: 'join',
      collection: 'enheter',
      on: 'parent',
    },
    {
      // The people in the unit (LO-02).
      name: 'people',
      type: 'join',
      collection: 'personer',
      on: 'units',
    },
  ],
}
