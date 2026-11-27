import { getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SEARCH_SLUG, SEARCHED_COLLECTIONS, type SearchedCollection } from '@/search'
import type { Person, Role, User } from '@/payload-types'

// The search index is a copy, with read access of its own. Whoever may read a
// document in its collection may read its search document, and nobody else
// may (FS-01, AL-04). This checks every searched collection against every
// kind of user, so a collection added to the search, or a change to the read
// access of one, fails here until `sok` follows it.

let payload: Payload
let location: string
let teamType: number
const createdRoles: number[] = []

const prefix = `int-search-access-${Date.now()}`

const person = (n: number, extra: Partial<Person> = {}) =>
  payload.create({
    collection: 'personer',
    data: {
      firstName: 'Kari',
      lastName: `${prefix} ${n}`,
      email: `${prefix}-person-${n}@example.com`,
      externalId: `${prefix}-person-${n}`,
      employeeNumber: `${prefix}-${n}`,
      locationCode: location,
      ...extra,
    } as RequiredDataFromCollectionSlug<'personer'>,
  })

// The roles that give rights are found by their fixed code.
const roleWithCode = async (code: string, name: string): Promise<Role> => {
  const { docs } = await payload.find({ collection: 'roller', where: { code: { equals: code } } })
  if (docs[0]) return docs[0]
  const role = await payload.create({ collection: 'roller', data: { name, code } })
  createdRoles.push(role.id)
  return role
}

// Documents of each searched collection, active and inactive where the
// collection has that, for the users below to read. Every searched collection
// needs an entry: the test fails for one without.
const fixtures: Record<SearchedCollection, () => Promise<{ id: number }[]>> = {
  team: async () => [
    await payload.create({
      collection: 'team',
      data: { name: `${prefix} Aktivt team`, teamType } as RequiredDataFromCollectionSlug<'team'>,
    }),
    await payload.create({
      collection: 'team',
      data: { name: `${prefix} Nedlagt team`, teamType, active: false } as RequiredDataFromCollectionSlug<'team'>,
    }),
  ],
  teamtyper: async () => [await payload.create({ collection: 'teamtyper', data: { name: `${prefix} Teamtype` } })],
  enheter: async () =>
    Promise.all(
      [true, false].map((active, i) =>
        payload.create({
          collection: 'enheter',
          data: {
            externalUnitId: `${prefix}-unit-${i}`,
            name: `${prefix} Enhet ${i}`,
            level: 'department',
            active,
          } as RequiredDataFromCollectionSlug<'enheter'>,
        }),
      ),
    ),
  personer: async () => [await person(10), await person(11, { active: false })],
  roller: async () => [await payload.create({ collection: 'roller', data: { name: `${prefix} Rolle` } })],
  verktoy: async () => [
    await payload.create({
      collection: 'verktoy',
      data: {
        name: `${prefix} Verktøy`,
        toolType: 'mal',
        description: 'Til testen.',
      } as RequiredDataFromCollectionSlug<'verktoy'>,
    }),
  ],
}

// The kinds of user whose rights differ. The anonymous one is a visitor who
// is not logged in.
const WHO = ['anonymous', 'integration', 'signedIn', 'teamMember', 'teamLead', 'admin'] as const
const users = {} as Record<(typeof WHO)[number], User | undefined>
const docs = {} as Record<SearchedCollection, number[]>

const asUser = (user: User | undefined) => ({
  user: user ? { ...user, collection: 'brukere' as const } : undefined,
  overrideAccess: false,
})

/** The IDs among `ids` that the user may read, or none if they may read nothing. */
const readable = async (collection: SearchedCollection, ids: number[], user: User | undefined) => {
  try {
    const result = await payload.find({
      collection,
      where: { id: { in: ids } },
      pagination: false,
      depth: 0,
      ...asUser(user),
    })
    return result.docs.map((d) => d.id).sort()
  } catch {
    return []
  }
}

