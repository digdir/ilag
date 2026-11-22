import type { CollectionConfig, FieldHook, Validate } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { hiddenFromEditors } from '../access/teamEditor'
import { isSignedIn } from '../access/isSignedIn'
import { codeFromName, isCode } from '../utils/codes'
import { collectionGroups } from './groups'

// A new role without a code gets one from its name. Runs on the server before
// validation, so the admin form may leave the code empty.
const codeFromNameIfEmpty: FieldHook = ({ siblingData, value }) =>
  value || (typeof siblingData.name === 'string' ? codeFromName(siblingData.name) : value)

// Empty passes: the admin form validates before the hook above has filled it.
const validCode: Validate = (value) =>
  !value || isCode(value)
    ? true
    : 'Koden kan bare ha små bokstaver a–z, tall og bindestrek, som «teamleder».'

// Roles a person can have in a team (RO-01), such as teamleder or produkteier,
// described after RAMO: rolle, ansvar, myndighet og oppgaver (RO-02).
// Administrators maintain them (RO-07), and link each role to the team types
// it is relevant for (RO-03).
export const Roles: CollectionConfig = {
  slug: 'roller',
  dbName: 'roles',
  labels: {
    singular: 'Rolle',
    plural: 'Roller',
  },
  typescript: {
    interface: 'Role',
  },
  admin: {
    group: collectionGroups.organisation,
    // Team editors only see their teams in the admin panel.
    hidden: hiddenFromEditors,
    useAsTitle: 'name',
    defaultColumns: ['name', 'code'],
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
      // What ilag knows the role by, such as «teamleder». Access is checked
      // against the code, never the name (access/teamEditor.ts), so the name
      // can be changed or translated without changing anyone's rights. Set
      // once, from the name unless typed, and never changed after that.
      name: 'code',
      label: 'Kode',
      type: 'text',
      unique: true,
      index: true,
      validate: validCode,
      hooks: {
        beforeValidate: [codeFromNameIfEmpty],
      },
      access: {
        // Not required in the schema, so the column could be added to
        // databases that already had roles; those may set it once.
        update: ({ doc }) => !doc?.code,
      },
      admin: {
        position: 'sidebar',
        description:
          'Fast kode som ilag kjenner rollen igjen på. Lages fra navnet hvis du lar den stå tom, og kan ikke endres etter at rollen er lagret.',
      },
    },
    // RAMO. Not required, so a role can be created first and described later.
    {
      name: 'role',
      label: 'Rolle',
      type: 'textarea',
    },
    {
      name: 'responsibility',
      label: 'Ansvar',
      type: 'textarea',
    },
    {
      name: 'authority',
      label: 'Myndighet',
      type: 'textarea',
    },
    {
      name: 'tasks',
      label: 'Oppgaver',
      type: 'textarea',
    },
    {
      // RO-03. Every type the role applies to, also for roles all teams have;
      // a new team type is added here by hand. Empty for the roles teams work
      // with that aren't roles in a team, such as linjeleder.
      name: 'teamTypes',
      type: 'relationship',
      relationTo: 'teamtyper',
      hasMany: true,
    },
  ],
}
