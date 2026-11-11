import {
  authHeaders,
  PayloadSDKError,
  sdk,
  type Team,
  type TeamMembership,
  type TeamType,
} from '@ilag/shared'

// The team queries the pages use. Reads as the visitor, so Payload's access
// control decides what comes back. The members join on Team brings each
// membership with its person and roles (maxDepth in Teams.ts).

/** A person in a team, with the names of their roles there. */
export type Member = {
  id: number
  name: string
  roles: string[]
  /** Only filled in by getTeam, which asks for one level more. */
  location: string | null
  units: string[]
}

export type TeamWithMembers = Omit<Team, 'members' | 'teamType'> & {
  teamType: TeamType | null
  members: Member[]
}

/** All active teams by name, with their members (TO-01, TO-03). */
export async function getTeams(cookie: string | null): Promise<TeamWithMembers[]> {
  const { docs } = await sdk.find(
    { collection: 'team', where: { active: { equals: true } }, sort: 'name', pagination: false },
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
          personer: { fullName: true, location: true, units: true },
          roller: { name: true },
          lokasjoner: { name: true },
          enheter: { name: true },
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

/** The names of the members with a role, such as «Teamleder». */
export const withRole = (members: Member[], role: string) =>
  members.filter((m) => m.roles.includes(role)).map((m) => m.name)

// The generated types allow a relationship to be either the document or just
// its ID, whatever depth was asked for, so the IDs are left out.
const withMembers = ({ members, teamType, ...team }: Team): TeamWithMembers => ({
  ...team,
  teamType: typeof teamType === 'object' ? teamType : null,
  members: (members?.docs ?? [])
    .filter((m) => typeof m === 'object')
    .map(toMember)
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})

const toMember = ({ id, person, roles }: TeamMembership): Member => ({
  id,
  name: typeof person === 'object' ? (person.fullName ?? '') : '',
  roles: roles.flatMap((r) => (typeof r === 'object' ? [r.name] : [])),
  location:
    typeof person === 'object' && typeof person.location === 'object'
      ? (person.location?.name ?? null)
      : null,
  units:
    typeof person === 'object'
      ? (person.units ?? []).flatMap((u) => (typeof u === 'object' ? [u.name] : []))
      : [],
})
