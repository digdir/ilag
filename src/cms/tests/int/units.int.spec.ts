import { getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Location, Person, Unit, User } from '@/payload-types'

let payload: Payload
let user: User
let admin: User
let location: Location

// Prefix for every test row, so cleanup never touches other data.
const prefix = `int-units-${Date.now()}`

const unit = (n: number, extra: Partial<Unit> = {}) =>
  ({
    externalUnitId: `${prefix}-unit-${n}`,
    name: `Enhet ${n}`,
    level: 'division',
    ...extra,
  }) as RequiredDataFromCollectionSlug<'enheter'>

const person = (n: number, extra: Partial<Person> = {}) =>
  ({
    firstName: 'Kari',
    lastName: `Nordmann ${n}`,
    email: `${prefix}-${n}@example.com`,
    externalId: `${prefix}-person-${n}`,
    employeeNumber: `${prefix}-${n}`,
    locationCode: location.code,
    ...extra,
  }) as RequiredDataFromCollectionSlug<'personer'>

const ids = (docs: (number | { id: number })[] | undefined) =>
  (docs ?? []).map((d) => (typeof d === 'object' ? d.id : d))

describe('Units', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Created first, so the first-user rule never makes `user` an administrator.
    admin = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-admin@example.com`, password: 'test-password', roles: ['admin'] },
    })
    user = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}@example.com`, password: 'test-password' },
    })
    location = await payload.create({
      collection: 'lokasjoner',
      data: { code: `${prefix}-LEI`, name: 'Leikanger' },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    // Children before parents, so no unit is left pointing at a deleted one.
    for (const level of ['section', 'department', 'support', 'authority', 'division', 'directorate'] as const) {
      await payload.delete({
        collection: 'enheter',
        where: { externalUnitId: { like: prefix }, level: { equals: level } },
      })
    }
    await payload.delete({ collection: 'lokasjoner', where: { code: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('marks new units as active by default', async () => {
    const created = await payload.create({ collection: 'enheter', data: unit(1) })
    expect(created.active).toBe(true)
  })

  it('NF-07: rejects a duplicate externalUnitId', async () => {
    await payload.create({ collection: 'enheter', data: unit(2) })
    await expect(
      payload.create({ collection: 'enheter', data: unit(3, { externalUnitId: `${prefix}-unit-2` }) }),
    ).rejects.toThrow()
  })

  it('LO-01: requires a known level', async () => {
    await expect(
      payload.create({ collection: 'enheter', data: unit(4, { level: undefined }) }),
    ).rejects.toThrow()
    await expect(
      payload.create({ collection: 'enheter', data: unit(5, { level: 'team' as Unit['level'] }) }),
    ).rejects.toThrow()
  })

  it('LO-01: builds the hierarchy from parents and lists each unit\'s sub-units', async () => {
    const directorate = await payload.create({ collection: 'enheter', data: unit(16, { level: 'directorate' }) })
    const division = await payload.create({ collection: 'enheter', data: unit(6, { parent: directorate.id }) })
    const department = await payload.create({
      collection: 'enheter',
      data: unit(7, { level: 'department', parent: division.id }),
    })
    const sections = await Promise.all(
      [8, 9].map((n) =>
        payload.create({ collection: 'enheter', data: unit(n, { level: 'section', parent: department.id }) }),
      ),
    )

    const read = await payload.findByID({ collection: 'enheter', id: department.id, depth: 1 })
    expect((read.parent as Unit).id).toBe(division.id)
    expect(ids(read.children?.docs as never).sort()).toEqual(sections.map((s) => s.id).sort())

    const top = await payload.findByID({ collection: 'enheter', id: directorate.id })
    expect(top.parent).toBeFalsy()
    expect(ids(top.children?.docs as never)).toEqual([division.id])
  })

  it('LO-02: links the leader and lists the people in a unit', async () => {
    const leader = await payload.create({ collection: 'personer', data: person(1) })
    const led = await payload.create({ collection: 'enheter', data: unit(10, { leader: leader.id }) })
    const member = await payload.create({
      collection: 'personer',
      data: person(2, { externalUnitIds: [led.externalUnitId], units: [led.id] }),
    })

    const read = await payload.findByID({ collection: 'enheter', id: led.id, depth: 1 })
    expect((read.leader as Person).id).toBe(leader.id)
    expect(ids(read.people?.docs as never)).toEqual([member.id])
  })

  it('FO-02: lets a person belong to more than one unit', async () => {
    const [a, b] = await Promise.all(
      [11, 12].map((n) => payload.create({ collection: 'enheter', data: unit(n) })),
    )
    const member = await payload.create({
      collection: 'personer',
      data: person(3, { externalUnitIds: [a!.externalUnitId, b!.externalUnitId], units: [a!.id, b!.id] }),
      depth: 1,
    })

    expect((member.units as Unit[]).map((u) => u.name).sort()).toEqual(['Enhet 11', 'Enhet 12'])
    for (const u of [a!, b!]) {
      const read = await payload.findByID({ collection: 'enheter', id: u.id })
      expect(ids(read.people?.docs as never)).toContain(member.id)
    }
  })

  it('NF-07: lets signed-in users read units, but not anonymous users', async () => {
    await payload.create({ collection: 'enheter', data: unit(13) })
    const where = { externalUnitId: { equals: `${prefix}-unit-13` } }

    const signedIn = await payload.find({ collection: 'enheter', where, overrideAccess: false, user })
    expect(signedIn.docs).toHaveLength(1)

    await expect(payload.find({ collection: 'enheter', where, overrideAccess: false })).rejects.toThrow()
  })

  it('NF-07: only the import can create, delete or change units, not even an administrator', async () => {
    const created = await payload.create({ collection: 'enheter', data: unit(14) })

    await expect(
      payload.create({ collection: 'enheter', data: unit(15), overrideAccess: false, user: admin }),
    ).rejects.toThrow()
    await expect(
      payload.delete({ collection: 'enheter', id: created.id, overrideAccess: false, user: admin }),
    ).rejects.toThrow()

    // Payload drops fields the user may not update, rather than refusing the request.
    const updated = await payload.update({
      collection: 'enheter',
      id: created.id,
      data: { name: 'Nytt navn', level: 'section', active: false },
      overrideAccess: false,
      user: admin,
    })
    expect(updated.name).toBe('Enhet 14')
    expect(updated.level).toBe('division')
    expect(updated.active).toBe(true)
  })

  it('LO-06: does not mark a new unit as advising all of Digdir', async () => {
    const created = await payload.create({ collection: 'enheter', data: unit(18) })
    expect(created.advisesAllOfDigdir).toBe(false)
  })

  it('LO-06: lets administrators mark a unit as advising all of Digdir, and nobody else', async () => {
    const created = await payload.create({ collection: 'enheter', data: unit(19) })

    const updated = await payload.update({
      collection: 'enheter',
      id: created.id,
      data: { advisesAllOfDigdir: true },
      overrideAccess: false,
      user: admin,
    })
    expect(updated.advisesAllOfDigdir).toBe(true)

    await expect(
      payload.update({
        collection: 'enheter',
        id: created.id,
        data: { advisesAllOfDigdir: false },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })

  it('LO-02: lets administrators set the leader, and nobody else', async () => {
    const leader = await payload.create({ collection: 'personer', data: person(4) })
    const created = await payload.create({ collection: 'enheter', data: unit(17) })

    const updated = await payload.update({
      collection: 'enheter',
      id: created.id,
      data: { leader: leader.id },
      overrideAccess: false,
      user: admin,
    })
    expect(updated.leader).toBeTruthy()

    await expect(
      payload.update({
        collection: 'enheter',
        id: created.id,
        data: { leader: null },
        overrideAccess: false,
        user,
      }),
    ).rejects.toThrow()
  })
})
