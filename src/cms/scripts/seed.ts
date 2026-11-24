import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload, type CollectionSlug, type Payload, type RequiredDataFromCollectionSlug, type Where } from 'payload'
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

const findId = async (payload: Payload, collection: CollectionSlug, where: Where) => {
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
  const created: Partial<Record<CollectionSlug, number>> = {}
  const count = (collection: CollectionSlug) => (created[collection] = (created[collection] ?? 0) + 1)

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

  // Unit descriptions, which the file doesn't have either. Descriptions set by
  // hand are kept.
  for (const { unit, description } of data.unitDescriptions) {
    const { docs } = await payload.find({
      collection: 'enheter',
      where: { externalUnitId: { equals: unit } },
      limit: 1,
      depth: 0,
    })
    if (docs[0] && !docs[0].description) {
      await payload.update({ collection: 'enheter', id: docs[0].id, data: { description } })
    }
  }

  // Units that advise all of Digdir, which the file doesn't have either.
  await payload.update({
    collection: 'enheter',
    where: { externalUnitId: { in: data.advisesAllOfDigdir } },
    data: { advisesAllOfDigdir: true },
    depth: 0,
  })

  const teamTypeIds = new Map<string, number>()
  for (const teamType of data.teamTypes) {
    let id = await findId(payload, 'teamtyper', { name: { equals: teamType.name } })
    if (!id) {
      id = (await payload.create({ collection: 'teamtyper', data: teamType })).id
      count('teamtyper')
    }
    teamTypeIds.set(teamType.name, id)
  }

  // The team type wizard's questions, leaves first, so each answer's
  // question exists when it is created.
  const questionIds = new Map<string, number>()
  for (const { key, answers, ...question } of data.wizardQuestions) {
    let id = await findId(payload, 'teamtype-veiviser', { title: { equals: question.title } })
    if (!id) {
      const data = {
        ...question,
        answers: answers.map(({ to, ...answer }) => ({
          ...answer,
          leadsTo: !to
            ? null
            : 'question' in to
              ? { relationTo: 'teamtype-veiviser' as const, value: questionIds.get(to.question)! }
              : { relationTo: 'teamtyper' as const, value: teamTypeIds.get(to.teamType)! },
        })),
      }
      id = (await payload.create({ collection: 'teamtype-veiviser', data })).id
      count('teamtype-veiviser')
    }
    questionIds.set(key, id)
  }

  const roleIds = new Map<string, number>()
  for (const role of data.roles) {
    let id = await findId(payload, 'roller', { code: { equals: role.code } })
    // A role seeded before roles had codes gets its code.
    const uncoded = !id && (await findId(payload, 'roller', { name: { equals: role.name }, code: { exists: false } }))
    if (uncoded) {
      await payload.update({ collection: 'roller', id: uncoded, data: { code: role.code } })
      id = uncoded
    }
    if (!id) {
      const { teamTypes, ...fields } = role
      id = (
        await payload.create({
          collection: 'roller',
          data: { ...fields, teamTypes: teamTypes.map((name) => teamTypeIds.get(name)!) },
        })
      ).id
      count('roller')
    }
    roleIds.set(role.name, id)
  }

  const toolIds = new Map<string, number>()
  for (const { teamTypes, ...tool } of data.tools) {
    let id = await findId(payload, 'verktoy', { name: { equals: tool.name } })
    if (!id) {
      id = (
        await payload.create({
          collection: 'verktoy',
          data: {
            ...tool,
            resources: tool.resources.map((resource) => ({ ...resource })),
            teamTypes: teamTypes.map((name) => teamTypeIds.get(name)!),
          },
        })
      ).id
      count('verktoy')
    }
    toolIds.set(tool.name, id)
  }

  for (const principle of data.principles) {
    if (!(await findId(payload, 'prinsipper', { title: { equals: principle.title } }))) {
      await payload.create({ collection: 'prinsipper', data: { ...principle } })
      count('prinsipper')
    }
  }

  for (const concept of data.concepts) {
    if (!(await findId(payload, 'begreper', { name: { equals: concept.name } }))) {
      await payload.create({ collection: 'begreper', data: { ...concept, variants: [...concept.variants] } })
      count('begreper')
    }
  }

  for (const { members, teamType, tools, ...team } of data.teams) {
    let teamId = await findId(payload, 'team', { name: { equals: team.name } })
    if (!teamId) {
      teamId = (
        await payload.create({
          collection: 'team',
          data: {
            ...team,
            teamType: teamTypeIds.get(teamType)!,
            tools: tools.map((name) => toolIds.get(name)!),
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

  // Mandates, made through drafts and approval like in the admin panel. A
  // team or unit that already has a mandate keeps it.
  for (const { team, unit, approvedAt, draft, ...fields } of data.mandates) {
    const ownerId = team
      ? await findId(payload, 'team', { name: { equals: team } })
      : await findId(payload, 'enheter', { externalUnitId: { equals: unit } })
    if (!ownerId) continue
    const owner = team ? { team: ownerId } : { unit: ownerId }
    if (await findId(payload, 'mandater', team ? { team: { equals: ownerId } } : { unit: { equals: ownerId } })) continue
    const mandate = await payload.create({
      collection: 'mandater',
      data: { ...owner, ...fields } as RequiredDataFromCollectionSlug<'mandater'>,
      draft: true,
    })
    if (approvedAt) {
      await payload.update({
        collection: 'mandater',
        id: mandate.id,
        data: { _status: 'published', approvedAt: new Date(approvedAt).toISOString() },
      })
    }
    if (draft) {
      await payload.update({ collection: 'mandater', id: mandate.id, data: draft, draft: true })
    }
    count('mandater')
  }

  // Users for some of the people, to try the admin panel as a team editor or
  // as someone who may not edit, linked the way an Entra ID login links them.
  for (const { person, email } of data.users) {
    if (!(await findId(payload, 'brukere', { email: { equals: email } }))) {
      await payload.create({
        collection: 'brukere',
        data: { email, password: ADMIN.password, person: personIds.get(person) },
      })
      count('brukere')
    }
  }

  // Sent as the reporter, so the collection's hook stores them as it does for
  // anyone who may be contacted.
  for (const item of data.feedback) {
    if (await findId(payload, 'tilbakemeldinger', { text: { equals: item.text } })) continue
    const team = 'team' in item ? await findId(payload, 'team', { name: { equals: item.team } }) : undefined
    const unit =
      'unit' in item ? await findId(payload, 'enheter', { externalUnitId: { equals: item.unit } }) : undefined
    const page = team ? `/organisering/team/${team}` : unit ? `/organisering/linjeorganisasjon/${unit}` : 'page' in item ? item.page : undefined
    const reporter =
      'reporter' in item
        ? (await payload.find({ collection: 'brukere', where: { email: { equals: item.reporter } } })).docs[0]
        : undefined
    const { id } = await payload.create({
      collection: 'tilbakemeldinger',
      data: { category: item.category, text: item.text, status: 'ny', page: page!, team, unit, contactMe: Boolean(reporter) },
      user: reporter ? { ...reporter, collection: 'brukere' } : undefined,
    })
    if (item.status !== 'ny') await payload.update({ collection: 'tilbakemeldinger', id, data: { status: item.status } })
    count('tilbakemeldinger')
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
  const deletes: [CollectionSlug, Where][] = [
    ['tilbakemeldinger', { text: { in: data.feedback.map((f) => f.text) } }],
    // Deleting a team deletes its memberships and its mandate.
    ['team', { name: { in: data.teams.map((t) => t.name) } }],
    ['mandater', { 'unit.externalUnitId': { in: unitIds } }],
    ['teammedlemskap', { 'person.employeeNumber': { in: employeeNumbers } }],
    ['verktoy', { name: { in: data.tools.map((t) => t.name) } }],
    ['prinsipper', { title: { in: data.principles.map((p) => p.title) } }],
    ['begreper', { name: { in: data.concepts.map((c) => c.name) } }],
    ['roller', { code: { in: data.roles.map((r) => r.code) } }],
    ['teamtype-veiviser', { title: { in: data.wizardQuestions.map((q) => q.title) } }],
    ['teamtyper', { name: { in: data.teamTypes.map((t) => t.name) } }],
    ['personer', { employeeNumber: { in: employeeNumbers } }],
    // Children before parents, so no unit is left pointing at a deleted one.
    ...(['section', 'department', 'support', 'authority', 'division', 'directorate'] as const).map(
      (level): [CollectionSlug, Where] => ['enheter', { externalUnitId: { in: unitIds }, level: { equals: level } }],
    ),
    ['lokasjoner', { code: { in: data.locations.map((l) => l.code) } }],
    ['importkjoringer', { 'sender.email': { equals: ADMIN.email } }],
    ['brukere', { email: { in: [ADMIN.email, ...data.users.map((u) => u.email)] } }],
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
  for (const { email, description } of data.users) console.log(`  ${email}: ${description}, same password.`)
}

await payload.destroy()
process.exit(0)
