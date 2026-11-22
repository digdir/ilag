import type { ToolType } from '../types/tool'

// The tool types (VK-02) by their stored value, in the order the chips show
// them. The same values as TOOL_TYPES in the CMS (collections/Tools.ts).
export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  mal: 'Mal',
  metode: 'Metode',
  veileder: 'Veileder',
  verktoy: 'Verktøy',
}

/** The tool type's label, such as «Mal». */
export const toolTypeLabel = (toolType: ToolType) => TOOL_TYPE_LABELS[toolType]

/** The address of a tool's page. */
export const toolHref = (id: number) => `/verktoy/verktoykasse/${id}`
