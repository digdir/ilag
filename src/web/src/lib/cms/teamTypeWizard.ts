import { authHeaders, sdk, type TeamTypeWizardQuestion } from '@ilag/shared'

/**
 * The team type wizard's questions (TK-03), by ID, with the questions and
 * team types their answers lead to filled in, and the one it starts at.
 */
export async function getTeamTypeWizard(cookie: string | null) {
  const { docs } = await sdk.find(
    { collection: 'teamtype-veiviser', pagination: false, depth: 1 },
    { headers: authHeaders(cookie) },
  )
  return {
    start: docs.find((q) => q.isStart),
    byId: new Map<number, TeamTypeWizardQuestion>(docs.map((q) => [q.id, q])),
  }
}

/** A list editors write one point per line, as its points. */
export const lines = (text: string | null | undefined): string[] =>
  (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
