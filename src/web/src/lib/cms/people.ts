import { authHeaders, sdk, type Person } from '@ilag/shared'

import type { PersonRow } from '../../types/person'

// The queries the Folk page uses. Reads as the visitor, so Payload's access
// control decides what comes back.

/** Everyone who works in Digdir, by name, with their units and teams (FO-01, FO-02). */
export async function getPeople(cookie: string | null): Promise<PersonRow[]> {
  // Depth 2 reaches the teams through the memberships (person → membership →
  // team; maxDepth on People.teams). `populate` keeps only the fields the
  // page shows from each collection.
  const { docs } = await sdk.find(
    {
      collection: 'personer',
      where: { active: { equals: true } },
      select: { fullName: true, title: true, mobile: true, units: true, teams: true },
      populate: {
        enheter: { name: true },
        teammedlemskap: { team: true },
        team: { name: true, active: true },
      },
      depth: 2,
      pagination: false,
    },
    { headers: authHeaders(cookie) },
  )
  return docs.map(toRow).sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

// The fields the query above selects.
type SelectedPerson = Pick<Person, 'id' | 'fullName' | 'title' | 'mobile' | 'units' | 'teams'>

const toRow = ({ id, fullName, title, mobile, units, teams }: SelectedPerson): PersonRow => ({
  id,
  name: fullName ?? '',
  title: title || null,
  mobile: mobile || null,
  units: (units ?? []).flatMap((u) => (typeof u === 'object' ? [u.name] : [])),
  teams: (teams?.docs ?? [])
    .flatMap((m) => (typeof m === 'object' && typeof m.team === 'object' ? [m.team] : []))
    .filter((team) => team.active)
    .map((team) => ({ id: team.id, name: team.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})
