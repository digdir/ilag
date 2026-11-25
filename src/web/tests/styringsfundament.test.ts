import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Styringsfundament from '../src/pages/styring/styringsfundament/index.astro'
import { cookie, json } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Styringsfundament, {
    request: new Request('http://localhost/styring/styringsfundament', { headers: { cookie } }),
  })
}

// Every field filled in.
const foundation = {
  id: 1,
  intro: 'Digdirs visjon og mål, samlet på én side.',
  vision: 'ilag for ein enklare digital kvardag',
  mission: 'Vi bidrar til ein samordna digitalisering',
  documents: [
    {
      title: 'Tildelingsbrevet',
      tag: 'Årlig',
      summary: 'Resultatmål og rammer for budsjettåret.',
      details: '- Rapporteringskrav.\n\n[Oppdragsbrev](https://example.com/oppdrag.pdf)',
      files: [
        { id: 3, alt: 'Tildelingsbrev 2026 (PDF)', url: 'http://localhost:3000/api/medier/file/tildelingsbrev.pdf' },
        // A file the visitor may not read comes back as its ID only.
        4,
      ],
    },
  ],
  goals: [
    { title: 'Vi fremmer samordning', details: '- Leverer fellesløysingar.\n\n[Les meir om målet](https://www.digdir.no/mal-1)' },
    { title: 'Vi leder an i bruk av data' },
  ],
  plan: {
    title: 'Virksomhetsplanen',
    text: 'Mål og rammer for virksomheten.\n\n[Virksomhetsplan 2026 (PDF)](https://example.com/vp.pdf)',
    files: [],
  },
  values: [{ name: 'Uredd', text: 'Vi vågar å utfordre.' }],
  audiences: '- Innbyggarar\n- Næringslivet\n\nVi jobbar brukerretta.',
  roles: '- Forvaltar av Norges digitale grunnmur',
  footnote: 'Inspirert av kompasset til Mattilsynet.',
  updatedAt: '2026-11-24T23:30:00.000Z',
}

// The page asks for the global; Prose asks for the concepts.
const cms = (global: unknown) =>
  vi.fn(async (url: string, _init?: RequestInit) => json(url.includes('/api/globals/') ? global : { docs: [] }))

describe('styringsfundament page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('SF-01: asks the CMS for the global as the visitor, with files populated', async () => {
    const fetchMock = cms(foundation)
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls.find(([url]) => url.includes('/api/globals/styringsfundament'))!
    expect(new URL(url).searchParams.get('depth')).toBe('1')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('SF-01: shows every section in the prototype’s order', async () => {
    vi.stubGlobal('fetch', cms(foundation))

    const html = await render()

    expect(html).toMatch(
      /Styringsfundament[\s\S]*Digdirs visjon og mål[\s\S]*Vår visjon[\s\S]*ilag for ein enklare digital kvardag[\s\S]*Vårt samfunnsoppdrag[\s\S]*Vi bidrar til ein samordna[\s\S]*Vis eksterne styrende dokumenter[\s\S]*Tildelingsbrevet[\s\S]*Årlig[\s\S]*Les mer[\s\S]*Rapporteringskrav[\s\S]*Vårt målbilde[\s\S]*Vis detaljer om målbildet[\s\S]*Vi fremmer samordning[\s\S]*Leverer fellesløysingar[\s\S]*Vi leder an i bruk av data[\s\S]*Virksomhetsplanen[\s\S]*Våre verdiar[\s\S]*Uredd[\s\S]*Vi vågar å utfordre[\s\S]*Våre brukarar[\s\S]*Innbyggarar[\s\S]*Næringslivet[\s\S]*Vi jobbar brukerretta[\s\S]*Våre roller[\s\S]*Forvaltar av Norges digitale grunnmur[\s\S]*Inspirert av kompasset[\s\S]*Sist oppdatert/,
    )
    expect(html).not.toContain('ikke registrert')
    // The vision is dark; the goals are tinted by position, and one button opens them all.
    expect(html).toMatch(/data-color-scheme="dark"[^>]*>[\s\S]*?Vår visjon/)
    expect(html).toMatch(/<article data-color="accent"[^>]*>[\s\S]*?Vi fremmer samordning/)
    expect(html).toMatch(/<article data-color="warning"[^>]*>[\s\S]*?Vi leder an i bruk av data/)
    expect(html.match(/type="checkbox"[^>]*aria-label="Vis detaljer om målbildet"/g)).toHaveLength(1)
    // A goal with no sub-goals has nothing to open.
    expect(html).toMatch(/Vi leder an i bruk av data<\/h3>\s*<\/article>/)
    // The user groups and the roles as markdown lists.
    expect(html).toMatch(/<ul class="ds-list">\s*<li>Innbyggarar<\/li>\s*<li>Næringslivet<\/li>/)
    expect(html).toMatch(/<ul class="ds-list">\s*<li>Forvaltar av Norges digitale grunnmur<\/li>/)
  })

  it('SF-05: shows when it was last changed, in Norwegian time', async () => {
    vi.stubGlobal('fetch', cms(foundation))

    // The evening of the 24th UTC is the 25th in Norway.
    expect(await render()).toContain('Sist oppdatert 25. november 2026')
  })

  it('SF-01: links to uploaded files in a new tab, leaves out files it can’t read, and renders markdown links', async () => {
    vi.stubGlobal('fetch', cms(foundation))

    const html = await render()

    expect(html).toMatch(/href="http:\/\/localhost:3000\/api\/medier\/file\/tildelingsbrev.pdf" target="_blank"[^>]*>\s*Tildelingsbrev 2026 \(PDF\)/)
    expect(html.match(/api\/medier\/file/g)).toHaveLength(1)
    expect(html).toContain('<a href="https://example.com/vp.pdf" class="ds-link">Virksomhetsplan 2026 (PDF)</a>')
    expect(html).toContain('<a href="https://example.com/oppdrag.pdf" class="ds-link">Oppdragsbrev</a>')
    expect(html).toContain('<a href="https://www.digdir.no/mal-1" class="ds-link">Les meir om målet</a>')
  })

  it('leaves out sections whose fields are empty', async () => {
    vi.stubGlobal(
      'fetch',
      cms({ id: 1, vision: 'ilag for ein enklare digital kvardag', documents: [], goals: [], plan: { title: 'Virksomhetsplanen' }, values: [] }),
    )

    const html = await render()

    expect(html).toContain('Vår visjon')
    for (const heading of ['Vårt samfunnsoppdrag', 'Vårt målbilde', 'Virksomhetsplanen', 'Våre verdiar', 'Våre brukarar', 'Våre roller']) {
      expect(html).not.toContain(heading)
    }
    expect(html).not.toContain('ikke registrert')
  })

  it('says so when nothing is filled in', async () => {
    vi.stubGlobal('fetch', cms({ id: 1, documents: [], goals: [], plan: { title: 'Virksomhetsplanen' }, values: [] }))

    const html = await render()

    expect(html).toContain('Styringsfundamentet er ikke registrert ennå.')
    expect(html).not.toContain('Vår visjon')
  })
})
