import { authHeaders, PayloadSDKError, sdk, type Tool } from '@ilag/shared'

import type { ToolWithTypes } from '../../types/tool'

// The toolbox queries the pages use. Reads as the visitor, so Payload's access
// control decides what comes back. Depth 1 brings each tool's team types;
// `populate` keeps only their names, and `joins` leaves out the teams
// that use the tool, which only the admin panel shows.

const populate = { teamtyper: { name: true } } as const

/** All tools in the toolbox by name (VK-01). */
export async function getTools(cookie: string | null): Promise<ToolWithTypes[]> {
  const { docs } = await sdk.find(
    { collection: 'verktoy', sort: 'name', pagination: false, depth: 1, populate, joins: { teams: false } },
    { headers: authHeaders(cookie) },
  )
  return docs.map(withTypes)
}

/** The tools in the toolbox meant for a team type (VK-05), by name; not those that suit all. */
export async function getToolsForTeamType(teamTypeId: number, cookie: string | null): Promise<ToolWithTypes[]> {
  const { docs } = await sdk.find(
    {
      collection: 'verktoy',
      where: { teamTypes: { in: [teamTypeId] } },
      sort: 'name',
      pagination: false,
      depth: 1,
      populate,
      joins: { teams: false },
    },
    { headers: authHeaders(cookie) },
  )
  return docs.map(withTypes)
}

/** One tool, or null if it doesn't exist or the visitor may not see it. */
export async function getTool(id: string, cookie: string | null): Promise<ToolWithTypes | null> {
  if (!/^\d+$/.test(id)) return null
  try {
    const tool = await sdk.findByID(
      { collection: 'verktoy', id: Number(id), depth: 1, populate, joins: { teams: false } },
      { headers: authHeaders(cookie) },
    )
    return withTypes(tool)
  } catch (err) {
    if (err instanceof PayloadSDKError && err.status === 404) return null
    throw err
  }
}

// The generated types allow a relationship to be either the document or just
// its ID, whatever depth was asked for, so the IDs are left out.
const withTypes = ({ teamTypes, teams: _teams, ...tool }: Tool): ToolWithTypes => ({
  ...tool,
  teamTypes: (teamTypes ?? [])
    .flatMap((t) => (typeof t === 'object' ? [{ id: t.id, name: t.name }] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb')),
})
