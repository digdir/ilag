import type { Feedback } from '@ilag/shared'

// Mirrors FEEDBACK_CATEGORIES in the CMS's Feedback collection (TB-01).
export const FEEDBACK_CATEGORIES: { value: Feedback['category']; label: string }[] = [
  { value: 'faktafeil', label: 'Faktafeil' },
  { value: 'utdatert', label: 'Utdatert' },
  { value: 'uklart', label: 'Uklart' },
  { value: 'mangler', label: 'Mangler' },
  { value: 'annet', label: 'Annet' },
]

/**
 * What a page is about decides who gets feedback on it (TB-02): the team on a
 * team's page, the unit on a unit's page, and the administrators everywhere
 * else.
 */
export function feedbackOwner(path: string): { team?: number; unit?: number; label: string } {
  const team = path.match(/^\/organisering\/team\/(\d+)\/?$/)
  if (team) return { team: Number(team[1]), label: 'teameier og teamleder for teamet' }
  const unit = path.match(/^\/organisering\/linjeorganisasjon\/(\d+)\/?$/)
  if (unit) return { unit: Number(unit[1]), label: 'lederen for enheten' }
  return { label: 'administratorene i ilag' }
}
