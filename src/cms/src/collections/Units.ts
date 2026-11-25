import type { CollectionConfig } from 'payload'

import { importOnly } from '../access/fields'
import { isAdmin } from '../access/isAdmin'
import { hiddenFromEditors } from '../access/teamEditor'
import { isSignedIn } from '../access/isSignedIn'
import { importEndpoints } from '../imports/endpoints'
import { collectionGroups } from './groups'

// The directorate, its divisions, departments and sections, imported from
// their own file from Digdir's authoritative source (NF-07). The import writes
// through the Local API, which bypasses access control. Nobody can create or
// delete units through the admin panel or the REST/GraphQL API, or change what
// the import sets. Administrators set the leader and the description, which
// the file doesn't have.
// What a unit leader maintains in ilag (LO-03) lives elsewhere, such as the
// unit's mandate in Mandates.
//
// The import matches units on externalUnitId, and sets `parent` from the
// codes in the file. The field mapping is in docs/integrations/unit-import.md.

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
    group: collectionGroups.organisation,
    // Team editors only see their teams in the admin panel.
    hidden: hiddenFromEditors,
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
      // at the top. A staff unit (stab) and a supervisory authority (tilsyn) sit
      // directly under the directorate like a division; the import sets them from UNIT_LEVELS
      // in imports/settings.ts, since the file can't tell them apart.
      name: 'level',
      type: 'select',
      required: true,
      options: [
        { label: 'Direktorat', value: 'directorate' },
        { label: 'Divisjon', value: 'division' },
        { label: 'Stab', value: 'support' },
        { label: 'Tilsyn', value: 'authority' },
        { label: 'Avdeling', value: 'department' },
        { label: 'Seksjon', value: 'section' },
      ],
      access: { update: importOnly },
    },
    {
      // What the unit does, in a few sentences, shown under the unit's name on
      // its page (LO-02). Set by an administrator; the import never changes
      // it. The mandate (LO-02, LO-03) is in Mandates.
      name: 'description',
      type: 'textarea',
      label: 'Beskrivelse',
      admin: {
        description: 'Kort om hva enheten gjør. Vises under navnet på enhetssiden.',
      },
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
    {
      // The unit's mandate (LO-02), at most one. Read access on mandates
      // applies: drafts only reach those who may edit them (ADR-0007).
      name: 'mandate',
      type: 'join',
      collection: 'mandater',
      on: 'unit',
      defaultLimit: 1,
    },
  ],
}
