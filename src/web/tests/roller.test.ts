import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Roles from '../src/pages/organisering/roller/index.astro'
import { linjeleder, produkteier, roleTeamTypes, teameier } from './roles'
import { cookie, json } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Roles, {
    request: new Request('http://localhost/organisering/roller', { headers: { cookie } }),
  })
}

// The page asks for the roles and the team types.
const cms = (roles: unknown[]) =>
  vi.fn(async (url: string, _init?: RequestInit) =>
    json(new URL(url).pathname === '/api/teamtyper' ? roleTeamTypes : { docs: roles }),
  )

describe('roles page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('RO-01: asks the CMS for all roles with their team types, as the visitor', async () => {
    const fetchMock = cms([])
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls.find(([url]) => url.includes('/api/roller'))!
    const { searchParams } = new URL(url)
    expect(searchParams.get('depth')).toBe('1')
    expect(searchParams.get('pagination')).toBe('false')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('RO-01, RO-02: lists each role with its RAMO description, linking to the role', async () => {
    vi.stubGlobal('fetch', cms([teameier, produkteier]))

    const html = await render()

    expect(html).toContain('Roller og ansvar')
    expect(html).toContain('2 roller')
    expect(html).toMatch(/<dt[^>]*>Rolle<\/dt>/)
    expect(html).toMatch(/<dt[^>]*>Ansvar<\/dt>/)
    expect(html).toMatch(/<dt[^>]*>Myndighet<\/dt>/)
    expect(html).toMatch(/<dt[^>]*>Oppgaver<\/dt>/)
    expect(html).toContain('Fastsette mandat, mål/OKR')
    expect(html).toContain('href="/organisering/roller/1"')
    expect(html).toContain('Se hele rollebeskrivelsen')
  })

  it('RO-02: leaves out the parts of RAMO that are not written yet', async () => {
    vi.stubGlobal('fetch', cms([produkteier]))

    const html = await render()

    expect(html).toMatch(/<dt[^>]*>Rolle<\/dt>/)
    expect(html).not.toMatch(/<dt[^>]*>Ansvar<\/dt>/)
    expect(html).not.toMatch(/<dt[^>]*>Oppgaver<\/dt>/)
  })

  it('RO-03: tags each role with its team types', async () => {
    vi.stubGlobal('fetch', cms([teameier, produkteier, linjeleder]))

    const html = await render()

    const tags = [...html.matchAll(/class="ds-tag[^"]*"[^>]*>([^<]+)</g)].map((m) =>
      m[1]!.trim(),
    )
    expect(tags).toEqual([
      'Produktteam',
      'Leveranseteam',
      'Produktteam',
      'Støtteteam',
      'Samspiller med team',
    ])
    expect(html).toContain('Aktuell for')
  })

  it('RO-01: lists the roles of a team type first, then the others, each by name', async () => {
    vi.stubGlobal('fetch', cms([linjeleder, teameier, produkteier]))

    const html = await render()

    const order = ['Produkteier', 'Teameier', 'Linjeleder'].map((name) =>
      html.indexOf(`>${name}</h2>`),
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(order[0]).toBeGreaterThan(-1)
  })

  it('RO-04: has a name search and a chip per team type and for other roles', async () => {
    vi.stubGlobal('fetch', cms([teameier, linjeleder]))

    const html = await render()

    expect(html).toContain('type="search"')
    expect(html).toMatch(/value checked[^>]*>\s*Alle/)
    expect(html).toMatch(/value="1"[^>]*>\s*Produktteam/)
    expect(html).toMatch(/value="none"[^>]*>\s*Andre roller/)
    expect(html).toContain('data-search="teameier" data-filter-type="3 1 4"')
    expect(html).toContain('data-search="linjeleder" data-filter-type="none"')
    expect(html).toContain('Ingen roller passer søket.')
  })

  it('says so when there are no roles', async () => {
    vi.stubGlobal('fetch', cms([]))

    expect(await render()).toContain('Ingen roller er registrert ennå.')
  })
})
