import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Team from '../src/pages/team/[id].astro'
import { cms, cookie, json, memberships, nettverk, skjemabygger } from './teams'

const render = async (id: string) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(Team, {
    params: { id },
    request: new Request(`http://localhost/team/${id}`, { headers: { cookie } }),
  })
}

describe('team page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TO-02, TO-03: shows the team type, and the members with all their roles', async () => {
    const fetchMock = vi.fn(
      cms({ team: () => json(skjemabygger), teammedlemskap: () => json({ docs: memberships }) }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('7')
    const html = await res.text()

    const urls = fetchMock.mock.calls.map(([url]) => new URL(url))
    expect(urls.map((u) => u.pathname)).toContain('/api/team/7')
    expect(urls.find((u) => u.pathname === '/api/teammedlemskap')?.searchParams.get('where[team][equals]')).toBe('7')
    expect(res.status).toBe(200)
    expect(html).toContain('Team Skjemabygger')
    expect(html).toContain('Produktteam')
    expect(html).toContain('Emma Kristiansen')
    expect(html).toContain('Teamleder, Produkteier')
    expect(html).toContain('href="/team"')
  })

  it('says so when the team has no members', async () => {
    vi.stubGlobal('fetch', vi.fn(cms({ team: () => json(nettverk), teammedlemskap: () => json({ docs: [] }) })))

    expect(await (await render('8')).text()).toContain('Ingen medlemmer registrert ennå.')
  })

  it('answers 404 when the CMS has no such team', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        cms({
          team: () => json({ errors: [{ message: 'Not Found' }] }, 404),
          teammedlemskap: () => json({ docs: [] }),
        }),
      ),
    )

    const res = await render('99999')

    expect(res.status).toBe(404)
    expect(await res.text()).toContain('Fant ikke teamet')
  })

  it('answers 404 without asking the CMS when the id is not a number', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect((await render('abc')).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
