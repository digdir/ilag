import type { Payload, PayloadRequest, Where } from 'payload'

import { isAdmin } from './isAdmin'

// The roles that may edit a team: change the team and add, change and remove
// its members (TO-08, RO-06). Matched on the role's name, so renaming one of
// these roles in Roller takes the rights away from everyone who has it.
export const TEAM_EDITOR_ROLES = ['Teameier', 'Teamleder']

type ID = number

const CACHE_KEY = 'editableTeamIds'

// The teams the user is teameier or teamleder of. `req` only to run in its
// transaction; the dashboard has a user but no request.
export const teamsEditedBy = async (
  payload: Payload,
  user: PayloadRequest['user'],
  req?: PayloadRequest,
): Promise<ID[]> => {
  const person = user?.person
  const personId = typeof person === 'object' && person ? person.id : person
  if (!personId) return []

  const { docs: roles } = await payload.find({
    collection: 'roller',
    where: { name: { in: TEAM_EDITOR_ROLES } },
    pagination: false,
    depth: 0,
    req,
  })
  if (!roles.length) return []

  const { docs: memberships } = await payload.find({
    collection: 'teammedlemskap',
    where: { person: { equals: personId }, roles: { in: roles.map((r) => r.id) } },
    pagination: false,
    depth: 0,
    req,
  })
  return [...new Set(memberships.map((m) => (typeof m.team === 'object' ? m.team.id : m.team)))]
}

// teamsEditedBy for the request's user, looked up once per request: the
// access functions of one request often ask several times.
export const editableTeamIds = (req: PayloadRequest): Promise<ID[]> => {
  const cached = req.context[CACHE_KEY] as Promise<ID[]> | undefined
  if (cached) return cached
  const ids = teamsEditedBy(req.payload, req.user, req)
  req.context[CACHE_KEY] = ids
  return ids
}

export const isTeamEditor = async (req: PayloadRequest): Promise<boolean> =>
  (await editableTeamIds(req)).length > 0

// Everything for administrators, the user's own teams for team editors, and
// nothing for everyone else. `field` is the path to the team's ID.
export const ownTeams = async (req: PayloadRequest, field: string): Promise<boolean | Where> => {
  if (isAdmin(req.user)) return true
  const ids = await editableTeamIds(req)
  return ids.length ? { [field]: { in: ids } } : false
}

// For `admin.hidden`: collections team editors can't change aren't shown to
// them in the admin panel. Not access control; read access is unchanged.
export const hiddenFromEditors = ({ user }: { user: PayloadRequest['user'] }): boolean => !isAdmin(user)
