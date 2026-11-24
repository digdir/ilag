interface ImportMetaEnv {
  readonly PUBLIC_CMS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace App {
  interface Locals {
    /** Set by the middleware on every page except /logg-inn. */
    user?: import('@ilag/shared').User
    /** Whether the user may use the CMS's admin panel; the header links to it. */
    canAccessAdmin?: Promise<boolean>
    /** The concepts to explain, read once per request by Prose (BG-06). */
    concepts?: Promise<import('./lib/concepts').ConceptMatcher>
    /** How many concept popovers the page has, to keep their ids apart. */
    conceptPopovers?: number
  }
}
