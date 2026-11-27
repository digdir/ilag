import type { FrontPage } from '@ilag/shared'

import type { Change } from '../types/frontPage'

/** How many changes the front page shows (FS-06). */
export const CHANGES_SHOWN = 5

/**
 * The newest changes, newest first (FS-06). Administrators may add them in
 * any order; changes on the same day keep the order they were written in.
 */
export const newestChanges = (changes: FrontPage['changes'], count = CHANGES_SHOWN): Change[] =>
  [...(changes ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, count)
