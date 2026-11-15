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

/** A person on a unit page, with what the page shows to get in touch (LO-02). */
export type UnitPerson = {
  id: number
  name: string
  /** The job title, such as «Seniorrådgiver». */
  title: string | null
  email: string
  mobile: string | null
}

/** A unit with its leader and the people who work there (LO-02). */
export type UnitDetail = {
  id: number
  name: string
  code: string | null
  level: Unit['level']
  /** The unit above, for the way back; null for the directorate. */
  parent: { id: number; name: string } | null
  advisesAllOfDigdir: boolean
  /** Null until an administrator has set an active leader. */
  leader: UnitPerson | null
  /** The active people in the unit itself, by name, without the leader. */
  employees: UnitPerson[]
}
