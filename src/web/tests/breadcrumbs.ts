// Reads the breadcrumbs out of a rendered page, for the page tests.

/** The back link shown on narrow screens, as [label, href]. */
export const backLink = (html: string) => {
  const m = html.match(/<nav class="ds-breadcrumbs"[^>]*>\s*<a class="ds-link" href="([^"]*)"[^>]*>\s*([^<]*?)\s*<\/a>/)
  return m ? [m[2], m[1]] : null
}

/** The trail shown on wide screens, as [label, href] from the list page down. */
export const trail = (html: string) => {
  const list = html.match(/<nav class="ds-breadcrumbs"[\s\S]*?<\/nav>/)?.[0].match(/<ol>[\s\S]*<\/ol>/)?.[0]
  return [...(list ?? '').matchAll(/<a class="ds-link" href="([^"]*)"[^>]*>\s*([^<]*?)\s*<\/a>/g)].map(
    (m) => [m[2], m[1]],
  )
}
