import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { GovernanceFoundation, User } from '@/payload-types'

// The styringsfundament (SF-01, SF-02): administrators edit it, every
// change is kept as a version, and signed-in readers see only what is published.

let payload: Payload
let admin: User
let user: User

const prefix = `int-governance-${Date.now()}`
const slug = 'styringsfundament'
const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })
const withVision = (vision: string) => ({ vision })
const visionOf = (doc: GovernanceFoundation) => doc.vision

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

  it('SF-01: signed-in users read the published version, not a draft', async () => {
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

  it('keeps every published change as a version, for the admin panel', async () => {
    const before = (await payload.findGlobalVersions({ slug, ...as(admin) })).totalDocs

    await payload.updateGlobal({ slug, data: { ...withVision('Ny visjon'), _status: 'published' }, ...as(admin) })

    const { totalDocs, docs } = await payload.findGlobalVersions({ slug, sort: '-updatedAt', ...as(admin) })
    expect(totalDocs).toBe(before + 1)
    expect(visionOf(docs[0].version)).toBe('Ny visjon')
  })
})
