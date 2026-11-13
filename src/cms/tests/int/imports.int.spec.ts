import { getPayload, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { parseCsv } from '@/imports/csv'
import { importEndpoints } from '@/imports/endpoints'
import { readPeopleFile } from '@/imports/people'
import { readUnitFile } from '@/imports/units'
import type { ImportRun, Person, Unit, User } from '@/payload-types'

// The imports from the authoritative source (NF-07, ADR-0003), from the
// files in docs/integrations to the units and people in ilag. They run in the
// test database (tests/helpers/database.ts), since they apply whole files.

let payload: Payload
let integration: User
let admin: User

const prefix = `int-imports-${Date.now()}`
const apiKey = `${prefix}-key`

const UNIT_HEADER = 'orgEnhet,Betegnelse på organisasjonsenh,Koststed,Avdeling,Seksjon,gruppe'
const UNITS = [
  UNIT_HEADER,
  '10008925,Digitaliseringsdirektoratet,1000,Digitaliseringsdirektoratet,Digitaliseringsdirektoratet,',
  '10003925,Kommunikasjon,1200,KOM,KOM,',
  '10014625,KOM – Gruppe Nett og innhold,1200,KOM,KNI,',
  '10002031,Fellesløsninger,7100,FEL,FEL,',
  '10003276,FEL - Utvikling,7120,FEL,FUT,',
  '10014302,FEL – Backend,7120,FEL,FUT,FBA',
  '10013301,BOD-ekstern,7200,BOD-ekstern,BEK,',
]

const PEOPLE_HEADER =
  '0000PERNR;0001BTRTL;0001ORGEH;0001PERSG;0001STELL;0002NACHN;0002VORNA;01050001USRID;01050010USRID_LONG;01059003USRID;01059004USRID;9999BEGDA;9999LEDER_PERNR;9999PLANS_TEKST'
const line = (p: Partial<Record<'pernr' | 'loc' | 'unit' | 'group' | 'last' | 'first' | 'sap' | 'email' | 'm1' | 'm2' | 'mgr' | 'title', string>>) =>
  [p.pernr, p.loc ?? 'LEI', p.unit, p.group ?? '1', '50001234', p.last ?? 'Nordmann', p.first ?? 'Kari', p.sap ?? `SAP${p.pernr}`, p.email ?? `${prefix}-${p.pernr}@example.com`, p.m1 ?? '', p.m2 ?? '', '01.03.2019', p.mgr ?? '', p.title ?? 'Seniorrådgiver'].join(';')
const PEOPLE = [
  PEOPLE_HEADER,
  line({ pernr: '4711', unit: '10008925', mgr: '4711', title: 'Direktør', m1: '+4791234567' }),
  line({ pernr: '4712', unit: '10002031', mgr: '4711', loc: 'OSL', m2: '+4799887766' }),
  line({ pernr: '4720', unit: '10014302', mgr: '4712', group: '8', first: 'Åse', last: 'Ødegård' }),
  line({ pernr: '4720', unit: '10014625', mgr: '4712', group: '8', first: 'Åse', last: 'Ødegård', title: 'Rådgiver' }),
  line({ pernr: '4730', unit: '10013301', mgr: '4799', group: '9' }),
]

const csv = (lines: string[]) => lines.join('\r\n') + '\r\n'

const [receiveUnits, unitStatus] = importEndpoints('units')
const [receivePeople] = importEndpoints('people')

const request = (body: string, user: User | null, type = 'text/csv; charset=utf-8', routeParams = {}) =>
  ({
    payload,
    user,
    headers: new Headers({ 'content-type': type }),
    text: async () => body,
    routeParams,
  }) as unknown as PayloadRequest

const runJobs = () => payload.jobs.run({ queue: 'imports' })
const findRun = (id: number) => payload.findByID({ collection: 'importkjoringer', id }) as Promise<ImportRun>
const unitByExternalId = async (externalUnitId: string) =>
  (await payload.find({ collection: 'enheter', where: { externalUnitId: { equals: externalUnitId } }, depth: 0 }))
    .docs[0] as Unit | undefined
const personByNumber = async (employeeNumber: string) =>
  (await payload.find({ collection: 'personer', where: { employeeNumber: { equals: employeeNumber } }, depth: 0 }))
    .docs[0] as Person | undefined

describe('CSV files', () => {
  it('reads a byte order mark, a #TYPE line, quotes and semicolons, with the sender\'s line numbers', () => {
    const file = parseCsv('﻿#TYPE System.Object\r\n"a";"b"\r\n"1;2";"say ""hi"""\r\n\r\n3;4\r\n')
    expect(file.header).toEqual(['a', 'b'])
    expect(file.headerLine).toBe(2)
    expect(file.rows).toEqual([
      { line: 3, values: ['1;2', 'say "hi"'] },
      { line: 5, values: ['3', '4'] },
    ])
  })

  it('detects a comma as separator', () => {
    expect(parseCsv('a,b\n1,2').rows[0]!.values).toEqual(['1', '2'])
  })
})

describe('The unit file', () => {
  it('LO-01: works out level, code and parent from the codes, and skips BOD-ekstern', () => {
    const file = readUnitFile(csv(UNITS))
    if ('errors' in file) throw new Error(JSON.stringify(file.errors))
    const byId = Object.fromEntries(file.units.map((u) => [u.externalUnitId, u]))

    expect(byId['10008925']).toMatchObject({ level: 'directorate', code: null, parentId: null })
    expect(byId['10002031']).toMatchObject({ level: 'division', code: 'FEL', parentId: '10008925' })
    expect(byId['10003276']).toMatchObject({ level: 'department', code: 'FUT', parentId: '10002031' })
    expect(byId['10014302']).toMatchObject({ level: 'section', code: 'FBA', parentId: '10003276' })
    expect(byId['10014625']).toMatchObject({ level: 'department', code: 'KNI', parentId: '10003925' })
    expect(byId['10013301']).toBeUndefined()
    expect(file.skipped).toEqual(['10013301'])
  })

  it('LO-01: gives KOM the level support and TUU the level authority, with their units under them as under a division', () => {
    const file = readUnitFile(
      csv([
        ...UNITS,
        '10004805,Tilsyn for universell utforming av IKT,1300,TUU,TUU,',
        '10011800,TUU- seksjon for tilsyn,1310,TUU,TUS,',
      ]),
    )
    if ('errors' in file) throw new Error(JSON.stringify(file.errors))
    const byId = Object.fromEntries(file.units.map((u) => [u.externalUnitId, u]))

    expect(byId['10003925']).toMatchObject({ level: 'support', code: 'KOM', parentId: '10008925' })
    expect(byId['10014625']).toMatchObject({ level: 'department', parentId: '10003925' })
    expect(byId['10004805']).toMatchObject({ level: 'authority', code: 'TUU', parentId: '10008925' })
    expect(byId['10011800']).toMatchObject({ level: 'department', code: 'TUS', parentId: '10004805' })
  })

  it('refuses a file with errors, listing all of them with their lines', () => {
    const file = readUnitFile(
      csv([
        UNIT_HEADER,
        '10002031,Fellesløsninger,7100,FEL,FEL,',
        '10002031,Fellesløsninger igjen,7100,FEL,FEL,',
        '10003276,FEL - Utvikling,7120,FELL,FUT,',
        '10014302,FEL – Backend,7120,FEL,FUX,FBA',
        '10014303,,7120,FEL,FUT,FFR',
      ]),
    )
    expect('errors' in file && file.errors).toEqual([
      { line: 1, column: 'orgEnhet', message: 'The directorate, «10008925», is not in the file' },
      { line: 3, column: 'orgEnhet', message: '«10002031» is already on line 2' },
      { line: 4, column: 'Avdeling', message: 'No division in the file has the code «FELL»' },
      { line: 5, column: 'Seksjon', message: 'No department in the file has the codes «FEL» and «FUX»' },
      { line: 6, column: 'Betegnelse på organisasjonsenh', message: '«Betegnelse på organisasjonsenh» is empty' },
    ])
  })

  it('refuses a file without a required column', () => {
    const file = readUnitFile('orgEnhet,Avdeling,Seksjon\n10008925,D,D\n')
    expect('errors' in file && file.errors).toEqual([
      { line: 1, column: 'Betegnelse på organisasjonsenh', message: 'The column «Betegnelse på organisasjonsenh» is missing' },
    ])
  })
})

describe('The people file', () => {
  it('FO-02: gathers a person\'s units from their lines, and takes the rest from the first line', () => {
    const file = readPeopleFile(csv(PEOPLE))
    if ('errors' in file) throw new Error(JSON.stringify(file.errors))
    const byNumber = Object.fromEntries(file.people.map((p) => [p.employeeNumber, p]))

    expect(file.rows).toBe(5)
    expect(file.people).toHaveLength(4)
    expect(byNumber['4711']).toMatchObject({ managerEmployeeNumber: null, isEmployee: true, mobile: '+4791234567' })
    expect(byNumber['4712']).toMatchObject({ managerEmployeeNumber: '4711', locationCode: 'OSL', mobile: '+4799887766' })
    expect(byNumber['4720']).toMatchObject({
      externalUnitIds: ['10014302', '10014625'],
      isEmployee: false,
      title: 'Seniorrådgiver',
      firstName: 'Åse',
    })
    expect(byNumber['4730']!.externalUnitIds).toEqual([])
    expect(file.differingLines).toEqual(['4720'])
  })

  it('refuses a repeated person and unit, unknown employee groups, bad emails and shared IDs', () => {
    const file = readPeopleFile(
      csv([
        PEOPLE_HEADER,
        line({ pernr: '1', unit: '10002031' }),
        line({ pernr: '1', unit: '10002031' }),
        line({ pernr: '2', unit: '10002031', group: '5' }),
        line({ pernr: '3', unit: '10002031', email: 'kari.nordmann' }),
        line({ pernr: '4', unit: '10002031', sap: 'SAP1' }),
        line({ pernr: '5', unit: '10002031', email: `${prefix}-1@EXAMPLE.com` }),
      ]),
    )
    expect('errors' in file && file.errors).toEqual([
      { line: 3, column: '0001ORGEH', message: '«1» is already in unit «10002031» on line 2' },
      { line: 4, column: '0001PERSG', message: '«5» is not 1, 4, 8 or 9' },
      { line: 5, column: '01050010USRID_LONG', message: '«kari.nordmann» is not a valid email' },
      { line: 6, column: '01050001USRID', message: '«SAP1» already belongs to employee number «1»' },
      { line: 7, column: '01050010USRID_LONG', message: `«${prefix}-1@example.com» already belongs to employee number «1»` },
    ])
  })
})

describe('The import endpoints and jobs', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-admin@example.com`, password: 'test-password', roles: ['admin'] },
    })
    await payload.create({
      collection: 'brukere',
      data: {
        email: `${prefix}-integration@example.com`,
        password: 'test-password',
        roles: ['integration'],
        enableAPIKey: true,
        apiKey,
      },
    })
    const { user } = await payload.auth({ headers: new Headers({ Authorization: `brukere API-Key ${apiKey}` }) })
    integration = user as User
    await payload.create({ collection: 'lokasjoner', data: { code: 'LEI', name: 'Leikanger' } })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'personer', where: { id: { exists: true } } })
    for (const level of ['section', 'department', 'support', 'authority', 'division', 'directorate'] as const) {
      await payload.delete({ collection: 'enheter', where: { level: { equals: level } } })
    }
    await payload.delete({ collection: 'lokasjoner', where: { code: { in: ['LEI', 'OSL'] } } })
    await payload.delete({ collection: 'importkjoringer', where: { id: { exists: true } } })
    await payload.delete({ collection: 'payload-jobs', where: { id: { exists: true } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('NF-07: lets the integration user in with its API key, and nowhere else', async () => {
    expect(integration?.roles).toEqual(['integration'])

    await expect(
      payload.find({ collection: 'personer', overrideAccess: false, user: integration }),
    ).rejects.toThrow()
    await expect(payload.find({ collection: 'enheter', overrideAccess: false, user: integration })).rejects.toThrow()
    await expect(
      payload.login({ collection: 'brukere', data: { email: integration.email, password: 'test-password' } }),
    ).rejects.toThrow()
  })

  it('refuses callers other than the integration user, and bodies that aren\'t CSV', async () => {
    expect((await receiveUnits!.handler(request(csv(UNITS), null))).status).toBe(401)
    expect((await receiveUnits!.handler(request(csv(UNITS), admin))).status).toBe(403)
    expect((await receiveUnits!.handler(request(csv(UNITS), integration, 'application/json'))).status).toBe(415)
    expect((await receiveUnits!.handler(request('x'.repeat(5 * 1024 * 1024 + 1), integration))).status).toBe(413)
  })

  it('answers 400 with every error, and queues nothing', async () => {
    const res = await receiveUnits!.handler(request(csv([UNIT_HEADER, '10002031,FEL,7100,FEL,FEL,']), integration))
    expect(res.status).toBe(400)
    expect((await res.json()).errors).toHaveLength(1)
    expect((await payload.count({ collection: 'importkjoringer' })).totalDocs).toBe(0)
  })

  it('ADR-0003: applies people before units, and links them when the units arrive', async () => {
    const res = await receivePeople!.handler(request(csv(PEOPLE), integration))
    expect(res.status).toBe(202)
    const accepted = await res.json()
    expect(accepted).toMatchObject({ status: 'queued', rows: 5, people: 4 })
    expect(accepted.statusUrl).toMatch(new RegExp(`/api/personer/import/${accepted.importRunId}$`))

    await runJobs()
    const run = await findRun(accepted.importRunId)
    expect(run.status).toBe('succeeded')
    expect(run.result).toMatchObject({
      created: 4,
      updated: 0,
      deactivated: 0,
      unknownLocations: ['OSL'],
      unknownManagers: ['4799'],
      differingLines: ['4720'],
    })
    expect((run.result as { unknownUnits: string[] }).unknownUnits.sort()).toEqual(['10002031', '10008925', '10014302', '10014625'])

    const kari = await personByNumber('4711')
    const ola = await personByNumber('4712')
    expect(kari).toMatchObject({ manager: null, units: [], isEmployee: true, active: true, fullName: 'Kari Nordmann' })
    expect(ola!.manager).toBe(kari!.id)

    const unitRes = await receiveUnits!.handler(request(csv(UNITS), integration))
    expect(unitRes.status).toBe(202)
    const unitRun = await unitRes.json()
    await runJobs()
    expect((await findRun(unitRun.importRunId)).result).toEqual({
      created: 6,
      updated: 0,
      deactivated: 0,
      skipped: ['10013301'],
    })

    const fel = await unitByExternalId('10002031')
    const fut = await unitByExternalId('10003276')
    const directorate = await unitByExternalId('10008925')
    expect(fel).toMatchObject({ level: 'division', code: 'FEL', parent: directorate!.id, active: true })
    expect(fut!.parent).toBe(fel!.id)

    const ase = await personByNumber('4720')
    expect(ase!.units).toEqual([(await unitByExternalId('10014302'))!.id, (await unitByExternalId('10014625'))!.id])
    expect((await personByNumber('4712'))!.units).toEqual([fel!.id])
    expect((await personByNumber('4730'))!.units).toEqual([])
  })

  it('ADR-0003: links a location registered after the people file at the next import', async () => {
    const oslo = await payload.create({ collection: 'lokasjoner', data: { code: 'OSL', name: 'Oslo' } })
    await receiveUnits!.handler(request(csv(UNITS), integration))
    await runJobs()
    expect((await personByNumber('4712'))!.location).toBe(oslo.id)
  })

  it('reports the status of a run to its sender', async () => {
    const { docs } = await payload.find({ collection: 'importkjoringer', where: { kind: { equals: 'units' } }, limit: 1 })
    const res = await unitStatus!.handler(request('', integration, 'text/plain', { id: String(docs[0]!.id) }))
    expect(await res.json()).toMatchObject({ status: 'succeeded', result: { created: expect.any(Number) } })

    const people = await payload.find({ collection: 'importkjoringer', where: { kind: { equals: 'people' } }, limit: 1 })
    const wrongKind = await unitStatus!.handler(request('', integration, 'text/plain', { id: String(people.docs[0]!.id) }))
    expect(wrongKind.status).toBe(404)
  })

  it('NF-07: marks people missing from the file as left, and brings back someone who returns', async () => {
    const without = PEOPLE.filter((l) => !l.startsWith('4730;'))
    await receivePeople!.handler(request(csv(without), integration))
    await runJobs()
    expect((await personByNumber('4730'))!.active).toBe(false)

    const back = await receivePeople!.handler(request(csv(PEOPLE.map((l) => l.replace('SAP4730', 'SAP4730-NY'))), integration))
    await runJobs()
    const run = await findRun((await back.json()).importRunId)
    expect(run.result).toMatchObject({ created: 0, updated: 4 })
    expect(await personByNumber('4730')).toMatchObject({ active: true, externalId: 'SAP4730-NY' })
  })

  it('replaces a queued file with a newer one', async () => {
    const first = await (await receiveUnits!.handler(request(csv(UNITS), integration))).json()
    const second = await (await receiveUnits!.handler(request(csv(UNITS), integration))).json()
    await runJobs()
    expect((await findRun(first.importRunId)).status).toBe('superseded')
    expect((await findRun(second.importRunId)).status).toBe('succeeded')
  })

  it('ADR-0003: changes nothing when applying a file fails halfway', async () => {
    // Valid in itself, but 4801 takes the SAP user ID of 4730, who is still in
    // ilag, so the database refuses it after the others are updated.
    const failing = [
      ...PEOPLE.filter((l) => !l.startsWith('4730;')).map((l) => l.replace('Seniorrådgiver', 'Endret')),
      line({ pernr: '4801', unit: '10002031', sap: 'SAP4730-NY' }),
    ]
    const res = await receivePeople!.handler(request(csv(failing), integration))
    await runJobs()

    const run = await findRun((await res.json()).importRunId)
    expect(run.status).toBe('failed')
    expect(run.error).toBeTruthy()
    expect((await personByNumber('4712'))!.title).toBe('Seniorrådgiver')
    expect((await personByNumber('4730'))!.active).toBe(true)
    expect(await personByNumber('4801')).toBeUndefined()

    // The newer file replaces it before it is tried again.
    await receivePeople!.handler(request(csv(PEOPLE), integration))
    await runJobs()
    expect((await findRun(run.id)).status).toBe('superseded')
  })

  it('LO-06: keeps a unit\'s marking as advising all of Digdir when the units are imported again', async () => {
    const backend = (await unitByExternalId('10014302'))!
    await payload.update({ collection: 'enheter', id: backend.id, data: { advisesAllOfDigdir: true } })

    const res = await receiveUnits!.handler(request(csv(UNITS), integration))
    const { importRunId } = await res.json()
    await runJobs()

    expect((await findRun(importRunId)).status).toBe('succeeded')
    expect((await unitByExternalId('10014302'))!.advisesAllOfDigdir).toBe(true)
  })

  it('ADR-0003: holds a file with under half the active units until an administrator confirms it', async () => {
    const res = await receiveUnits!.handler(request(csv(UNITS.slice(0, 3)), integration))
    const held = await res.json()
    expect(held.status).toBe('held')
    await runJobs()
    expect((await findRun(held.importRunId)).status).toBe('held')
    expect((await unitByExternalId('10002031'))!.active).toBe(true)

    await expect(
      payload.update({
        collection: 'importkjoringer',
        id: held.importRunId,
        data: { status: 'succeeded' },
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow()

    await payload.update({
      collection: 'importkjoringer',
      id: held.importRunId,
      data: { status: 'queued' },
      overrideAccess: false,
      user: admin,
    })
    await runJobs()
    const run = await findRun(held.importRunId)
    expect(run).toMatchObject({ status: 'succeeded', confirmedBy: expect.anything() })
    expect(run.result).toMatchObject({ deactivated: 4 })
    expect((await unitByExternalId('10002031'))!.active).toBe(false)
  })

  it('removes people files after 90 days, and keeps unit files', async () => {
    const old = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString()
    await payload.update({ collection: 'importkjoringer', where: { id: { exists: true } }, data: { createdAt: old } })
    await payload.jobs.queue({ task: 'removeOldPeopleFiles', input: {}, queue: 'imports' })
    await runJobs()

    const { docs } = await payload.find({ collection: 'importkjoringer', pagination: false })
    for (const run of docs) {
      if (run.kind === 'people') expect(run).toMatchObject({ file: null, fileRemovedAt: expect.any(String) })
      else expect(run.file).toBeTruthy()
    }
  })
})
