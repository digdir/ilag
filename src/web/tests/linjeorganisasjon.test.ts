import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildChart } from '../src/lib/cms/units'
import Linjeorganisasjon from '../src/pages/organisering/linjeorganisasjon/index.astro'
import { parse } from './dom'
import { cookie, json } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return parse(
    await container.renderToString(Linjeorganisasjon, {
      request: new Request('http://localhost/organisering/linjeorganisasjon', {
        headers: { cookie },
      }),
    }),
  )
}

// Whether `a` comes before `b` in the page.
const before = (a: Node, b: Node) => (a.compareDocumentPosition(b) & 4) !== 0 // DOCUMENT_POSITION_FOLLOWING

// The box at the top of a unit's column: code, size, name and leader.
const head = (page: Awaited<ReturnType<typeof render>>, name: string) =>
  within(page.getByRole('link', { name }).parentElement!)

type Level = 'directorate' | 'division' | 'support' | 'authority' | 'department' | 'section'
const unit = (id: number, name: string, level: Level, parent: number | null, extra = {}) => ({
  id,
  name,
  code: null as string | null,
  level,
  parent,
  leader: null as { id: number; fullName: string } | null,
  ...extra,
})

// Sorted by name, as the query asks for.
const units = [
  unit(4, 'Digital strategi og samordning', 'division', 1, { code: 'DSS' }),
  unit(1, 'Digitaliseringsdirektoratet', 'directorate', null, {
    leader: { id: 1, fullName: 'Ingrid Berg' },
  }),
  unit(5, 'FEL – Backend', 'section', 3, { code: 'FBA' }),
  unit(3, 'FEL – Utvikling', 'department', 2, { code: 'FUT' }),
  unit(2, 'Fellesløsninger', 'division', 1, {
    code: 'FEL',
    leader: { id: 2, fullName: 'Kari Nordmann' },
  }),
  unit(6, 'Kommunikasjon', 'support', 1, { code: 'KOM' }),
  unit(7, 'Tilsyn for universell utforming av IKT', 'authority', 1, { code: 'TUU' }),
]

// Kari leads FEL, Silje is in FUT, Åse in the section under it, and Erik in
// both FUT and the section, so he counts once in FEL.
const people = [
  { id: 1, units: [1] },
  { id: 2, units: [2] },
  { id: 3, units: [3] },
  { id: 4, units: [5] },
  { id: 5, units: [3, 5] },
]

const cms = (found: { units: unknown[]; people: unknown[] }) =>
  vi.fn(async (url: string, _init?: RequestInit) =>
    json({ docs: new URL(url).pathname === '/api/enheter' ? found.units : found.people }),
  )

