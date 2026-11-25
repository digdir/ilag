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

// One box of each kind, two card boxes, in another order than the seed's.
const foundation = {
  id: 1,
  intro: 'Digdirs visjon og mål, samlet på én side.',
  footnote: 'Inspirert av kompasset til Mattilsynet.',
  sections: [
    { blockType: 'list', heading: 'Våre roller', text: '- Forvaltar av Norges digitale grunnmur' },
    {
      blockType: 'cards',
      heading: 'Våre verdier',
      colors: 'neutral',
      cards: [{ title: 'Uredd', text: 'Vi vågar å utfordre.' }],
    },
    { blockType: 'statement', heading: 'Vår visjon', style: 'dark', text: 'ilag for ein enklare digital kvardag' },
    {
      blockType: 'documents',
      heading: 'Vis eksterne styrende dokumenter',
      documents: [
        {
          title: 'Tildelingsbrevet',
          tag: 'Årlig',
          summary: 'Resultatmål og rammer for budsjettåret.',
          details:
            '**Innhold**\n\n- Rapporteringskrav.\n\nSupplerende brev kommer gjennom året.\n\n[Oppdragsbrev](https://example.com/oppdrag.pdf)',
          files: [
            { id: 3, alt: 'Tildelingsbrev 2026 (PDF)', url: 'http://localhost:3000/api/medier/file/tildelingsbrev.pdf' },
            // A file the visitor may not read comes back as its ID only.
            4,
          ],
        },
      ],
    },
    {
      blockType: 'cards',
      heading: 'Vårt målbilde',
      colors: 'varied',
      detailsLabel: 'Vis delmål',
      cards: [
        { title: 'Vi fremmer samordning', details: '- Leverer fellesløysingar.\n\n[Les meir om målet](https://www.digdir.no/mal-1)' },
        { title: 'Vi leder an i bruk av data' },
      ],
    },
    {
      blockType: 'textWithFiles',
      heading: 'Virksomhetsplanen',
      text: 'Mål og rammer for virksomheten.\n\n[Virksomhetsplan 2026 (PDF)](https://example.com/vp.pdf)',
    },
    { blockType: 'list', heading: 'Våre brukarar', chips: 'Innbyggarar\n Næringslivet \n\n', text: 'Vi jobbar brukerretta.' },
  ],
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

  it('SF-01: shows the boxes in the order and with the headings the editor chose', async () => {
    vi.stubGlobal('fetch', cms(foundation))

    const html = await render()

    expect(html).toMatch(
      /Styringsfundament[\s\S]*Digdirs visjon og mål[\s\S]*Våre roller[\s\S]*Forvaltar av Norges digitale grunnmur[\s\S]*Våre verdier[\s\S]*Uredd[\s\S]*Vi vågar å utfordre[\s\S]*Vår visjon[\s\S]*ilag for ein enklare digital kvardag[\s\S]*Vis eksterne styrende dokumenter[\s\S]*Tildelingsbrevet[\s\S]*Årlig[\s\S]*Les mer[\s\S]*Innhold[\s\S]*Rapporteringskrav[\s\S]*Vårt målbilde[\s\S]*Vi fremmer samordning[\s\S]*Vis delmål[\s\S]*Leverer fellesløysingar[\s\S]*Virksomhetsplanen[\s\S]*Våre brukarar[\s\S]*Innbyggarar[\s\S]*Vi jobbar brukerretta[\s\S]*Inspirert av kompasset/,
    )
    // In Norwegian time, the evening of the 24th UTC is the 25th.
    expect(html).toContain('Sist oppdatert 25. november 2026')
  })

  it('shows each kind of box its own way', async () => {
    vi.stubGlobal('fetch', cms(foundation))

    const html = await render()

    // A dark statement, and lists in half-width boxes.
    expect(html).toMatch(/data-color-scheme="dark"[^>]*>[\s\S]*?Vår visjon/)
    expect(html.match(/class="box half"/g)).toHaveLength(2)
    // Varied cards are tinted by position; grey ones all alike. A card with nothing more has no toggle.
    expect(html).toMatch(/data-color="accent" data-variant="tinted"[^>]*>[\s\S]*?Vi fremmer samordning/)
    expect(html).toMatch(/data-color="warning" data-variant="tinted"[^>]*>[\s\S]*?Vi leder an i bruk av data/)
    expect(html.match(/<summary[^>]*>Vis delmål<\/summary>/g)).toHaveLength(1)
    // Markdown lists, and one chip per line.
    expect(html).toMatch(/<ul class="ds-list">\s*<li>Forvaltar av Norges digitale grunnmur<\/li>/)
    expect(html.match(/class="ds-tag"[^>]*>\s*(Innbyggarar|Næringslivet)\s*</g)).toHaveLength(2)
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

  it('says so when no boxes are added', async () => {
    vi.stubGlobal('fetch', cms({ id: 1, sections: [] }))

    const html = await render()

    expect(html).toContain('Styringsfundamentet er ikke registrert ennå.')
  })
})
