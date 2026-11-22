import {
  authHeaders,
  PayloadSDKError,
  sdk,
  type Team,
  type TeamMembership,
} from '@ilag/shared'

import type { Member, TeamWithMembers } from '../../types/team'

// The team queries the pages use. Reads as the visitor, so Payload's access
// control decides what comes back. The members join on Team brings each
// membership with its person and roles (maxDepth in Teams.ts).

/** All active teams by name, with their members (TO-01, TO-03). */
export async function getTeams(cookie: string | null): Promise<TeamWithMembers[]> {
  return findActiveTeams(cookie)
}

/** The active teams of a team type by name, with their members (TK-01). */
export async function getTeamsOfType(teamTypeId: number, cookie: string | null): Promise<TeamWithMembers[]> {
  return findActiveTeams(cookie, teamTypeId)
}

async function findActiveTeams(cookie: string | null, teamTypeId?: number): Promise<TeamWithMembers[]> {
  const where = {
    active: { equals: true },
    ...(teamTypeId === undefined ? {} : { teamType: { equals: teamTypeId } }),
  }
  const { docs } = await sdk.find(
    { collection: 'team', where, sort: 'name', pagination: false },
    { headers: authHeaders(cookie) },
  )
  return docs.map(withMembers)
}

/** One team with its members, or null if it doesn't exist or the visitor may not see it. */
export async function getTeam(id: string, cookie: string | null): Promise<TeamWithMembers | null> {
  if (!/^\d+$/.test(id)) return null
  try {
    // Depth 3 reaches the people's location and units (team → membership →
    // person → location), for the team owner. It would also fill in each
    // person's manager and teams and each unit's people, so `populate` keeps
    // only the fields the page shows from each collection.
    const team = await sdk.findByID(
      {
        collection: 'team',
        id: Number(id),
        depth: 3,
        populate: {
          team: { name: true },
          teamtyper: { name: true },
          personer: { fullName: true, active: true, location: true, units: true },
          roller: { name: true, code: true },
          lokasjoner: { name: true },
          enheter: { name: true },
          verktoy: { name: true, toolType: true },
        },
      },
      { headers: authHeaders(cookie) },
    )
    return withMembers(team)
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}

/** The names of the members with a role, by its code (ROLE_CODES). */
export const withRole = (members: Member[], code: string) =>
  members.filter((m) => m.roleCodes.includes(code)).map((m) => m.name)

// The generated types allow a relationship to be either the document or just
// its ID, whatever depth was asked for, so the IDs are left out.
const withMembers = ({ members, teamType, tools, ...team }: Team): TeamWithMembers => ({
  ...team,
  teamType: typeof teamType === 'object' ? teamType : null,
  tools: (tools ?? [])
    .flatMap((t) => (typeof t === 'object' ? [{ id: t.id, name: t.name, toolType: t.toolType }] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
  members: (members?.docs ?? [])
    .filter((m) => typeof m === 'object')
    .map(toMember)
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})

const toMember = ({ id, person, roles }: TeamMembership): Member => ({
  id,
  // Only a person who still works in Digdir has a page to link to.
  personId: typeof person === 'object' && person.active ? person.id : null,
  name: typeof person === 'object' ? (person.fullName ?? '') : '',
  roles: roles.flatMap((r) => (typeof r === 'object' ? [r.name] : [])),
  roleCodes: roles.flatMap((r) => (typeof r === 'object' && r.code ? [r.code] : [])),
  location:
    typeof person === 'object' && typeof person.location === 'object'
      ? (person.location?.name ?? null)
      : null,
  units:
    typeof person === 'object'
      ? (person.units ?? []).flatMap((u) => (typeof u === 'object' ? [u.name] : []))
      : [],
})
