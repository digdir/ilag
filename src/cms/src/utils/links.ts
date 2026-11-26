// Links typed into the admin panel: to pages outside ilag, such as a tool's
// link (VK-08) and its resources (VK-07), and to pages in ilag or out of it,
// such as the front page's links (FS-02, FS-03, FS-06).

import type { TextFieldSingleValidation } from 'payload'

/**
 * Whether a value is an absolute http(s) link. A link without a scheme, such
 * as «www.figma.com», would become a relative link on our own site, and
 * schemes such as `javascript:` don't belong in a link to another page.
 */
export const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  try {
    const { protocol, hostname } = new URL(value)
    return (protocol === 'https:' || protocol === 'http:') && hostname.includes('.')
  } catch {
    return false
  }
}

/** Validation for an optional link field: empty, or an absolute http(s) link. */
export const validHttpUrl: TextFieldSingleValidation = (value) =>
  !value || isHttpUrl(value) ? true : 'Lenken må starte med https://, som «https://www.figma.com».'

/**
 * Whether a value is a link a page in ilag may point to: a path on our own
 * site, such as «/verktoy/veiviser», or an absolute http(s) link. A path that
 * starts with `//` is a link to another host, so it doesn't count as ours.
 */
export const isSiteLink = (value: unknown): value is string =>
  typeof value === 'string' && ((value.startsWith('/') && !value.startsWith('//')) || isHttpUrl(value))

/** Validation for a link field that may point inside ilag or out of it. */
export const validSiteLink: TextFieldSingleValidation = (value) =>
  !value || isSiteLink(value)
    ? true
    : 'Lenken må være en side i ilag som starter med /, som «/verktoy/veiviser», eller starte med https://.'
