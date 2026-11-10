import { getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Location, Role, Team, User } from '@/payload-types'

let payload: Payload
let user: User
let admin: User
let location: Location
let teamLead: Role
let productOwner: Role
let teamMember: Role

// Prefix for every test row, so cleanup never touches other data.
const prefix = `int-teams-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

const person = (n: number) =>
  payload.create({
    collection: 'personer',
    data: {
      firstName: 'Kari',
      lastName: `Nordmann ${n}`,
      email: `${prefix}-${n}@example.com`,
      externalId: `${prefix}-person-${n}`,
      externalLocationId: location.externalLocationId,
    } as RequiredDataFromCollectionSlug<'personer'>,
  })

const team = (n: number) =>
  payload.create({
    collection: 'team',
    data: {
      name: `${prefix} Team ${n}`,
      teamType: 'product',
    } as RequiredDataFromCollectionSlug<'team'>,
  })

const ids = (docs: (number | { id: number })[] | undefined) =>
  (docs ?? []).map((d) => (typeof d === 'object' ? d.id : d))

describe('Teams', () => {
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
    location = await payload.create({
      collection: 'lokasjoner',
      data: { externalLocationId: `${prefix}-loc`, code: `${prefix}-LEI`, name: 'Leikanger' },
    })
    // Roles and team types are content that administrators create.
    const role = (name: string) =>
      payload.create({ collection: 'roller', data: { name: `${prefix} ${name}` } })
    teamLead = await role('Teamleder')
    productOwner = await role('Produkteier')
    teamMember = await role('Teammedlem')
  })

  afterAll(async () => {
    // Deleting the teams deletes their memberships.
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'roller', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    await payload.delete({
      collection: 'lokasjoner',
      where: { externalLocationId: { like: prefix } },
    })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('TO-02: requires a known team type', async () => {
    await expect(
      payload.create({
        collection: 'team',
        data: { name: `${prefix} Uten type` } as RequiredDataFromCollectionSlug<'team'>,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'team',
        data: {
          name: `${prefix} Ukjent type`,
          teamType: 'squad' as Team['teamType'],
        } as RequiredDataFromCollectionSlug<'team'>,
      }),
    ).rejects.toThrow()
  })

  it('marks new teams as active by default', async () => {
    expect((await team(1)).active).toBe(true)
  })

  it('requires at least one role, chosen by whoever adds the person', async () => {
    const t = await team(2)
    const p = await person(1)
    await expect(
      payload.create({
        collection: 'teammedlemskap',
        data: { team: t.id, person: p.id, roles: [] },
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'teammedlemskap',
        data: { team: t.id, person: p.id } as RequiredDataFromCollectionSlug<'teammedlemskap'>,
      }),
    ).rejects.toThrow()
  })

  it('allows only one membership per person and team', async () => {
    const t = await team(3)
    const p = await person(2)
    await payload.create({
      collection: 'teammedlemskap',
      data: { team: t.id, person: p.id, roles: [teamMember.id] },
    })
    await expect(
      payload.create({
        collection: 'teammedlemskap',
        data: { team: t.id, person: p.id, roles: [productOwner.id] },
      }),
    ).rejects.toThrow()
  })

  it('TO-03, FO-02, RO-05: shows members with their roles on the team, and teams on the person', async () => {
    const t = await team(4)
    const kari = await person(3)
    const ola = await person(4)
    const lead = await payload.create({
      collection: 'teammedlemskap',
      data: { team: t.id, person: kari.id, roles: [teamLead.id, productOwner.id] },
    })
    const member = await payload.create({
      collection: 'teammedlemskap',
      data: { team: t.id, person: ola.id, roles: [teamMember.id] },
    })

    const found = await payload.findByID({ collection: 'team', id: t.id, depth: 1 })
    expect(ids(found.members?.docs)).toEqual(expect.arrayContaining([lead.id, member.id]))

    const withTeams = await payload.findByID({ collection: 'personer', id: kari.id, depth: 1 })
    expect(ids(withTeams.teams?.docs)).toEqual([lead.id])

    const leads = await payload.find({
      collection: 'teammedlemskap',
      where: { team: { equals: t.id }, roles: { in: [teamLead.id] } },
      depth: 0,
    })
    expect(leads.docs.map((d) => d.person)).toEqual([kari.id])
  })

  it('deletes the memberships with the team', async () => {
    const t = await team(5)
    await payload.create({
      collection: 'teammedlemskap',
      data: { team: t.id, person: (await person(5)).id, roles: [teamMember.id] },
    })
    await payload.delete({ collection: 'team', id: t.id })
    const { totalDocs } = await payload.count({
      collection: 'teammedlemskap',
      where: { team: { equals: t.id } },
    })
    expect(totalDocs).toBe(0)
  })

  it('hides teams, roles and memberships from anonymous users', async () => {
    for (const collection of ['team', 'roller', 'teammedlemskap'] as const) {
      await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow()
      await expect(payload.find({ collection, ...as(user) })).resolves.toBeDefined()
    }
  })

  it('TO-08, RO-06: only administrators change teams and memberships for now', async () => {
    const t = await team(6)
    const p = await person(6)
    await expect(
      payload.create({
        collection: 'team',
        data: {
          name: `${prefix} Team 7`,
          teamType: 'product',
        } as RequiredDataFromCollectionSlug<'team'>,
        ...as(user),
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'team',
        id: t.id,
        data: { name: `${prefix} Nytt navn` },
        ...as(user),
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'teammedlemskap',
        data: { team: t.id, person: p.id, roles: [teamMember.id] },
        ...as(user),
      }),
    ).rejects.toThrow()

    const membership = await payload.create({
      collection: 'teammedlemskap',
      data: { team: t.id, person: p.id, roles: [teamLead.id] },
      ...as(admin),
    })
    expect(ids(membership.roles)).toEqual([teamLead.id])
  })

  it('RO-07: lets only administrators create and delete roles', async () => {
    await expect(
      payload.create({ collection: 'roller', data: { name: `${prefix} Rolle 1` }, ...as(user) }),
    ).rejects.toThrow()

    const created = await payload.create({
      collection: 'roller',
      data: { name: `${prefix} Rolle 2` },
      ...as(admin),
    })
    await expect(
      payload.delete({ collection: 'roller', id: created.id, ...as(user) }),
    ).rejects.toThrow()
    await payload.delete({ collection: 'roller', id: created.id, ...as(admin) })
  })
})
