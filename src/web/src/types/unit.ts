import type { Unit } from '@ilag/shared'

// The shape the organisation chart works with. src/lib/cms/units.ts builds it
// from Payload's generated types.

/** A unit in the organisation chart, with the units under it (LO-01). */
export type OrgUnit = {
  id: number
  name: string
  /** A short code such as «FEL». The directorate has none. */
  code: string | null
  level: Unit['level']
  /** The leader's name, when an administrator has set one. */
  leader: string | null
  /** How many active people work in the unit and the units under it. */
  size: number
  children: OrgUnit[]
}
