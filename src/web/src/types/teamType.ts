import type { Role, TeamType } from '@ilag/shared'

// The shape the team type page works with. src/lib/cms/teamTypes.ts builds it
// from Payload's generated types.

/** A team type (TK-01) with the roles relevant for it (RO-03), by name. */
export type TeamTypeWithRoles = Omit<TeamType, 'roles'> & {
  roles: Pick<Role, 'id' | 'name'>[]
}