/** The IDs among `ids` that the user finds in the search. */
const found = async (collection: SearchedCollection, ids: number[], user: User | undefined) => {
  try {
    const result = await payload.find({
      collection: SEARCH_SLUG,
      where: { 'doc.relationTo': { equals: collection }, 'doc.value': { in: ids } },
      pagination: false,
      depth: 0,
      ...asUser(user),
    })
    return result.docs.map((d) => (typeof d.doc.value === 'object' ? d.doc.value.id : d.doc.value)).sort()
  } catch {
    return []
  }
}

describe('Search access follows the searched collections', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const user = (name: string, data: Partial<User> = {}) =>
      payload.create({
        collection: 'brukere',
        data: { email: `${prefix}-${name}@example.com`, password: 'test-password', ...data },
      })
    // In an empty database the first user becomes an administrator.
    users.admin = await user('admin', { roles: ['admin'] })
    users.integration = await user('integration', { roles: ['integration'] })
    users.signedIn = await user('signed-in')

    location = (await payload.create({ collection: 'lokasjoner', data: { code: `${prefix}-LEI`, name: 'Leikanger' } }))
      .code
    teamType = (await payload.create({ collection: 'teamtyper', data: { name: `${prefix} Produktteam` } })).id

    for (const collection of SEARCHED_COLLECTIONS) {
      const make = fixtures[collection]
      if (make) docs[collection] = (await make()).map((d) => d.id)
    }

    // A team lead of the first team, who may edit it (TO-08), and a member of
    // it with no rights beyond reading.
    const [leadPerson, memberPerson] = [await person(1), await person(2)]
    const lead = await roleWithCode('teamleder', 'Teamleder')
    const member = await payload.create({ collection: 'roller', data: { name: `${prefix} Teammedlem` } })
    await payload.create({
      collection: 'teammedlemskap',
      data: { team: docs.team[0], person: leadPerson.id, roles: [lead.id] },
    })
    await payload.create({
      collection: 'teammedlemskap',
      data: { team: docs.team[0], person: memberPerson.id, roles: [member.id] },
    })
    users.teamLead = await user('team-lead', { person: leadPerson.id })
    users.teamMember = await user('team-member', { person: memberPerson.id })
    users.anonymous = undefined
  })

  afterAll(async () => {
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    await payload.delete({ collection: 'enheter', where: { externalUnitId: { like: prefix } } })
    await payload.delete({ collection: 'verktoy', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'roller', where: { name: { like: prefix } } })
    if (createdRoles.length) await payload.delete({ collection: 'roller', where: { id: { in: createdRoles } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'lokasjoner', where: { code: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('indexes exactly the collections the tests know', () => {
    const docField = payload.collections[SEARCH_SLUG].config.fields.find((f) => 'name' in f && f.name === 'doc')
    const indexed = docField && 'relationTo' in docField ? [docField.relationTo].flat() : []
    expect(indexed.sort()).toEqual([...SEARCHED_COLLECTIONS].sort())
  })

  it.each(SEARCHED_COLLECTIONS)('has test data for %s', (collection) => {
    expect(fixtures[collection], `Add test data for «${collection}» to fixtures in this file`).toBeTypeOf('function')
    expect(docs[collection]?.length).toBeGreaterThan(0)
  })

  // Otherwise the comparison below would pass with nothing on either side.
  it.each(SEARCHED_COLLECTIONS)('lets an administrator read and find the test data for %s', async (collection) => {
    const ids = docs[collection] ?? []
    expect(await readable(collection, ids, users.admin)).toEqual([...ids].sort())
    expect(await found(collection, ids, users.admin)).toEqual([...ids].sort())
  })

  const cases = SEARCHED_COLLECTIONS.flatMap((collection) => WHO.map((who) => [collection, who] as const))

  it.each(cases)('%s: %s finds what they may read, and nothing else', async (collection, who) => {
    const ids = docs[collection] ?? []
    const [inSearch, inCollection] = await Promise.all([
      found(collection, ids, users[who]),
      readable(collection, ids, users[who]),
    ])
    expect(inSearch).toEqual(inCollection)
  })
})
