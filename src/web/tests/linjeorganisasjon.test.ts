import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildChart } from '../src/lib/cms/units'
import Linjeorganisasjon from '../src/pages/organisering/linjeorganisasjon/index.astro'
import { cookie, json } from './teams'

const render = async () => {
  const container = await AstroContainer.create()
  return container.renderToString(Linjeorganisasjon, {
    request: new Request('http://localhost/organisering/linjeorganisasjon', {
      headers: { cookie },
    }),
  })
}

type Level = 'directorate' | 'division' | 'department' | 'section'
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

    const html = await render()

    expect(html).toMatch(/Direktør<\/span>\s*<span[^>]*>Ingrid Berg</)
    expect(html).toMatch(/>FEL<\/span>\s*<span[^>]*>4 ansatte</)
    expect(html).toMatch(/>DSS<\/span>\s*<span[^>]*>0 ansatte</)
    expect(html).toContain('Kari Nordmann')
    expect(html.indexOf('Digital strategi og samordning')).toBeLessThan(
      html.indexOf('Fellesløsninger'),
    )
  })

  it('LO-01: lists the departments under their division, and the sections under them', async () => {
    vi.stubGlobal('fetch', cms({ units, people }))

    const html = await render()

    expect(html).toContain('aria-label="Divisjoner i Digitaliseringsdirektoratet"')
    expect(html).toMatch(/aria-label="Enheter i Fellesløsninger"[\s\S]*FEL – Utvikling/)
    expect(html).toMatch(/aria-label="Enheter i FEL – Utvikling"[\s\S]*FEL – Backend/)
  })

  it('says so when there are no units', async () => {
    vi.stubGlobal('fetch', cms({ units: [], people: [] }))

    expect(await render()).toContain('Ingen enheter er registrert ennå.')
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
