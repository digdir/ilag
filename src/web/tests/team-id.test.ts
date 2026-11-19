import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Team from '../src/pages/organisering/team/[id].astro'
import { cookie, json, nettverk, skjemabygger } from './teams'
import { backLink, trail } from './breadcrumbs'

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
    expect(html).toContain('Produktteam')
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
