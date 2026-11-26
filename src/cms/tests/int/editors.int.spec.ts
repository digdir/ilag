import {
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
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
import { codeFromName } from '@/utils/codes'

// Redaktører maintain the shared content (tools, principles, concepts, team
// types, the wizard and roles) alongside the administrators, and see only those
// collections in the admin panel. Feedback stays with the administrators and
// the owners of teams and units (TB-02). Only administrators choose a role's
// code or delete the roles that decide who edits a team.

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

  it('tells a redaktør on their own user that they may use the admin panel, for the CMS button', async () => {
    const self = (u: User) => payload.findByID({ collection: 'brukere', id: u.id, ...as(u) })

    expect((await self(editor)).canAccessAdmin).toBe(true)
    expect((await self(user)).canAccessAdmin).toBe(false)
  })

  it('shows a redaktør the shared content in the menu, and hides what only administrators change', () => {
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
    // In the menu for everyone who uses the admin panel; their lists show only
    // what the user owns (`baseFilter` and read access), so they are empty
    // for a redaktør who edits no team and leads no unit.
    for (const slug of ['team', 'teammedlemskap', 'mandater', 'tilbakemeldinger'] as const) {
      expect(hidden(slug), slug).toBe(false)
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

  it('makes the code of a role from its name for a redaktør, and lets only an administrator choose it', async () => {
    const byEditor = await payload.create({
      collection: 'roller',
      data: { name: `${prefix} Redaktørs rolle`, code: `${prefix}-valgt` },
      ...as(editor),
    })
    createdRoles.push(byEditor.id)
    expect(byEditor.code).toBe(codeFromName(`${prefix} Redaktørs rolle`))

    const byAdmin = await payload.create({
      collection: 'roller',
      data: { name: `${prefix} Admins rolle`, code: `${prefix}-valgt` },
      ...as(admin),
    })
    createdRoles.push(byAdmin.id)
    expect(byAdmin.code).toBe(`${prefix}-valgt`)

    const renamed = await payload.update({
      collection: 'roller',
      id: byEditor.id,
      data: { name: `${prefix} Nytt navn` },
      ...as(editor),
    })
    expect(renamed.code).toBe(byEditor.code)
  })

  it('refuses a redaktør a code that decides who edits a team (TO-08, RO-06)', async () => {
    for (const code of TEAM_EDITOR_ROLES) {
      // A name whose code is one of them, as a new role or on an existing role
      // that has no code yet.
      await expect(
        payload.create({ collection: 'roller', data: { name: code.toUpperCase() }, ...as(editor) }),
        code,
      ).rejects.toThrow(/kan bare gis av en administrator/)

      const uncoded = await payload.create({
        collection: 'roller',
        data: { name: `${prefix} Uten kode ${code}` },
      })
      createdRoles.push(uncoded.id)
      await payload.db.updateOne({ collection: 'roller', id: uncoded.id, data: { code: null } })

      await expect(
        payload.update({
          collection: 'roller',
          id: uncoded.id,
          data: { name: code.toUpperCase() },
          ...as(editor),
        }),
        code,
      ).rejects.toThrow(/kan bare gis av en administrator/)

      // A code typed by a redaktør is dropped, and the role gets one from its name.
      const updated = await payload.update({
        collection: 'roller',
        id: uncoded.id,
        data: { code },
        ...as(editor),
      })
      expect(updated.code, code).toBe(codeFromName(uncoded.name))
    }
  })

  it('lets only an administrator delete the roles that decide who edits a team (RO-07)', async () => {
    for (const code of TEAM_EDITOR_ROLES) {
      const role = await roleWithCode(code)
      await expect(
        payload.delete({ collection: 'roller', id: role.id, ...as(editor) }),
        code,
      ).rejects.toThrow(/kan bare slettes av en administrator/)

      // The administrator's delete runs in a transaction that is rolled back,
      // so the role is still there for the other tests.
      const req = await createLocalReq({ user: { ...admin, collection: 'brukere' } }, payload)
      await initTransaction(req)
      try {
        await payload.delete({ collection: 'roller', id: role.id, req, overrideAccess: false })
        const { totalDocs } = await payload.count({
          collection: 'roller',
          where: { id: { equals: role.id } },
          req,
        })
        expect(totalDocs, code).toBe(0)
      } finally {
        await killTransaction(req)
      }

      const { totalDocs } = await payload.count({
        collection: 'roller',
        where: { id: { equals: role.id } },
      })
      expect(totalDocs, code).toBe(1)
    }
  })

  describe('feedback (TB-02)', () => {
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

    it('lets a redaktør read no feedback, not even on shared content', async () => {
      const { docs } = await payload.find({
        collection: 'tilbakemeldinger',
        where: { text: { like: prefix } },
        pagination: false,
        depth: 0,
        ...as(editor),
      })
      expect(docs).toEqual([])
    })

    it('refuses a redaktør to change or delete feedback', async () => {
      for (const fb of [shared, onTeam]) {
        await expect(
          payload.update({
            collection: 'tilbakemeldinger',
            id: fb.id,
            data: { status: 'under-arbeid' },
            ...as(editor),
          }),
        ).rejects.toThrow()
        await expect(
          payload.delete({ collection: 'tilbakemeldinger', id: fb.id, ...as(editor) }),
        ).rejects.toThrow()
      }
    })
  })
})
