import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Teams from '../src/pages/team/index.astro'
import { cms, cookie, json, memberships, nettverk, skjemabygger } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Teams, {
    request: new Request('http://localhost/team', { headers: { cookie } }),
  })
}

const withTeams = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(
      cms({
        team: () => json({ docs: [skjemabygger, nettverk] }),
        teammedlemskap: () => json({ docs: memberships }),
      }),
    ),
  )

describe('team overview', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TO-01: asks the CMS for the active teams and their memberships, as the visitor', async () => {
    const fetchMock = vi.fn(cms({ team: () => json({ docs: [] }), teammedlemskap: () => json({ docs: [] }) }))
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const requests = fetchMock.mock.calls.map(([url, init]) => ({ url: new URL(url), init }))
    const teams = requests.find((r) => r.url.pathname === '/api/team')!
    const members = requests.find((r) => r.url.pathname === '/api/teammedlemskap')!
    expect(teams.url.searchParams.get('where[active][equals]')).toBe('true')
    for (const { init } of [teams, members]) {
      expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
    }
  })

  it('TO-01, TO-02: lists each team with its type, linking to the team', async () => {
    withTeams()

    const html = await render()

    expect(html).toContain('2 team')
    expect(html).toContain('Team Skjemabygger')
    expect(html).toContain('Produktteam')
    expect(html).toContain('Fagnettverk')
    expect(html).toContain('href="/team/7"')
  })

  it('shows the number of members, the team lead and the owner', async () => {
    withTeams()

    const html = await render()

    expect(html).toContain('3 medlemmer · Emma Kristiansen · Eier: Magnus Johansen')
    expect(html).toContain('Medlemmer ikke registrert')
  })

  it('says so when there are no teams', async () => {
    vi.stubGlobal('fetch', vi.fn(cms({ team: () => json({ docs: [] }), teammedlemskap: () => json({ docs: [] }) })))

    expect(await render()).toContain('Ingen team er registrert ennå.')
  })
})
