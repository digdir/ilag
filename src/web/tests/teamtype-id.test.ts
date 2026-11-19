import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import TeamType from '../src/pages/organisering/team/typer/[id].astro'
import { trail } from './breadcrumbs'
import { cookie, json, skjemabygger } from './teams'
import { prosjektmandat } from './tools'

// A team type as the CMS returns it with depth 1: the roles join filled in.
const produktteam = {
  id: 1,
  name: 'Produktteam',
  description: 'Et leveranseteam med varig og helhetlig ansvar for ett eller flere produkter.',
  requirements: 'Et tydelig mandat\n\nEn teamkontrakt\n',
  roles: {
    docs: [
      { id: 2, name: 'Teamleder' },
      { id: 1, name: 'Produkteier' },
    ],
    hasNextPage: false,
  },
}

// Answers each of the page's queries by its collection.
const cms = ({ teamType = produktteam as unknown, teams = [skjemabygger], tools = [prosjektmandat] } = {}) =>
  vi.fn(async (input: string, _init?: RequestInit) => {
    const { pathname } = new URL(input)
    if (pathname.startsWith('/api/teamtyper/'))
      return teamType ? json(teamType) : json({ errors: [{ message: 'Not Found' }] }, 404)
    if (pathname === '/api/team') return json({ docs: teams })
    if (pathname === '/api/verktoy') return json({ docs: tools })
    throw new Error(`Unexpected request: ${input}`)
  })

const render = async (id: string) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(TeamType, {
    params: { id },
    request: new Request(`http://localhost/organisering/team/typer/${id}`, { headers: { cookie } }),
  })
}

const section = (html: string, heading: string) =>
  html.split(new RegExp(`${heading}\\s*</h2>`))[1]!.split('</section>')[0]!

describe('team type page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TK-01, TK-04: shows the team type, what characterises it and what must be in place, as the visitor', async () => {
    const fetchMock = cms()
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('1')
    const html = await res.text()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(new URL(url).pathname).toBe('/api/teamtyper/1')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
    expect(res.status).toBe(200)
    expect(html).toMatch(/<h1[^>]*>\s*Produktteam\s*<\/h1>/)
    expect(html).toContain('Et leveranseteam med varig og helhetlig ansvar')
    const requirements = section(html, 'Dette må på plass')
    expect(requirements).toMatch(/<li[^>]*>\s*Et tydelig mandat\s*<\/li>/)
    expect(requirements).toMatch(/<li[^>]*>\s*En teamkontrakt\s*<\/li>/)
    expect(trail(html)).toEqual([
      ['Team', '/organisering/team'],
      ['Produktteam', '/organisering/team/typer/1'],
    ])
  })

  it('RO-03: lists the roles relevant for the type by name, linking to each', async () => {
    vi.stubGlobal('fetch', cms())

    const roles = section(await (await render('1')).text(), 'Roller')

    const links = [...roles.matchAll(/<a class="ds-link" href="([^"]*)"[^>]*>\s*([^<]*?)\s*<\/a>/g)].map((m) => [
      m[2],
      m[1],
    ])
    expect(links).toEqual([
      ['Produkteier', '/organisering/roller/1'],
      ['Teamleder', '/organisering/roller/2'],
    ])
  })

  it('shows the active teams of the type, as the visitor', async () => {
    const fetchMock = cms()
    vi.stubGlobal('fetch', fetchMock)

    const html = await (await render('1')).text()

    const call = fetchMock.mock.calls.find(([url]) => new URL(url).pathname === '/api/team')!
    const query = decodeURIComponent(new URL(call[0]).search)
    expect(query).toContain('where[active][equals]=true')
    expect(query).toContain('where[teamType][equals]=1')
    expect(new Headers(call[1]?.headers).get('Authorization')).toBe('JWT visitor-token')
    expect(section(html, 'Team av denne typen')).toContain('href="/organisering/team/7"')
  })

  it('VK-05: recommends the tools meant for the type, and points to the toolbox for the rest', async () => {
    const fetchMock = cms()
    vi.stubGlobal('fetch', fetchMock)

    const tools = section(await (await render('1')).text(), 'Anbefalte verktøy')

    const call = fetchMock.mock.calls.find(([url]) => new URL(url).pathname === '/api/verktoy')!
    expect(decodeURIComponent(new URL(call[0]).search)).toContain('where[teamTypes][in][0]=1')
    expect(tools).toMatch(/href="\/verktoy\/verktoykasse\/2"[^>]*>\s*Prosjektmandat/)
    expect(tools).toContain('href="/verktoy/verktoykasse"')
  })

  it('says so when nothing is registered for the type yet', async () => {
    const bare = { id: 1, name: 'Produktteam', description: null, requirements: null, roles: { docs: [] } }
    vi.stubGlobal('fetch', cms({ teamType: bare, teams: [], tools: [] }))

    const html = await (await render('1')).text()

    expect(section(html, 'Dette må på plass')).toContain('Ikke beskrevet ennå.')
    expect(section(html, 'Roller')).toContain('Ingen roller registrert ennå.')
    expect(section(html, 'Anbefalte verktøy')).toContain('Ingen verktøy registrert ennå.')
    expect(html).toContain('Ingen aktive team av denne typen.')
  })

  it('answers 404 when the CMS has no such team type', async () => {
    const fetchMock = cms({ teamType: null })
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('99')

    expect(res.status).toBe(404)
    expect(await res.text()).toContain('Fant ikke teamtypen')
    // No teams or tools to look for.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('answers 404 without asking the CMS when the id is not a number', async () => {
    const fetchMock = cms()
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('abc')

    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
