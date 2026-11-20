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
    /** How many concept popovers the page has, to keep their ids apart. */
    conceptPopovers?: number
  }
}
