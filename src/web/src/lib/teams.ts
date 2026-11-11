import { authHeaders, PayloadSDKError, sdk, type Team, type TeamMembership } from '@ilag/shared'

// The team queries the pages use. Reads as the visitor, so Payload's access
// control decides what comes back. The members join on Team brings each
// membership with its person and roles (maxDepth 2 in Teams.ts).

/** A person in a team, with the names of their roles there. */
export type Member = { id: number; name: string; roles: string[] }

export type TeamWithMembers = Omit<Team, 'members'> & { members: Member[] }

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
    const team = await sdk.findByID({ collection: 'team', id: Number(id) }, { headers: authHeaders(cookie) })
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
const withMembers = ({ members, ...team }: Team): TeamWithMembers => ({
  ...team,
  members: (members?.docs ?? [])
    .filter((m) => typeof m === 'object')
    .map(toMember)
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})

const toMember = ({ id, person, roles }: TeamMembership): Member => ({
  id,
  name: typeof person === 'object' ? (person.fullName ?? '') : '',
  roles: roles.flatMap((r) => (typeof r === 'object' ? [r.name] : [])),
})
