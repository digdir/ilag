import { authHeaders, sdk, type Person, type Unit } from '@ilag/shared'

import type { PersonRow } from '../../types/person'

// The queries the Folk page uses. Reads as the visitor, so Payload's access
// control decides what comes back.

/** Everyone who works in Digdir, by name, with their units and teams (FO-01, FO-02). */
export async function getPeople(cookie: string | null): Promise<PersonRow[]> {
  const headers = authHeaders(cookie)
  const [{ docs: people }, { docs: units }] = await Promise.all([
    // Depth 2 reaches the teams through the memberships (person → membership
    // → team; maxDepth on People.teams). `populate` keeps only the fields the
    // page shows, so the units come back with their name alone, and
    // `unitLabel` builds the chain from the units below.
    sdk.find(
      {
        collection: 'personer',
        where: { active: { equals: true } },
        select: { fullName: true, title: true, units: true, teams: true },
        populate: {
          enheter: { name: true },
          teammedlemskap: { team: true },
          team: { name: true, active: true },
        },
        depth: 2,
        pagination: false,
      },
      { headers },
    ),
    sdk.find(
      {
        collection: 'enheter',
        select: { name: true, code: true, parent: true },
        depth: 0,
        pagination: false,
      },
      { headers },
    ),
  ])
  const byId = new Map(units.map((u) => [u.id, u]))
  return people
    .map((person) => toRow(person, byId))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

// The fields the queries above select.
type SelectedPerson = Pick<Person, 'id' | 'fullName' | 'title' | 'units' | 'teams'>
type SelectedUnit = Pick<Unit, 'id' | 'name' | 'code' | 'parent'>

const toRow = (
  { id, fullName, title, units, teams }: SelectedPerson,
  byId: Map<number, SelectedUnit>,
): PersonRow => ({
  id,
  name: fullName ?? '',
  title: title || null,
  units: (units ?? []).flatMap((u) => {
    const unit = byId.get(typeof u === 'object' ? u.id : u)
    return unit ? [unitLabel(unit, byId)] : []
  }),
  teams: (teams?.docs ?? [])
    .flatMap((m) => (typeof m === 'object' && typeof m.team === 'object' ? [m.team] : []))
    .filter((team) => team.active)
    .map((team) => ({ id: team.id, name: team.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})

// Like the prototype: the codes of the units above, then the unit's own name,
// such as «KOM · KOM – Gruppe Nett og innhold». The directorate has no code and
// is left out.
const unitLabel = (unit: SelectedUnit, byId: Map<number, SelectedUnit>): string => {
  const codes: string[] = []
  const seen = new Set([unit.id])
  let parentId = unit.parent
  while (parentId != null) {
    const id = typeof parentId === 'object' ? parentId.id : parentId
    const parent = byId.get(id)
    if (!parent || seen.has(id)) break
    seen.add(id)
    if (parent.code) codes.unshift(parent.code)
    parentId = parent.parent
  }
  return [...codes, unit.name].join(' · ')
}
