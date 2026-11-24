import type { PayloadRequest } from 'payload'

import { ROLE_CODES, TEAM_EDITOR_ROLES, teamIdsWithRoles } from './teamEditor'

type ID = number

// The teams and units whose mandate a user may work on (ADR-0007):
// `edit` may save drafts, `approve` may also approve the mandate and make it
// current, or mark it expired. Everyone who approves also edits.
export type MandateOwners = {
  edit: { teams: ID[]; units: ID[] }
  approve: { teams: ID[]; units: ID[] }
}

// For everyone but administrators, who may do everything anyway. Teameier and
// teamleder edit their team's mandate, the same people who edit the team
// (ADR-0005); only the teameier approves it (TO-09, TO-16). Unit leaders
// (LO-03) follow when ADR-0005 lets them into the admin panel; until then
// only administrators work on a unit's mandate.
export const findMandateOwners = async (req: PayloadRequest): Promise<MandateOwners> => {
  const [edit, approve] = await Promise.all([
    teamIdsWithRoles(req, TEAM_EDITOR_ROLES),
    teamIdsWithRoles(req, [ROLE_CODES.teamOwner]),
  ])
  return {
    edit: { teams: edit, units: [] },
    approve: { teams: approve, units: [] },
  }
}
