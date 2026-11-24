import MarkdownIt from 'markdown-it'

// Text written in markdown in the admin panel, such as a mandate's fields
// (TO-09), rendered on the server. Raw HTML is off, so nobody can put HTML or
// scripts on a page, and links are limited to the schemes markdown-it allows
// (ADR-0007). Headings are off, since the text sits under the page's own
// headings, and images are off, so a page loads nothing from elsewhere.
const md = new MarkdownIt({ html: false, linkify: false, typographer: false }).disable([
  'heading',
  'lheading',
  'image',
])

// Designsystemet's classes on what markdown makes, so it looks like the rest
// of the page without styles of its own.
const CLASSES: Record<string, string> = {
  paragraph_open: 'ds-paragraph',
  bullet_list_open: 'ds-list',
  ordered_list_open: 'ds-list',
  link_open: 'ds-link',
}

md.core.ruler.push('designsystemet_classes', (state) => {
  const visit = (tokens: typeof state.tokens) => {
    for (const token of tokens) {
      const cls = CLASSES[token.type]
      if (cls) token.attrJoin('class', cls)
      if (token.children) visit(token.children)
    }
  }
  visit(state.tokens)
})

/** HTML for markdown text, safe to put on a page with `set:html`. */
export const renderMarkdown = (text: string): string => md.render(text)
