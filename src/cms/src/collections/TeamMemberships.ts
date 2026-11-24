import { Forbidden, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { isSignedIn } from '../access/isSignedIn'
import { editableTeamIds, isTeamEditor, ownTeams } from '../access/teamEditor'
import { collectionGroups } from './groups'
import { idOf } from '../utils/ids'

// Create access can't be limited with a query, so a team editor's new
// membership is checked here: it has to be in one of their teams.
const onlyOwnTeams: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !req.user || isAdmin(req.user)) return data
  const team = idOf(data.team)
  if (!(await editableTeamIds(req)).includes(team)) throw new Forbidden(req.t)
  return data
}

// A person in a team, with their roles there (TO-03, RO-05). One membership
// per person and team; a person with several roles in the team has them all
// on the same membership. Allocation (AL-01) will belong here too.
//
// Administrators change all memberships. A team's teameier and teamleder add,
// change and remove the memberships of their own team (RO-06), but can't move
// one to another team.
export const TeamMemberships: CollectionConfig = {
  slug: 'teammedlemskap',
  dbName: 'team_memberships',
  labels: {
    singular: 'Teammedlemskap',
    plural: 'Teammedlemskap',
  },
  typescript: {
    interface: 'TeamMembership',
  },
  admin: {
    group: collectionGroups.team,
    useAsTitle: 'personName',
    defaultColumns: ['team', 'person', 'roles'],
    // Only the list in the admin panel; read is open to everyone signed in.
    baseFilter: async ({ req }) => {
      const own = await ownTeams(req, 'team')
      return own === true ? null : own || { id: { in: [] } }
    },
  },
  access: {
    read: ({ req }) => isSignedIn(req.user),
    create: async ({ req }) => isAdmin(req.user) || (await isTeamEditor(req)),
    update: ({ req }) => ownTeams(req, 'team'),
    delete: ({ req }) => ownTeams(req, 'team'),
  },
  hooks: {
    beforeChange: [onlyOwnTeams],
  },
  indexes: [{ fields: ['team', 'person'], unique: true }],
  fields: [
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'team',
      required: true,
      access: {
        // Moving a membership could put it in a team the user doesn't edit.
        update: ({ req }) => isAdmin(req.user),
      },
      // The picker offers team editors only their own teams. Validation runs
      // this too, so without a user (the Local API, the seed) all teams go.
      filterOptions: async ({ req }) => {
        if (!req.user) return true
        const own = await ownTeams(req, 'id')
        return own === true ? true : own || { id: { in: [] } }
      },
    },
    {
      name: 'person',
      type: 'relationship',
      relationTo: 'personer',
      required: true,
    },
    {
      // The person's name, read from the person, as the membership's title in
      // the admin panel. Not stored.
      name: 'personName',
      type: 'text',
      virtual: 'person.fullName',
      admin: {
        hidden: true,
      },
    },
    {
      // At least one, chosen by whoever adds the person to the team.
      name: 'roles',
      type: 'relationship',
      relationTo: 'roller',
      hasMany: true,
      required: true,
    },
  ],
}
