import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Concept, User } from '@/payload-types'

// The concept list (BG-01, BG-02, BG-06): everyone signed in reads it,
// administrators maintain it.

let payload: Payload
let admin: User
let user: User
let integration: User
let concept: Concept

const prefix = `int-concepts-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

describe('Concepts', () => {
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
    concept = await payload.create({
      collection: 'begreper',
      data: {
        name: `${prefix} Teammandat`,
        definition: 'Beskriver hvorfor teamet finnes.',
        variants: [`${prefix} teammandatet`],
        autoLink: true,
      },
      ...as(admin),
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'begreper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('BG-01, BG-02, BG-06: lets everyone signed in read a concept, explained automatically by default', async () => {
    const found = await payload.findByID({ collection: 'begreper', id: concept.id, ...as(user) })

    expect(found.name).toBe(`${prefix} Teammandat`)
    expect(found.definition).toBe('Beskriver hvorfor teamet finnes.')
    expect(found.variants).toEqual([`${prefix} teammandatet`])
    expect(found.autoLink).toBe(true)
  })

  it('NF-11: shows no concepts to anyone not signed in, or to integrations', async () => {
    await expect(payload.find({ collection: 'begreper', overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'begreper', ...as(integration) })).rejects.toThrow()
  })

  it('BG-01: lets only administrators create, change and delete concepts', async () => {
    const data = { name: `${prefix} OKR`, definition: 'Objectives and key results.', autoLink: true }
    await expect(payload.create({ collection: 'begreper', data, ...as(user) })).rejects.toThrow()
    await expect(
      payload.update({ collection: 'begreper', id: concept.id, data: { definition: 'Endret.' }, ...as(user) }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: 'begreper', id: concept.id, ...as(user) })).rejects.toThrow()

    const created = await payload.create({ collection: 'begreper', data, ...as(admin) })
    await payload.delete({ collection: 'begreper', id: created.id, ...as(admin) })
  })

  it('BG-06: lets two concepts share a form, which the popover then explains both', async () => {
    const other = await payload.create({
      collection: 'begreper',
      data: {
        name: `${prefix} Enhetsmandat`,
        definition: 'Beskriver hvorfor enheten finnes.',
        variants: [`${prefix} teammandatet`],
        autoLink: true,
      },
      ...as(admin),
    })

    expect(other.variants).toEqual([`${prefix} teammandatet`])
  })

  it('BG-06: lets an administrator change a concept’s forms', async () => {
    const updated = await payload.update({
      collection: 'begreper',
      id: concept.id,
      data: { variants: [`${prefix} teammandatet`, `${prefix} teammandater`] },
      ...as(admin),
    })

    expect(updated.variants).toHaveLength(2)
  })
})
