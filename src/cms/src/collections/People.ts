import type { CollectionConfig } from 'payload'

import { isSignedIn } from '../access/isSignedIn'
import { importEndpoints } from '../imports/endpoints'

// Employees and contractors, imported from Digdir's authoritative source
// (NF-07). The import writes through the Local API, which bypasses access
// control, so nobody can change people through the admin panel or the
// REST/GraphQL API.
//
// The import matches people on employeeNumber. It stores the manager's employee
// number, the location's code and the units' IDs as they come from the
// source, and sets the `manager`, `location` and `units` relationships from
// them once all people, locations and units exist. A value with no match
// leaves the relationship empty and keeps the raw value.
//
// The field mapping from the SAP file is in docs/integrations/people-import.md.
export const People: CollectionConfig = {
  slug: 'personer',
  dbName: 'people',
  labels: {
    singular: 'Person',
    plural: 'Personer',
  },
  typescript: {
    interface: 'Person',
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'title', 'units', 'location', 'isEmployee', 'active'],
  },
  endpoints: importEndpoints('people'),
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: ['lastName', 'firstName'],
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      // Stored rather than virtual, so it can be the title and be searched (FO-03).
      name: 'fullName',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) =>
            [siblingData.firstName, siblingData.lastName].filter(Boolean).join(' '),
        ],
      },
    },
    {
      // Unique among active people, which the import checks in the file. Not
      // unique in the collection: a contractor who becomes an employee keeps
      // the address, and comes back as a new person beside the old one.
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      // The formal job title, e.g. «Seniorrådgiver». Roles in a team, unit or
      // project belong to the membership, not to the person.
      name: 'title',
      type: 'text',
    },
    {
      // The employee number in SAP (PERNR); the import matches on it. It stays
      // the same when someone leaves and comes back, but changes when a
      // contractor becomes an employee. Managers refer to it.
      name: 'employeeNumber',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      // The SAP user ID.
      name: 'externalId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      // The manager's employeeNumber, as it comes from the source.
      name: 'managerEmployeeNumber',
      type: 'text',
      index: true,
    },
    {
      // Personalleder, set from managerEmployeeNumber.
      name: 'manager',
      type: 'relationship',
      relationTo: 'personer',
    },
    {
      // The location's code, such as «LEI», as it comes from the source.
      name: 'locationCode',
      type: 'text',
      required: true,
      index: true,
    },
    {
      // Set from locationCode, matched on the location's code.
      name: 'location',
      type: 'relationship',
      relationTo: 'lokasjoner',
    },
    {
      // The units' externalUnitIds, as they come from the source. A person can
      // belong to more than one unit (FO-02).
      name: 'externalUnitIds',
      type: 'text',
      hasMany: true,
    },
    {
      // Set from externalUnitIds.
      name: 'units',
      type: 'relationship',
      relationTo: 'enheter',
      hasMany: true,
    },
    {
      // Employee or contractor.
      name: 'isEmployee',
      type: 'checkbox',
      required: true,
      defaultValue: false,
    },
    {
      // False once the person no longer works in Digdir. Kept rather than
      // deleted, so their history in teams survives.
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      name: 'mobile',
      type: 'text',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'medier',
    },
    {
      // The teams the person is in, with their roles there (FO-02).
      name: 'teams',
      type: 'join',
      collection: 'teammedlemskap',
      on: 'person',
      defaultLimit: 0,
    },
  ],
}
