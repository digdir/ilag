import { authHeaders, PayloadSDKError, sdk, type TeamType } from '@ilag/shared'

import type { TeamTypeWithRoles } from '../../types/teamType'

/** All team types by name, for the type filter (TO-05). */
export async function getTeamTypes(cookie: string | null): Promise<TeamType[]> {
  const { docs } = await sdk.find(
    { collection: 'teamtyper', sort: 'name', pagination: false, depth: 0 },
    { headers: authHeaders(cookie) },
  )
  return docs
}

/**
 * One team type with the roles relevant for it (TK-01, RO-03), or null if it
 * doesn't exist or the visitor may not see it. Depth 1 brings the roles in the
 * join; `populate` keeps only their names.
 */
export async function getTeamType(id: string, cookie: string | null): Promise<TeamTypeWithRoles | null> {
  if (!/^\d+$/.test(id)) return null
  try {
    const { roles, ...teamType } = await sdk.findByID(
      { collection: 'teamtyper', id: Number(id), depth: 1, populate: { roller: { name: true } } },
      { headers: authHeaders(cookie) },
    )
    return {
      ...teamType,
      // The generated types allow each role to be either the document or just its ID.
      roles: (roles?.docs ?? [])
        .flatMap((role) => (typeof role === 'object' ? [{ id: role.id, name: role.name }] : []))
        .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
    }
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}
