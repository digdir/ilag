// The shape the Folk page works with. src/lib/cms/people.ts builds it from
// Payload's generated types.

/** A person in the Folk list (FO-01, FO-02). */
export type PersonRow = {
  id: number
  name: string
  /** The job title, such as «Seniorrådgiver». */
  title: string | null
  /** The names of the person's units in the line. */
  units: string[]
  /** The active teams the person is a member of, by name. */
  teams: { id: number; name: string }[]
}

/** One person, for their own page (FO-02). Allocation (AL-01) is not part of it. */
export type PersonDetail = {
  id: number
  name: string
  title: string | null
  email: string
  mobile: string | null
  /** The location's name, such as «Leikanger». */
  location: string | null
  /** The person's active units in the line. */
  units: { id: number; name: string }[]
  /** The active teams the person is a member of, with their roles there. */
  teams: { id: number; name: string; roles: string[] }[]
}
