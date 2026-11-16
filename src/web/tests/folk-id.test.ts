import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Person from '../src/pages/folk/[id].astro'
import { cookie, json } from './teams'

const render = async (id: string) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(Person, {
    params: { id },
    request: new Request(`http://localhost/folk/${id}`, { headers: { cookie } }),
  })
}

const role = (id: number, name: string) => ({ id, name })
const team = (id: number, name: string, active = true) => ({ id, name, active })

const ase = {
  id: 1,
  fullName: 'Åse Ødegård',
  title: 'Seniorutvikler',
  email: 'ase.odegard@digdir.no',
  mobile: '912 34 567',
  active: true,
  location: { id: 2, name: 'Leikanger' },
  units: [
    { id: 283, name: 'FEL – Backend', active: true },
    { id: 270, name: 'FEL – Utvikling', active: true },
    { id: 99, name: 'Nedlagt enhet', active: false },
  ],
  teams: {
    docs: [
      { id: 1, team: team(9, 'Team Skjemabygger'), roles: [role(1, 'Teamleder'), role(2, 'Utvikler')] },
      { id: 2, team: team(10, 'Team Nedlagt', false), roles: [role(2, 'Utvikler')] },
      { id: 3, team: team(11, 'Team Altinn'), roles: [role(2, 'Utvikler')] },
    ],
  },
}

const emma = {
  id: 3,
  fullName: 'Emma Kristiansen',
  title: null,
  email: 'emma.kristiansen@digdir.no',
  mobile: null,
  active: true,
  location: null,
  units: [],
  teams: { docs: [] },
}

const cms = (person: unknown) => vi.fn(async (_url: string, _init?: RequestInit) => json(person))

describe('person page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('FO-02: asks the CMS for the person, as the visitor', async () => {
    const fetchMock = cms(ase)
    vi.stubGlobal('fetch', fetchMock)

    const res = await render('1')

    expect(res.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0]!
    const { pathname, searchParams } = new URL(url)
    expect(pathname).toBe('/api/personer/1')
    expect(searchParams.get('depth')).toBe('2')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('FO-01: shows the name and title, with a link back to Folk', async () => {
    vi.stubGlobal('fetch', cms(ase))

    const html = await (await render('1')).text()

    expect(html).toContain('<title>Åse Ødegård — ilag</title>')
    expect(html).toMatch(/<h1[^>]*>\s*Åse Ødegård\s*<\/h1>/)
    expect(html).toContain('Seniorutvikler')
    expect(html).toContain('href="/folk"')
    expect(html).toMatch(/class="ds-avatar"[^>]*>ÅØ</)
  })

  it('FO-02: shows email, mobile and location, and the active units linking to their pages', async () => {
    vi.stubGlobal('fetch', cms(ase))

    const html = await (await render('1')).text()

    expect(html).toContain('href="mailto:ase.odegard@digdir.no"')
    expect(html).toContain('href="tel:91234567"')
    expect(html).toContain('Leikanger')
    expect(html).toMatch(/href="\/organisering\/linjeorganisasjon\/283"[^>]*>\s*FEL – Backend/)
    expect(html).toMatch(/href="\/organisering\/linjeorganisasjon\/270"[^>]*>\s*FEL – Utvikling/)
    expect(html.indexOf('FEL – Backend')).toBeLessThan(html.indexOf('FEL – Utvikling'))
    expect(html).not.toContain('Nedlagt enhet')
  })

  it('FO-02: lists the active teams by name with the roles there', async () => {
    vi.stubGlobal('fetch', cms(ase))

    const html = await (await render('1')).text()

    expect(html).toMatch(/href="\/organisering\/team\/9"[^>]*>\s*Team Skjemabygger/)
    expect(html).toContain('Teamleder, Utvikler')
    expect(html).toMatch(/href="\/organisering\/team\/11"[^>]*>\s*Team Altinn/)
    expect(html.indexOf('Team Altinn')).toBeLessThan(html.indexOf('Team Skjemabygger'))
    expect(html).not.toContain('Team Nedlagt')
  })

  it('AL-04: shows no allocation', async () => {
    vi.stubGlobal('fetch', cms(ase))

    const html = await (await render('1')).text()

    expect(html).not.toMatch(/allokering|%/i)
  })

  it('says what is not registered', async () => {
    vi.stubGlobal('fetch', cms(emma))

    const html = await (await render('3')).text()

    expect(html).toMatch(/Mobil.*Ikke registrert.*Lokasjon.*Ikke registrert.*Enhet i linjen.*Ikke registrert/s)
    expect(html).toContain('Ikke med i noen team.')
  })

  it('answers 404 for a person who has left, an unknown id or a non-numeric one', async () => {
    vi.stubGlobal('fetch', cms({ ...ase, active: false }))
    const left = await render('1')
    expect(left.status).toBe(404)
    expect(await left.text()).toContain('Fant ikke personen')

    vi.stubGlobal('fetch', vi.fn(async () => json({ errors: [{ message: 'Not Found' }] }, 404)))
    expect((await render('42')).status).toBe(404)

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect((await render('abc')).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
