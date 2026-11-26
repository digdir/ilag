import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Index from '../src/pages/index.astro'
import { cookie, json } from './teams'

const render = async (locals: App.Locals = {}) => {
  const container = await AstroContainer.create()
  return container.renderToString(Index, {
    locals,
    request: new Request('http://localhost/', { headers: { cookie } }),
  })
}

// Every field filled in, with the changes out of order and more than are shown.
const frontPage = {
  id: 1,
  eyebrow: 'Rammeverk for team og leveranser',
  title: 'Slik jobber vi sammen i Digdir',
  intro: 'ilag er vår felles måte å jobbe sammen på.',
  image: null,
  entries: [
    {
      id: 'a',
      title: 'Ny i Digdir?',
      text: 'Start med organisasjonen og begrepene.',
      links: [
        { id: 'a1', label: 'Se organisasjonen', href: '/organisering/linjeorganisasjon' },
        { id: 'a2', label: 'Begreper', href: '/verktoy/begreper' },
      ],
    },
    {
      id: 'b',
      title: 'Skal du etablere et team?',
      text: 'Veiviseren tar deg gjennom noen spørsmål.',
      links: [{ id: 'b1', label: 'Start veiviseren', href: '/verktoy/veiviser' }],
    },
  ],
  changes: [
    { id: 'c1', date: '2026-10-01T00:00:00.000Z', text: 'Den eldste endringen.' },
    { id: 'c2', date: '2026-11-24T00:00:00.000Z', text: 'Prinsippene kan filtreres.', href: '/styring/prinsipper' },
    { id: 'c3', date: '2026-11-06T00:00:00.000Z', text: 'Saman har byttet navn til ilag.' },
    { id: 'c4', date: '2026-11-18T00:00:00.000Z', text: 'Veiviseren er på plass.', href: '/verktoy/veiviser' },
    { id: 'c5', date: '2026-11-16T00:00:00.000Z', text: 'Team har fått mandat.' },
    { id: 'c6', date: '2026-11-20T00:00:00.000Z', text: 'Verktøy på teamtypens side.' },
  ],
}

const tools = [
  {
    id: 14,
    name: 'Team Restart',
    toolType: 'metode',
    description: 'En workshop for team som trenger en ny start.',
    createdAt: '2026-11-25T09:00:00.000Z',
  },
  { id: 13, name: 'DevOps', toolType: 'veileder', description: 'Slik jobber vi med drift.', createdAt: '2026-11-20T09:00:00.000Z' },
]

// The page asks for the global and the newest tools.
const cms = (global: unknown, docs: unknown[] = tools) =>
  vi.fn(async (url: string, _init?: RequestInit) => json(url.includes('/api/globals/') ? global : { docs }))

describe('front page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks the CMS for the global as the visitor, with the illustration populated', async () => {
    const fetchMock = cms(frontPage)
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls.find(([url]) => url.includes('/api/globals/forside'))!
    expect(new URL(url).searchParams.get('depth')).toBe('1')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('shows the texts at the top, with ilag’s own illustration when the global has none', async () => {
    vi.stubGlobal('fetch', cms(frontPage))

    const html = await render()

    expect(html).toMatch(/Rammeverk for team og leveranser[\s\S]*<h1[^>]*>Slik jobber vi sammen i Digdir<\/h1>[\s\S]*ilag er vår felles måte/)
    expect(html).toContain('<img src="/forside-illustrasjon.png" alt=""')
  })

  it('shows the global’s illustration when the visitor may read it', async () => {
    const image = { id: 3, alt: 'Folk rundt et bord', url: 'http://localhost:3000/api/medier/file/forside.png' }
    vi.stubGlobal('fetch', cms({ ...frontPage, image }))

    expect(await render()).toContain('<img src="http://localhost:3000/api/medier/file/forside.png" alt=""')
  })

  it('FS-02, FS-03: shows the entrances, with the first link as the main button', async () => {
    vi.stubGlobal('fetch', cms(frontPage))

    const html = await render()

    expect(html).toMatch(/Ny i Digdir\?[\s\S]*Start med organisasjonen og begrepene[\s\S]*Skal du etablere et team\?/)
    expect(html).toMatch(/<a class="ds-button" data-variant="primary"[^>]*href="\/organisering\/linjeorganisasjon"[^>]*>\s*Se organisasjonen/)
    expect(html).toMatch(/<a class="ds-button" data-variant="secondary"[^>]*href="\/verktoy\/begreper"[^>]*>\s*Begreper/)
    expect(html).toMatch(/<a class="ds-button" data-variant="primary"[^>]*href="\/verktoy\/veiviser"[^>]*>\s*Start veiviseren/)
  })

  it('FS-05: asks for the three newest tools and shows them with their type and the day they were added', async () => {
    const fetchMock = cms(frontPage)
    vi.stubGlobal('fetch', fetchMock)

    const html = await render()

    const [url] = fetchMock.mock.calls.find(([url]) => url.includes('/api/verktoy'))!
    const params = new URL(url).searchParams
    expect(params.get('sort')).toBe('-createdAt')
    expect(params.get('limit')).toBe('3')
    expect(html).toMatch(/Nytt i verktøykassen[\s\S]*href="\/verktoy\/verktoykasse"[^>]*>Hele verktøykassen/)
    expect(html).toMatch(/href="\/verktoy\/verktoykasse\/14"[^>]*>\s*Team Restart[\s\S]*Metode ·\s*<time datetime="2026-11-25" title="25. november 2026"[^>]*>\s*25. nov.\s*<\/time>[\s\S]*En workshop/)
    expect(html.indexOf('Team Restart')).toBeLessThan(html.indexOf('DevOps'))
  })

  it('FS-06: shows the five newest changes, newest first, linking those that have a link', async () => {
    vi.stubGlobal('fetch', cms(frontPage))

    const html = await render()

    expect(html).toMatch(
      /Endringer i ilag[\s\S]*title="24. november 2026"[^>]*>\s*24. nov.[\s\S]*Prinsippene kan filtreres[\s\S]*20. nov.[\s\S]*18. nov.[\s\S]*16. nov.[\s\S]*6. nov.[\s\S]*Saman har byttet navn/,
    )
    expect(html).not.toContain('Den eldste endringen')
    expect(html).toMatch(/<a class="ds-link" data-color="neutral" href="\/styring\/prinsipper"[^>]*>Prinsippene kan filtreres/)
    expect(html).toMatch(/<span[^>]*>Saman har byttet navn til ilag.<\/span>/)
  })

  it('leaves out what has no content, and says so when nothing is filled in', async () => {
    vi.stubGlobal('fetch', cms({ id: 1, entries: [], changes: [] }, []))

    const html = await render()

    expect(html).toContain('Forsiden er ikke fylt ut ennå.')
    expect(html).toMatch(/<h1[^>]*>ilag<\/h1>/)
    expect(html).not.toContain('Nytt i verktøykassen')
    expect(html).not.toContain('Endringer i ilag')
    expect(html).not.toContain('forside-illustrasjon')
  })

  it('shows who is logged in, with a way to log out, in the site header', async () => {
    vi.stubGlobal('fetch', cms(frontPage))

    const html = await render({
      user: { email: 'kari@digdir.no', firstName: 'Kari', lastName: 'Nordmann' } as App.Locals['user'],
    })

    expect(html).toContain('Kari Nordmann')
    expect(html).toContain('action="/logg-ut"')
    expect(html).toContain('aria-label="Hovedmeny"')
  })
})
