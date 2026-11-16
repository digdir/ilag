import type { Team, TeamType } from '@ilag/shared'

// The shapes the team pages and components work with. src/lib/cms/teams.ts
// builds them from Payload's generated types.

/** A person in a team, with the names of their roles there. */
export type Member = {
  /** The membership's ID. */
  id: number
  /** The person's ID, for the link to their page; null if they have left or weren't fetched. */
  personId: number | null
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
