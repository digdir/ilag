import type { Team, TeamType } from '@ilag/shared'

import type { MandateView } from './mandate'
import type { ToolSummary } from './tool'

// The shapes the team pages and components work with. src/lib/cms/teams.ts
// builds them from Payload's generated types.

/** A person in a team, with their roles there. */
export type Member = {
  /** The membership's ID. */
  id: number
  /** The person's ID, for the link to their page; null if they have left or weren't fetched. */
  personId: number | null
  name: string
  /** The roles' names, to show. */
  roles: string[]
  /** The roles' fixed codes, to pick out roles such as teamleder (ROLE_CODES). */
  roleCodes: string[]
  /** Only filled in by getTeam, which asks for one level more. */
  location: string | null
  units: string[]
}

export type TeamWithMembers = Omit<Team, 'members' | 'teamType' | 'tools' | 'mandate'> & {
  teamType: TeamType | null
  members: Member[]
  /** The team's mandate (TO-04), or null if it has none the visitor may see. */
  mandate: MandateView | null
  /** The tools the team uses (TO-07), by name. */
  tools: ToolSummary[]
}
