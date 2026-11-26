import {
  APIError,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type FieldHook,
  type Validate,
} from 'payload'

import { adminOnly } from '../access/fields'
import { sharedContentAccess } from '../access/isEditor'
import { hiddenUnlessSharedContentEditor } from '../access/adminMenu'
import { isAdmin } from '../access/isAdmin'
import { TEAM_EDITOR_ROLES } from '../access/teamEditor'
import { codeFromName, isCode } from '../utils/codes'
import { collectionGroups } from './groups'

// A role without a code gets one from its name. beforeChange, since Payload
// drops a value set in beforeValidate when field access is denied.
const codeFromNameIfEmpty: FieldHook = ({ originalDoc, siblingData, value }) =>
  value ||
  originalDoc?.code ||
  (typeof siblingData.name === 'string' ? codeFromName(siblingData.name) : value)

// Empty passes: the admin form validates before the hook above has filled it.
const validCode: Validate = (value) =>
  !value || isCode(value)
    ? true
    : 'Koden kan bare ha små bokstaver a–z, tall og bindestrek, som «teamleder».'

// Who may edit a team follows the roles with these codes (TEAM_EDITOR_ROLES),
// so deleting one would leave every team without editors. Only administrators
// may delete them (RO-07), as before redaktører could change roles; a
// redaktør can still change their name and description, and the code never
// changes. Scripts on the server, which run without a user, still can.
const keepTeamEditorRoles: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (!req.user || isAdmin(req.user)) return
  const role = await req.payload.findByID({ collection: 'roller', id, depth: 0, req })
  if (role.code && TEAM_EDITOR_ROLES.includes(role.code)) {
    throw new APIError(
      `Rollen «${role.name}» styrer hvem som kan redigere team, og kan bare slettes av en administrator.`,
      403,
    )
  }
}

// Roles a person can have in a team (RO-01), such as teamleder or produkteier,
// described after RAMO: rolle, ansvar, myndighet og oppgaver (RO-02).
// Administrators and redaktører maintain them (RO-07), and link each role to
// the team types it is relevant for (RO-03). Only administrators choose a
// role's code or delete the roles that decide who edits a team.
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
    // In the admin panel's menu for administrators and redaktører.
    hidden: hiddenUnlessSharedContentEditor,
    useAsTitle: 'name',
    defaultColumns: ['name', 'code'],
  },
  hooks: {
    beforeDelete: [keepTeamEditorRoles],
  },
  access: sharedContentAccess,
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
        beforeChange: [codeFromNameIfEmpty],
      },
      access: {
        // Only administrators choose a code, once; otherwise it comes from
        // the name.
        create: adminOnly,
        update: ({ doc, req }) => isAdmin(req.user) && !doc?.code,
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
