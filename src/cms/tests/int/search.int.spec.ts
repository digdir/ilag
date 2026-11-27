import { createLocalReq, getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Location, SearchResult, TeamType, User } from '@/payload-types'
import { SEARCH_SLUG, SEARCHED_COLLECTIONS } from '@/search'

let payload: Payload
let user: User
let admin: User
let location: Location
let productTeam: TeamType

// Prefix for every test row, so cleanup never touches other data.
const prefix = `int-search-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

/** The search documents for one document, read past access control. */
const indexOf = async (collection: SearchResult['doc']['relationTo'], id: number) => {
  const { docs } = await payload.find({
    collection: SEARCH_SLUG,
    where: { 'doc.relationTo': { equals: collection }, 'doc.value': { equals: id } },
    depth: 0,
  })
  return docs
}

const person = (n: number) =>
  payload.create({
    collection: 'personer',
    data: {
      firstName: 'Kari',
      lastName: `${prefix} ${n}`,
      title: 'Seniorrådgiver',
      email: `${prefix}-${n}@example.com`,
      mobile: '+47 400 00 000',
      externalId: `${prefix}-person-${n}`,
      employeeNumber: `${prefix}-${n}`,
      locationCode: location.code,
    } as RequiredDataFromCollectionSlug<'personer'>,
  })

describe('Search (FS-01)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // In an empty database the first user becomes an administrator.
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
    productTeam = await payload.create({
      collection: 'teamtyper',
      data: { name: `${prefix} Produktteam` },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    await payload.delete({ collection: 'enheter', where: { externalUnitId: { like: prefix } } })
    await payload.delete({ collection: 'roller', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'verktoy', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'lokasjoner', where: { code: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('indexes a team with its team type, and follows a rename', async () => {
    const team = await payload.create({
      collection: 'team',
      data: { name: `${prefix} Plattform`, teamType: productTeam.id } as RequiredDataFromCollectionSlug<'team'>,
    })
    expect(await indexOf('team', team.id)).toMatchObject([
      { title: `${prefix} Plattform`, subtitle: `${prefix} Produktteam`, active: true },
    ])

    await payload.update({ collection: 'team', id: team.id, data: { name: `${prefix} Plattformen` } })
    expect(await indexOf('team', team.id)).toMatchObject([{ title: `${prefix} Plattformen` }])
  })

  it('keeps an inactive team in the index, marked inactive', async () => {
    const team = await payload.create({
      collection: 'team',
      data: { name: `${prefix} Nedlagt`, teamType: productTeam.id } as RequiredDataFromCollectionSlug<'team'>,
    })
    await payload.update({ collection: 'team', id: team.id, data: { active: false } })
    const [doc] = await indexOf('team', team.id)
    expect(doc.active).toBe(false)
  })

  it('removes the search document when its source is deleted', async () => {
    const team = await payload.create({
      collection: 'team',
      data: { name: `${prefix} Kortvarig`, teamType: productTeam.id } as RequiredDataFromCollectionSlug<'team'>,
    })
    expect(await indexOf('team', team.id)).toHaveLength(1)
    await payload.delete({ collection: 'team', id: team.id })
    expect(await indexOf('team', team.id)).toHaveLength(0)
  })

  it('indexes a unit with the label of its level', async () => {
    const unit = await payload.create({
      collection: 'enheter',
      data: {
        externalUnitId: `${prefix}-unit-1`,
        name: `${prefix} Fellesløsninger`,
        level: 'division',
      } as RequiredDataFromCollectionSlug<'enheter'>,
    })
    const [doc] = await indexOf('enheter', unit.id)
    expect(doc).toMatchObject({ title: `${prefix} Fellesløsninger`, subtitle: 'Divisjon', active: true })
  })

  it('FO-03: indexes a person by full name and title', async () => {
    const created = await person(1)
    const [doc] = await indexOf('personer', created.id)
    expect(doc).toMatchObject({ title: `Kari ${prefix} 1`, subtitle: 'Seniorrådgiver', active: true })
  })

  it('NF-09: keeps contact details out of the index', async () => {
    const created = await person(2)
    const [doc] = await indexOf('personer', created.id)
    const stored = JSON.stringify(doc)
    expect(stored).not.toContain('@example.com')
    expect(stored).not.toContain('400 00 000')
    expect(Object.keys(doc).sort()).toEqual(
      ['active', 'createdAt', 'doc', 'id', 'priority', 'subtitle', 'title', 'updatedAt'].sort(),
    )
  })

  it('indexes team types by name', async () => {
    expect(await indexOf('teamtyper', productTeam.id)).toMatchObject([
      { title: `${prefix} Produktteam`, subtitle: null, active: true },
    ])
  })

  it('indexes roles and tools, tools with their type', async () => {
    const role = await payload.create({ collection: 'roller', data: { name: `${prefix} Teamleder` } })
    const tool = await payload.create({
      collection: 'verktoy',
      data: {
        name: `${prefix} Prosjektmandat`,
        toolType: 'mal',
        description: 'Beskriver et prosjekt.',
      } as RequiredDataFromCollectionSlug<'verktoy'>,
    })
    expect((await indexOf('roller', role.id))[0]).toMatchObject({ title: `${prefix} Teamleder`, active: true })
    expect((await indexOf('verktoy', tool.id))[0]).toMatchObject({ title: `${prefix} Prosjektmandat`, subtitle: 'Mal' })
  })

  it('orders the types by priority: teams, team types, units, people, roles, tools', async () => {
    const { docs } = await payload.find({
      collection: SEARCH_SLUG,
      where: { title: { like: prefix } },
      sort: ['priority', 'title'],
      pagination: false,
      depth: 0,
    })
    const order = docs.map((d) => d.doc.relationTo).filter((t, i, all) => all.indexOf(t) === i)
    expect(order).toEqual([...SEARCHED_COLLECTIONS])
  })

  // Who may search is checked for every collection in searchAccess.int.spec.ts.
  it('finds a name by any of its words, in any order', async () => {
    const { docs } = await payload.find({
      collection: SEARCH_SLUG,
      where: { title: { like: `kari ${prefix}` } },
      ...as(user),
    })
    expect(docs.map((d) => d.doc.relationTo)).toContain('personer')
  })

  it('lets nobody but administrators change the index, which reindexing needs', async () => {
    const [doc] = (await payload.find({ collection: SEARCH_SLUG, where: { title: { like: prefix } }, limit: 1 })).docs
    await expect(
      payload.update({ collection: SEARCH_SLUG, id: doc.id, data: { title: 'Endret' }, ...as(user) }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: SEARCH_SLUG, id: doc.id, ...as(user) })).rejects.toThrow()
    await expect(
      payload.create({
        collection: SEARCH_SLUG,
        data: { title: 'Ny', doc: { relationTo: 'team', value: doc.id } },
        ...as(admin),
      }),
    ).rejects.toThrow()
  })

  // What the admin panel's «Reindekser» button calls.
  const reindex = async (u: User, collections: string[]) => {
    const endpoint = payload.collections[SEARCH_SLUG].config.endpoints || []
    const { handler } = endpoint.find((e) => e.path === '/reindex')!
    const req = await createLocalReq({ user: { ...u, collection: 'brukere' } }, payload)
    req.json = async () => ({ collections })
    return handler(req)
  }

  it('lets administrators reindex a collection, and nobody else', async () => {
    const type = await payload.create({ collection: 'teamtyper', data: { name: `${prefix} Uindeksert` } })
    await payload.delete({
      collection: SEARCH_SLUG,
      where: { 'doc.relationTo': { equals: 'teamtyper' }, 'doc.value': { equals: type.id } },
    })

    expect((await reindex(user, ['teamtyper'])).status).toBe(401)
    expect(await indexOf('teamtyper', type.id)).toHaveLength(0)

    expect((await reindex(admin, ['teamtyper'])).status).toBe(200)
    expect(await indexOf('teamtyper', type.id)).toMatchObject([{ title: `${prefix} Uindeksert`, priority: 15 }])
  })
})
