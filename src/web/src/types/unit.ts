import type { Unit } from '@ilag/shared'

import type { MandateView } from './mandate'

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
  /** What the unit does, in paragraphs; empty until an administrator writes one. */
  description: string[]
  /** The units above it, from the directorate down, for the breadcrumbs; empty for the directorate. */
  ancestors: { id: number; name: string }[]
  advisesAllOfDigdir: boolean
  /** The unit's mandate (LO-02), or null if it has none the visitor may see. */
  mandate: MandateView | null
  /** Null until an administrator has set an active leader. */
  leader: UnitPerson | null
  /** The active people in the unit itself, by name, without the leader. */
  employees: UnitPerson[]
  /** The active units directly under it, by name. */
  children: SubUnit[]
}

/** A unit under the one the page shows (LO-02). */
export type SubUnit = {
  id: number
  name: string
  code: string | null
  level: Unit['level']
  /** The leader's name, when an administrator has set an active one. */
  leader: string | null
}
