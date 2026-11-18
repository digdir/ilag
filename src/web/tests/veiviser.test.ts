import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Veiviser from '../src/pages/verktoy/veiviser/index.astro'
import { cookie, json } from './teams'

// The team type wizard's questions as the CMS returns them with depth 1: the
// question or team type an answer leads to is filled in.
const prosjektteam = {
  id: 1,
  name: 'Prosjektteam',
  description: 'Løser en avgrenset oppgave.',
  requirements: 'Et tydelig prosjektmandat\n\nEn teamkontrakt\n',
}
const slutt = {
  id: 11,
  title: 'Har oppgaven en definert avslutning?',
  isStart: false,
  answers: [{ label: 'Ja, oppgaven har en definert avslutning', leadsTo: { relationTo: 'teamtyper', value: prosjektteam } }],
}
const team = {
  id: 10,
  title: 'Egner oppgaven seg for teamarbeid?',
  isStart: true,
  intro: 'Team er en egnet arbeidsform når oppgaven løses bedre gjennom tett samarbeid.',
  considerations: 'Krever oppgaven tett samarbeid?\nHar de et felles mål?',
  answers: [
    { label: 'Hovedsakelig ja', hint: 'Gå videre.', leadsTo: { relationTo: 'teamtype-veiviser', value: slutt } },
    { label: 'Hovedsakelig nei', hint: 'Vurder individuelt ansvar.', leadsTo: null },
  ],
}

const render = async (search = '') => {
  const container = await AstroContainer.create()
  return container.renderToString(Veiviser, {
    request: new Request(`http://localhost/verktoy/veiviser${search}`, { headers: { cookie } }),
  })
}

const cms = (questions: unknown[] = [slutt, team]) => vi.fn(async (_url: string, _init?: RequestInit) => json({ docs: questions }))

describe('team type wizard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TK-03: asks the CMS for the questions, as the visitor', async () => {
    const fetchMock = cms()
    vi.stubGlobal('fetch', fetchMock)

    await render()

    const [url, init] = fetchMock.mock.calls[0]!
    const { pathname, searchParams } = new URL(url)
    expect(pathname).toBe('/api/teamtype-veiviser')
    expect(searchParams.get('depth')).toBe('1')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('TK-03: starts at the start question, with what to consider and links to the answers', async () => {
    vi.stubGlobal('fetch', cms())

    const html = await render()

    expect(html).toContain('Spørsmål 1')
    expect(html).toContain('Egner oppgaven seg for teamarbeid?')
    expect(html).toMatch(/<li[^>]*>Krever oppgaven tett samarbeid\?<\/li>/)
    expect(html).toMatch(/<li[^>]*>Har de et felles mål\?<\/li>/)
    expect(html).toMatch(/href="\?svar=1"[^>]*>[\s\S]*?Hovedsakelig ja/)
    expect(html).toMatch(/href="\?svar=2"[^>]*>[\s\S]*?Hovedsakelig nei/)
    expect(html).not.toContain('Forrige spørsmål')
  })

  it('TK-03: follows the answers in the URL, with a link back', async () => {
    vi.stubGlobal('fetch', cms())

    const html = await render('?svar=1')

    expect(html).toContain('Spørsmål 2')
    expect(html).toContain('Har oppgaven en definert avslutning?')
    expect(html).toContain('href="?svar=1.1"')
    expect(html).toMatch(/href="\/verktoy\/veiviser"[^>]*>\s*Forrige spørsmål/)
  })

  it('TK-04: ends at a team type with what must be in place', async () => {
    vi.stubGlobal('fetch', cms())

    const html = await render('?svar=1.1')

    expect(html).toContain('Teamtype')
    expect(html).toContain('Prosjektteam')
    expect(html).toContain('Løser en avgrenset oppgave.')
    expect(html).toContain('Dette må på plass:')
    expect(html).toMatch(/<li[^>]*>Et tydelig prosjektmandat<\/li>/)
    expect(html).toMatch(/<li[^>]*>En teamkontrakt<\/li>/)
    expect(html).toMatch(/href="\/verktoy\/veiviser"[^>]*>\s*Start på nytt/)
    expect(html).toMatch(/href="\?svar=1"[^>]*>\s*Forrige spørsmål/)
  })

  it('TK-03: an answer that leads nowhere ends with the answer as advice', async () => {
    vi.stubGlobal('fetch', cms())

    const html = await render('?svar=2')

    expect(html).toContain('Anbefaling')
    expect(html).toContain('Hovedsakelig nei')
    expect(html).toContain('Vurder individuelt ansvar.')
    expect(html).toContain('Start på nytt')
  })

  it('starts over when the answers in the URL no longer fit', async () => {
    vi.stubGlobal('fetch', cms())

    for (const search of ['?svar=9', '?svar=1.1.1', '?svar=x']) {
      const html = await render(search)
      expect(html).toContain('Spørsmål 1')
      expect(html).toContain('Egner oppgaven seg for teamarbeid?')
    }
  })

  it('says so when there is no start question', async () => {
    vi.stubGlobal('fetch', cms([slutt]))

    expect(await render()).toContain('Veiviseren er ikke satt opp ennå.')
  })
})
