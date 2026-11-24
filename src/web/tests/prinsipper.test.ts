import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Principles from '../src/pages/styring/prinsipper/index.astro'
import { brukerbehov, retning } from './principles'
import { cookie, json } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Principles, {
    request: new Request('http://localhost/styring/prinsipper', { headers: { cookie } }),
  })
}

// The page asks only for the principles.
const cms = (principles: unknown[]) => vi.fn(async (_url: string, _init?: RequestInit) => json({ docs: principles }))

describe('principles page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('PR-01: asks the CMS for all principles in order of their number, as the visitor', async () => {
    const fetchMock = cms([])
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls.find(([url]) => url.includes('/api/prinsipper'))!
    const { searchParams } = new URL(url)
    expect(searchParams.get('sort')).toBe('number')
    expect(searchParams.get('pagination')).toBe('false')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('PR-01, PR-02: shows each principle with its number, area, title and whole text', async () => {
    vi.stubGlobal('fetch', cms([brukerbehov, retning]))

    const html = await render()

    expect(html).toMatch(/<h1[^>]*>Prinsipper<\/h1>/)
    expect(html).toContain('2 prinsipper')
    expect(html).toMatch(/<article class="ds-card"[\s\S]*?>1<\/span>[\s\S]*?Alle i Digdir[\s\S]*?Vi løser reelle brukerbehov/)
    expect(html).toMatch(/>8<\/span>[\s\S]*?Ledelse[\s\S]*?Vi leder gjennom tydelig retning og handlingsrom/)
    // Each paragraph of the text on its own, and no link to a page per principle.
    expect(html).toMatch(/<p[^>]*>Vi starter med å forstå hvem vi gjør det for.<\/p>/)
    expect(html).toMatch(/<p[^>]*>Vi kartlegger behov og tester løsninger.<\/p>/)
    expect(html).not.toContain('href="/styring/prinsipper/')
  })

  it('PR-03: filters by area, in one row of chips, without a search field', async () => {
    vi.stubGlobal('fetch', cms([brukerbehov, retning]))

    const html = await render()

    expect(html).toContain('data-chip-row="area"')
    for (const label of ['Alle i Digdir', 'Ledelse', 'Arkitektur']) {
      expect(html).toMatch(new RegExp(`name="prinsipper-area" value="[a-z]+"[^>]*>\\s*${label}`))
    }
    expect(html).toContain('data-filter-area="ledelse"')
    expect(html).not.toContain('type="search"')
    expect(html).toContain('Ingen prinsipper passer filtrene. Prøv en annen kombinasjon.')
  })

  it('says so when no principles are registered', async () => {
    vi.stubGlobal('fetch', cms([]))

    const html = await render()

    expect(html).toContain('Ingen prinsipper er registrert ennå.')
    expect(html).not.toContain('data-list-filter')
  })
})
