import type { TeamType, Tool } from '@ilag/shared'

// The shapes the toolbox pages and components work with. src/lib/cms/tools.ts
// builds them from Payload's generated types.

/** A tool type's stored value, such as `mal` (VK-02). */
export type ToolType = Tool['toolType']

/** A tool with the team types it suits (VK-05), by name; none if it suits all. */
export type ToolWithTypes = Omit<Tool, 'teamTypes' | 'teams'> & {
  teamTypes: Pick<TeamType, 'id' | 'name'>[]
}

/** A tool as a team lists it (TO-07). */
export type ToolSummary = Pick<Tool, 'id' | 'name' | 'toolType'>

/** A tool as the front page lists it among the newest (FS-05). */
export type NewTool = Pick<Tool, 'id' | 'name' | 'toolType' | 'description' | 'createdAt'>
