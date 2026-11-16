import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'

import Tag from '../src/components/Tag.astro'

const render = async (props: Record<string, unknown> = {}) => {
  const container = await AstroContainer.create()
  return container.renderToString(Tag, { props, slots: { default: 'Produktteam' } })
}

describe('tag', () => {
  it('is a small, non-interactive Designsystemet tag in the info colour', async () => {
    const html = await render()

    expect(html).toMatch(/<span class="ds-tag" data-color="info" data-size="sm"[^>]*>Produktteam<\/span>/)
  })

  it('takes another colour', async () => {
    expect(await render({ color: 'neutral' })).toContain('data-color="neutral"')
  })
})
