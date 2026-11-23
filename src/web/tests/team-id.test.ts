import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Team from '../src/pages/organisering/team/[id].astro'
import { concepts, teammandat } from './concepts'
import { cookie, json, nettverk, skjemabygger } from './teams'
import { backLink, trail } from './breadcrumbs'
import { approvedMandate, joined } from './mandates'

// The mandate section, from its heading to the end of the section.
const mandateSection = (html: string) => html.match(/id="mandat"[\s\S]*?<\/section>/)?.[0] ?? ''

const render = async (id: string) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(Team, {
    params: { id },
    request: new Request(`http://localhost/organisering/team/${id}`, { headers: { cookie } }),
  })
}

describe('team page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TO-02, TO-03: shows the team type, and the members with all their roles', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json(skjemabygger))
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('7')
    const html = await res.text()

    const url = new URL(fetchMock.mock.calls[0]![0])
    expect(url.pathname).toBe('/api/team/7')
    expect(url.searchParams.get('depth')).toBe('3')
    expect(res.status).toBe(200)
    expect(html).toContain('Team Skjemabygger')
    // The team type links to its page.
    expect(html).toMatch(/<a class="ds-tag"[^>]*href="\/organisering\/team\/typer\/1"[^>]*>\s*Produktteam/)
    expect(html).toContain('Teamleder, Produkteier')
    expect(trail(html)).toEqual([
      ['Team', '/organisering/team'],
      ['Team Skjemabygger', '/organisering/team/7'],
    ])
  })

  it('TO-03: shows the team owner in a box of their own, with location and unit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(skjemabygger)))

    const html = await (await render('7')).text()
    const [owner, members] = html.split('Hvem er vi?</h2>')

    expect(members).not.toContain('Magnus Johansen')
    expect(owner).toContain('Magnus Johansen')
    expect(owner).toContain('Leikanger')
    expect(owner).toContain('Organisasjonslæring')
  })

  it('TO-03: finds the team owner by the role\'s code, whatever the role is called', async () => {
    const renamed = {
      ...skjemabygger,
      members: {
        docs: [
          { id: 9, person: { id: 9, fullName: 'Kari Nordmann' }, roles: [{ id: 1, name: 'Eier', code: 'teameier' }] },
          { id: 10, person: { id: 10, fullName: 'Ola Nordmann' }, roles: [{ id: 2, name: 'Teameier', code: 'annet' }] },
        ],
      },
    }
    vi.stubGlobal('fetch', vi.fn(async () => json(renamed)))

    const [owner, members] = (await (await render('7')).text()).split('Hvem er vi?</h2>')

    expect(owner).toContain('Kari Nordmann')
    expect(owner).not.toContain('Ola Nordmann')
    expect(members).toContain('Ola Nordmann')
  })

  it('says when the owner has no location or unit, or there is no owner', async () => {
    const withOwner = {
      ...skjemabygger,
      members: {
        docs: [
          {
            id: 9,
            person: { id: 9, fullName: 'Kari Nordmann' },
            roles: [{ id: 1, name: 'Teameier', code: 'teameier' }],
          },
        ],
      },
    }
    vi.stubGlobal('fetch', vi.fn(async () => json(withOwner)))
    expect(await (await render('7')).text()).toMatch(
      /Lokasjon.*Ikke registrert.*Linjetilhørighet.*Ikke registrert/s,
    )

    vi.stubGlobal('fetch', vi.fn(async () => json(nettverk)))
    expect(await (await render('8')).text()).toContain('Teameier ikke registrert.')
  })

  it('shows the avatars in the accent colour, as in Folk and on the unit page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(skjemabygger)))

    const html = await (await render('7')).text()
    const avatars = html.match(/<span[^>]*class="ds-avatar"[^>]*>/g)!

    expect(avatars).toHaveLength(3)
    for (const avatar of avatars) expect(avatar).toContain('data-color="accent"')
  })

  it('links the owner and the members to their pages in Folk, except those who have left', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(skjemabygger)))

    const html = await (await render('7')).text()

    expect(html).toMatch(/href="\/folk\/101"[^>]*>Magnus Johansen</)
    expect(html).toMatch(/href="\/folk\/102"[^>]*>Emma Kristiansen</)
    expect(html).toContain('Ida Haugen')
    expect(html).not.toContain('href="/folk/103"')
  })

  it('lists the members by name', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(skjemabygger)))

    const html = await (await render('7')).text()

    const order = ['Emma Kristiansen', 'Ida Haugen'].map((name) => html.indexOf(name))
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('says so when the team has no members', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(nettverk)))

    expect(await (await render('8')).text()).toContain('Ingen medlemmer registrert ennå.')
  })

  it('TO-07: lists the tools the team uses by name, linking to the toolbox', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(skjemabygger)))

    const html = await (await render('7')).text()
    const [, tools] = html.split('Verktøy teamet bruker</h2>')

    expect(tools).toMatch(/href="\/verktoy\/verktoykasse\/1"[^>]*>\s*Figma/)
    expect(tools).toMatch(/href="\/verktoy\/verktoykasse\/4"[^>]*>\s*OKR/)
    expect(tools.indexOf('Figma')).toBeLessThan(tools.indexOf('OKR'))
  })

  it('TO-07: says so when the team has registered no tools', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(nettverk)))

    expect(await (await render('8')).text()).toContain('Ingen verktøy registrert ennå.')
  })

  it('TO-04, TO-16: shows the approved mandate first, with its status and approval date', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...skjemabygger, mandate: joined(approvedMandate()) })))

    const html = await (await render('7')).text()
    const mandate = mandateSection(html)

    expect(html.indexOf('id="mandat"')).toBeLessThan(html.indexOf('Teameier</h2>'))
    expect(mandate).toMatch(/<span class="ds-tag" data-color="success"[^>]*>\s*Gjeldende/)
    expect(mandate).toContain('Godkjent 15. september 2026')
    for (const label of ['Hva skal vi løse?', 'Hva skal vi oppnå?', 'Hva forventes av oss?', 'Hvordan samarbeider vi med andre?']) {
      expect(mandate).toMatch(new RegExp(`<h3[^>]*>\\s*${label.replace('?', '\\?')}`))
    }
    // TO-09: the fields are markdown.
    expect(mandate).toContain('<strong>gode</strong>')
    expect(mandate).toContain('<a href="https://example.com/innsikt" class="ds-link">innsikten</a>')
    expect(mandate).toContain('<li>Et nytt skjema på under en dag.</li>')
    expect(mandate).not.toContain('ikke komplett')
  })

  it('TO-10: says the mandate is incomplete, and which fields are missing', async () => {
    const incomplete = approvedMandate({ status: 'draft', _status: 'draft', approvedAt: null, outcomes: null, collaboration: '  ' })
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...skjemabygger, mandate: joined(incomplete) })))

    const mandate = mandateSection(await (await render('7')).text())

    expect(mandate).toMatch(/<div class="ds-alert" data-color="warning"[^>]*>[\s\S]*Mandatet er ikke komplett\. Teamet fyller ut resten selv/)
    expect(mandate).toMatch(/<li[^>]*>Hva skal vi oppnå\?<\/li>\s*<li[^>]*>Hvordan samarbeider vi med andre\?<\/li>/)
    expect(mandate.match(/Ikke registrert ennå/g)).toHaveLength(2)
    // TO-16: a mandate that has never been approved is a draft, which only its editors get.
    expect(mandate).toMatch(/data-color="warning"[^>]*>\s*Utkast/)
    expect(mandate).toContain('Ikke godkjent ennå')
  })

  it('TO-16: marks an expired mandate, with when it stopped applying', async () => {
    const expired = approvedMandate({ status: 'expired', expiredAt: '2026-11-16T00:00:00.000Z' })
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...skjemabygger, mandate: joined(expired) })))

    const mandate = mandateSection(await (await render('7')).text())

    expect(mandate).toMatch(/data-color="neutral"[^>]*>\s*Utgått/)
    expect(mandate).toContain('Gjaldt til 16. november 2026 · Godkjent 15. september 2026')
  })

  it('says so when the team has no mandate the visitor may see', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...skjemabygger, mandate: joined() })))
    expect(mandateSection(await (await render('7')).text())).toContain('Mandat ikke registrert.')

    vi.stubGlobal('fetch', vi.fn(async () => json(nettverk)))
    expect(mandateSection(await (await render('8')).text())).toContain('Mandat ikke registrert.')
  })

  it('BG-06: explains a concept in the description in a popover, read once as the visitor', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      new URL(url).pathname === '/api/begreper'
        ? json({ docs: concepts })
        : json({ ...skjemabygger, description: 'Teamet bruker OKR og <b>OKR</b> igjen.' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const html = await (await render('7')).text()

    const reads = fetchMock.mock.calls.filter(([url]) => new URL(url).pathname === '/api/begreper')
    expect(reads).toHaveLength(1)
    expect(new Headers(reads[0]![1]?.headers).get('Authorization')).toBe('JWT visitor-token')
    // The first use only, as a button opening the concept's popover.
    const buttons = [...html.matchAll(/<button type="button" data-popover="inline" popovertarget="([^"]+)"[^>]*>([^<]+)<\/button>/g)]
    expect(buttons.map((m) => m[2])).toEqual(['OKR'])
    const id = buttons[0]![1]
    expect(html).toMatch(new RegExp(`<div class="ds-popover[^"]*" id="${id}" popover[^>]*>[\\s\\S]*?Objectives and key results`))
    // «Teamet» is a concept that isn't explained automatically, and the text is escaped.
    expect(html).not.toMatch(/<button[^>]*>Teamet<\/button>/)
    expect(html).toContain('&lt;b&gt;OKR&lt;/b&gt;')
  })

  it('BG-06: explains both concepts when they share a word, in one popover', async () => {
    const enhetsmandat = { id: 6, name: 'Enhetsmandat', definition: 'Beskriver hvorfor enheten finnes.', variants: ['mandatet'], autoLink: true }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        new URL(url).pathname === '/api/begreper'
          ? json({ docs: [{ ...teammandat, variants: ['mandatet'] }, enhetsmandat] })
          : json({ ...skjemabygger, description: 'Mandatet er godkjent.' }),
      ),
    )

    const html = await (await render('7')).text()

    const ids = [...html.matchAll(/class="ds-popover[^"]*" id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(1)
    expect(html).toContain(`popovertarget="${ids[0]}"`)
    const popover = html.slice(html.indexOf(`id="${ids[0]}"`))
    expect(popover).toMatch(/Enhetsmandat[\s\S]*Beskriver hvorfor enheten finnes[\s\S]*Teammandat[\s\S]*Beskriver hvorfor teamet finnes/)
  })

  it('BG-06: shows the description unmarked when the concepts can’t be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        new URL(url).pathname === '/api/begreper'
          ? json({ errors: [{ message: 'Feil' }] }, 500)
          : json({ ...skjemabygger, description: 'Teamet bruker OKR.' }),
      ),
    )

    const res = await render('7')
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('Teamet bruker OKR.')
    expect(html).not.toContain('popovertarget')
  })

  it('answers 404 when the CMS has no such team', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ errors: [{ message: 'Not Found' }] }, 404)))

    const res = await render('99999')

    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('Fant ikke teamet')
    expect(backLink(html)).toEqual(['Team', '/organisering/team'])
  })

  it('answers 404 without asking the CMS when the id is not a number', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect((await render('abc')).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
