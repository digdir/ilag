import { getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Principle, User } from '@/payload-types'

// The principles (PR-01, PR-02): everyone signed in reads them,
// administrators maintain them, and the areas are a fixed list.

let payload: Payload
let admin: User
let user: User
let integration: User
let principle: Principle

const prefix = `int-principles-${Date.now()}`
// Numbers are unique, so the tests use their own range.
const base = 900_000 + Math.floor(Math.random() * 90_000)

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

const principleData = (title: string, extra: Partial<RequiredDataFromCollectionSlug<'prinsipper'>> = {}) =>
  ({
    number: base,
    title: `${prefix} ${title}`,
    area: 'ledelse',
    description: 'Ledere setter tydelige mål og rammer.',
    ...extra,
  }) as RequiredDataFromCollectionSlug<'prinsipper'>

describe('Principles', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-admin@example.com`, password: 'test-password', roles: ['admin'] },
    })
    user = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}@example.com`, password: 'test-password' },
    })
    integration = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-integration@example.com`, password: 'test-password', roles: ['integration'] },
    })
    principle = await payload.create({
      collection: 'prinsipper',
      data: principleData('Vi leder gjennom tydelig retning'),
      ...as(admin),
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'prinsipper', where: { title: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('PR-01, PR-02: lets everyone signed in read a principle with its number, area and text', async () => {
    const found = await payload.findByID({ collection: 'prinsipper', id: principle.id, ...as(user) })

    expect(found).toMatchObject({
      number: base,
      title: `${prefix} Vi leder gjennom tydelig retning`,
      area: 'ledelse',
      description: 'Ledere setter tydelige mål og rammer.',
    })
  })

  it('PR-01: lists the principles in order of their number', async () => {
    await payload.create({
      collection: 'prinsipper',
      data: principleData('Vi løser reelle brukerbehov', { number: base - 1, area: 'felles' }),
      ...as(admin),
    })

    const { docs } = await payload.find({
      collection: 'prinsipper',
      where: { title: { like: prefix } },
      pagination: false,
      ...as(user),
    })

    expect(docs.map((p) => p.number)).toEqual([base - 1, base])
  })

  it('NF-11: shows no principles to anyone not signed in, or to integrations', async () => {
    await expect(payload.find({ collection: 'prinsipper', overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'prinsipper', ...as(integration) })).rejects.toThrow()
  })

  it('leaves creating, changing and deleting principles to administrators', async () => {
    await expect(
      payload.create({ collection: 'prinsipper', data: principleData('Ny', { number: base + 1 }), ...as(user) }),
    ).rejects.toThrow()
    await expect(
      payload.update({ collection: 'prinsipper', id: principle.id, data: { title: 'Nei' }, ...as(user) }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: 'prinsipper', id: principle.id, ...as(user) })).rejects.toThrow()
  })

  it('PR-02: only takes the areas in the list', async () => {
    await expect(
      payload.create({
        collection: 'prinsipper',
        data: principleData('Ukjent område', { number: base + 2, area: 'kultur' as 'felles' }),
        ...as(admin),
      }),
    ).rejects.toThrow()
  })

  it('gives each principle its own number', async () => {
    await expect(
      payload.create({ collection: 'prinsipper', data: principleData('Samme nummer'), ...as(admin) }),
    ).rejects.toThrow()
  })
})
