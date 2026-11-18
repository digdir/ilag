import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TeamType, TeamTypeWizardQuestion, User } from '@/payload-types'

// The team type wizard's questions (TK-03): everyone logged in reads them,
// administrators edit them, and each answer leads to a question, a team type
// or nowhere.

let payload: Payload
let admin: User
let user: User
let integration: User
let teamType: TeamType
let next: TeamTypeWizardQuestion

const prefix = `int-wizard-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

const question = (title: string, answers: TeamTypeWizardQuestion['answers'], isStart = false) =>
  payload.create({ collection: 'teamtype-veiviser', data: { title: `${prefix} ${title}`, isStart, answers } })

describe('Team type wizard', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // The administrator first: in an empty database, the first user becomes
    // an administrator whatever their roles.
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
    teamType = await payload.create({
      collection: 'teamtyper',
      data: { name: `${prefix} Prosjektteam`, requirements: 'Et tydelig mandat\nEn teamkontrakt' },
    })
    next = await question('Har oppgaven en definert avslutning?', [
      { label: 'Ja', leadsTo: { relationTo: 'teamtyper', value: teamType.id } },
    ])
  })

  afterAll(async () => {
    await payload.delete({ collection: 'teamtype-veiviser', where: { title: { like: prefix } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('TK-03: an answer leads to a question, a team type or nowhere', async () => {
    const start = await question(
      'Egner oppgaven seg for teamarbeid?',
      [
        { label: 'Hovedsakelig ja', leadsTo: { relationTo: 'teamtype-veiviser', value: next.id } },
        { label: 'Hovedsakelig nei', hint: 'Vurder individuelt ansvar.' },
      ],
      true,
    )

    const read = await payload.findByID({ collection: 'teamtype-veiviser', id: start.id, depth: 2 })
    const [yes, no] = read.answers!

    expect(yes.leadsTo).toMatchObject({ relationTo: 'teamtype-veiviser', value: { id: next.id } })
    const after = yes.leadsTo!.value as TeamTypeWizardQuestion
    expect(after.answers![0].leadsTo).toMatchObject({
      relationTo: 'teamtyper',
      value: { id: teamType.id, requirements: 'Et tydelig mandat\nEn teamkontrakt' },
    })
    expect(no.leadsTo).toBeFalsy()
    expect(read.isStart).toBe(true)
  })

  it('TK-03: needs a title and at least one answer', async () => {
    await expect(
      payload.create({ collection: 'teamtype-veiviser', data: { title: `${prefix} Uten svar`, answers: [] } }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'teamtype-veiviser',
        data: { answers: [{ label: 'Ja' }] } as unknown as TeamTypeWizardQuestion,
      }),
    ).rejects.toThrow()
  })

  it('TK-03: everyone logged in reads the questions', async () => {
    const { docs } = await payload.find({
      collection: 'teamtype-veiviser',
      where: { id: { equals: next.id } },
      ...as(user),
    })
    expect(docs).toHaveLength(1)
  })

  it('TK-03: is not readable without logging in, or by the integration user', async () => {
    await expect(payload.find({ collection: 'teamtype-veiviser', overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'teamtype-veiviser', ...as(integration) })).rejects.toThrow()
  })

  it('TK-03: only administrators create, change and delete questions', async () => {
    const data = { title: `${prefix} Ny`, answers: [{ label: 'Ja' }] }

    await expect(payload.create({ collection: 'teamtype-veiviser', data, ...as(user) })).rejects.toThrow()
    await expect(
      payload.update({ collection: 'teamtype-veiviser', id: next.id, data: { title: 'Endret' }, ...as(user) }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: 'teamtype-veiviser', id: next.id, ...as(user) })).rejects.toThrow()

    const created = await payload.create({ collection: 'teamtype-veiviser', data, ...as(admin) })
    const changed = await payload.update({
      collection: 'teamtype-veiviser',
      id: created.id,
      data: { title: `${prefix} Endret` },
      ...as(admin),
    })
    expect(changed.title).toBe(`${prefix} Endret`)
    await payload.delete({ collection: 'teamtype-veiviser', id: created.id, ...as(admin) })
  })
})
