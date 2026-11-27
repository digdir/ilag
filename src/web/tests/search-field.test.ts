import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import ListFilter from '../src/components/ListFilter.astro'
import SearchField from '../src/components/SearchField.astro'
import SiteSearch from '../src/components/SiteSearch.astro'

const render = async (component: Parameters<AstroContainer['renderToString']>[0], props = {}) => {
  const container = await AstroContainer.create()
  return container.renderToString(component, { props })
}

describe('search field', () => {
  it('is a Designsystemet Suggestion with a search input and a clear button', async () => {
    const html = await render(SearchField, { id: 'q', label: 'Søk' })

    expect(html).toMatch(/<label class="ds-label"[^>]*for="q"[^>]*>Søk<\/label>/)
    expect(html).toMatch(/<ds-suggestion class="ds-suggestion"[^>]*>\s*<input class="ds-input" id="q" type="search"/)
    expect(html).toMatch(/<button type="reset" hidden/)
  })

  it('can hide its label for sight only', async () => {
    const html = await render(SearchField, { id: 'q', label: 'Søk', hideLabel: true })

    expect(html).toMatch(/<label class="ds-label ds-sr-only"/)
  })

  it('is the field both in the header and in list filters', async () => {
    const header = await render(SiteSearch)
    const filter = await render(ListFilter, {
      list: 'roller',
      label: 'Søk i roller',
      count: 1,
      noun: { one: 'rolle', other: 'roller' },
    })

    for (const html of [header, filter]) {
      expect(html).toMatch(/<ds-suggestion class="ds-suggestion"[^>]*>\s*<input class="ds-input"[^>]*type="search"/)
      expect(html).toContain('<button type="reset" hidden')
    }
  })
})
