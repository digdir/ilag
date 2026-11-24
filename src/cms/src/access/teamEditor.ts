import type { ClientUser, Payload, PayloadRequest, Where } from 'payload'

import { isAdmin } from './isAdmin'

// Roles that access depends on, by their fixed code (`code` on Roller). The
// names are for people and can be changed or translated without changing
// anyone's rights.
export const ROLE_CODES = {
  teamOwner: 'teameier',
  teamLead: 'teamleder',
} as const

// The roles that may edit a team: change the team and add, change and remove
// its members (TO-08, RO-06).
export const TEAM_EDITOR_ROLES: readonly string[] = [ROLE_CODES.teamOwner, ROLE_CODES.teamLead]

type ID = number

// The teams where the user has one of the roles with these codes. `req` only to
// run in its transaction; the dashboard has a user but no request.
export const teamsWithRoles = async (
  payload: Payload,
  user: PayloadRequest['user'],
  codes: readonly string[],
  req?: PayloadRequest,
): Promise<ID[]> => {
  const person = user?.person
  const personId = typeof person === 'object' && person ? person.id : person
  if (!personId || !codes.length) return []

  const { docs: roles } = await payload.find({
    collection: 'roller',
    where: { code: { in: codes } },
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

// The teams the user is teameier or teamleder of.
export const teamsEditedBy = (payload: Payload, user: PayloadRequest['user'], req?: PayloadRequest) =>
  teamsWithRoles(payload, user, TEAM_EDITOR_ROLES, req)

// teamsWithRoles for the request's user, looked up once per request and set of
// codes: the access functions of one request often ask several times.
export const teamIdsWithRoles = (req: PayloadRequest, codes: readonly string[]): Promise<ID[]> => {
  const key = `teamIdsWithRoles:${[...codes].sort().join(',')}`
  const cached = req.context[key] as Promise<ID[]> | undefined
  if (cached) return cached
  const ids = teamsWithRoles(req.payload, req.user, codes, req)
  req.context[key] = ids
  return ids
}

// The teams the request's user may edit.
export const editableTeamIds = (req: PayloadRequest): Promise<ID[]> => teamIdsWithRoles(req, TEAM_EDITOR_ROLES)

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
// The admin panel passes the user without `collection`, which isAdmin doesn't read.
export const hiddenFromEditors = ({ user }: { user: ClientUser }): boolean =>
  !isAdmin(user as PayloadRequest['user'])
