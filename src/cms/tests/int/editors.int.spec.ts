import {
  createLocalReq,
  getPayload,
  Payload,
  type CollectionSlug,
  type RequiredDataFromCollectionSlug,
} from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Feedback, Role, Team, TeamType, User } from '@/payload-types'
import { hiddenUnlessAdmin, hiddenUnlessSharedContentEditor } from '@/access/adminMenu'
import { canEditSharedContent, isEditor } from '@/access/isEditor'
import { TEAM_EDITOR_ROLES } from '@/access/teamEditor'

// Redaktører maintain the shared content (tools, principles, concepts, team
// types, the wizard and roles) alongside the administrators, read and handle
// feedback on it (TB-02, TB-03), and see only those collections in the admin
// panel. The roles that decide who edits a team can't be deleted.

let payload: Payload
let admin: User
let editor: User
let user: User
let teamType: TeamType
let team: Team
const createdRoles: number[] = []

const prefix = `int-editors-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

// Something valid to create in each shared collection.
const sharedContent = (): {
  collection: CollectionSlug
  data: Record<string, unknown>
  change: Record<string, unknown>
}[] => [
  {
    collection: 'verktoy',
    data: { name: `${prefix} Verktøy`, toolType: 'mal', description: 'Et verktøy.' },
    change: { description: 'Et endret verktøy.' },
  },
  {
    collection: 'prinsipper',
    data: {
      number: 9000 + Math.floor(Math.random() * 999),
      title: `${prefix} Prinsipp`,
      area: 'felles',
      description: 'Et prinsipp.',
    },
    change: { description: 'Et endret prinsipp.' },
  },
  {
    collection: 'begreper',
    data: { name: `${prefix} Begrep`, definition: 'Et begrep.' },
    change: { definition: 'Et endret begrep.' },
  },
  {
    collection: 'teamtyper',
    data: { name: `${prefix} Teamtype` },
    change: { description: 'En teamtype.' },
  },
  {
    collection: 'teamtype-veiviser',
    data: { title: `${prefix} Spørsmål`, answers: [{ label: 'Ja' }] },
    change: { intro: 'Et spørsmål.' },
  },
  {
    collection: 'roller',
    data: { name: `${prefix} Rolle` },
    change: { responsibility: 'Et ansvar.' },
  },
]

const mayUseAdminPanel = async (u: User) => {
  const req = await createLocalReq({ user: { ...u, collection: 'brukere' } }, payload)
  return payload.collections.brukere.config.access.admin!({ req })
}

const roleWithCode = async (code: string): Promise<Role> => {
  const { docs } = await payload.find({ collection: 'roller', where: { code: { equals: code } } })
  if (docs[0]) return docs[0]
  const role = await payload.create({
    collection: 'roller',
    data: { name: `${prefix} ${code}`, code },
  })
  createdRoles.push(role.id)
  return role
}

describe('Redaktører', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-admin@example.com`, password: 'test-password', roles: ['admin'] },
    })
    editor = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-editor@example.com`, password: 'test-password', roles: ['editor'] },
    })
    user = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}@example.com`, password: 'test-password' },
    })
    teamType = await payload.create({
      collection: 'teamtyper',
      data: { name: `${prefix} Produktteam` },
    })
    team = await payload.create({
      collection: 'team',
      data: {
        name: `${prefix} Team`,
        teamType: teamType.id,
      } as RequiredDataFromCollectionSlug<'team'>,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'tilbakemeldinger', where: { text: { like: prefix } } })
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'verktoy', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'prinsipper', where: { title: { like: prefix } } })
    await payload.delete({ collection: 'begreper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'teamtype-veiviser', where: { title: { like: prefix } } })
    await payload.delete({ collection: 'roller', where: { name: { like: prefix } } })
    if (createdRoles.length)
      await payload.delete({ collection: 'roller', where: { id: { in: createdRoles } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('tells redaktører apart by their role', () => {
    expect(isEditor(editor)).toBe(true)
    expect(isEditor(admin)).toBe(false)
    expect(isEditor(user)).toBe(false)
    expect(canEditSharedContent(admin)).toBe(true)
    expect(canEditSharedContent(editor)).toBe(true)
    expect(canEditSharedContent(user)).toBe(false)
  })

  it('lets a redaktør into the admin panel', async () => {
    expect(await mayUseAdminPanel(editor)).toBe(true)
    expect(await mayUseAdminPanel(user)).toBe(false)
  })

  it('shows a redaktør only the shared content in the menu', () => {
    const args = (u: User) =>
      ({ user: { roles: u.roles } }) as unknown as Parameters<typeof hiddenUnlessAdmin>[0]
    expect(hiddenUnlessSharedContentEditor(args(editor))).toBe(false)
    expect(hiddenUnlessSharedContentEditor(args(admin))).toBe(false)
    expect(hiddenUnlessSharedContentEditor(args(user))).toBe(true)
    expect(hiddenUnlessAdmin(args(editor))).toBe(true)
    expect(hiddenUnlessAdmin(args(admin))).toBe(false)

    const hidden = (slug: CollectionSlug) => {
      const rule = payload.collections[slug].config.admin.hidden
      return typeof rule === 'function' ? rule(args(editor)) : Boolean(rule)
    }
    for (const slug of [
      'verktoy',
      'prinsipper',
      'begreper',
      'teamtyper',
      'teamtype-veiviser',
      'roller',
    ] as const) {
      expect(hidden(slug), slug).toBe(false)
    }
    for (const slug of [
      'personer',
      'enheter',
      'lokasjoner',
      'brukere',
      'medier',
      'importkjoringer',
    ] as const) {
      expect(hidden(slug), slug).toBe(true)
    }
  })

  it('lets a redaktør create, change and delete shared content', async () => {
    for (const { collection, data, change } of sharedContent()) {
      const doc = await payload.create({ collection, data: data as never, depth: 0, ...as(editor) })
      const changed = await payload.update({
        collection,
        id: doc.id,
        data: change as never,
        depth: 0,
        ...as(editor),
      })
      expect(changed, collection).toMatchObject(change)
      await payload.delete({ collection, id: doc.id, ...as(editor) })
      const { totalDocs } = await payload.count({ collection, where: { id: { equals: doc.id } } })
      expect(totalDocs, collection).toBe(0)
    }
  })

  it('refuses shared content to someone who is neither administrator nor redaktør', async () => {
    for (const { collection, data } of sharedContent()) {
      await expect(
        payload.create({ collection, data: data as never, ...as(user) }),
        collection,
      ).rejects.toThrow()
    }
  })

  it('refuses a redaktør what only administrators change', async () => {
    await expect(
      payload.create({
        collection: 'team',
        data: {
          name: `${prefix} Nytt team`,
          teamType: teamType.id,
        } as RequiredDataFromCollectionSlug<'team'>,
        ...as(editor),
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'team',
        id: team.id,
        data: { description: 'Endret' },
        ...as(editor),
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'lokasjoner',
        data: { code: `${prefix}-X`, name: 'X' },
        ...as(editor),
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'brukere',
        data: { email: `${prefix}-ny@example.com`, password: 'test-password' },
        ...as(editor),
      }),
    ).rejects.toThrow()
  })

  it('never lets a redaktør change their own roles', async () => {
    await expect(
      payload.update({
        collection: 'brukere',
        id: editor.id,
        data: { roles: ['admin'] },
        ...as(editor),
      }),
    ).rejects.toThrow()
    const after = await payload.findByID({ collection: 'brukere', id: editor.id })
    expect(after.roles).toEqual(['editor'])
  })

  it('lets an administrator make a user a redaktør', async () => {
    const other = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-other@example.com`, password: 'test-password' },
    })
    const updated = await payload.update({
      collection: 'brukere',
      id: other.id,
      data: { roles: ['editor'] },
      ...as(admin),
    })
    expect(updated.roles).toEqual(['editor'])
  })

  it('refuses to delete the roles that decide who edits a team (RO-07)', async () => {
    for (const code of TEAM_EDITOR_ROLES) {
      const role = await roleWithCode(code)
      for (const u of [admin, editor]) {
        await expect(
          payload.delete({ collection: 'roller', id: role.id, ...as(u) }),
          `${code} as ${u.email}`,
        ).rejects.toThrow(/kan ikke slettes/)
      }
      const { totalDocs } = await payload.count({
        collection: 'roller',
        where: { id: { equals: role.id } },
      })
      expect(totalDocs).toBe(1)
    }
  })

  describe('feedback on shared content (TB-02, TB-03)', () => {
    let shared: Feedback
    let onTeam: Feedback

    beforeAll(async () => {
      const create = (extra: Partial<Feedback>) =>
        payload.create({
          collection: 'tilbakemeldinger',
          data: {
            category: 'uklart',
            text: `${prefix} ${extra.page}`,
            page: '/',
            contactMe: false,
            ...extra,
          } as never,
          depth: 0,
          ...as(user),
        })
      shared = await create({ page: '/verktoy/verktoykasse' })
      onTeam = await create({ page: `/organisering/team/${team.id}`, team: team.id })
    })

    it('lets a redaktør read feedback on shared content, but not on a team', async () => {
      const { docs } = await payload.find({
        collection: 'tilbakemeldinger',
        where: { text: { like: prefix } },
        pagination: false,
        depth: 0,
        ...as(editor),
      })
      expect(docs.map((d) => d.id)).toEqual([shared.id])
    })

    it('lets a redaktør set the status of feedback on shared content', async () => {
      const updated = await payload.update({
        collection: 'tilbakemeldinger',
        id: shared.id,
        data: { status: 'under-arbeid' },
        depth: 0,
        ...as(editor),
      })
      expect(updated.status).toBe('under-arbeid')
      await expect(
        payload.update({
          collection: 'tilbakemeldinger',
          id: onTeam.id,
          data: { status: 'rettet' },
          ...as(editor),
        }),
      ).rejects.toThrow()
    })

    it('keeps what was reported as it was', async () => {
      const updated = await payload.update({
        collection: 'tilbakemeldinger',
        id: shared.id,
        data: { text: 'Endret', category: 'annet' },
        depth: 0,
        ...as(editor),
      })
      expect(updated.text).toBe(`${prefix} /verktoy/verktoykasse`)
      expect(updated.category).toBe('uklart')
    })

    it('refuses a redaktør to delete feedback', async () => {
      await expect(
        payload.delete({ collection: 'tilbakemeldinger', id: shared.id, ...as(editor) }),
      ).rejects.toThrow()
    })
  })
})
