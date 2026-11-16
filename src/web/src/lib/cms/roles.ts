import { authHeaders, PayloadSDKError, type Role, sdk } from '@ilag/shared'

import type { RoleWithTypes } from '../../types/role'

// The role queries the pages use. Reads as the visitor, so Payload's access
// control decides what comes back. Depth 1 brings each role's team types;
// `populate` keeps only their names, not the roles they join back to.

const populate = { teamtyper: { name: true } } as const

/**
 * All roles (RO-01), the ones that belong to a team type first and then the
 * ones teams work with, such as linjeleder, each by name.
 */
export async function getRoles(cookie: string | null): Promise<RoleWithTypes[]> {
  const { docs } = await sdk.find(
    { collection: 'roller', sort: 'name', pagination: false, depth: 1, populate },
    { headers: authHeaders(cookie) },
  )
  return docs
    .map(withTypes)
    .sort(
      (a, b) =>
        Number(!a.teamTypes.length) - Number(!b.teamTypes.length) ||
        a.name.localeCompare(b.name, 'nb'),
    )
}

/** One role, or null if it doesn't exist or the visitor may not see it. */
export async function getRole(id: string, cookie: string | null): Promise<RoleWithTypes | null> {
  if (!/^\d+$/.test(id)) return null
  try {
    const role = await sdk.findByID(
      { collection: 'roller', id: Number(id), depth: 1, populate },
      { headers: authHeaders(cookie) },
    )
    return withTypes(role)
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}

// The generated types allow a relationship to be either the document or just
// its ID, whatever depth was asked for, so the IDs are left out.
const withTypes = ({ teamTypes, ...role }: Role): RoleWithTypes => ({
  ...role,
  teamTypes: (teamTypes ?? [])
    .flatMap((t) => (typeof t === 'object' ? [{ id: t.id, name: t.name }] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})
