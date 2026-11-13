// The shape the Folk page works with. src/lib/cms/people.ts builds it from
// Payload's generated types.

/** A person in the Folk list (FO-01, FO-02). */
export type PersonRow = {
  id: number
  name: string
  /** The job title, such as «Seniorrådgiver». */
  title: string | null
  /** Each unit in the line with the codes of the units above it: «KOM · Kommunikasjon». */
  units: string[]
  /** The active teams the person is a member of, by name. */
  teams: { id: number; name: string }[]
}
