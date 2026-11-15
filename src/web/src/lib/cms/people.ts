import { authHeaders, PayloadSDKError, sdk, type Person } from '@ilag/shared'

import type { PersonDetail, PersonRow } from '../../types/person'

// The queries the Folk pages use. Reads as the visitor, so Payload's access
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
      select: { fullName: true, title: true, units: true, teams: true },
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
type SelectedPerson = Pick<Person, 'id' | 'fullName' | 'title' | 'units' | 'teams'>

const toRow = ({ id, fullName, title, units, teams }: SelectedPerson): PersonRow => ({
  id,
  name: fullName ?? '',
  title: title || null,
  units: (units ?? []).flatMap((u) => (typeof u === 'object' ? [u.name] : [])),
  teams: (teams?.docs ?? [])
    .flatMap((m) => (typeof m === 'object' && typeof m.team === 'object' ? [m.team] : []))
    .filter((team) => team.active)
    .map((team) => ({ id: team.id, name: team.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})

/**
 * One person, for their own page (FO-02), or null if they don't exist, have
 * left Digdir or the visitor may not see them.
 */
export async function getPerson(id: string, cookie: string | null): Promise<PersonDetail | null> {
  if (!/^\d+$/.test(id)) return null
  try {
    // Depth 2 reaches the teams and the roles through the memberships
    // (person → membership → team, roles). The manager, the photo and the
    // import's raw values are left out: the page doesn't show them.
    const person = await sdk.findByID(
      {
        collection: 'personer',
        id: Number(id),
        select: {
          fullName: true,
          title: true,
          email: true,
          mobile: true,
          active: true,
          location: true,
          units: true,
          teams: true,
        },
        populate: {
          lokasjoner: { name: true },
          enheter: { name: true, active: true },
          teammedlemskap: { team: true, roles: true },
          team: { name: true, active: true },
          roller: { name: true },
        },
        depth: 2,
      },
      { headers: authHeaders(cookie) },
    )
    return person.active ? toDetail(person) : null
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}

type SelectedDetail = Pick<
  Person,
  'id' | 'fullName' | 'title' | 'email' | 'mobile' | 'location' | 'units' | 'teams'
>

const toDetail = (person: SelectedDetail): PersonDetail => ({
  id: person.id,
  name: person.fullName ?? '',
  title: person.title || null,
  email: person.email,
  mobile: person.mobile || null,
  location: typeof person.location === 'object' ? (person.location?.name ?? null) : null,
  units: (person.units ?? [])
    .flatMap((u) => (typeof u === 'object' && u.active ? [{ id: u.id, name: u.name }] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
  teams: (person.teams?.docs ?? [])
    .flatMap((m) =>
      typeof m === 'object' && typeof m.team === 'object' && m.team.active
        ? [
            {
              id: m.team.id,
              name: m.team.name,
              roles: m.roles.flatMap((r) => (typeof r === 'object' ? [r.name] : [])),
            },
          ]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})
