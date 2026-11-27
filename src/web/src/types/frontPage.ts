import type { FrontPage } from '@ilag/shared'

// The shapes the front page's components work with, from the global
// «Forside». src/lib/cms/frontPage.ts reads it.

/** An entrance at the bottom of the front page (FS-02, FS-03), with its links. */
export type Entry = NonNullable<FrontPage['entries']>[number]

/** A change in ilag (FS-06). */
export type Change = NonNullable<FrontPage['changes']>[number]
