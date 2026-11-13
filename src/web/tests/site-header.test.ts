import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import SiteHeader from '../src/components/SiteHeader.astro'

const kari = {
  email: 'kari@digdir.no',
  firstName: 'Kari',
  lastName: 'Nordmann',
} as App.Locals['user']

const render = async (props: { user?: App.Locals['user']; pathname: string }) => {
  const container = await AstroContainer.create()
  return container.renderToString(SiteHeader, { props })
}

// The <a> of the menu item with this label.
const menuLink = (html: string, label: string) =>
  html.match(new RegExp(`<a [^>]*>\\s*${label}\\s*</a>`))?.[0]

describe('site header', () => {
  it('shows the logged-in user, a link to the CMS and a way to log out', async () => {
    const html = await render({ user: kari, pathname: '/' })

    expect(html).toContain('Kari Nordmann')
    expect(html).toContain('href="http://localhost:3000/admin"')
    expect(html).toMatch(/<form[^>]*method="post"[^>]*action="\/logg-ut"/)
  })

  it('links the logo to the front page', async () => {
    const html = await render({ user: kari, pathname: '/' })

    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>\s*<img [^>]*alt="Digdir"/)
  })

  it('has a hidden submenu for a section outside it, which the section item points to', async () => {
    const html = await render({ user: kari, pathname: '/' })

    const item = menuLink(html, 'Organisering')
    expect(item).toContain('href="/organisering/team"')
    const id = item!.match(/data-submenu="([^"]+)"/)![1]
    expect(html).toMatch(new RegExp(`<nav [^>]*id="${id}"[^>]*aria-label="Organisering"[^>]*hidden`))
  })

  it('marks the section of the current page as current and shows its submenu', async () => {
    const html = await render({ user: kari, pathname: '/organisering/team/42' })

    expect(menuLink(html, 'Organisering')).toContain('data-current')
    const submenu = html.match(/<nav [^>]*aria-label="Organisering"[^>]*>/)![0]
    expect(submenu).not.toContain('hidden')
  })

  it('marks no section or page as current outside the menu', async () => {
    const html = await render({ user: kari, pathname: '/' })

    expect(html).not.toContain('data-current')
    expect(html).not.toContain('aria-current')
  })

  it('does not take a path that only starts with the same letters as the section', async () => {
    const html = await render({ user: kari, pathname: '/organiseringer' })

    expect(html).not.toContain('data-current')
    expect(html).not.toContain('aria-current')
  })

  it('shows the submenu of the current section, linking only pages that are built', async () => {
    const html = await render({ user: kari, pathname: '/organisering/team/42' })

    expect(html).toContain('aria-label="Organisering"')
    expect(menuLink(html, 'Team')).toMatch(/href="\/organisering\/team"[^>]*aria-current="page"/)
    expect(html).toMatch(/<span [^>]*>\s*Linjeorganisasjon\s*<\/span>/)
    expect(menuLink(html, 'Linjeorganisasjon')).toBeUndefined()
  })

  it('shows only the logo when nobody is logged in', async () => {
    const html = await render({ pathname: '/logg-inn' })

    expect(html).toContain('alt="Digdir"')
    expect(html).not.toContain('Hovedmeny')
    expect(html).not.toContain('/logg-ut')
    expect(html).not.toContain('/admin')
  })
})
