import { describe, expect, it } from 'vitest'

import { breadcrumbs, hasSubMenu, isWithin, mainMenu, type NavGroup } from '../src/lib/navigation'

const nav: NavGroup[] = [
  {
    label: 'Organisering',
    path: '/organisering',
    pages: [
      { label: 'Linjeorganisasjon', href: '/organisering/linjeorganisasjon', built: false },
      { label: 'Team', href: '/organisering/team', built: true },
    ],
  },
  { label: 'Folk', path: '/folk', pages: [{ label: 'Folk', href: '/folk', built: true }] },
  { label: 'Styring', path: '/styring', pages: [{ label: 'Prinsipper', href: '/styring/prinsipper', built: false }] },
]

describe('navigation', () => {
  it('counts a path and the pages below it as within, but not a longer name', () => {
    expect(isWithin('/organisering', '/organisering')).toBe(true)
    expect(isWithin('/organisering/team/42', '/organisering')).toBe(true)
    expect(isWithin('/organiseringer', '/organisering')).toBe(false)
  })

  it('lists the groups that have a built page in the main menu', () => {
    expect(mainMenu(nav).map((group) => group.label)).toEqual(['Organisering', 'Folk'])
  })

  it('gives a submenu only to groups with more than one page', () => {
    expect(nav.filter(hasSubMenu).map((group) => group.label)).toEqual(['Organisering'])
  })

  describe('breadcrumbs', () => {
    it('start from the menu page above, and end with the page itself', () => {
      expect(breadcrumbs('/organisering/team/7', { current: 'Team Skjemabygger' }, nav)).toEqual([
        { label: 'Team', href: '/organisering/team' },
        { label: 'Team Skjemabygger', href: '/organisering/team/7' },
      ])
    })

    it('put the trail between the menu page and the page itself', () => {
      const trail = [{ label: 'Divisjon', href: '/folk/divisjon' }]

      expect(breadcrumbs('/folk/1', { trail, current: 'Kari' }, nav)?.map((c) => c.label)).toEqual([
        'Folk',
        'Divisjon',
        'Kari',
      ])
    })

    it('are only the menu page when the page itself was not found', () => {
      expect(breadcrumbs('/folk/42', {}, nav)).toEqual([{ label: 'Folk', href: '/folk' }])
    })

    it('are none on a menu page, outside the menu or below a page not built yet', () => {
      expect(breadcrumbs('/organisering/team', { current: 'Team' }, nav)).toBeNull()
      expect(breadcrumbs('/folkemusikk/1', { current: 'x' }, nav)).toBeNull()
      expect(breadcrumbs('/organisering/linjeorganisasjon/2', { current: 'x' }, nav)).toBeNull()
      expect(breadcrumbs('/logg-inn', {}, nav)).toBeNull()
    })
  })
})
