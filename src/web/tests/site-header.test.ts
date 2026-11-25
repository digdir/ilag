import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import SiteHeader from '../src/components/SiteHeader.astro'
import { byTestId, parse } from './dom'

const kari = {
  email: 'kari@digdir.no',
  firstName: 'Kari',
  lastName: 'Nordmann',
} as App.Locals['user']

const render = async (props: { user?: App.Locals['user']; pathname: string }) => {
  const container = await AstroContainer.create()
  return parse(await container.renderToString(SiteHeader, { props }))
}

// A section's submenu row, by its label.
const submenu = (page: ReturnType<typeof parse>, label: string) => page.querySelector(`nav[aria-label="${label}"]`)!

describe('site header', () => {
  it('shows the logged-in user and a way to log out', async () => {
    const page = await render({ user: kari, pathname: '/' })

    expect(page.querySelector('header')!.textContent).toContain('Kari Nordmann')
    expect(page.querySelector('form[method="post"][action="/logg-ut"] button')).not.toBeNull()
  })

  it('links to the CMS for someone who may use the admin panel', async () => {
    const page = await render({ user: { ...kari!, canAccessAdmin: true }, pathname: '/' })

    expect(page.querySelector('a[href="http://localhost:3000/admin"]')?.textContent?.trim()).toBe('CMS')
  })

  it('leaves the CMS link out for someone who may not use the admin panel', async () => {
    const page = await render({ user: { ...kari!, canAccessAdmin: false }, pathname: '/' })

    expect(page.querySelector('a[href$="/admin"]')).toBeNull()
  })

  it('links the logo to the front page', async () => {
    const page = await render({ user: kari, pathname: '/' })

    expect(page.querySelector('img[alt="Digdir"]')!.closest('a')!.getAttribute('href')).toBe('/')
  })

  it('has a hidden submenu for a section outside it, which the section item points to', async () => {
    const page = await render({ user: kari, pathname: '/' })

    const item = byTestId(page, 'menu-organisering')!
    expect(item.getAttribute('href')).toBe('/organisering/team')
    const row = page.getElementById(item.getAttribute('data-submenu')!)!
    expect(row.getAttribute('aria-label')).toBe('Organisering')
    expect(row.hasAttribute('hidden')).toBe(true)
  })

  it('marks the section of the current page as current and shows its submenu', async () => {
    const page = await render({ user: kari, pathname: '/organisering/team/42' })

    expect(byTestId(page, 'menu-organisering')!.hasAttribute('data-current')).toBe(true)
    expect(submenu(page, 'Organisering').hasAttribute('hidden')).toBe(false)
  })

  it('marks no section or page as current outside the menu', async () => {
    const page = await render({ user: kari, pathname: '/' })

    expect(page.querySelector('[data-current], [aria-current]')).toBeNull()
  })

  it('does not take a path that only starts with the same letters as the section', async () => {
    const page = await render({ user: kari, pathname: '/organiseringer' })

    expect(page.querySelector('[data-current], [aria-current]')).toBeNull()
  })

  it('shows the submenu of the current section, linking only pages that are built', async () => {
    const page = await render({ user: kari, pathname: '/organisering/team/42' })

    const team = byTestId(page, 'submenu-organisering-team')!
    expect(team.tagName).toBe('A')
    expect(team.getAttribute('href')).toBe('/organisering/team')
    expect(team.getAttribute('aria-current')).toBe('page')
    expect(byTestId(page, 'submenu-organisering-linjeorganisasjon')!.getAttribute('href')).toBe(
      '/organisering/linjeorganisasjon',
    )
    const innsats = byTestId(page, 'submenu-organisering-innsatsomrade')!
    expect(innsats.tagName).toBe('SPAN')
    expect(innsats.textContent).toBe('Innsatsområde (kommer snart)')
  })

  it('shows an icon before each main menu item, as in the prototype, hidden from screen readers', async () => {
    const page = await render({ user: kari, pathname: '/' })

    for (const section of ['styring', 'folk', 'organisering', 'verktoy']) {
      const icon = byTestId(page, `menu-${section}`)?.firstElementChild
      expect(icon?.tagName, section).toBe('svg')
      expect(icon?.getAttribute('aria-hidden'), section).toBe('true')
    }
  })

  it('shows only the logo when nobody is logged in', async () => {
    const page = await render({ pathname: '/logg-inn' })

    expect(page.querySelector('img[alt="Digdir"]')).not.toBeNull()
    expect(page.querySelector('nav')).toBeNull()
    expect(page.querySelector('form[action="/logg-ut"]')).toBeNull()
    expect(page.querySelector('a[href$="/admin"]')).toBeNull()
  })
})
