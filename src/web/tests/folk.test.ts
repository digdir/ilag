import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Folk from '../src/pages/folk/index.astro'
import { cookie, json } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Folk, {
    request: new Request('http://localhost/folk', { headers: { cookie } }),
  })
}

const membership = (id: number, team: { id: number; name: string; active: boolean }) => ({
  id,
  team,
})

const people = [
  {
    id: 1,
    fullName: 'Åse Ødegård',
    title: 'Utvikler',
    mobile: '+4790011223',
    units: [{ id: 4, name: 'FEL – Backend' }],
    teams: {
      docs: [
        membership(1, { id: 9, name: 'Team Innlogging', active: true }),
        membership(2, { id: 10, name: 'Team Nedlagt', active: false }),
      ],
    },
  },
  {
    id: 2,
    fullName: 'Ingrid Berg',
    title: 'Direktør',
    mobile: '+46701234567',
    units: [{ id: 1, name: 'Digitaliseringsdirektoratet' }],
    teams: { docs: [] },
  },
  {
    id: 3,
    fullName: 'Emma Kristiansen',
    title: null,
    mobile: null,
    units: [],
    teams: { docs: [] },
  },
]

const cms = (found: unknown[]) =>
  vi.fn(async (_url: string, _init?: RequestInit) => json({ docs: found }))

describe('Folk', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('FO-01: asks the CMS for the active people, as the visitor', async () => {
    const fetchMock = cms([])
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls.find(([url]) => url.includes('/api/personer?'))!
    const { searchParams } = new URL(url)
    expect(searchParams.get('where[active][equals]')).toBe('true')
    expect(searchParams.get('depth')).toBe('2')
    expect(searchParams.get('select[mobile]')).toBe('true')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('FO-01: lists everyone by name in Norwegian order, with their title and avatar', async () => {
    vi.stubGlobal('fetch', cms(people))

    const html = await render()

    expect(html).toContain('3 personer')
    const names = [...html.matchAll(/class="ds-paragraph name"[^>]*>([^<]*)</g)].map((m) => m[1])
    expect(names).toEqual(['Emma Kristiansen', 'Ingrid Berg', 'Åse Ødegård'])
    expect(html).toContain('Utvikler')
    expect(html).toMatch(/class="ds-avatar"[^>]*>ÅØ</)
  })

  it('FO-02: shows the name of the unit, and says when there is none', async () => {
    vi.stubGlobal('fetch', cms(people))

    const html = await render()

    expect(html).toMatch(/<li[^>]*>FEL – Backend<\/li>/)
    expect(html).toMatch(/<li[^>]*>Digitaliseringsdirektoratet<\/li>/)
    expect(html).toContain('Ikke registrert')
  })

  it('shows the mobile number as a link, Norwegian numbers in pairs', async () => {
    vi.stubGlobal('fetch', cms(people))

    const html = await render()

    expect(html).toMatch(/href="tel:\+4790011223"[^>]*>\s*90 01 12 23\s*</)
    expect(html).toMatch(/href="tel:\+46701234567"[^>]*>\s*\+46701234567\s*</)
    expect(html).toMatch(/<th scope="col"[^>]*>Mobil</)
  })

  it('FO-02: links to the active teams only, and says when there are none', async () => {
    vi.stubGlobal('fetch', cms(people))

    const html = await render()

    expect(html).toMatch(/href="\/organisering\/team\/9"[^>]*>\s*Team Innlogging/)
    expect(html).not.toContain('Team Nedlagt')
    expect(html).toContain('Ingen team')
  })

  it('FO-03: has a search, and marks each person with their name, title, units and teams', async () => {
    vi.stubGlobal('fetch', cms(people))

    const html = await render()

    expect(html).toContain('type="search"')
    expect(html).toContain('placeholder="Søk etter navn, rolle, enhet eller team"')
    expect(html).toContain('data-search="åse ødegård utvikler fel – backend team innlogging"')
    expect(html).toContain('Ingen treff.')
  })

  it('AL-01: shows no allocation', async () => {
    vi.stubGlobal('fetch', cms(people))

    const html = await render()

    expect(html).not.toMatch(/allokering/i)
  })

  it('says so when there are no people', async () => {
    vi.stubGlobal('fetch', cms([]))

    expect(await render()).toContain('Ingen ansatte er registrert ennå.')
  })
})
