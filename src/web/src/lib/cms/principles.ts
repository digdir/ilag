import { authHeaders, sdk } from '@ilag/shared'

import type { PrincipleView } from '../../types/principle'

// The principle queries the pages use. Reads as the visitor, so Payload's
// access control decides what comes back.

/** All principles in order of their number (PR-01). */
export async function getPrinciples(cookie: string | null): Promise<PrincipleView[]> {
  const { docs } = await sdk.find(
    { collection: 'prinsipper', sort: 'number', pagination: false, depth: 0 },
    { headers: authHeaders(cookie) },
  )
  return docs.map(({ id, number, title, area, description }) => ({ id, number, title, area, description }))
}
