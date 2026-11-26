import type { APIContext } from 'astro'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from '../src/pages/sok.json'
import { cookie, json } from './teams'

// The search in the header asks /sok.json, which asks the CMS's search index.
const get = async (q: string | null) => {
  const url = new URL('http://localhost/sok.json')
  if (q !== null) url.searchParams.set('q', q)
  const request = new Request(url, { headers: { cookie } })
  const response = await GET({ url, request } as unknown as APIContext)
  return { response, hits: await response.json() }
}

const hit = (relationTo: string, value: number, title: string, subtitle: string | null = null) => ({
  id: value + 1000,
  title,
  subtitle,
  active: true,
  doc: { relationTo, value },
})

describe('search (FS-01)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks the CMS for the active hits by name, in order of type, as the visitor', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ docs: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await get('plattform')

    const [url, init] = fetchMock.mock.calls[0]
    const { pathname, searchParams } = new URL(url)
    expect(pathname).toBe('/api/sok')
    expect(searchParams.get('where[title][like]')).toBe('plattform')
    expect(searchParams.get('where[active][equals]')).toBe('true')
    expect(searchParams.get('sort')).toBe('priority,title')
    expect(new Headers(init?.headers).get('Authorization')).toBe('JWT visitor-token')
  })

  it('links each hit to its page, with its type and context', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          docs: [
            hit('team', 7, 'Team Skjemabygger', 'Produktteam'),
            hit('teamtyper', 1, 'Produktteam'),
            hit('enheter', 3, 'Fellesløsninger', 'Divisjon'),
            hit('personer', 12, 'Kari Nordmann', 'Seniorrådgiver'),
            hit('roller', 2, 'Teamleder'),
            hit('verktoy', 4, 'OKR', 'Metode'),
          ],
        }),
      ),
    )

    const { response, hits } = await get('a')
    expect(hits).toEqual([])
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')

    const { hits: found } = await get('te')
    expect(found).toEqual([
      { title: 'Team Skjemabygger', subtitle: 'Produktteam', kindLabel: 'Team', url: '/organisering/team/7' },
      { title: 'Produktteam', subtitle: null, kindLabel: 'Teamtype', url: '/organisering/team/typer/1' },
      {
        title: 'Fellesløsninger',
        subtitle: 'Divisjon',
        kindLabel: 'Enhet',
        url: '/organisering/linjeorganisasjon/3',
      },
      { title: 'Kari Nordmann', subtitle: 'Seniorrådgiver', kindLabel: 'Person', url: '/folk/12' },
      { title: 'Teamleder', subtitle: null, kindLabel: 'Rolle', url: '/organisering/roller/2' },
      { title: 'OKR', subtitle: 'Metode', kindLabel: 'Verktøy', url: '/verktoy/verktoykasse/4' },
    ])
  })

  it('leaves out a subtitle that only repeats the type', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ docs: [hit('verktoy', 1, 'Figma', 'Verktøy')] })))

    const { hits } = await get('fig')
    expect(hits[0]).toMatchObject({ title: 'Figma', subtitle: null, kindLabel: 'Verktøy' })
  })

  it('does not ask the CMS for less than two letters', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect((await get(null)).hits).toEqual([])
    expect((await get(' k ')).hits).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
