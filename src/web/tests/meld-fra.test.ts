import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MeldFra from '../src/pages/meld-fra.astro'
import SiteFooter from '../src/components/SiteFooter.astro'
import { cookie, json } from './teams'

const render = async (path: string, form?: Record<string, string>) => {
  const container = await AstroContainer.create()
  return container.renderToResponse(MeldFra, {
    request: new Request(new URL(path, 'http://localhost:4321'), {
      headers: { cookie },
      ...(form && { method: 'POST', body: new URLSearchParams(form) }),
    }),
  })
}

const post = (side: string, form: Record<string, string>) =>
  render(`/meld-fra?${new URLSearchParams({ side, tittel: 'Team Skjemabygger — ilag' })}`, form)

describe('report an error page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TB-01: links to the page from the footer, with where the visitor is', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(SiteFooter, {
      props: { signedIn: true, pathname: '/organisering/team/7', title: 'Team Skjemabygger — ilag' },
    })
    expect(html).toContain('href="/meld-fra?side=%2Forganisering%2Fteam%2F7&amp;tittel=Team+Skjemabygger+%E2%80%94+ilag"')
  })

  it('TB-02: says who gets feedback on a team, and offers the categories', async () => {
    const html = await (await render(`/meld-fra?${new URLSearchParams({ side: '/organisering/team/7', tittel: 'Team Skjemabygger — ilag' })}`)).text()
    expect(html).toContain('Team Skjemabygger')
    expect(html).toContain('teameier og teamleder for teamet')
    for (const label of ['Faktafeil', 'Utdatert', 'Uklart', 'Mangler', 'Annet']) expect(html).toContain(label)
  })

  it('TB-01, TB-02: sends the feedback as the visitor, with the team the page is about', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => json({ doc: { id: 1 } }, 201))
    vi.stubGlobal('fetch', fetchMock)

    const res = await post('/organisering/team/7', { category: 'uklart', text: ' Feil leder ', contactMe: 'on' })

    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toContain('sendt=')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('http://localhost:3000/api/tilbakemeldinger')
    expect(new Headers(init?.headers).get('authorization')).toBe('JWT visitor-token')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      category: 'uklart',
      text: 'Feil leder',
      page: '/organisering/team/7',
      contactMe: true,
      team: 7,
    })
  })

  it('TB-02: sends feedback on other pages to the administrators, and never to another site', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => json({ doc: { id: 1 } }, 201))
    vi.stubGlobal('fetch', fetchMock)

    await post('https://evil.example/organisering/team/7', { category: 'annet', text: 'Hei' })

    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))
    expect(body).toMatchObject({ page: '/', contactMe: false })
    expect(body.team).toBeUndefined()
  })

  it('keeps what was typed when the CMS refuses it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ errors: [{ message: 'Nei' }] }, 400)))

    const res = await post('/organisering/linjeorganisasjon/3', { category: 'mangler', text: 'Mangler leder' })

    expect(res.status).toBe(400)
    const html = await res.text()
    expect(html).toContain('ble ikke sendt')
    expect(html).toContain('Mangler leder</textarea>')
    expect(html).toMatch(/value="mangler"[^>]*checked/)
  })

  it('refuses an empty description without asking the CMS', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)

    const res = await post('/', { category: 'annet', text: '   ' })

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
