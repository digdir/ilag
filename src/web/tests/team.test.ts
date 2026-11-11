import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Teams from '../src/pages/organisering/team/index.astro'
import { cookie, json, nettverk, skjemabygger } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Teams, {
    request: new Request('http://localhost/team', { headers: { cookie } }),
  })
}

describe('team overview', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TO-01: asks the CMS for the active teams, as the visitor', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ docs: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls[0]!
    const { pathname, searchParams } = new URL(url)
    expect(pathname).toBe('/api/team')
    expect(searchParams.get('where[active][equals]')).toBe('true')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('TO-01, TO-02: lists each team with its type, linking to the team', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ docs: [skjemabygger, nettverk] })))

    const html = await render()

    expect(html).toContain('2 team')
    expect(html).toContain('Team Skjemabygger')
    expect(html).toContain('Produktteam')
    expect(html).toContain('Fagnettverk')
    expect(html).toContain('class="ds-tag" data-color="info"')
    expect(html).toContain('href="/organisering/team/7"')
  })

  it('shows the number of members, the team lead and the owner', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ docs: [skjemabygger, nettverk] })))

    const html = await render()

    expect(html).toContain('3 medlemmer · Emma Kristiansen · Eier: Magnus Johansen')
    expect(html).toContain('Medlemmer ikke registrert')
  })

  it('says so when there are no teams', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ docs: [] })))

    expect(await render()).toContain('Ingen team er registrert ennå.')
  })
})
