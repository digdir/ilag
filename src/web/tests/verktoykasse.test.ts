import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Toolbox from '../src/pages/verktoy/verktoykasse/index.astro'
import { cookie, json } from './teams'
import { figma, prosjektmandat, toolTeamTypes } from './tools'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Toolbox, {
    request: new Request('http://localhost/verktoy/verktoykasse', { headers: { cookie } }),
  })
}

// The page asks for the tools and the team types.
const cms = (tools: unknown[]) =>
  vi.fn(async (url: string, _init?: RequestInit) =>
    json(new URL(url).pathname === '/api/teamtyper' ? toolTeamTypes : { docs: tools }),
  )

describe('toolbox page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('VK-01: asks the CMS for all tools, as the visitor, without the teams that use them', async () => {
    const fetchMock = cms([])
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls.find(([url]) => url.includes('/api/verktoy'))!
    const { searchParams } = new URL(url)
    expect(searchParams.get('pagination')).toBe('false')
    expect(searchParams.get('joins[teams]')).toBe('false')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('VK-01–VK-03: lists each tool with its type and description, as a card linking to its page', async () => {
    vi.stubGlobal('fetch', cms([figma, prosjektmandat]))

    const html = await render()

    expect(html).toMatch(/<h1[^>]*>Verktøykasse<\/h1>/)
    expect(html).toContain('2 verktøy')
    expect(html).toMatch(/class="ds-tag[^"]*"[^>]*>Verktøy</)
    expect(html).toMatch(/class="ds-tag[^"]*"[^>]*>Mal</)
    expect(html).toContain('Brukes til design, skisser og samarbeid om grensesnitt.')
    // The whole card is the link, as on the team cards.
    expect(html).toMatch(/<a class="ds-card"[^>]*href="\/verktoy\/verktoykasse\/1"[^>]*>[\s\S]*?Figma[\s\S]*?<\/a>/)
    expect(html).toMatch(/<a class="ds-card"[^>]*href="\/verktoy\/verktoykasse\/2"[^>]*>[\s\S]*?Prosjektmandat/)
  })

  it('VK-04, VK-05: filters by tool type and by team type, in two rows of chips', async () => {
    vi.stubGlobal('fetch', cms([figma, prosjektmandat]))

    const html = await render()

    expect(html).toContain('data-chip-row="kind"')
    expect(html).toContain('data-chip-row="type"')
    for (const label of ['Mal', 'Metode', 'Veileder', 'Verktøy']) {
      expect(html).toMatch(new RegExp(`name="verktoy-kind" value="[a-z]+"[^>]*>\\s*${label}`))
    }
    expect(html).toMatch(/name="verktoy-type" value="3"[^>]*>\s*Prosjektteam/)
    expect(html).toContain('data-filter-kind="mal"')
  })

  it('VK-05: lets a tool with no team types match every team type', async () => {
    vi.stubGlobal('fetch', cms([figma, prosjektmandat]))

    const html = await render()

    expect(html).toMatch(/data-filter-kind="verktoy" data-filter-type="1 3"/)
    expect(html).toMatch(/data-filter-kind="mal" data-filter-type="1 3"/)
  })

  it('VK-04: searches the name and the description', async () => {
    vi.stubGlobal('fetch', cms([figma]))

    const html = await render()

    expect(html).toContain('data-search="figma digdir har lisens.')
    expect(html).toContain('Ingen verktøy passer filtrene. Prøv en annen kombinasjon.')
  })

  it('says so when no tools are registered', async () => {
    vi.stubGlobal('fetch', cms([]))

    const html = await render()

    expect(html).toContain('Ingen verktøy er registrert ennå.')
    expect(html).not.toContain('data-list-filter')
  })
})
