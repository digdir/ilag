// The site's menu, from the prototype's NAV_GROUPS: a main menu of groups,
// each with a submenu of pages. Each group's pages live in its own folder
// (`/organisering/...`). A page is `built` once it exists; the others are
// shown in the submenu without a link, so the structure is visible.

export interface NavPage {
  label: string
  href: string
  built: boolean
}

export interface NavGroup {
  label: string
  /** The group's folder: the group is current on every page below it. */
  path: string
  pages: NavPage[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Styring',
    path: '/styring',
    pages: [
      { label: 'Styringsfundament', href: '/styring/styringsfundament', built: false },
      { label: 'Prinsipper', href: '/styring/prinsipper', built: false },
      { label: 'Porteføljestyring', href: '/styring/portefolje', built: false },
    ],
  },
  {
    label: 'Folk',
    path: '/folk',
    pages: [{ label: 'Folk', href: '/folk', built: false }],
  },
  {
    label: 'Organisering',
    path: '/organisering',
    pages: [
      { label: 'Team', href: '/organisering/team', built: true },
      { label: 'Linjeorganisasjon', href: '/organisering/linjeorganisasjon', built: false },
      { label: 'Innsatsområde', href: '/organisering/innsatsomrade', built: false },
      { label: 'Roller', href: '/organisering/roller', built: false },
    ],
  },
  {
    label: 'Verktøy',
    path: '/verktoy',
    pages: [
      { label: 'Verktøykasse', href: '/verktoy/verktoykasse', built: false },
      { label: 'Begreper', href: '/verktoy/begreper', built: false },
      { label: 'Veiviser', href: '/verktoy/veiviser', built: false },
    ],
  },
]

/** Whether `pathname` is `path` or a page below it. */
export const isWithin = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)

/** The groups in the main menu: those with at least one built page, linking to the first. */
export const mainMenu = (nav: NavGroup[] = NAV) =>
  nav.flatMap((group) => {
    const first = group.pages.find((page) => page.built)
    return first ? [{ label: group.label, href: first.href, path: group.path }] : []
  })

/** The group the current page belongs to, if it has more than one page to choose between. */
export const subMenuFor = (pathname: string, nav: NavGroup[] = NAV) => {
  const group = nav.find((g) => isWithin(pathname, g.path))
  return group && group.pages.length > 1 ? group : undefined
}
