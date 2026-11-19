import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Tool from '../src/pages/verktoy/verktoykasse/[id].astro'
import { trail } from './breadcrumbs'
import { cookie, json } from './teams'
import { figma, prosjektmandat } from './tools'

const render = async (id: string) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(Tool, {
    params: { id },
    request: new Request(`http://localhost/verktoy/verktoykasse/${id}`, { headers: { cookie } }),
  })
}

describe('tool page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('VK-02, VK-03, VK-05: shows the type, the description and the team types, as the visitor', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json(prosjektmandat))
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('2')
    const html = await res.text()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(new URL(url).pathname).toBe('/api/verktoy/2')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
    expect(res.status).toBe(200)
    expect(html).toMatch(/<h1[^>]*>\s*Prosjektmandat\s*<\/h1>/)
    const tags = [...html.matchAll(/class="ds-tag[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1])
    // The team types by name.
    expect(tags).toEqual(['Mal', 'Produktteam', 'Prosjektteam'])
    // In the info colour, like team types everywhere else.
    const colours = [...html.matchAll(/class="ds-tag[^"]*" data-color="(\w+)"/g)].map((m) => m[1])
    expect(colours).toEqual(['info', 'info', 'info'])
    expect(html).toContain('Beskriver formål, mål, rammer og myndighet')
    expect(trail(html)).toEqual([
      ['Verktøykasse', '/verktoy/verktoykasse'],
      ['Prosjektmandat', '/verktoy/verktoykasse/2'],
    ])
  })

  it('puts «Passer for» and «Ressurser» in cards, like the team page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(prosjektmandat)))

    const html = await (await render('2')).text()

    for (const heading of ['Passer for', 'Ressurser']) {
      expect(html).toMatch(new RegExp(`<section class="ds-card"[^>]*>\\s*<h2[^>]*>\\s*${heading}`))
    }
  })

  it('VK-07: links to the resources', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(prosjektmandat)))

    const html = await (await render('2')).text()

    expect(html).toMatch(/href="https:\/\/www.prosjektveiviseren.no"[^>]*>\s*Mal for prosjektmandat/)
  })

  it('VK-08: links to the tool itself first under «Ressurser», only when it has a link', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...figma, resources: prosjektmandat.resources })))
    const withLink = await (await render('1')).text()
    const [header, resources] = withLink.split('Ressurser')
    expect(header).not.toContain('Åpne Figma')
    const links = [...resources.matchAll(/<a class="ds-link" href="([^"]+)"[^>]*>\s*([^<]+?)\s*</g)].map((m) => [m[1], m[2]])
    expect(links).toEqual([
      ['https://www.figma.com', 'Åpne Figma'],
      ['https://www.prosjektveiviseren.no', 'Mal for prosjektmandat'],
    ])

    vi.stubGlobal('fetch', vi.fn(async () => json(prosjektmandat)))
    const without = await (await render('2')).text()
    expect(without).not.toContain('Åpne Prosjektmandat')
  })

  it('says when the tool suits all team types', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(figma)))

    expect(await (await render('1')).text()).toContain('Alle teamtyper')
  })

  it('says there are no resources only when the tool has no links at all', async () => {
    // Figma has a link to the tool but no resources.
    vi.stubGlobal('fetch', vi.fn(async () => json(figma)))
    expect(await (await render('1')).text()).not.toContain('Ingen ressurser er lenket opp ennå.')

    vi.stubGlobal('fetch', vi.fn(async () => json({ ...figma, toolUrl: null })))
    expect(await (await render('1')).text()).toContain('Ingen ressurser er lenket opp ennå.')
  })

  it('answers 404 when the CMS has no such tool', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ errors: [{ message: 'Not Found' }] }, 404)))

    const res = await render('99')

    expect(res.status).toBe(404)
    expect(await res.text()).toContain('Fant ikke verktøyet')
  })

  it('answers 404 without asking the CMS when the id is not a number', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('figma')

    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
