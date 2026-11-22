import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Toolbox from '../src/pages/verktoy/verktoykasse/index.astro'
import { cookie, json } from './teams'
import { figma, prosjektmandat } from './tools'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Toolbox, {
    request: new Request('http://localhost/verktoy/verktoykasse', { headers: { cookie } }),
  })
}

// The page asks only for the tools.
const cms = (tools: unknown[]) => vi.fn(async (_url: string, _init?: RequestInit) => json({ docs: tools }))

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

  it('VK-04: filters by tool type, in one row of chips', async () => {
    vi.stubGlobal('fetch', cms([figma, prosjektmandat]))

    const html = await render()

    expect(html).toContain('data-chip-row="kind"')
    for (const label of ['Mal', 'Metode', 'Veileder', 'Verktøy']) {
      expect(html).toMatch(new RegExp(`name="verktoy-kind" value="[a-z]+"[^>]*>\\s*${label}`))
    }
    expect(html).toContain('data-filter-kind="mal"')
  })

  it('VK-05: does not filter by team type, which the team type page covers', async () => {
    const fetchMock = cms([figma, prosjektmandat])
    vi.stubGlobal('fetch', fetchMock)

    const html = await render()

    expect(html).not.toContain('data-chip-row="type"')
    expect(html).not.toContain('data-filter-type')
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).pathname)).not.toContain('/api/teamtyper')
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
