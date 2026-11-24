import { createLocalReq, getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Feedback, Person, Team, Unit, User } from '@/payload-types'

// Feedback goes to whoever owns the content and the reporter, never to
// everyone (TB-01–TB-05).

let payload: Payload
let admin: User
let teamOwner: User
let teamLead: User
let unitLeader: User
let reporter: User
let otherUser: User
let integration: User
let team: Team
let otherTeam: Team
let unit: Unit
const createdRoles: number[] = []

const prefix = `int-feedback-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

const report = (u: User, extra: Partial<Feedback> = {}) =>
  payload.create({
    collection: 'tilbakemeldinger',
    data: {
      category: 'faktafeil',
      text: `${prefix} feil`,
      page: '/',
      contactMe: true,
      ...extra,
    } as RequiredDataFromCollectionSlug<'tilbakemeldinger'>,
    depth: 0,
    ...as(u),
  })

const readable = async (u: User) => {
  const { docs } = await payload.find({
    collection: 'tilbakemeldinger',
    where: { text: { like: prefix } },
    pagination: false,
    depth: 0,
    ...as(u),
  })
  return docs.map((d) => d.id).sort()
}

const mayUseAdminPanel = async (u: User) => {
  const req = await createLocalReq({ user: { ...u, collection: 'brukere' } }, payload)
  return payload.collections.brukere.config.access.admin!({ req })
}

describe('Feedback', () => {
  let location: string
  let n = 0
  const person = () =>
    payload.create({
      collection: 'personer',
      data: {
        firstName: 'Kari',
        lastName: `Nordmann ${++n}`,
        email: `${prefix}-person-${n}@example.com`,
        externalId: `${prefix}-person-${n}`,
        employeeNumber: `${prefix}-${n}`,
        locationCode: location,
      } as RequiredDataFromCollectionSlug<'personer'>,
    })
  const userFor = (name: string, p?: Person, roles?: User['roles']) =>
    payload.create({
      collection: 'brukere',
      data: {
        email: `${prefix}-${name}@example.com`,
        password: 'test-password',
        person: p?.id,
        roles,
      },
    })
  const roleWithCode = async (code: string) => {
    const { docs } = await payload.find({ collection: 'roller', where: { code: { equals: code } } })
    if (docs[0]) return docs[0]
    const role = await payload.create({
      collection: 'roller',
      data: { name: `${prefix} ${code}`, code },
    })
    createdRoles.push(role.id)
    return role
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await userFor('admin', undefined, ['admin'])
    location = (
      await payload.create({
        collection: 'lokasjoner',
        data: { code: `${prefix}-LEI`, name: 'Leikanger' },
      })
    ).code
    const teamType = (
      await payload.create({ collection: 'teamtyper', data: { name: `${prefix} Produktteam` } })
    ).id
    const newTeam = (name: string) =>
      payload.create({
        collection: 'team',
        data: { name: `${prefix} ${name}`, teamType } as RequiredDataFromCollectionSlug<'team'>,
      })
    team = await newTeam('Eget')
    otherTeam = await newTeam('Annet')

    const [ownerP, leadP, unitLeaderP] = await Promise.all([person(), person(), person()])
    const [ownerRole, leadRole] = await Promise.all([
      roleWithCode('teameier'),
      roleWithCode('teamleder'),
    ])
    await payload.create({
      collection: 'teammedlemskap',
      data: { team: team.id, person: ownerP.id, roles: [ownerRole.id] },
    })
    await payload.create({
      collection: 'teammedlemskap',
      data: { team: team.id, person: leadP.id, roles: [leadRole.id] },
    })
    unit = await payload.create({
      collection: 'enheter',
      data: {
        externalUnitId: `${prefix}-unit`,
        name: `${prefix} Enhet`,
        level: 'division',
        leader: unitLeaderP.id,
        advisesAllOfDigdir: false,
        active: true,
      },
    })

    teamOwner = await userFor('owner', ownerP)
    teamLead = await userFor('lead', leadP)
    unitLeader = await userFor('unit-leader', unitLeaderP)
    reporter = await userFor('reporter', await person())
    otherUser = await userFor('other', await person())
    integration = await userFor('integration', undefined, ['integration'])
  })

  afterAll(async () => {
    await payload.delete({ collection: 'tilbakemeldinger', where: { text: { like: prefix } } })
    await payload.delete({ collection: 'enheter', where: { externalUnitId: { like: prefix } } })
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    if (createdRoles.length)
      await payload.delete({ collection: 'roller', where: { id: { in: createdRoles } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    await payload.delete({ collection: 'lokasjoner', where: { code: { like: prefix } } })
  })

  it('TB-01: lets anyone signed in report, and not the integration user', async () => {
    const created = await report(otherUser)
    expect(created.status).toBe('ny')
    await expect(report(integration)).rejects.toThrow()
  })

  it('TB-05: stores the reporter only when they may be contacted, and never someone else', async () => {
    const named = await report(reporter, { reporter: otherUser.id, status: 'rettet' })
    expect(named.reporter).toBe(reporter.id)
    expect(named.status).toBe('ny')

    const anonymous = await report(reporter, { contactMe: false, reporter: reporter.id })
    expect(anonymous.reporter).toBeFalsy()
  })

  it('TB-02: shows feedback only to the owner of the content, administrators and the reporter', async () => {
    const onTeam = await report(reporter, { team: team.id })
    const onOtherTeam = await report(otherUser, { team: otherTeam.id })
    const onUnit = await report(reporter, { unit: unit.id })
    const shared = await report(otherUser, { contactMe: false })

    const teamOwnerSees = await readable(teamOwner)
    expect(teamOwnerSees).toContain(onTeam.id)
    expect(teamOwnerSees).not.toContain(onOtherTeam.id)
    expect(teamOwnerSees).not.toContain(onUnit.id)
    expect(teamOwnerSees).not.toContain(shared.id)
    expect(await readable(teamLead)).toEqual(teamOwnerSees)

    const unitLeaderSees = await readable(unitLeader)
    expect(unitLeaderSees).toContain(onUnit.id)
    expect(unitLeaderSees).not.toContain(onTeam.id)
    expect(unitLeaderSees).not.toContain(shared.id)

    const reporterSees = await readable(reporter)
    expect(reporterSees).toContain(onTeam.id)
    expect(reporterSees).toContain(onUnit.id)
    expect(reporterSees).not.toContain(onOtherTeam.id)
    expect(reporterSees).not.toContain(shared.id)

    // Anonymous feedback belongs to no one, not even the one who sent it.
    expect(await readable(otherUser)).not.toContain(shared.id)
    expect(await readable(admin)).toEqual(
      expect.arrayContaining([onTeam.id, onOtherTeam.id, onUnit.id, shared.id]),
    )
  })

  it('TB-03: lets the owner and administrators set the status, and nothing else', async () => {
    const onTeam = await report(reporter, { team: team.id })
    const updated = await payload.update({
      collection: 'tilbakemeldinger',
      id: onTeam.id,
      data: { status: 'under-arbeid', text: 'Endret', team: otherTeam.id },
      depth: 0,
      ...as(teamLead),
    })
    expect(updated.status).toBe('under-arbeid')
    expect(updated.text).toBe(onTeam.text)
    expect(updated.team).toBe(team.id)

    for (const u of [reporter, unitLeader, otherUser]) {
      await expect(
        payload.update({
          collection: 'tilbakemeldinger',
          id: onTeam.id,
          data: { status: 'avvist' },
          ...as(u),
        }),
      ).rejects.toThrow()
    }
    const byAdmin = await payload.update({
      collection: 'tilbakemeldinger',
      id: onTeam.id,
      data: { status: 'rettet', reporter: otherUser.id },
      depth: 0,
      ...as(admin),
    })
    expect(byAdmin.status).toBe('rettet')
    expect(byAdmin.reporter).toBe(reporter.id)
    await expect(
      payload.delete({ collection: 'tilbakemeldinger', id: onTeam.id, ...as(teamLead) }),
    ).rejects.toThrow()
  })

  it('TB-02: lets unit leaders into the admin panel, and not everyone', async () => {
    expect(await mayUseAdminPanel(unitLeader)).toBe(true)
    expect(await mayUseAdminPanel(reporter)).toBe(false)
  })
})
