import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Unit from '../src/pages/organisering/linjeorganisasjon/[id].astro'
import { backLink, trail } from './breadcrumbs'
import { approvedMandate, joined } from './mandates'
import { cookie, json } from './teams'

// The mandate section, from its heading to the end of the section.
const mandateSection = (html: string) => html.match(/id="mandat"[\s\S]*?<\/section>/)?.[0] ?? ''

const render = async (id: string) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(Unit, {
    params: { id },
    request: new Request(`http://localhost/organisering/linjeorganisasjon/${id}`, {
      headers: { cookie },
    }),
  })
}

const person = (id: number, fullName: string, extra = {}) => ({
  id,
  fullName,
  title: 'Seniorrådgiver' as string | null,
  email: `${fullName.split(' ')[0]!.toLowerCase()}@example.com`,
  mobile: null as string | null,
  active: true,
  ...extra,
})

const kari = person(2, 'Kari Nordmann', { title: 'Divisjonsdirektør', mobile: '900 00 000' })

const fel = {
  id: 2,
  name: 'Fellesløsninger',
  code: 'FEL',
  level: 'division',
  description: 'Utvikler og forvalter fellesløsningene.\n\nSamarbeider med hele offentlig sektor.' as
    | string
    | null,
  parent: { id: 1, name: 'Digitaliseringsdirektoratet' },
  leader: kari as unknown,
  advisesAllOfDigdir: false,
  active: true,
}

// As the CMS returns them; the leader is in the unit too.
const people = [
  person(4, 'Åse Vik', { title: null }),
  kari,
  person(3, 'Erik Hansen', { mobile: '911 11 111' }),
]

// The units under FEL, sorted by name as the query asks for.
const children = [
  {
    id: 3,
    name: 'FEL - Utvikling',
    code: 'FUT',
    level: 'department',
    leader: { id: 5, fullName: 'Silje Larsen', active: true },
  },
  {
    id: 6,
    name: 'FEL – Marked',
    code: null,
    level: 'department',
    leader: { id: 7, fullName: 'Ola Sluttet', active: false },
  },
]

const cms = (unit: unknown, found: unknown[] = people, under: unknown[] = children) =>
  vi.fn(async (url: string, _init?: RequestInit) => {
    const { pathname } = new URL(url)
    if (pathname.startsWith('/api/enheter/')) return json(unit)
    return json({ docs: pathname === '/api/enheter' ? under : found })
  })

