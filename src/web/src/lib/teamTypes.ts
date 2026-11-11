import type { TeamType } from '@ilag/shared'

// How each team type is shown (TO-02). The labels match the options in
// src/cms/src/fields/teamType.ts, which the frontend can't import; a type
// added there without an entry here fails the type check. The colours are
// the theme's, close to the prototype's.
export const teamTypes: Record<TeamType, { label: string; color: string }> = {
  product: { label: 'Produktteam', color: 'info' },
  delivery: { label: 'Leveranseteam', color: 'neutral' },
  support: { label: 'Støtteteam', color: 'warning' },
  project: { label: 'Prosjektteam', color: 'danger' },
  network: { label: 'Fagnettverk', color: 'brand2' },
}
