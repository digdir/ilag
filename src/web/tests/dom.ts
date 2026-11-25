import { Window } from 'happy-dom'

/**
 * Parses rendered HTML into a document, so tests can find elements by
 * selector or `data-testid` instead of matching the markup with regular
 * expressions, which break when it changes.
 */
export const parse = (html: string) => {
  const { document } = new Window()
  document.body.innerHTML = html
  return document
}

/** The element with this `data-testid`, or null. */
export const byTestId = (document: ReturnType<typeof parse>, id: string) =>
  document.querySelector(`[data-testid="${id}"]`)
