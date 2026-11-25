import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import SiteHeader from '../src/components/SiteHeader.astro'
import { parse } from './dom'

const kari = {
  email: 'kari@digdir.no',
  firstName: 'Kari',
  lastName: 'Nordmann',
} as App.Locals['user']

const render = async (props: { user?: App.Locals['user']; pathname: string }) => {
  const container = await AstroContainer.create()
  return parse(await container.renderToString(SiteHeader, { props }))
}

// Main menu items are found by test id: a section with a submenu is a link
// without JavaScript and a button with it, so its role changes.
describe('site header', () => {
  it('shows the logged-in user and a way to log out', async () => {
    const page = await render({ user: kari, pathname: '/' })

    expect(page.getByText('Kari Nordmann')).toBeTruthy()
    expect(page.getByRole('button', { name: 'Logg ut' }).closest('form')!.getAttribute('action')).toBe('/logg-ut')
  })

  it('links to the CMS for someone who may use the admin panel', async () => {
    const page = await render({ user: { ...kari!, canAccessAdmin: true }, pathname: '/' })

    expect(page.getByRole('link', { name: 'CMS' }).getAttribute('href')).toBe('http://localhost:3000/admin')
  })

  it('leaves the CMS link out for someone who may not use the admin panel', async () => {
    const page = await render({ user: { ...kari!, canAccessAdmin: false }, pathname: '/' })

    expect(page.queryByRole('link', { name: 'CMS' })).toBeNull()
    expect(page.container.querySelector('a[href$="/admin"]')).toBeNull()
  })

  it('links the logo to the front page', async () => {
    const page = await render({ user: kari, pathname: '/' })

    expect(page.getByRole('link', { name: 'Digdir ilag' }).getAttribute('href')).toBe('/')
  })

  it('has a hidden submenu for a section outside it, which the section item points to', async () => {
    const page = await render({ user: kari, pathname: '/' })

    const item = page.getByTestId('menu-organisering')
    expect(item.getAttribute('href')).toBe('/organisering/team')
    // A hidden element has no accessible name, so follow the item to its submenu.
    const submenu = page.container.querySelector(`#${item.getAttribute('data-submenu')}`)!
    expect(submenu.getAttribute('aria-label')).toBe('Organisering')
    expect(submenu.hasAttribute('hidden')).toBe(true)
  })

  it('marks the section of the current page as current and shows its submenu', async () => {
    const page = await render({ user: kari, pathname: '/organisering/team/42' })

    expect(page.getByTestId('menu-organisering').hasAttribute('data-current')).toBe(true)
    expect(page.getByRole('navigation', { name: 'Organisering' }).hasAttribute('hidden')).toBe(false)
  })

  it('marks no section or page as current outside the menu', async () => {
    const page = await render({ user: kari, pathname: '/' })

    expect(page.container.querySelector('[data-current], [aria-current]')).toBeNull()
  })

  it('does not take a path that only starts with the same letters as the section', async () => {
    const page = await render({ user: kari, pathname: '/organiseringer' })

    expect(page.container.querySelector('[data-current], [aria-current]')).toBeNull()
  })

  it('shows the submenu of the current section, linking only pages that are built', async () => {
    const page = await render({ user: kari, pathname: '/organisering/team/42' })

    expect(page.getByRole('link', { name: 'Team', current: 'page' }).getAttribute('href')).toBe('/organisering/team')
    expect(page.getByRole('link', { name: 'Linjeorganisasjon' }).getAttribute('href')).toBe(
      '/organisering/linjeorganisasjon',
    )
    expect(page.getByText('Innsatsområde').textContent).toBe('Innsatsområde (kommer snart)')
    expect(page.queryByRole('link', { name: /Innsatsområde/ })).toBeNull()
  })

  it('shows an icon before each main menu item, as in the prototype, hidden from screen readers', async () => {
    const page = await render({ user: kari, pathname: '/' })

    for (const section of ['styring', 'folk', 'organisering', 'verktoy']) {
      const icon = page.getByTestId(`menu-${section}`).firstElementChild
      expect(icon?.tagName, section).toBe('svg')
      expect(icon?.getAttribute('aria-hidden'), section).toBe('true')
    }
  })

  it('shows only the logo when nobody is logged in', async () => {
    const page = await render({ pathname: '/logg-inn' })

    expect(page.getByRole('img', { name: 'Digdir' })).toBeTruthy()
    expect(page.queryByRole('navigation')).toBeNull()
    expect(page.queryByRole('button', { name: 'Logg ut' })).toBeNull()
    expect(page.queryByRole('link', { name: 'CMS' })).toBeNull()
  })
})