describe('unit page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('LO-02: asks the CMS for the unit and the active people in it, as the visitor', async () => {
    const fetchMock = cms(fel)
    vi.stubGlobal('fetch', fetchMock)

    await render('2')

    const calls = fetchMock.mock.calls.map(([url, init]) => ({
      url: new URL(url),
      auth: new Headers(init?.headers).get('Authorization'),
    }))
    const unit = calls.find((c) => c.url.pathname === '/api/enheter/2')!
    const found = calls.find((c) => c.url.pathname === '/api/personer')!
    expect(unit.auth).toBe('JWT visitor-token')
    expect(found.auth).toBe('JWT visitor-token')
    expect(unit.url.searchParams.get('populate[personer][email]')).toBe('true')
    expect(unit.url.searchParams.get('populate[enheter][parent]')).toBe('true')
    expect(Number(unit.url.searchParams.get('depth'))).toBeGreaterThanOrEqual(4)
    expect(found.url.searchParams.get('where[units][in][0]')).toBe('2')
    expect(found.url.searchParams.get('where[active][equals]')).toBe('true')
    const under = calls.find((c) => c.url.pathname === '/api/enheter')!
    expect(under.auth).toBe('JWT visitor-token')
    expect(under.url.searchParams.get('where[parent][equals]')).toBe('2')
    expect(under.url.searchParams.get('where[active][equals]')).toBe('true')
  })

  it('LO-02: shows the unit with its code, level and the way back', async () => {
    vi.stubGlobal('fetch', cms(fel))

    const res = await render('2')
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('FEL · Divisjon')
    expect(html).toMatch(/<h1[^>]*>\s*Fellesløsninger\s*<\/h1>/)
    expect(trail(html)).toEqual([
      ['Linjeorganisasjon', '/organisering/linjeorganisasjon'],
      ['Digitaliseringsdirektoratet', '/organisering/linjeorganisasjon/1'],
      ['Fellesløsninger', '/organisering/linjeorganisasjon/2'],
    ])
    expect(backLink(html)).toEqual(['Digitaliseringsdirektoratet', '/organisering/linjeorganisasjon/1'])
    expect(html).not.toContain('Bistår og rådgir hele Digdir')
  })

  it('LO-02: shows the description under the name, a paragraph for each blank line', async () => {
    const fetchMock = cms(fel)
    vi.stubGlobal('fetch', fetchMock)

    const html = await (await render('2')).text()

    const [url] = fetchMock.mock.calls.find(([url]) => url.includes('/api/enheter/2'))!
    expect(new URL(url).searchParams.get('select[description]')).toBe('true')
    expect(html).toMatch(
      /Fellesløsninger\s*<\/h1>\s*<p[^>]*>Utvikler og forvalter fellesløsningene.<\/p>\s*<p[^>]*>Samarbeider med hele offentlig sektor.<\/p>/,
    )
  })

  it('leaves out the description when there is none', async () => {
    vi.stubGlobal('fetch', cms({ ...fel, description: null }))

    const html = await (await render('2')).text()

    expect(html).toMatch(/Fellesløsninger\s*<\/h1>\s*<\/header>/)
  })

  it('LO-02: shows the leader with title, email and mobile', async () => {
    vi.stubGlobal('fetch', cms(fel))

    const html = await (await render('2')).text()
    const [, leader, employees] = html.split(/id="leder"|id="ansatte"/)

    expect(leader).toContain('Kari Nordmann')
    expect(leader).toContain('Divisjonsdirektør')
    expect(leader).toContain('href="mailto:kari@example.com"')
    expect(leader).toContain('href="tel:90000000"')
    expect(employees).not.toContain('Kari Nordmann')
  })

  it('shows the leader compactly, with name, email and mobile on one line', async () => {
    vi.stubGlobal('fetch', cms(fel))

    const html = await (await render('2')).text()
    const line = html.match(/<p[^>]*class="[^"]*line[^"]*"[^>]*>([\s\S]*?)<\/p>/)![1]!

    expect(line).toContain('Kari Nordmann')
    expect(line).toContain('href="mailto:kari@example.com"')
    expect(line).toContain('aria-label="Mobil 900 00 000"')
    expect(line).not.toContain('Divisjonsdirektør')
  })

  it('shows the avatars in the accent colour, as in Folk', async () => {
    vi.stubGlobal('fetch', cms(fel))

    const html = await (await render('2')).text()
    const avatars = html.match(/<span[^>]*class="ds-avatar"[^>]*>/g)!

    expect(avatars).toHaveLength(3)
    for (const avatar of avatars) expect(avatar).toContain('data-color="accent"')
  })

  it('LO-02: lists the employees by name, without the leader, with their contact information', async () => {
    vi.stubGlobal('fetch', cms(fel))

    const html = await (await render('2')).text()
    const employees = html.split('id="ansatte"')[1]!

    expect(employees).toContain('2 ansatte')
    expect(employees.indexOf('Erik Hansen')).toBeLessThan(employees.indexOf('Åse Vik'))
    expect(employees).toContain('href="mailto:erik@example.com"')
    expect(employees).toContain('911 11 111')
  })

  it('links the leader and the employees to their pages in Folk', async () => {
    vi.stubGlobal('fetch', cms(fel))

    const html = await (await render('2')).text()
    const [, leader, employees] = html.split(/id="leder"|id="ansatte"/)

    expect(leader).toMatch(/href="\/folk\/2"[^>]*>Kari Nordmann</)
    expect(employees).toMatch(/href="\/folk\/3"[^>]*>Erik Hansen</)
    expect(employees).toMatch(/href="\/folk\/4"[^>]*>Åse Vik</)
  })

  it('says when there is no leader, the leader has left, or there are no employees', async () => {
    vi.stubGlobal('fetch', cms({ ...fel, leader: null }, []))
    let html = await (await render('2')).text()
    expect(html).toContain('Leder er ikke registrert.')
    expect(html).toContain('Ingen ansatte er registrert i enheten.')
    expect(html).toContain('0 ansatte')

    vi.stubGlobal('fetch', cms({ ...fel, leader: { ...kari, active: false } }))
    html = await (await render('2')).text()
    expect(html).toContain('Leder er ikke registrert.')
  })

  it('LO-02, LO-05: lists the units under it with level and leader, each linking to its page', async () => {
    vi.stubGlobal('fetch', cms(fel))

    const html = await (await render('2')).text()
    const under = html.split('id="enheter-under"')[1]!

    expect(under).toMatch(/href="\/organisering\/linjeorganisasjon\/3"[\s\S]*FUT · Avdeling[\s\S]*FEL - Utvikling[\s\S]*Silje Larsen/)
    expect(under).toMatch(/href="\/organisering\/linjeorganisasjon\/6"[\s\S]*>\s*Avdeling\s*<[\s\S]*FEL – Marked/)
    expect(under).not.toContain('Ola Sluttet')
    expect(under).toContain('Leder ikke registrert')
  })

  it('leaves out «Enheter under» when there are none', async () => {
    vi.stubGlobal('fetch', cms(fel, people, []))

    expect(await (await render('2')).text()).not.toContain('Enheter under')
  })

  it('LO-06: marks a unit that advises all of Digdir', async () => {
    vi.stubGlobal('fetch', cms({ ...fel, advisesAllOfDigdir: true }))

    expect(await (await render('2')).text()).toContain('Bistår og rådgir hele Digdir')
  })

  it('shows every unit above it in the breadcrumbs, from the directorate down', async () => {
    const digdir = { id: 1, name: 'Digitaliseringsdirektoratet', parent: null }
    const division = { id: 2, name: 'Fellesløsninger', parent: digdir }
    const department = { id: 3, name: 'FEL - Utvikling', parent: division }
    vi.stubGlobal('fetch', cms({ ...fel, id: 9, name: 'Team Plattform', level: 'section', parent: department }))

    const html = await (await render('9')).text()

    expect(trail(html).map(([label]) => label)).toEqual([
      'Linjeorganisasjon',
      'Digitaliseringsdirektoratet',
      'Fellesløsninger',
      'FEL - Utvikling',
      'Team Plattform',
    ])
    expect(backLink(html)).toEqual(['FEL - Utvikling', '/organisering/linjeorganisasjon/3'])
  })

  it('stops the breadcrumbs at a unit above that the visitor may not see', async () => {
    // Payload leaves the id where it would not populate the unit.
    const division = { id: 2, name: 'Fellesløsninger', parent: 1 }
    vi.stubGlobal('fetch', cms({ ...fel, id: 3, name: 'FEL - Utvikling', level: 'department', parent: division }))

    const html = await (await render('3')).text()

    expect(trail(html).map(([label]) => label)).toEqual(['Linjeorganisasjon', 'Fellesløsninger', 'FEL - Utvikling'])
  })

  it('answers 404 when the CMS has no such unit, or it is closed', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      new URL(url).pathname.startsWith('/api/enheter/')
        ? json({ errors: [{ message: 'Not Found' }] }, 404)
        : json({ docs: [] }),
    ))
    let res = await render('99999')
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('Fant ikke enheten')
    expect(backLink(html)).toEqual(['Linjeorganisasjon', '/organisering/linjeorganisasjon'])

    vi.stubGlobal('fetch', cms({ ...fel, active: false }))
    res = await render('2')
    expect(res.status).toBe(404)
  })

  it('LO-02, LO-04: shows the mandate first, with its status, and asks the CMS for it', async () => {
    const fetchMock = cms({ ...fel, mandate: joined(approvedMandate({ approvedAt: '2026-08-20T00:00:00.000Z' })) })
    vi.stubGlobal('fetch', fetchMock)

    const html = await (await render('2')).text()
    const mandate = mandateSection(html)

    const unitUrl = new URL(fetchMock.mock.calls.find(([url]) => new URL(url).pathname === '/api/enheter/2')![0])
    expect(unitUrl.searchParams.get('select[mandate]')).toBe('true')
    expect(html.indexOf('id="mandat"')).toBeLessThan(html.indexOf('id="leder"'))
    expect(mandate).toMatch(/data-color="success"[^>]*>\s*Gjeldende/)
    expect(mandate).toContain('Godkjent 20. august 2026')
    expect(mandate).toContain('<strong>gode</strong>')
  })

  it('LO-04: says the unit\'s mandate is incomplete, and what is missing', async () => {
    vi.stubGlobal('fetch', cms({ ...fel, mandate: joined(approvedMandate({ expectations: '' })) }))

    const mandate = mandateSection(await (await render('2')).text())

    expect(mandate).toContain('Mandatet er ikke komplett. Enheten fyller ut resten selv.')
    expect(mandate).toMatch(/<li[^>]*>Hva forventes av oss\?<\/li>/)
  })

  it('says so when the unit has no mandate the visitor may see', async () => {
    vi.stubGlobal('fetch', cms(fel))

    expect(mandateSection(await (await render('2')).text())).toContain('Mandat ikke registrert.')
  })

  it('answers 404 without asking the CMS when the id is not a number', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect((await render('abc')).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
