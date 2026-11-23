import {
  createLocalReq,
  getPayload,
  Payload,
  restoreVersionOperation,
  type RequiredDataFromCollectionSlug,
} from 'payload'
import { isAfterToday } from '@/collections/Mandates'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Mandate, Person, Role, Team, Unit, User } from '@/payload-types'

// Who is teamleder and teameier of which team comes from the team's
// memberships, through the user's person (ADR-0005).

let payload: Payload
let location: string
let leadRole: Role
let ownerRole: Role
const createdRoles: number[] = []
let ownerPerson: Person
let leadPerson: Person
let admin: User
let reader: User
let teamLead: User
let teamOwner: User
let otherLead: User
let team: Team
let otherTeam: Team
let unit: Unit

const prefix = `int-mandates-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

const content = {
  problem: 'Det er vanskelig å lage **gode** skjema.',
  outcomes: 'Flere skjema på kortere tid.',
  expectations: 'Teamet eier skjemaverktøyet.',
  collaboration: 'Samarbeider med [Team Innlogging](https://example.com).',
}

const user = (name: string, roles: ('admin' | 'integration')[] = [], person?: Person) =>
  payload.create({
    collection: 'brukere',
    data: { email: `${prefix}-${name}@example.com`, password: 'test-password', roles, person: person?.id },
  })

const person = (name: string) =>
  payload.create({
    collection: 'personer',
    data: {
      firstName: 'Kari',
      lastName: name,
      email: `${prefix}-person-${name}@example.com`,
      externalId: `${prefix}-person-${name}`,
      employeeNumber: `${prefix}-${name}`,
      locationCode: location,
    } as RequiredDataFromCollectionSlug<'personer'>,
  })

// The roles that give rights over a mandate are found by their fixed code.
const roleWithCode = async (code: string, name: string) => {
  const { docs } = await payload.find({ collection: 'roller', where: { code: { equals: code } } })
  if (docs[0]) return docs[0]
  const role = await payload.create({ collection: 'roller', data: { name, code } })
  createdRoles.push(role.id)
  return role
}

const join = (t: Team, p: Person, roles: Role[]) =>
  payload.create({
    collection: 'teammedlemskap',
    data: { team: t.id, person: p.id, roles: roles.map((r) => r.id) },
  })

// A signed-in user linked to a new person with these roles in a team.
const member = async (name: string, t: Team, roles: Role[]) => {
  const p = await person(name)
  await join(t, p, roles)
  return { user: await user(name, [], p), person: p }
}

// A mandate for a fresh team, through the API as `who`.
const newTeam = async (n: string) => {
  const teamType = await payload.find({ collection: 'teamtyper', where: { name: { like: prefix } }, limit: 1 })
  return payload.create({
    collection: 'team',
    data: { name: `${prefix} Team ${n}`, teamType: teamType.docs[0].id } as RequiredDataFromCollectionSlug<'team'>,
  })
}

const draftFor = (teamId: number, who: User, data: Partial<Mandate> = content) =>
  payload.create({ collection: 'mandater', data: { team: teamId, ...data } as Mandate, draft: true, ...as(who) })

const saveDraft = (id: number, who: User, data: Partial<Mandate>) =>
  payload.update({ collection: 'mandater', id, data, draft: true, ...as(who) })

const approve = (id: number, who: User, data: Partial<Mandate> = {}) =>
  payload.update({ collection: 'mandater', id, data: { ...data, _status: 'published' }, ...as(who) })

const read = (id: number, who: User, draft = false) =>
  payload.findByID({ collection: 'mandater', id, draft, depth: 0, ...as(who) })

// Restores a version the way the REST endpoint and the admin panel's Restore
// button do. The Local API's restoreVersion has no `draft` option, so it
// always restores as published.
const restore = async (versionId: string, who: User, draft: boolean) =>
  restoreVersionOperation({
    id: versionId,
    collection: payload.collections.mandater,
    draft,
    overrideAccess: false,
    req: await createLocalReq({ user: { ...who, collection: 'brukere' } }, payload),
  })

const idOf = (value: unknown) => (value && typeof value === 'object' ? (value as { id: number }).id : value)

const reqAs = (who: User) => createLocalReq({ user: { ...who, collection: 'brukere' } }, payload)

const today = () => {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

describe('Mandates', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await user('admin', ['admin'])
    location = (await payload.create({ collection: 'lokasjoner', data: { code: `${prefix}-LEI`, name: 'Leikanger' } }))
      .code
    ;[leadRole, ownerRole] = await Promise.all([
      roleWithCode('teamleder', 'Teamleder'),
      roleWithCode('teameier', 'Teameier'),
    ])
    await payload.create({ collection: 'teamtyper', data: { name: `${prefix} Produktteam` } })
    team = await newTeam('Skjema')
    otherTeam = await newTeam('Annet')
    reader = await user('reader')
    ;({ user: teamLead, person: leadPerson } = await member('teamleder', team, [leadRole]))
    ;({ user: teamOwner, person: ownerPerson } = await member('teameier', team, [ownerRole]))
    otherLead = (await member('annen-teamleder', otherTeam, [leadRole])).user
    unit = await payload.create({
      collection: 'enheter',
      data: {
        externalUnitId: `${prefix}-unit`,
        name: `${prefix} Seksjon`,
        level: 'section',
        active: true,
      } as RequiredDataFromCollectionSlug<'enheter'>,
    })
  })

  afterAll(async () => {
    // Deleting the teams deletes their mandates and memberships.
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'mandater', where: { 'unit.externalUnitId': { like: prefix } } })
    await payload.delete({ collection: 'enheter', where: { externalUnitId: { like: prefix } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    if (createdRoles.length) await payload.delete({ collection: 'roller', where: { id: { in: createdRoles } } })
    await payload.delete({ collection: 'lokasjoner', where: { code: { like: prefix } } })
  })

  it('TO-17: keeps every version, not only the last 100', () => {
    expect(payload.collections.mandater.config.versions).toMatchObject({ maxPerDoc: 0 })
  })

  describe('a team mandate from first draft to approval', () => {
    let mandate: Mandate

    it('TO-09: lets the teamleder save a draft, incomplete if need be', async () => {
      mandate = await draftFor(team.id, teamLead, { problem: content.problem })
      expect(mandate._status).toBe('draft')
      expect(mandate.status).toBe('draft')
      expect(mandate.approvedAt).toBeFalsy()
    })

    it('TO-10: tells which fields are missing', async () => {
      const draft = await read(mandate.id, teamLead, true)
      expect(draft.complete).toBe(false)
      expect(draft.missingFields).toEqual(['outcomes', 'expectations', 'collaboration'])
    })

    it('hides a mandate that has never been approved from readers', async () => {
      await expect(read(mandate.id, reader)).rejects.toThrow()
      await expect(read(mandate.id, reader, true)).rejects.toThrow()
      for (const draft of [false, true]) {
        const { docs } = await payload.find({
          collection: 'mandater',
          where: { id: { equals: mandate.id } },
          draft,
          ...as(reader),
        })
        expect(docs).toEqual([])
      }
      const withMandate = await payload.findByID({ collection: 'team', id: team.id, depth: 1, ...as(reader) })
      expect(withMandate.mandate?.docs ?? []).toEqual([])
    })

    it('TO-16: refuses approval by the teamleder', async () => {
      await saveDraft(mandate.id, teamLead, content)
      await expect(approve(mandate.id, teamLead)).rejects.toThrow()
      expect((await read(mandate.id, teamLead, true))._status).toBe('draft')
    })

    it('TO-16: refuses changes that are neither a draft nor an approval', async () => {
      // Without `draft`, Payload writes straight to the published mandate.
      await expect(
        payload.update({ collection: 'mandater', id: mandate.id, data: { problem: 'Uten utkast' }, ...as(teamLead) }),
      ).rejects.toThrow()
      // ...and `_status: 'draft'` without it unpublishes.
      await expect(
        payload.update({ collection: 'mandater', id: mandate.id, data: { _status: 'draft' }, ...as(teamOwner) }),
      ).rejects.toThrow()
      await expect(
        payload.update({ collection: 'mandater', id: mandate.id, data: { _status: 'draft' }, ...as(admin) }),
      ).rejects.toThrow()
    })

    it('TO-16: lets the teameier approve, which makes the mandate current, dated today and signed by them', async () => {
      // Who approved is recorded by the CMS, whatever the request says.
      const approved = await approve(mandate.id, teamOwner, { approvedBy: leadPerson.id })
      expect(approved._status).toBe('published')
      expect(approved.status).toBe('current')
      expect(approved.approvedAt).toBe(today())
      expect(idOf(approved.approvedBy)).toBe(ownerPerson.id)
      expect(approved.complete).toBe(true)
      expect(idOf((await read(mandate.id, reader)).approvedBy)).toBe(ownerPerson.id)
    })

    it('TO-04: shows the approved mandate to everyone, also on the team', async () => {
      const seen = await read(mandate.id, reader)
      expect(seen.problem).toBe(content.problem)
      expect(seen.status).toBe('current')
      const withMandate = await payload.findByID({ collection: 'team', id: team.id, depth: 1, ...as(reader) })
      expect((withMandate.mandate?.docs?.[0] as Mandate).id).toBe(mandate.id)
    })

    it('keeps showing the approved mandate while a new draft is worked on', async () => {
      await saveDraft(mandate.id, teamLead, { problem: 'Et nytt problem.' })

      const seen = await read(mandate.id, reader)
      expect(seen.problem).toBe(content.problem)
      expect(seen.status).toBe('current')
      expect(seen.approvedAt).toBe(today())
      // Asking for drafts doesn't get a reader the draft either.
      const asDraft = await read(mandate.id, reader, true).catch(() => null)
      expect(asDraft?.problem).not.toBe('Et nytt problem.')
      const withMandate = await payload.findByID({ collection: 'team', id: team.id, depth: 1, ...as(reader) })
      expect((withMandate.mandate?.docs?.[0] as Mandate).problem).toBe(content.problem)

      const draft = await read(mandate.id, teamLead, true)
      expect(draft.problem).toBe('Et nytt problem.')
      expect(draft.status).toBe('draft')
      expect(draft.approvedAt).toBeFalsy()
      expect(draft.approvedBy).toBeFalsy()
    })

    it('TO-16: lets the teameier approve the new version with an earlier date', async () => {
      const approved = await approve(mandate.id, teamOwner, { approvedAt: '2026-11-02T00:00:00.000Z' })
      expect(approved.problem).toBe('Et nytt problem.')
      expect(approved.status).toBe('current')
      expect(approved.approvedAt).toBe('2026-11-02T00:00:00.000Z')
      expect((await read(mandate.id, reader)).problem).toBe('Et nytt problem.')
    })

    it('TO-17: keeps every version, and shows drafts only to those who edit', async () => {
      const versions = (who: User) =>
        payload.findVersions({
          collection: 'mandater',
          where: { parent: { equals: mandate.id } },
          sort: 'createdAt',
          pagination: false,
          ...as(who),
        })
      const all = await versions(teamLead)
      // Draft, draft, approval, draft, approval.
      expect(all.docs.map((v) => v.version._status)).toEqual(['draft', 'draft', 'published', 'draft', 'published'])
      const approved = await versions(reader)
      expect(approved.docs.map((v) => v.version.problem)).toEqual([content.problem, 'Et nytt problem.'])
    })

    it('TO-17: restores an earlier version only as a draft, to be approved again', async () => {
      const { docs } = await payload.findVersions({
        collection: 'mandater',
        where: { parent: { equals: mandate.id }, 'version._status': { equals: 'published' } },
        sort: 'createdAt',
        limit: 1,
      })
      const first = docs[0]
      // Restoring without `draft` would publish the old version unapproved,
      // and restoring a draft version that way would unpublish the mandate.
      await expect(restore(first.id, teamLead, false)).rejects.toThrow()
      await expect(restore(first.id, admin, false)).rejects.toThrow()
      await expect(payload.restoreVersion({ collection: 'mandater', id: first.id, ...as(admin) })).rejects.toThrow()

      await restore(first.id, teamLead, true)
      const draft = await read(mandate.id, teamLead, true)
      expect(draft.problem).toBe(content.problem)
      expect(draft.team).toBe(team.id)
      expect(draft.status).toBe('draft')
      expect(draft.approvedAt).toBeFalsy()
      const seen = await read(mandate.id, reader)
      expect(seen.problem).toBe('Et nytt problem.')
      expect(seen.approvedAt).toBe('2026-11-02T00:00:00.000Z')
    })

    it('TO-16: refuses an approval dated in the future', async () => {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) + 'T12:00:00.000Z'
      await expect(approve(mandate.id, teamOwner, { approvedAt: tomorrow })).rejects.toThrow(/approvedAt/)
      expect((await read(mandate.id, reader)).approvedAt).toBe('2026-11-02T00:00:00.000Z')
    })

    it('TO-16: approving the restored draft makes it the current mandate', async () => {
      const approved = await approve(mandate.id, teamOwner)
      expect(approved.status).toBe('current')
      expect(approved.problem).toBe(content.problem)
      expect(approved.approvedAt).toBe(today())
    })

    it('never moves a mandate to another team', async () => {
      const moved = await payload.update({
        collection: 'mandater',
        id: mandate.id,
        data: { team: otherTeam.id },
        draft: true,
        depth: 0,
        ...as(admin),
      })
      expect(moved.team).toBe(team.id)
    })

    it('allows one mandate per team', async () => {
      await expect(draftFor(team.id, admin)).rejects.toThrow()
    })
  })

  describe('who may do what', () => {
    let mandate: Mandate

    beforeAll(async () => {
      mandate = await draftFor(otherTeam.id, otherLead)
    })

    it('refuses readers', async () => {
      const t = await newTeam('Leser')
      await expect(draftFor(t.id, reader)).rejects.toThrow()
      await expect(saveDraft(mandate.id, reader, { problem: 'Nei' })).rejects.toThrow()
      await expect(approve(mandate.id, reader)).rejects.toThrow()
    })

    it("refuses editors of other teams, and hides other teams' drafts from them", async () => {
      await expect(saveDraft(mandate.id, teamLead, { problem: 'Nei' })).rejects.toThrow()
      await expect(read(mandate.id, teamLead, true)).rejects.toThrow()
    })

    it('refuses a teamleder who creates a mandate as approved', async () => {
      const t = await newTeam('Snarvei')
      await join(t, leadPerson, [leadRole])
      await expect(
        payload.create({
          collection: 'mandater',
          data: { team: t.id, ...content, _status: 'published' } as Mandate,
          ...as(teamLead),
        }),
      ).rejects.toThrow()
      // As a draft, the same mandate is fine.
      expect((await draftFor(t.id, teamLead)).status).toBe('draft')
    })

    it('TO-16: lets a teamleder not set who approved a draft', async () => {
      const draft = await saveDraft(mandate.id, otherLead, { approvedBy: leadPerson.id })
      expect(draft.approvedBy).toBeFalsy()
    })

    it('records no approver when an administrator without a person approves', async () => {
      const t = await newTeam('Admin')
      const draft = await draftFor(t.id, admin)
      const approved = await approve(draft.id, admin)
      expect(approved.status).toBe('current')
      expect(approved.approvedBy).toBeFalsy()
    })

    it("lists only their own teams' mandates to team editors in the admin panel, and offers only those teams", async () => {
      const { baseFilter } = payload.collections.mandater.config.admin
      const where = await baseFilter!({ req: await reqAs(otherLead), limit: 10, page: 1, sort: '' })
      const { docs } = await payload.find({ collection: 'mandater', where: where ?? {}, draft: true, depth: 0 })
      expect(docs.map((d) => idOf(d.team))).toEqual([otherTeam.id])
      expect(await baseFilter!({ req: await reqAs(admin), limit: 10, page: 1, sort: '' })).toBeNull()

      const field = payload.collections.mandater.config.fields.find((f) => 'name' in f && f.name === 'team')
      const filterOptions = (field as unknown as { filterOptions: (args: { req: unknown }) => Promise<unknown> })
        .filterOptions
      expect(await filterOptions({ req: await reqAs(otherLead) })).toEqual({ id: { in: [otherTeam.id] } })
      expect(await filterOptions({ req: await reqAs(reader) })).toEqual({ id: { in: [] } })
      expect(await filterOptions({ req: await reqAs(admin) })).toBe(true)
    })

    it('refuses to approve an incomplete mandate', async () => {
      const t = await newTeam('Halv')
      const half = await draftFor(t.id, admin, { problem: content.problem })
      await expect(approve(half.id, admin)).rejects.toThrow()
    })

    it('lets only administrators delete a mandate, which deletes its history', async () => {
      await expect(payload.delete({ collection: 'mandater', id: mandate.id, ...as(otherLead) })).rejects.toThrow()
      await payload.delete({ collection: 'mandater', id: mandate.id, ...as(admin) })
      const { totalDocs } = await payload.findVersions({
        collection: 'mandater',
        where: { parent: { equals: mandate.id } },
      })
      expect(totalDocs).toBe(0)
    })
  })

  describe('a unit mandate', () => {
    it('requires exactly one owner, a team or a unit', async () => {
      await expect(
        payload.create({ collection: 'mandater', data: { ...content } as Mandate, draft: true, ...as(admin) }),
      ).rejects.toThrow()
      await expect(
        payload.create({
          collection: 'mandater',
          data: { ...content, team: otherTeam.id, unit: unit.id } as Mandate,
          draft: true,
          ...as(admin),
        }),
      ).rejects.toThrow()
    })

    it('LO-02: shows the approved mandate on the unit', async () => {
      const mandate = await payload.create({
        collection: 'mandater',
        data: { unit: unit.id, ...content } as Mandate,
        draft: true,
        ...as(admin),
      })
      await approve(mandate.id, admin)
      const withMandate = await payload.findByID({ collection: 'enheter', id: unit.id, depth: 1, ...as(reader) })
      expect((withMandate.mandate?.docs?.[0] as Mandate).status).toBe('current')
    })

    it('is titled by its owner in the admin panel, a unit or a team', async () => {
      const { docs } = await payload.find({
        collection: 'mandater',
        where: { or: [{ unit: { equals: unit.id } }, { team: { equals: team.id } }] },
        sort: 'id',
        depth: 0,
        ...as(admin),
      })
      expect(docs.map((d) => d.title)).toEqual([`Mandat for ${team.name}`, `Mandat for ${unit.name}`])
    })

    it('ignores a sort on a calculated field instead of returning nothing', async () => {
      for (const sort of ['title', '-status', 'complete']) {
        const { totalDocs } = await payload.find({ collection: 'mandater', sort, ...as(admin) })
        expect(totalDocs).toBeGreaterThan(0)
      }
    })
  })
})

describe('isAfterToday', () => {
  // The admin panel stores a picked day at noon UTC.
  it('compares the picked day with today in Norway', () => {
    // 00:30 on 24 November in Oslo, still the 23rd in UTC.
    const now = new Date('2026-11-23T23:30:00.000Z')
    expect(isAfterToday('2026-11-24T12:00:00.000Z', now)).toBe(false)
    expect(isAfterToday('2026-11-23T00:00:00.000Z', now)).toBe(false)
    expect(isAfterToday('2026-11-25T12:00:00.000Z', now)).toBe(true)
  })
})
