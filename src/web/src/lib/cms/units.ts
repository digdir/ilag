import { authHeaders, PayloadSDKError, sdk, type Person, type Unit } from '@ilag/shared'

import type { OrgUnit, UnitDetail, UnitPerson } from '../../types/unit'

// The queries the line organisation pages use. Reads as the visitor, so
// Payload's access control decides what comes back.

/**
 * The organisation chart: the directorate with the active units under it,
 * each with its leader and how many people work there (LO-01). Null if there
 * is no directorate.
 */
export async function getOrgChart(cookie: string | null): Promise<OrgUnit | null> {
  const headers = authHeaders(cookie)
  const [{ docs: units }, { docs: people }] = await Promise.all([
    sdk.find(
      {
        collection: 'enheter',
        where: { active: { equals: true } },
        select: { name: true, code: true, level: true, parent: true, leader: true },
        populate: { personer: { fullName: true } },
        depth: 1,
        sort: 'name',
        pagination: false,
      },
      { headers },
    ),
    sdk.find(
      {
        collection: 'personer',
        where: { active: { equals: true } },
        select: { units: true },
        depth: 0,
        pagination: false,
      },
      { headers },
    ),
  ])
  return buildChart(units, people)
}

// The fields the queries above select.
type SelectedUnit = Pick<Unit, 'id' | 'name' | 'code' | 'level' | 'parent' | 'leader'>
type SelectedPerson = Pick<Person, 'id' | 'units'>

const idOf = (ref: number | { id: number } | null | undefined) =>
  ref == null ? null : typeof ref === 'object' ? ref.id : ref

/** The tree under the directorate, sorted by name at each level as the query returns them. */
export function buildChart(units: SelectedUnit[], people: SelectedPerson[]): OrgUnit | null {
  const childrenOf = new Map<number | null, SelectedUnit[]>()
  for (const unit of units) {
    const parent = idOf(unit.parent)
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), unit])
  }
  // The people in each unit itself; a person can be in more than one.
  const peopleIn = new Map<number, Set<number>>()
  for (const person of people) {
    for (const unit of person.units ?? []) {
      const id = idOf(unit)!
      peopleIn.set(id, (peopleIn.get(id) ?? new Set()).add(person.id))
    }
  }

  // Also returns everyone in the subtree, so a person in two units under the
  // same division counts once there.
  const build = (unit: SelectedUnit, seen: Set<number>): [OrgUnit, Set<number>] => {
    seen.add(unit.id)
    const everyone = new Set(peopleIn.get(unit.id))
    const children = (childrenOf.get(unit.id) ?? [])
      .filter((child) => !seen.has(child.id))
      .map((child) => {
        const [node, inChild] = build(child, seen)
        inChild.forEach((id) => everyone.add(id))
        return node
      })
    const leader = typeof unit.leader === 'object' ? (unit.leader?.fullName ?? null) : null
    return [
      {
        id: unit.id,
        name: unit.name,
        code: unit.code || null,
        level: unit.level,
        leader,
        size: everyone.size,
        children,
      },
      everyone,
    ]
  }

  const root = units.find((u) => u.level === 'directorate' && idOf(u.parent) === null)
  return root ? build(root, new Set())[0] : null
}

/** The name of each level, as the unit page shows it. */
export const levelLabels: Record<Unit['level'], string> = {
  directorate: 'Direktorat',
  division: 'Divisjon',
  support: 'Stab',
  authority: 'Tilsyn',
  department: 'Avdeling',
  section: 'Seksjon',
}

// What the unit page shows of a person.
const contact = { fullName: true, title: true, email: true, mobile: true, active: true } as const

/**
 * One active unit with its leader and the active people who work in the unit
 * itself (LO-02), or null if it doesn't exist, is closed or the visitor may
 * not see it.
 */
export async function getUnit(id: string, cookie: string | null): Promise<UnitDetail | null> {
  if (!/^\d+$/.test(id)) return null
  const headers = authHeaders(cookie)
  try {
    const [unit, { docs: people }] = await Promise.all([
      sdk.findByID(
        {
          collection: 'enheter',
          id: Number(id),
          select: {
            name: true,
            code: true,
            level: true,
            parent: true,
            leader: true,
            advisesAllOfDigdir: true,
            active: true,
          },
          populate: { enheter: { name: true }, personer: contact },
          depth: 1,
        },
        { headers },
      ),
      sdk.find(
        {
          collection: 'personer',
          where: { units: { in: [Number(id)] }, active: { equals: true } },
          select: contact,
          depth: 0,
          pagination: false,
        },
        { headers },
      ),
    ])
    return unit.active ? toDetail(unit, people) : null
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}

// The fields the query above selects.
type SelectedContact = Pick<Person, 'id' | 'fullName' | 'title' | 'email' | 'mobile' | 'active'>
type SelectedDetail = Pick<
  Unit,
  'id' | 'name' | 'code' | 'level' | 'parent' | 'leader' | 'advisesAllOfDigdir' | 'active'
>

const toPerson = ({ id, fullName, title, email, mobile }: SelectedContact): UnitPerson => ({
  id,
  name: fullName ?? '',
  title: title || null,
  email,
  mobile: mobile || null,
})

/** The unit page's shape: an inactive leader counts as none, and the leader is not among the employees. */
export function toDetail(unit: SelectedDetail, people: SelectedContact[]): UnitDetail {
  const leader =
    typeof unit.leader === 'object' && unit.leader?.active ? toPerson(unit.leader) : null
  const parent =
    typeof unit.parent === 'object' && unit.parent
      ? { id: unit.parent.id, name: unit.parent.name }
      : null
  return {
    id: unit.id,
    name: unit.name,
    code: unit.code || null,
    level: unit.level,
    parent,
    advisesAllOfDigdir: unit.advisesAllOfDigdir,
    leader,
    employees: people
      .filter((p) => p.id !== leader?.id)
      .map(toPerson)
      .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
  }
}
