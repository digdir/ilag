import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Role from '../src/pages/organisering/roller/[id].astro'
import { linjeleder, teameier } from './roles'
import { cookie, json } from './teams'
import { backLink, trail } from './breadcrumbs'

const render = async (id: string) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(Role, {
    params: { id },
    request: new Request(`http://localhost/organisering/roller/${id}`, { headers: { cookie } }),
  })
}

describe('role page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('RO-02, RO-03: shows the whole RAMO description and the team types', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json(teameier))
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('1')
    const html = await res.text()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(new URL(url).pathname).toBe('/api/roller/1')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
    expect(res.status).toBe(200)
    expect(html).toMatch(/<h1[^>]*>\s*Teameier\s*<\/h1>/)
    const tags = [...html.matchAll(/class="ds-tag[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1])
    expect(tags).toEqual(['Leveranseteam', 'Produktteam', 'Støtteteam'])
    // Each links to the team type's page.
    expect(html).toMatch(/<a class="ds-tag"[^>]*href="\/organisering\/team\/typer\/\d+"[^>]*>\s*Leveranseteam/)
    for (const label of ['Rolle', 'Ansvar', 'Myndighet', 'Oppgaver']) {
      expect(html).toMatch(new RegExp(`<h2[^>]*>\\s*${label}\\s*</h2>`))
    }
    // Each part of RAMO in its own card, as on the other detail pages.
    const cards = [...html.matchAll(/<section class="ds-card"[^>]*>\s*<h2[^>]*>\s*(\S+)\s*<\/h2>/g)]
    expect(cards.map((match) => match[1])).toEqual(['Rolle', 'Ansvar', 'Myndighet', 'Oppgaver'])
    expect(html).toContain('Definere mål og forventninger.\nTett dialog med teamleder.')
    expect(trail(html)).toEqual([
      ['Roller', '/organisering/roller'],
      ['Teameier', '/organisering/roller/1'],
    ])
  })

  it('lines up with the other pages, in the wide column', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(teameier)))

    const html = await (await render('1')).text()

    expect(html).toMatch(/<main[^>]*class="wide[^"]*"/)
  })

  it('shows only the parts of RAMO that are written', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(linjeleder)),
    )

    const html = await (await render('3')).text()

    expect(html).toContain('Samspiller med team')
    expect(html).toMatch(/<h2[^>]*>\s*Rolle\s*<\/h2>/)
    expect(html).not.toMatch(/<h2[^>]*>\s*Ansvar\s*<\/h2>/)
  })

  it('answers 404 when the CMS has no such role', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ errors: [{ message: 'Not Found' }] }, 404)),
    )

    const res = await render('99')

    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('Fant ikke rollen')
    expect(backLink(html)).toEqual(['Roller', '/organisering/roller'])
  })

  it('answers 404 without asking the CMS when the id is not a number', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect((await render('abc')).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
