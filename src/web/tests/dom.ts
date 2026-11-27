import { within } from '@testing-library/dom'
import { Window } from 'happy-dom'

/**
 * Parses rendered HTML into a document and returns Testing Library's queries
 * for it, so tests find elements as a visitor would: by role and accessible
 * name (`getByRole('link', { name: 'CMS' })`), or by label for form fields.
 * `getByTestId` is the fallback; see «Finding elements in tests» in CLAUDE.md.
 * Elements that are `hidden`, such as a closed submenu, are left out unless
 * the query has `{ hidden: true }`, and have no accessible name. `container`
 * is the parsed body, for what no query covers.
 */
export const parse = (html: string) => {
  const { document } = new Window()
  document.body.innerHTML = html
  const container = document.body as unknown as HTMLElement
  return { container, ...within(container) }
}
