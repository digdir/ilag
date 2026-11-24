import { createLocalReq, getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { teamIdsWithRoles } from '@/access/teamEditor'
import type { Person, Role, Team, User } from '@/payload-types'

// Teameiere and teamledere change their own teams and members in the admin
// panel, and nothing else (TO-08, RO-06).

let payload: Payload
let location: string
let teamType: number
let owner: Role
let lead: Role
let productOwner: Role
let member: Role
let ownTeam: Team
let otherTeam: Team
let ownerUser: User
let leadUser: User
let productOwnerUser: User
let memberUser: User
let unlinkedUser: User
let admin: User
let outsider: Person
const createdRoles: number[] = []

const prefix = `int-editors-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

const person = (n: number) =>
  payload.create({
    collection: 'personer',
    data: {
      firstName: 'Kari',
      lastName: `Nordmann ${n}`,
      email: `${prefix}-person-${n}@example.com`,
      externalId: `${prefix}-person-${n}`,
      employeeNumber: `${prefix}-${n}`,
      locationCode: location,
    } as RequiredDataFromCollectionSlug<'personer'>,
  })

const team = (name: string) =>
  payload.create({
    collection: 'team',
    data: { name: `${prefix} ${name}`, teamType } as RequiredDataFromCollectionSlug<'team'>,
  })

const join = (t: Team, p: Person, roles: Role[]) =>
  payload.create({
    collection: 'teammedlemskap',
    data: { team: t.id, person: p.id, roles: roles.map((r) => r.id) },
  })

const userFor = async (n: string, p?: Person) =>
  payload.create({
    collection: 'brukere',
    data: { email: `${prefix}-${n}@example.com`, password: 'test-password', person: p?.id },
  })

// The roles that give edit rights are found by their fixed code.
const roleWithCode = async (code: string, name: string) => {
  const { docs } = await payload.find({ collection: 'roller', where: { code: { equals: code } } })
  if (docs[0]) return docs[0]
  const role = await payload.create({ collection: 'roller', data: { name, code } })
  createdRoles.push(role.id)
  return role
}

const mayUseAdminPanel = async (u: User) => {
  const req = await createLocalReq({ user: { ...u, collection: 'brukere' } }, payload)
  return payload.collections.brukere.config.access.admin!({ req })
}

describe('Team editors', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // In an empty database the first user becomes an administrator.
    admin = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}-admin@example.com`, password: 'test-password', roles: ['admin'] },
    })
    location = (await payload.create({ collection: 'lokasjoner', data: { code: `${prefix}-LEI`, name: 'Leikanger' } }))
      .code
    teamType = (await payload.create({ collection: 'teamtyper', data: { name: `${prefix} Produktteam` } })).id
    owner = await roleWithCode('teameier', 'Teameier')
    lead = await roleWithCode('teamleder', 'Teamleder')
    productOwner = await payload.create({ collection: 'roller', data: { name: `${prefix} Produkteier` } })
    member = await payload.create({ collection: 'roller', data: { name: `${prefix} Teammedlem` } })

    ownTeam = await team('Eget team')
    otherTeam = await team('Annet team')
    const [ownerPerson, leadPerson, productOwnerPerson, memberPerson] = await Promise.all([
      person(1),
      person(2),
      person(3),
      person(4),
    ])
    outsider = await person(5)
    await join(ownTeam, ownerPerson, [owner])
    await join(ownTeam, leadPerson, [lead, productOwner])
    await join(ownTeam, productOwnerPerson, [productOwner])
    await join(ownTeam, memberPerson, [member])
    await join(otherTeam, memberPerson, [member])

    ownerUser = await userFor('owner', ownerPerson)
    leadUser = await userFor('lead', leadPerson)
    productOwnerUser = await userFor('product-owner', productOwnerPerson)
    memberUser = await userFor('member', memberPerson)
    unlinkedUser = await userFor('unlinked')
  })

  afterAll(async () => {
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'verktoy', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'roller', where: { name: { like: prefix } } })
    if (createdRoles.length) await payload.delete({ collection: 'roller', where: { id: { in: createdRoles } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    await payload.delete({ collection: 'lokasjoner', where: { code: { like: prefix } } })
  })

  it('TO-08: lets the teameier and the teamleder change their own team', async () => {
    for (const u of [ownerUser, leadUser]) {
      const updated = await payload.update({
        collection: 'team',
        id: ownTeam.id,
        data: { description: `Endret av ${u.email}` },
        ...as(u),
      })
      expect(updated.description).toBe(`Endret av ${u.email}`)
    }
  })

  it('TO-08: refuses changes to other teams, and to anyone without an editor role', async () => {
    await expect(
      payload.update({ collection: 'team', id: otherTeam.id, data: { description: 'Nei' }, ...as(leadUser) }),
    ).rejects.toThrow()
    for (const u of [productOwnerUser, memberUser, unlinkedUser]) {
      await expect(
        payload.update({ collection: 'team', id: ownTeam.id, data: { description: 'Nei' }, ...as(u) }),
      ).rejects.toThrow()
    }
  })

  it('VK-06: lets the teamleder register the tools their own team uses, and no other team\'s', async () => {
    const tool = await payload.create({
      collection: 'verktoy',
      data: { name: `${prefix} Retrospektiv`, toolType: 'metode', description: 'Fast øvelse.' },
    })

    const updated = await payload.update({
      collection: 'team',
      id: ownTeam.id,
      data: { tools: [tool.id] },
      depth: 0,
      ...as(leadUser),
    })
    expect(updated.tools).toEqual([tool.id])

    await expect(
      payload.update({ collection: 'team', id: otherTeam.id, data: { tools: [tool.id] }, ...as(leadUser) }),
    ).rejects.toThrow()
    await expect(
      payload.update({ collection: 'team', id: ownTeam.id, data: { tools: [] }, ...as(memberUser) }),
    ).rejects.toThrow()
  })

  it('TO-08: leaves creating and deleting teams to administrators', async () => {
    await expect(
      payload.create({
        collection: 'team',
        data: { name: `${prefix} Nytt`, teamType } as RequiredDataFromCollectionSlug<'team'>,
        ...as(ownerUser),
      }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: 'team', id: ownTeam.id, ...as(ownerUser) })).rejects.toThrow()
  })

  it('RO-06: lets the teamleder add, change and remove members of their team', async () => {
    const added = await payload.create({
      collection: 'teammedlemskap',
      data: { team: ownTeam.id, person: outsider.id, roles: [member.id] },
      ...as(leadUser),
    })
    const changed = await payload.update({
      collection: 'teammedlemskap',
      id: added.id,
      data: { roles: [member.id, productOwner.id] },
      depth: 0,
      ...as(leadUser),
    })
    expect(changed.roles).toEqual([member.id, productOwner.id])
    await payload.delete({ collection: 'teammedlemskap', id: added.id, ...as(leadUser) })
  })

  it('RO-06: refuses members in other teams, and moving a member to another team', async () => {
    await expect(
      payload.create({
        collection: 'teammedlemskap',
        data: { team: otherTeam.id, person: outsider.id, roles: [member.id] },
        ...as(ownerUser),
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'teammedlemskap',
        data: { team: ownTeam.id, person: outsider.id, roles: [member.id] },
        ...as(memberUser),
      }),
    ).rejects.toThrow()

    const { docs } = await payload.find({
      collection: 'teammedlemskap',
      where: { team: { equals: otherTeam.id } },
      depth: 0,
    })
    await expect(
      payload.update({ collection: 'teammedlemskap', id: docs[0]!.id, data: { roles: [lead.id] }, ...as(ownerUser) }),
    ).rejects.toThrow()

    const added = await payload.create({
      collection: 'teammedlemskap',
      data: { team: ownTeam.id, person: outsider.id, roles: [member.id] },
      ...as(ownerUser),
    })
    // The team field is read-only for editors, so the change is ignored.
    const moved = await payload.update({
      collection: 'teammedlemskap',
      id: added.id,
      data: { team: otherTeam.id },
      depth: 0,
      ...as(ownerUser),
    })
    expect(moved.team).toBe(ownTeam.id)
    await payload.delete({ collection: 'teammedlemskap', id: added.id })
  })

  it('TO-01: still lets everyone signed in read all teams', async () => {
    for (const u of [leadUser, memberUser, unlinkedUser]) {
      const { docs } = await payload.find({
        collection: 'team',
        where: { name: { like: prefix } },
        depth: 0,
        ...as(u),
      })
      expect(docs.map((t) => t.id).sort()).toEqual([ownTeam.id, otherTeam.id].sort())
    }
  })

  it('TO-08: opens the admin panel to team editors only', async () => {
    expect(await mayUseAdminPanel(ownerUser)).toBe(true)
    expect(await mayUseAdminPanel(leadUser)).toBe(true)
    expect(await mayUseAdminPanel(productOwnerUser)).toBe(false)
    expect(await mayUseAdminPanel(memberUser)).toBe(false)
    expect(await mayUseAdminPanel(unlinkedUser)).toBe(false)
  })

  it('TO-08: tells team editors on their own user that they may use the admin panel', async () => {
    const self = (u: User) => payload.findByID({ collection: 'brukere', id: u.id, depth: 0, ...as(u) })

    expect((await self(leadUser)).canAccessAdmin).toBe(true)
    expect((await self(memberUser)).canAccessAdmin).toBe(false)
  })

  it('TO-08: checks roles by their code, so renaming a role changes no rights', async () => {
    await payload.update({ collection: 'roller', id: lead.id, data: { name: `${prefix} Leder` } })
    try {
      const updated = await payload.update({
        collection: 'team',
        id: ownTeam.id,
        data: { description: 'Etter navnebytte' },
        ...as(leadUser),
      })
      expect(updated.description).toBe('Etter navnebytte')
    } finally {
      await payload.update({ collection: 'roller', id: lead.id, data: { name: lead.name } })
    }
  })

  it('finds the teams where the user has given roles, such as only teameier', async () => {
    const reqFor = (u: User) => createLocalReq({ user: { ...u, collection: 'brukere' } }, payload)
    expect(await teamIdsWithRoles(await reqFor(ownerUser), ['teameier'])).toEqual([ownTeam.id])
    expect(await teamIdsWithRoles(await reqFor(leadUser), ['teameier'])).toEqual([])
    expect(await teamIdsWithRoles(await reqFor(leadUser), ['teameier', 'teamleder'])).toEqual([ownTeam.id])
  })

  it('RO-07: gives a new role a code from its name, and never changes it', async () => {
    const role = await payload.create({ collection: 'roller', data: { name: `${prefix} KI-agent Æøå` } })
    expect(role.code).toBe(`${prefix}-ki-agent-aeoa`)

    const renamed = await payload.update({
      collection: 'roller',
      id: role.id,
      data: { name: `${prefix} Nytt navn`, code: 'noe-annet' },
      user: { ...admin, collection: 'brukere' },
      overrideAccess: false,
    })
    expect(renamed.name).toBe(`${prefix} Nytt navn`)
    expect(renamed.code).toBe(`${prefix}-ki-agent-aeoa`)
  })

  it('RO-07: refuses a code another role has, or one that isn\'t a code', async () => {
    await expect(
      payload.create({ collection: 'roller', data: { name: `${prefix} Kopi`, code: 'teamleder' } }),
    ).rejects.toThrow()
    await expect(
      payload.create({ collection: 'roller', data: { name: `${prefix} Feil`, code: 'Team Leder' } }),
    ).rejects.toThrow()
  })

  it('TO-08: lets only administrators link a user to a person', async () => {
    const updated = await payload.update({
      collection: 'brukere',
      id: unlinkedUser.id,
      data: { person: outsider.id },
      depth: 0,
      ...as(unlinkedUser),
    }).catch(() => null)
    // Users can't update themselves at all; the field is admin-only either way.
    expect(updated?.person ?? null).toBeNull()
  })
})
