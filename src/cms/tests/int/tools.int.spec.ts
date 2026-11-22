import { getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TeamType, Tool, User } from '@/payload-types'
import { isHttpUrl } from '@/utils/links'

// The toolbox (VK-01–VK-08): everyone signed in reads it, administrators
// maintain it.

let payload: Payload
let admin: User
let user: User
let integration: User
let projectTeam: TeamType
let tool: Tool

const prefix = `int-tools-${Date.now()}`

const as = (u: User) => ({ user: { ...u, collection: 'brukere' as const }, overrideAccess: false })

const toolData = (name: string, extra: Partial<RequiredDataFromCollectionSlug<'verktoy'>> = {}) =>
  ({
    name: `${prefix} ${name}`,
    toolType: 'mal',
    description: 'Beskriver formål, mål, rammer og myndighet for et prosjekt.',
    ...extra,
  }) as RequiredDataFromCollectionSlug<'verktoy'>

describe('Tools', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // In an empty database the first user becomes an administrator.
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
    projectTeam = await payload.create({ collection: 'teamtyper', data: { name: `${prefix} Prosjektteam` } })
    tool = await payload.create({
      collection: 'verktoy',
      data: toolData('Prosjektmandat', {
        teamTypes: [projectTeam.id],
        toolUrl: 'https://example.org',
        resources: [{ label: 'Mal for prosjektmandat', url: 'https://example.org/mal' }],
      }),
      ...as(admin),
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'team', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'verktoy', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'teamtyper', where: { name: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('VK-01–VK-03, VK-05, VK-07, VK-08: lets everyone signed in read a tool with all its parts', async () => {
    const found = await payload.findByID({ collection: 'verktoy', id: tool.id, depth: 1, ...as(user) })

    expect(found.name).toBe(`${prefix} Prosjektmandat`)
    expect(found.toolType).toBe('mal')
    expect(found.description).toContain('rammer og myndighet')
    expect(found.teamTypes).toEqual([expect.objectContaining({ name: `${prefix} Prosjektteam` })])
    expect(found.toolUrl).toBe('https://example.org')
    expect(found.resources).toEqual([expect.objectContaining({ label: 'Mal for prosjektmandat' })])
  })

  it('NF-11: shows no tools to anyone not signed in, or to integrations', async () => {
    await expect(payload.find({ collection: 'verktoy', overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'verktoy', ...as(integration) })).rejects.toThrow()
  })

  it('leaves creating, changing and deleting tools to administrators', async () => {
    await expect(payload.create({ collection: 'verktoy', data: toolData('Ny'), ...as(user) })).rejects.toThrow()
    await expect(
      payload.update({ collection: 'verktoy', id: tool.id, data: { description: 'Nei' }, ...as(user) }),
    ).rejects.toThrow()
    await expect(payload.delete({ collection: 'verktoy', id: tool.id, ...as(user) })).rejects.toThrow()
  })

  it('VK-02: only takes the tool types in the list', async () => {
    await expect(
      payload.create({ collection: 'verktoy', data: toolData('Ukjent type', { toolType: 'app' as 'mal' }), ...as(admin) }),
    ).rejects.toThrow()
  })

  it('VK-07, VK-08: refuses links that are not absolute http(s) links, saying how to write them', async () => {
    // The message for each invalid field, such as «Lenken må starte med https://».
    const messages = (data: RequiredDataFromCollectionSlug<'verktoy'>) =>
      payload.create({ collection: 'verktoy', data, ...as(admin) }).then(
        () => [],
        (err: { data?: { errors?: { message: string }[] } }) => (err.data?.errors ?? []).map((e) => e.message),
      )

    for (const bad of ['www.figma.com', 'figma', 'javascript:alert(1)', 'mailto:post@digdir.no']) {
      expect(await messages(toolData(`Lenke ${bad}`, { toolUrl: bad }))).toEqual([
        expect.stringContaining('https://'),
      ])
      expect(await messages(toolData(`Ressurs ${bad}`, { resources: [{ label: 'Veileder', url: bad }] }))).toEqual([
        expect.stringContaining('https://'),
      ])
    }
  })

  it('checks links: absolute http(s) with a domain', () => {
    expect(isHttpUrl('https://www.figma.com')).toBe(true)
    expect(isHttpUrl('http://intranett.digdir.no/side')).toBe(true)
    expect(isHttpUrl('https://localhost')).toBe(false)
    expect(isHttpUrl('ftp://digdir.no')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
    expect(isHttpUrl(undefined)).toBe(false)
  })

  it('VK-06: shows the admin panel which teams use a tool', async () => {
    const team = await payload.create({
      collection: 'team',
      data: { name: `${prefix} Team`, teamType: projectTeam.id, tools: [tool.id] } as RequiredDataFromCollectionSlug<'team'>,
    })

    const found = await payload.findByID({ collection: 'verktoy', id: tool.id, depth: 0 })

    expect(found.teams?.docs).toEqual([team.id])
  })
})
