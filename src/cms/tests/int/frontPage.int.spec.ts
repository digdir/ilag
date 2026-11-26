import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { FrontPage, User } from '@/payload-types'

// The front page's content (3.15): administrators edit it, every change is
// kept as a version, signed-in readers see only what is published, and its
// links go to a page in ilag or to an http(s) address (FS-02, FS-03, FS-06).

let payload: Payload
let admin: User
let user: User

const prefix = `int-frontpage-${Date.now()}`
const slug = 'forside'
const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })
const titleOf = (doc: FrontPage) => doc.title
const withLink = (href: string) => ({
  entries: [{ title: 'Skal du etablere et team?', links: [{ label: 'Start veiviseren', href }] }],
})
const withChangeLink = (href: string) => ({
  changes: [{ date: '2026-11-24T00:00:00.000Z', text: 'Noe er endret.', href }],
})

describe('Forside', () => {
  let original: FrontPage

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    original = await payload.findGlobal({ slug, draft: true, depth: 0 })
    admin = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-admin@example.com`, password: 'test-password', roles: ['admin'] },
    })
    user = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}@example.com`, password: 'test-password' },
    })
    await payload.updateGlobal({ slug, data: { title: 'Publisert', _status: 'published' }, ...as(admin) })
  })

  afterAll(async () => {
    // Puts back what was there, such as the seed's content, as a new version.
    const { eyebrow, title, intro, image, entries, changes } = original
    await payload.updateGlobal({ slug, data: { eyebrow, title, intro, image, entries, changes, _status: 'published' } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('signed-in users read the published version, not a draft', async () => {
    await payload.updateGlobal({ slug, data: { title: 'Utkast' }, draft: true, ...as(admin) })

    expect(titleOf(await payload.findGlobal({ slug, ...as(user) }))).toBe('Publisert')
    expect(titleOf(await payload.findGlobal({ slug, draft: true, ...as(user) }))).toBe('Publisert')
    expect(titleOf(await payload.findGlobal({ slug, draft: true, ...as(admin) }))).toBe('Utkast')
  })

  it('NF-11: refuses anonymous readers', async () => {
    await expect(payload.findGlobal({ slug, overrideAccess: false })).rejects.toThrow()
  })

  it('only administrators update it and read its versions', async () => {
    await expect(payload.updateGlobal({ slug, data: { title: 'Ikke lov' }, ...as(user) })).rejects.toThrow()
    await expect(payload.findGlobalVersions({ slug, ...as(user) })).rejects.toThrow()

    const before = (await payload.findGlobalVersions({ slug, ...as(admin) })).totalDocs
    await payload.updateGlobal({ slug, data: { title: 'Ny tittel', _status: 'published' }, ...as(admin) })
    const { totalDocs, docs } = await payload.findGlobalVersions({ slug, sort: '-updatedAt', ...as(admin) })
    expect(totalDocs).toBe(before + 1)
    expect(titleOf(docs[0].version)).toBe('Ny tittel')
  })

  it.each(['/verktoy/veiviser', 'https://www.digdir.no/'])('FS-02, FS-03, FS-06: accepts the link %s', async (href) => {
    const saved = await payload.updateGlobal({ slug, data: { ...withLink(href), ...withChangeLink(href) }, ...as(admin) })

    expect(saved.entries?.[0].links?.[0].href).toBe(href)
    expect(saved.changes?.[0].href).toBe(href)
  })

  it.each(['javascript:alert(1)', '//evil.example.com', 'www.digdir.no', 'verktoy/veiviser'])(
    'FS-02, FS-03, FS-06: refuses the link %s',
    async (href) => {
      await expect(payload.updateGlobal({ slug, data: withLink(href), ...as(admin) })).rejects.toThrow()
      await expect(payload.updateGlobal({ slug, data: withChangeLink(href), ...as(admin) })).rejects.toThrow()
    },
  )
})
