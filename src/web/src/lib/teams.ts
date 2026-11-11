import { authHeaders, PayloadSDKError, sdk, type Team, type TeamMembership } from '@ilag/shared'

// The team queries the pages use. Reads as the visitor, so Payload's access
// control decides what comes back. Memberships are fetched on their own, since
// Payload doesn't fill in the person and roles inside the Team.members join.

/** A person in a team, with the names of their roles there. */
export type Member = { id: number; name: string; roles: string[] }

export type TeamWithMembers = Omit<Team, 'members'> & { members: Member[] }

/** All active teams by name, with their members (TO-01, TO-03). */
export async function getTeams(cookie: string | null): Promise<TeamWithMembers[]> {
  const init = { headers: authHeaders(cookie) }
  const [teams, memberships] = await Promise.all([
    sdk.find({ collection: 'team', where: { active: { equals: true } }, sort: 'name', pagination: false }, init),
    sdk.find({ collection: 'teammedlemskap', sort: 'person.lastName', pagination: false }, init),
  ])
  return teams.docs.map((team) => ({
    ...team,
    members: memberships.docs.filter((m) => idOf(m.team) === team.id).map(toMember),
  }))
}

/** One team with its members, or null if it doesn't exist or the visitor may not see it. */
export async function getTeam(id: string, cookie: string | null): Promise<TeamWithMembers | null> {
  if (!/^\d+$/.test(id)) return null
  const init = { headers: authHeaders(cookie) }
  try {
    const [team, memberships] = await Promise.all([
      sdk.findByID({ collection: 'team', id: Number(id) }, init),
      sdk.find(
        { collection: 'teammedlemskap', where: { team: { equals: id } }, sort: 'person.lastName', pagination: false },
        init,
      ),
    ])
    return { ...team, members: memberships.docs.map(toMember) }
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}

/** The names of the members with a role, such as «Teamleder». */
export const withRole = (members: Member[], role: string) =>
  members.filter((m) => m.roles.includes(role)).map((m) => m.name)

// The generated types allow a relationship to be either the document or just
// its ID, whatever depth was asked for.
const idOf = (doc: number | { id: number }) => (typeof doc === 'object' ? doc.id : doc)

const toMember = ({ id, person, roles }: TeamMembership): Member => ({
  id,
  name: typeof person === 'object' ? (person.fullName ?? '') : '',
  roles: roles.flatMap((r) => (typeof r === 'object' ? [r.name] : [])),
})