describe('organisation chart', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('LO-01: asks the CMS for the active units with their leaders and the active people, as the visitor', async () => {
    const fetchMock = cms({ units: [], people: [] })
    vi.stubGlobal('fetch', fetchMock)

    await render()

    for (const path of ['/api/enheter', '/api/personer']) {
      const [url, init] = fetchMock.mock.calls.find(([url]) => new URL(url).pathname === path)!
      expect(new URL(url).searchParams.get('where[active][equals]')).toBe('true')
      expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
    }
    const [url] = fetchMock.mock.calls.find(([url]) => url.includes('/api/enheter'))!
    expect(new URL(url).searchParams.get('populate[personer][fullName]')).toBe('true')
  })

  it('LO-01: shows the director, and each division with its code, size and leader', async () => {
    vi.stubGlobal('fetch', cms({ units, people }))

    const page = await render()

    expect(page.getByText('Direktør').nextElementSibling!.textContent).toBe('Ingrid Berg')
    const fel = head(page, 'Fellesløsninger')
    expect(fel.getByText('FEL')).toBeTruthy()
    expect(fel.getByText('Kari Nordmann')).toBeTruthy()
    const divisions = within(page.getByRole('list', { name: 'Divisjoner' }))
    expect(
      before(divisions.getByRole('link', { name: 'Digital strategi og samordning' }), fel.getByText('FEL')),
    ).toBe(true)
  })

  it('LO-01: shows the size as a number, with «ansatte» for screen readers, and nothing when it is 0', async () => {
    vi.stubGlobal('fetch', cms({ units, people }))

    const page = await render()

    const size = head(page, 'Fellesløsninger').getByTitle('Antall ansatte')
    expect(size.firstChild!.textContent).toBe('4')
    expect(size.textContent).toBe('4 ansatte')
    expect(size.querySelector('.ds-sr-only')!.textContent).toBe(' ansatte')
    expect(head(page, 'Digital strategi og samordning').queryByTitle('Antall ansatte')).toBeNull()
  })

  it('LO-01: says when a unit has no leader registered', async () => {
    vi.stubGlobal('fetch', cms({ units, people }))

    const page = await render()

    expect(head(page, 'Digital strategi og samordning').getByText('Leder ikke registrert')).toBeTruthy()
    expect(head(page, 'Fellesløsninger').queryByText('Leder ikke registrert')).toBeNull()
  })

  it('LO-01: lists the departments under their division, and the sections under them', async () => {
    vi.stubGlobal('fetch', cms({ units, people }))

    const page = await render()

    const departments = within(page.getByRole('list', { name: 'Enheter i Fellesløsninger' }))
    expect(departments.getByRole('link', { name: 'FEL – Utvikling' })).toBeTruthy()
    const sections = within(page.getByRole('list', { name: 'Enheter i FEL – Utvikling' }))
    expect(sections.getByRole('link', { name: 'FEL – Backend' })).toBeTruthy()
  })

  it('LO-01: places the tilsyn to the left of the director and the stab to the right, as in the prototype', async () => {
    vi.stubGlobal('fetch', cms({ units, people }))

    const page = await render()

    const director = page.getByText('Ingrid Berg')
    const tilsyn = page.getByRole('list', { name: 'Tilsyn' })
    const stab = page.getByRole('list', { name: 'Stab' })
    const divisions = page.getByRole('list', { name: 'Divisjoner' })
    // In the markup the director comes first, then the sides, then the
    // divisions; CSS puts the tilsyn to the left.
    expect(before(director, tilsyn)).toBe(true)
    expect(before(tilsyn, stab)).toBe(true)
    expect(before(stab, divisions)).toBe(true)
    expect(within(tilsyn).getByRole('link', { name: 'Tilsyn for universell utforming av IKT' })).toBeTruthy()
    const kommunikasjon = within(stab).getByRole('link', { name: 'Kommunikasjon' })
    expect(kommunikasjon.closest('[data-variant]')!.getAttribute('data-variant')).toBe('light')
    expect(within(divisions).queryByRole('link', { name: 'Kommunikasjon' })).toBeNull()
    expect(within(divisions).queryByRole('link', { name: /Tilsyn for universell/ })).toBeNull()
  })

  it('LO-05: links each division, department and section to its unit page', async () => {
    vi.stubGlobal('fetch', cms({ units, people }))

    const page = await render()

    const hrefs = page.getAllByRole('link').map((link) => link.getAttribute('href'))
    for (const id of [2, 3, 5, 6, 7]) {
      expect(hrefs).toContain(`/organisering/linjeorganisasjon/${id}`)
    }
  })

  it('leaves out the sides when there is no tilsyn or stab', async () => {
    vi.stubGlobal('fetch', cms({ units: units.slice(0, 5), people }))

    const page = await render()

    expect(page.queryByRole('list', { name: 'Tilsyn' })).toBeNull()
    expect(page.queryByRole('list', { name: 'Stab' })).toBeNull()
    expect(page.getByRole('list', { name: 'Divisjoner' })).toBeTruthy()
  })

  it('says so when there are no units', async () => {
    vi.stubGlobal('fetch', cms({ units: [], people: [] }))

    expect((await render()).getByText('Ingen enheter er registrert ennå.')).toBeTruthy()
  })
})

describe('buildChart', () => {
  it('counts everyone in a unit and the units under it, each person once', () => {
    const chart = buildChart(units as never, people)!

    const fel = chart.children.find((u) => u.code === 'FEL')!
    const fut = fel.children[0]!
    expect(chart.size).toBe(5)
    expect(fel.size).toBe(4)
    expect(fut.size).toBe(3)
    expect(fut.children[0]!.size).toBe(2)
  })

  it('says when there is no leader', () => {
    const chart = buildChart(units as never, people)!

    expect(chart.leader).toBe('Ingrid Berg')
    expect(chart.children.find((u) => u.code === 'DSS')!.leader).toBeNull()
  })

  it('returns null without a directorate', () => {
    expect(buildChart(units.slice(2) as never, people)).toBeNull()
  })

  it('leaves out units whose parent is not in the list, such as under a closed unit', () => {
    const withOrphan = [...units, unit(9, 'Under nedlagt enhet', 'section', 99)]

    const chart = buildChart(withOrphan as never, people)!

    expect(JSON.stringify(chart)).not.toContain('Under nedlagt enhet')
  })
})
