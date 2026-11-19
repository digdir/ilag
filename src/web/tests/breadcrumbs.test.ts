import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import Breadcrumbs from '../src/components/Breadcrumbs.astro'
import { backLink, trail } from './breadcrumbs'

const render = async (items: { label: string; href: string }[]) => {
  const container = await AstroContainer.create()
  return container.renderToString(Breadcrumbs, { props: { items } })
}

const team = { label: 'Team', href: '/organisering/team' }
const skjema = { label: 'Team Skjemabygger', href: '/organisering/team/7' }

describe('breadcrumbs', () => {
  it('is Designsystemet\'s breadcrumbs, labelled «Du er her:»', async () => {
    expect(await render([team, skjema])).toMatch(/<nav class="ds-breadcrumbs" aria-label="Du er her:">/)
  })

  it('shows the trail with the current page last, marked as current', async () => {
    const html = await render([team, skjema])

    expect(trail(html)).toEqual([
      ['Team', '/organisering/team'],
      ['Team Skjemabygger', '/organisering/team/7'],
    ])
    expect(html).toMatch(/href="\/organisering\/team\/7" aria-current="page"/)
    expect(html).not.toMatch(/href="\/organisering\/team" aria-current/)
  })

  it('links back to the page above, for narrow screens', async () => {
    const html = await render([team, skjema])

    expect(backLink(html)).toEqual(['Team', '/organisering/team'])
    expect(html).toContain('aria-label="Tilbake til Team"')
  })

  it('shows only the back link when there is no current page', async () => {
    const html = await render([team])

    expect(backLink(html)).toEqual(['Team', '/organisering/team'])
    expect(html).not.toContain('<ol>')
  })
})
