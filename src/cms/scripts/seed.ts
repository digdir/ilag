import { getPayload, type Payload, type RequiredDataFromCollectionSlug, type Where } from 'payload'
import config from '@payload-config'

import * as data from './seed-data'

// Fills the database with the test data in seed-data.ts: `pnpm db:seed`.
// Records that already exist are left as they are, so it is safe to run again.
// `pnpm db:seed:reset` first deletes what the seed creates, then creates it
// again. It passes `reset` without dashes, since `payload run` only hands the
// script arguments that aren't flags. Writes through the Local API, which
// bypasses access control, the way the import will.

type Slug = 'lokasjoner' | 'enheter' | 'personer' | 'roller' | 'team' | 'teammedlemskap'

const findId = async (payload: Payload, collection: Slug, where: Where) => {
  const { docs } = await payload.find({ collection, where, limit: 1, depth: 0 })
  return docs[0]?.id
}

const seed = async (payload: Payload) => {
  const created: Partial<Record<Slug, number>> = {}
  const count = (collection: Slug) => (created[collection] = (created[collection] ?? 0) + 1)

  const locationIds = new Map<string, number>()
  for (const location of data.locations) {
    let id = await findId(payload, 'lokasjoner', { code: { equals: location.code } })
    if (!id) {
      id = (await payload.create({ collection: 'lokasjoner', data: location })).id
      count('lokasjoner')
    }
    locationIds.set(location.code, id)
  }

  const unitIds = new Map<string, number>()
  const newUnits: (typeof data.units)[number][] = []
  for (const unit of data.units) {
    let id = await findId(payload, 'enheter', { externalUnitId: { equals: unit.externalUnitId } })
    if (!id) {
      const { leader: _, parent, ...fields } = unit
      id = (
        await payload.create({
          collection: 'enheter',
          data: {
            ...fields,
            parent: parent ? unitIds.get(parent) : null,
          } as RequiredDataFromCollectionSlug<'enheter'>,
        })
      ).id
      newUnits.push(unit)
      count('enheter')
    }
    unitIds.set(unit.externalUnitId, id)
  }

  const personIds = new Map<string, number>()
  const newPeople: (typeof data.people)[number][] = []
  for (const person of data.people) {
    let id = await findId(payload, 'personer', {
      employeeNumber: { equals: person.employeeNumber },
    })
    if (!id) {
      const { unit, manager, ...fields } = person
      id = (
        await payload.create({
          collection: 'personer',
          data: {
            ...fields,
            email: `${person.externalId.toLowerCase()}@example.com`,
            location: locationIds.get(person.locationCode),
            externalUnitIds: [unit],
            units: [unitIds.get(unit)!],
            managerEmployeeNumber: manager,
          } as RequiredDataFromCollectionSlug<'personer'>,
        })
      ).id
      newPeople.push(person)
      count('personer')
    }
    personIds.set(person.employeeNumber, id)
  }

  // Managers and unit leaders, once everyone exists.
  for (const person of newPeople) {
    if (person.manager) {
      await payload.update({
        collection: 'personer',
        id: personIds.get(person.employeeNumber)!,
        data: { manager: personIds.get(person.manager) },
      })
    }
  }
  for (const unit of newUnits) {
    await payload.update({
      collection: 'enheter',
      id: unitIds.get(unit.externalUnitId)!,
      data: { leader: personIds.get(unit.leader) },
    })
  }

  const roleIds = new Map<string, number>()
  for (const role of data.roles) {
    let id = await findId(payload, 'roller', { name: { equals: role.name } })
    if (!id) {
      id = (await payload.create({ collection: 'roller', data: role })).id
      count('roller')
    }
    roleIds.set(role.name, id)
  }

  for (const { members, ...team } of data.teams) {
    let teamId = await findId(payload, 'team', { name: { equals: team.name } })
    if (!teamId) {
      teamId = (
        await payload.create({
          collection: 'team',
          data: team as RequiredDataFromCollectionSlug<'team'>,
        })
      ).id
      count('team')
    }
    for (const member of members) {
      const person = personIds.get(member.person)!
      const exists = await findId(payload, 'teammedlemskap', {
        team: { equals: teamId },
        person: { equals: person },
      })
      if (!exists) {
        await payload.create({
          collection: 'teammedlemskap',
          data: { team: teamId, person, roles: member.roles.map((name) => roleIds.get(name)!) },
        })
        count('teammedlemskap')
      }
    }
  }

  return created
}

// Deletes what the seed creates, matched on the same keys, and the
// memberships that point at seeded people from other teams.
const removeSeed = async (payload: Payload) => {
  const employeeNumbers = data.people.map((p) => p.employeeNumber)
  const deletes: [Slug, Where][] = [
    // Deleting a team deletes its memberships.
    ['team', { name: { in: data.teams.map((t) => t.name) } }],
    ['teammedlemskap', { 'person.employeeNumber': { in: employeeNumbers } }],
    ['roller', { name: { in: data.roles.map((r) => r.name) } }],
    ['personer', { employeeNumber: { in: employeeNumbers } }],
    ['enheter', { externalUnitId: { in: data.units.map((u) => u.externalUnitId) } }],
    ['lokasjoner', { code: { in: data.locations.map((l) => l.code) } }],
  ]
  for (const [collection, where] of deletes) {
    const { docs, errors } = await payload.delete({ collection, where })
    console.log(`Deleted ${docs.length} from ${collection}`)
    for (const { message } of errors) console.error(`  ${collection}: ${message}`)
  }
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed: NODE_ENV is production.')
  process.exit(1)
}

const payload = await getPayload({ config })
if (process.argv.includes('reset')) await removeSeed(payload)
const created = await seed(payload)

const summary = Object.entries(created).map(([collection, n]) => `${n} ${collection}`)
console.log(
  summary.length
    ? `Created ${summary.join(', ')}.`
    : 'Nothing to create; the test data is already there.',
)

await payload.destroy()
process.exit(0)
