import { authHeaders, sdk, type TeamType } from '@ilag/shared'

/** All team types by name, for the type filter (TO-05). */
export async function getTeamTypes(cookie: string | null): Promise<TeamType[]> {
  const { docs } = await sdk.find(
    { collection: 'teamtyper', sort: 'name', pagination: false, depth: 0 },
    { headers: authHeaders(cookie) },
  )
  return docs
}
