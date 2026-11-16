import { describe, expect, it } from 'vitest'

import { hasSubMenu, isWithin, mainMenu, type NavGroup } from '../src/lib/navigation'

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
})
