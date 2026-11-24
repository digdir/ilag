import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Concepts from '../src/pages/verktoy/begreper/index.astro'
import { concepts } from './concepts'
import { cookie, json } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Concepts, {
    request: new Request('http://localhost/verktoy/begreper', { headers: { cookie } }),
  })
}

const cms = (docs: unknown[]) => vi.fn(async (_url: string, _init?: RequestInit) => json({ docs }))

describe('concept list page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('BG-01: asks the CMS for all concepts by name, as the visitor', async () => {
    const fetchMock = cms([])
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls[0]!
    const { pathname, searchParams } = new URL(url)
    expect(pathname).toBe('/api/begreper')
    expect(searchParams.get('pagination')).toBe('false')
    expect(searchParams.get('sort')).toBe('name')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('BG-01, BG-02: lists each concept by name, with its definition', async () => {
    vi.stubGlobal('fetch', cms(concepts))

    const html = await render()

    expect(html).toMatch(/<h1[^>]*>Begreper<\/h1>/)
    expect(html).toContain('4 begreper')
    expect(html).toMatch(/<h2[^>]*>Teammandat<\/h2>/)
    expect(html).not.toContain('href="/verktoy/begreper/')
    expect(html).toContain('Beskriver hvorfor teamet finnes, teamets ansvar og handlingsrom.')
  })

  it('BG-03: searches the name, the other forms and the definition', async () => {
    vi.stubGlobal('fetch', cms(concepts))

    const html = await render()

    expect(html).toContain('type="search"')
    expect(html).toContain(
      'data-search="teammandat teammandatet teammandater beskriver hvorfor teamet finnes, teamets ansvar og handlingsrom."',
    )
    expect(html).toContain('Ingen begreper passer søket.')
  })

  it('ADR-0009: doesn’t explain concepts in the list', async () => {
    vi.stubGlobal('fetch', cms(concepts))

    const html = await render()

    expect(html).not.toContain('popovertarget')
  })

  it('says so when there are no concepts yet', async () => {
    vi.stubGlobal('fetch', cms([]))

    const html = await render()

    expect(html).toContain('Ingen begreper er registrert ennå.')
    expect(html).not.toContain('type="search"')
  })
})
