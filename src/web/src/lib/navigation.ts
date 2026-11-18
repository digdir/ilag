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
    pages: [{ label: 'Folk', href: '/folk', built: true }],
  },
  {
    label: 'Organisering',
    path: '/organisering',
    pages: [
      { label: 'Team', href: '/organisering/team', built: true },
      { label: 'Linjeorganisasjon', href: '/organisering/linjeorganisasjon', built: true },
      { label: 'Innsatsområde', href: '/organisering/innsatsomrade', built: false },
      { label: 'Roller', href: '/organisering/roller', built: true },
    ],
  },
  {
    label: 'Verktøy',
    path: '/verktoy',
    pages: [
      { label: 'Verktøykasse', href: '/verktoy/verktoykasse', built: false },
      { label: 'Begreper', href: '/verktoy/begreper', built: false },
      { label: 'Veiviser', href: '/verktoy/veiviser', built: true },
    ],
  },
]

/** Whether `pathname` is `path` or a page below it. */
export const isWithin = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)

/** The groups in the main menu: those with at least one built page. */
export const mainMenu = (nav: NavGroup[] = NAV) =>
  nav.filter((group) => group.pages.some((page) => page.built))

/** Whether the group gets a submenu: it has more than one page to choose between. */
export const hasSubMenu = (group: NavGroup) => group.pages.length > 1

/** The id of the group's submenu row, which its main menu item shows. */
export const subMenuId = (group: NavGroup) => `undermeny-${group.path.slice(1)}`

/** A link in the breadcrumbs. */
export interface Crumb {
  label: string
  href: string
}

/**
 * The breadcrumbs for a page below a menu page, such as a team at
 * `/organisering/team/7`: the menu page, then `trail`, then the page itself
 * as `current`, if it was found. Null on the menu pages themselves and on
 * pages outside the menu, where the menu shows where you are.
 */
export function breadcrumbs(
  pathname: string,
  { trail = [], current }: { trail?: Crumb[]; current?: string | null } = {},
  nav: NavGroup[] = NAV,
): Crumb[] | null {
  const above = nav
    .flatMap((group) => group.pages)
    .find((page) => page.built && pathname.startsWith(`${page.href}/`))
  if (!above) return null
  return [
    { label: above.label, href: above.href },
    ...trail,
    ...(current ? [{ label: current, href: pathname }] : []),
  ]
}
