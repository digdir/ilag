import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { GovernanceFoundation, User } from '@/payload-types'

// The styringsfundament (SF-01, SF-02, SF-05): administrators edit it, every
// change is kept as a version, and signed-in readers see only what is published.

let payload: Payload
let admin: User
let user: User

const prefix = `int-governance-${Date.now()}`
const slug = 'styringsfundament'
const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })
// The page with only a vision box, and the vision a page shows.
const withVision = (text: string) => ({
  sections: [{ blockType: 'statement' as const, heading: 'Vår visjon', style: 'dark' as const, text }],
})
const visionOf = (doc: GovernanceFoundation) => {
  const box = doc.sections?.[0]
  return box?.blockType === 'statement' ? box.text : undefined
}

describe('Styringsfundament', () => {
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
    await payload.updateGlobal({ slug, data: { ...withVision('Publisert visjon'), _status: 'published' }, ...as(admin) })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('SF-01, SF-05: signed-in users read the published version, not a draft', async () => {
    await payload.updateGlobal({ slug, data: withVision('Utkast'), draft: true, ...as(admin) })

    expect(visionOf(await payload.findGlobal({ slug, ...as(user) }))).toBe('Publisert visjon')
    expect(visionOf(await payload.findGlobal({ slug, draft: true, ...as(user) }))).toBe('Publisert visjon')
    expect(visionOf(await payload.findGlobal({ slug, draft: true, ...as(admin) }))).toBe('Utkast')
  })

  it('NF-11: refuses anonymous readers', async () => {
    await expect(payload.findGlobal({ slug, overrideAccess: false })).rejects.toThrow()
  })

  it('SF-02: only administrators update it', async () => {
    await expect(payload.updateGlobal({ slug, data: withVision('Ikke lov'), ...as(user) })).rejects.toThrow()
    await expect(payload.findGlobalVersions({ slug, ...as(user) })).rejects.toThrow()
  })

  it('SF-05: keeps every published change as a version', async () => {
    const before = (await payload.findGlobalVersions({ slug, ...as(admin) })).totalDocs

    await payload.updateGlobal({ slug, data: { ...withVision('Ny visjon'), _status: 'published' }, ...as(admin) })

    const { totalDocs, docs } = await payload.findGlobalVersions({ slug, sort: '-updatedAt', ...as(admin) })
    expect(totalDocs).toBe(before + 1)
    expect(visionOf(docs[0].version)).toBe('Ny visjon')
  })

  it('SF-01: takes boxes of the same kind more than once, in the order given', async () => {
    const cards = (heading: string) => ({ blockType: 'cards' as const, heading, colors: 'neutral' as const, cards: [] })

    const saved = await payload.updateGlobal({
      slug,
      data: { sections: [cards('Våre verdiar'), ...withVision('Visjon').sections, cards('Vårt målbilde')] },
      ...as(admin),
    })

    expect(saved.sections?.map((box) => box.heading)).toEqual(['Våre verdiar', 'Vår visjon', 'Vårt målbilde'])
  })
})
