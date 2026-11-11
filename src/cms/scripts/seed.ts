import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type Payload, type RequiredDataFromCollectionSlug, type Where } from 'payload'
import config from '@payload-config'

import type { ImportError } from '../src/imports/csv'
import { readPeopleFile } from '../src/imports/people'
import { runImport } from '../src/imports/run'
import { readUnitFile } from '../src/imports/units'
import * as data from './seed-data'

// Fills the database with test data: `pnpm db:seed`. Units and people come
// from the files in seed-files/ and go through the import, as Ansattmottak's
// files do; the rest is in seed-data.ts. Records that already exist are left
// as they are, except that the files are imported again: each import is a
// full snapshot, so units and people not in the files are marked inactive.
// `pnpm db:seed:reset` first deletes what the seed creates, then creates it
// again, and `pnpm db:seed:clear` only deletes it. They pass `reset` and
// `clear` without dashes, since `payload run` only hands the script arguments
// that aren't flags.

type Slug =
  | 'brukere'
  | 'lokasjoner'
  | 'enheter'
  | 'personer'
  | 'roller'
  | 'teamtyper'
  | 'team'
  | 'teammedlemskap'

// An administrator to log in to the admin panel with.
const ADMIN = { email: 'admin@example.com', password: 'ilag' }

const dirname = path.dirname(fileURLToPath(import.meta.url))
const file = (name: string) => readFileSync(path.join(dirname, 'seed-files', name), 'utf-8')

// Stops the seed if a file has errors, which the import would refuse.
const valid = <F extends object>(name: string, read: { errors: ImportError[] } | F): F => {
  if (!('errors' in read)) return read
  console.error(`seed-files/${name} has errors:`)
  for (const { line, column, message } of read.errors) console.error(`  line ${line}, ${column}: ${message}`)
  process.exit(1)
}

const readFiles = () => ({
  units: valid('enheter.csv', readUnitFile(file('enheter.csv'))),
  people: valid('personer.csv', readPeopleFile(file('personer.csv'))),
})

const findId = async (payload: Payload, collection: Slug, where: Where) => {
  const { docs } = await payload.find({ collection, where, limit: 1, depth: 0 })
  return docs[0]?.id
}

// Creates an import run for a file and applies it, the way the import job
// does, so the run shows in the admin panel.
const importFile = async (payload: Payload, kind: 'units' | 'people', text: string, rows: number, count: number, sender: number) => {
  const collection = kind === 'units' ? 'enheter' : 'personer'
  const { totalDocs: activeBefore } = await payload.count({ collection, where: { active: { equals: true } } })
  const run = await payload.create({
    collection: 'importkjoringer',
    data: { kind, status: 'queued', sender, rows, count, activeBefore, file: text },
    context: { importInternal: true },
  })
  await runImport(payload, run.id)
  const done = await payload.findByID({ collection: 'importkjoringer', id: run.id, depth: 0 })
  console.log(`Imported ${collection}: ${JSON.stringify(done.result)}`)
}

const seed = async (payload: Payload) => {
  const files = readFiles()
  const created: Partial<Record<Slug, number>> = {}
  const count = (collection: Slug) => (created[collection] = (created[collection] ?? 0) + 1)

  let adminId = await findId(payload, 'brukere', { email: { equals: ADMIN.email } })
  if (!adminId) {
    adminId = (await payload.create({ collection: 'brukere', data: { ...ADMIN, roles: ['admin'] } })).id
    count('brukere')
  }

  for (const location of data.locations) {
    if (!(await findId(payload, 'lokasjoner', { code: { equals: location.code } }))) {
      await payload.create({ collection: 'lokasjoner', data: location })
      count('lokasjoner')
    }
  }

  await importFile(payload, 'units', file('enheter.csv'), files.units.rows, files.units.units.length, adminId)
  await importFile(payload, 'people', file('personer.csv'), files.people.rows, files.people.people.length, adminId)

  const personIds = new Map<string, number>()
  const { docs: people } = await payload.find({
    collection: 'personer',
    where: { employeeNumber: { in: files.people.people.map((p) => p.employeeNumber) } },
    pagination: false,
    depth: 0,
  })
  for (const person of people) personIds.set(person.employeeNumber, person.id)

  // Unit leaders, which the file doesn't have. Leaders set by hand are kept.
  for (const { unit, person } of data.leaders) {
    const { docs } = await payload.find({
      collection: 'enheter',
      where: { externalUnitId: { equals: unit } },
      limit: 1,
      depth: 0,
    })
    if (docs[0] && !docs[0].leader) {
      await payload.update({ collection: 'enheter', id: docs[0].id, data: { leader: personIds.get(person) } })
    }
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

  const teamTypeIds = new Map<string, number>()
  for (const teamType of data.teamTypes) {
    let id = await findId(payload, 'teamtyper', { name: { equals: teamType.name } })
    if (!id) {
      id = (await payload.create({ collection: 'teamtyper', data: teamType })).id
      count('teamtyper')
    }
    teamTypeIds.set(teamType.name, id)
  }

  for (const { members, teamType, ...team } of data.teams) {
    let teamId = await findId(payload, 'team', { name: { equals: team.name } })
    if (!teamId) {
      teamId = (
        await payload.create({
          collection: 'team',
          data: {
            ...team,
            teamType: teamTypeIds.get(teamType)!,
          } as RequiredDataFromCollectionSlug<'team'>,
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

// Deletes what the seed creates, matched on the same keys: the memberships
// that point at seeded people from other teams, the import runs the seed's
// administrator sent, and the administrator.
const removeSeed = async (payload: Payload) => {
  const files = readFiles()
  const employeeNumbers = files.people.people.map((p) => p.employeeNumber)
  const unitIds = files.units.units.map((u) => u.externalUnitId)
  const deletes: [Slug | 'importkjoringer', Where][] = [
    // Deleting a team deletes its memberships.
    ['team', { name: { in: data.teams.map((t) => t.name) } }],
    ['teammedlemskap', { 'person.employeeNumber': { in: employeeNumbers } }],
    ['roller', { name: { in: data.roles.map((r) => r.name) } }],
    ['teamtyper', { name: { in: data.teamTypes.map((t) => t.name) } }],
    ['personer', { employeeNumber: { in: employeeNumbers } }],
    // Children before parents, so no unit is left pointing at a deleted one.
    ...(['section', 'department', 'division', 'directorate'] as const).map(
      (level): [Slug, Where] => ['enheter', { externalUnitId: { in: unitIds }, level: { equals: level } }],
    ),
    ['lokasjoner', { code: { in: data.locations.map((l) => l.code) } }],
    ['importkjoringer', { 'sender.email': { equals: ADMIN.email } }],
    ['brukere', { email: { equals: ADMIN.email } }],
  ]
  for (const [collection, where] of deletes) {
    const { docs, errors } = await payload.delete({ collection, where })
    if (docs.length) console.log(`Deleted ${docs.length} from ${collection}`)
    for (const { message } of errors) console.error(`  ${collection}: ${message}`)
  }
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed: NODE_ENV is production.')
  process.exit(1)
}

const payload = await getPayload({ config })
const command = process.argv[2]

if (command === 'reset' || command === 'clear') await removeSeed(payload)

if (command !== 'clear') {
  const created = await seed(payload)
  const summary = Object.entries(created).map(([collection, n]) => `${n} ${collection}`)
  console.log(summary.length ? `Created ${summary.join(', ')}.` : 'Nothing else to create; the test data is already there.')
  console.log(`Log in to the admin panel as ${ADMIN.email} with the password «${ADMIN.password}».`)
}

await payload.destroy()
process.exit(0)
