import { describe, expect, it } from 'vitest'

import { isWithin, mainMenu, type NavGroup, subMenuFor } from '../src/lib/navigation'

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

  it('lists groups with a built page in the main menu, linking to the first built page', () => {
    expect(mainMenu(nav)).toEqual([
      { label: 'Organisering', href: '/organisering/team', path: '/organisering' },
      { label: 'Folk', href: '/folk', path: '/folk' },
    ])
  })

  it('gives the submenu of the current group', () => {
    expect(subMenuFor('/organisering/team/42', nav)?.label).toBe('Organisering')
  })

  it('gives no submenu outside the groups, or for a group with a single page', () => {
    expect(subMenuFor('/', nav)).toBeUndefined()
    expect(subMenuFor('/folk', nav)).toBeUndefined()
  })
})
