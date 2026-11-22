import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '../src/lib/markdown'

// Mandates are written in markdown in the admin panel (TO-09) and rendered on
// the server without raw HTML (ADR-0007).
describe('renderMarkdown', () => {
  it('TO-09: renders emphasis, links and lists with Designsystemet classes', () => {
    const html = renderMarkdown('Det er **viktig**. Se [innsikten](https://example.com).\n\n- en\n- to\n\n1. første')

    expect(html).toContain('<p class="ds-paragraph">Det er <strong>viktig</strong>.')
    expect(html).toContain('<a href="https://example.com" class="ds-link">innsikten</a>')
    expect(html).toContain('<ul class="ds-list">\n<li>en</li>')
    expect(html).toContain('<ol class="ds-list">')
  })

  it('escapes raw HTML, so nobody can put markup or scripts on a page', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nTekst med <b onclick="x()">fet</b>')

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b ')
    expect(html).toContain('&lt;script&gt;')
  })

  it('makes no links of unsafe schemes', () => {
    const html = renderMarkdown('[klikk](javascript:alert(1)) og [data](data:text/html;base64,PHNjcmlwdD4=)')

    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('href="data:')
  })

  it('leaves headings and images as text, under the page\'s own headings and loading nothing', () => {
    const html = renderMarkdown('# Overskrift\n\n![bilde](https://example.com/sporing.png)')

    expect(html).not.toMatch(/<h\d/)
    expect(html).not.toContain('<img')
    expect(html).toContain('# Overskrift')
  })
})
