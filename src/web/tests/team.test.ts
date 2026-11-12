import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Teams from '../src/pages/organisering/team/index.astro'
import { cookie, json, nettverk, skjemabygger, teamTypes } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Teams, {
    request: new Request('http://localhost/team', { headers: { cookie } }),
  })
}

// The page asks for the teams and the team types.
const cms = (teams: unknown[]) =>
  vi.fn(async (url: string, _init?: RequestInit) =>
    json(new URL(url).pathname === '/api/teamtyper' ? teamTypes : { docs: teams }),
  )

describe('team overview', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TO-01: asks the CMS for the active teams, as the visitor', async () => {
    const fetchMock = cms([])
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls.find(([url]) => url.includes('/api/team?'))!
    const { pathname, searchParams } = new URL(url)
    expect(pathname).toBe('/api/team')
    expect(searchParams.get('where[active][equals]')).toBe('true')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('TO-01, TO-02: lists each team with its type, linking to the team', async () => {
    vi.stubGlobal('fetch', cms([skjemabygger, nettverk]))

    const html = await render()

    expect(html).toContain('2 team')
    expect(html).toContain('Team Skjemabygger')
    expect(html).toContain('Produktteam')
    expect(html).toContain('Fagnettverk')
    expect(html).toContain('class="ds-tag" data-color="info"')
    expect(html).toContain('href="/organisering/team/7"')
  })

  it('shows the number of members, the team lead and the owner', async () => {
    vi.stubGlobal('fetch', cms([skjemabygger, nettverk]))

    const html = await render()

    expect(html).toContain('3 medlemmer · Emma Kristiansen · Eier: Magnus Johansen')
    expect(html).toContain('Medlemmer ikke registrert')
  })

  it('TO-05: has a name search and a filter per team type, marking each card for it', async () => {
    vi.stubGlobal('fetch', cms([skjemabygger, nettverk]))

    const html = await render()

    expect(html).toContain('type="search"')
    expect(html).toMatch(/name="teamtype" value="5"[^>]*>\s*Fagnettverk/)
    expect(html).toMatch(/name="teamtype" value="1"[^>]*>\s*Produktteam/)
    expect(html).toContain('data-name="team skjemabygger" data-type="1"')
    expect(html).toContain('Ingen team passer søket.')
  })

  it('says so when there are no teams', async () => {
    vi.stubGlobal('fetch', cms([]))

    expect(await render()).toContain('Ingen team er registrert ennå.')
  })
})
