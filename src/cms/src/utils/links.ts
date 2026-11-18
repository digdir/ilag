// Links to pages outside ilag, typed into the admin panel, such as a tool's
// link (VK-08) and its resources (VK-07).

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
