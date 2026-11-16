import type { Role, TeamType } from '@ilag/shared'

// The shape the role pages and components work with. src/lib/cms/roles.ts
// builds it from Payload's generated types.

/** A role with the team types it is relevant for (RO-03), by name. */
export type RoleWithTypes = Omit<Role, 'teamTypes'> & {
  teamTypes: Pick<TeamType, 'id' | 'name'>[]
}

/** One part of a RAMO description (RO-02), such as «Ansvar» and its text. */
export type RamoField = {
  label: string
  value: string
}
