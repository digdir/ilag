import { authHeaders, PayloadSDKError, sdk, type Team, type TeamMembership } from '@ilag/shared'

// The team queries the pages use. Reads as the visitor, so Payload's access
// control decides what comes back.

/** A person in a team, with the names of their roles there. */
export type Member = { id: number; name: string; roles: string[] }

export type TeamWithMembers = Pick<Team, 'id' | 'name' | 'description' | 'teamType'> & {
  members: Member[]
}

type Where = NonNullable<Parameters<typeof sdk.find>[0]['where']>

const teamSelect = { name: true, description: true, teamType: true } as const

/** All active teams by name, with their members (TO-01, TO-03). */
export async function getTeams(cookie: string | null): Promise<TeamWithMembers[]> {
  const init = { headers: authHeaders(cookie) }
  const [{ docs: teams }, memberships] = await Promise.all([
    sdk.find(
      {
        collection: 'team',
        where: { active: { equals: true } },
        sort: 'name',
        pagination: false,
        select: teamSelect,
        joins: false,
        depth: 0,
      },
      init,
    ),
    getMemberships({ 'team.active': { equals: true } }, init),
  ])
  return teams.map((team) => ({
    ...team,
    members: memberships
      .filter((m) => (typeof m.team === 'object' ? m.team.id : m.team) === team.id)
      .map(toMember),
  }))
}

/** One team with its members, or null if it doesn't exist or the visitor may not see it. */
export async function getTeam(id: string, cookie: string | null): Promise<TeamWithMembers | null> {
  if (!/^\d+$/.test(id)) return null
  const init = { headers: authHeaders(cookie) }
  try {
    const [team, memberships] = await Promise.all([
      sdk.findByID(
        { collection: 'team', id: Number(id), select: teamSelect, joins: false, depth: 0 },
        init,
      ),
      getMemberships({ team: { equals: Number(id) } }, init),
    ])
    return { ...team, members: memberships.map(toMember) }
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}

/** The names of the members with a role, such as «Teamleder». */
export const withRole = (members: Member[], role: string) =>
  members.filter((m) => m.roles.includes(role)).map((m) => m.name)

// Memberships with their person and roles filled in. Fetched on their own,
// since Payload doesn't fill in relationships inside a join (Team.members).
const getMemberships = async (where: Where, init: RequestInit) => {
  const { docs } = await sdk.find(
    {
      collection: 'teammedlemskap',
      where,
      sort: 'person.lastName',
      pagination: false,
      select: { team: true, person: true, roles: true },
      populate: { team: { name: true }, personer: { fullName: true }, roller: { name: true } },
      depth: 1,
    },
    init,
  )
  return docs
}

const toMember = ({ id, person, roles }: Pick<TeamMembership, 'id' | 'person' | 'roles'>): Member => ({
  id,
  name: typeof person === 'object' ? (person.fullName ?? '') : '',
  roles: roles.flatMap((r) => (typeof r === 'object' ? [r.name] : [])),
})
