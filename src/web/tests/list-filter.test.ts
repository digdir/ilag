import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import ListFilter from '../src/components/ListFilter.astro'

const props = {
  list: 'ting',
  empty: 'ting-tom',
  label: 'Søk i ting',
  placeholder: 'Søk etter navn',
  noun: { one: 'ting', other: 'tinger' },
}

const render = async (extra: Record<string, unknown>) => {
  const container = await AstroContainer.create()
  return container.renderToString(ListFilter, { props: { ...props, ...extra } })
}

describe('list filter', () => {
  it('has a labelled search field tied to the list it filters', async () => {
    const html = await render({ count: 3 })

    expect(html).toContain('data-list="ting"')
    expect(html).toContain('data-empty="ting-tom"')
    expect(html).toMatch(/<label[^>]*for="ting-search"[^>]*>Søk i ting<\/label>/)
    expect(html).toMatch(/<input[^>]*id="ting-search"[^>]*type="search"/)
    expect(html).not.toContain('type="radio"')
  })

  it('counts with the singular or plural noun', async () => {
    expect(await render({ count: 1 })).toContain('1 ting<')
    expect(await render({ count: 4 })).toContain('4 tinger')
  })

  it('adds the chips after «Alle», which is chosen', async () => {
    const html = await render({
      count: 2,
      chips: [{ key: 'type', legend: 'Type', options: [{ value: '7', label: 'Sju' }] }],
    })

    expect(html).toContain('<legend')
    expect(html).toContain('data-chip-row="type"')
    expect(html).toMatch(/name="ting-type" value checked[^>]*>\s*Alle/)
    expect(html).toMatch(/name="ting-type" value="7"[^>]*>\s*Sju/)
    expect(html).not.toContain('data-count-suffix')
  })

  it('passes the words to name a chosen chip in the count by, if any', async () => {
    const html = await render({
      count: 2,
      chips: [{ key: 'type', legend: 'Type', options: [{ value: '7', label: 'Sju' }], countSuffix: 'av typen' }],
    })

    expect(html).toContain('data-count-suffix="av typen"')
  })

  it('gives each row of chips its own key and radio group, so a chip can be chosen in each', async () => {
    const html = await render({
      count: 2,
      chips: [
        { key: 'kind', legend: 'Verktøytype', options: [{ value: 'mal', label: 'Mal' }] },
        { key: 'type', legend: 'Teamtype', options: [{ value: '7', label: 'Sju' }] },
      ],
    })

    expect(html.match(/<fieldset/g)).toHaveLength(2)
    expect(html).toContain('data-chip-row="kind"')
    expect(html).toContain('data-chip-row="type"')
    expect(html).toMatch(/name="ting-kind" value="mal"[^>]*>\s*Mal/)
    expect(html).toMatch(/name="ting-type" value="7"[^>]*>\s*Sju/)
  })
})
