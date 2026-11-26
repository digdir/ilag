import type { PayloadRequest } from 'payload'

// The line under a document's name in the search (FS-01), such as a person's
// title or a unit's level. A searched collection sets it as
// `custom.searchSubtitle`, next to the fields it reads; without one, its hits
// have no subtitle. The title is the collection's `admin.useAsTitle`.
//
// Only what everyone who may read the document may see: the index has no
// field-level access (AL-04). And only the document's own fields, which are
// synced when it is saved: a subtitle read from another document goes stale
// when that one changes, until a reindex. A team's type name is the one
// exception (ADR-0010).
export type SearchSubtitle = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the document of any searched collection
  doc: Record<string, any>,
  req: PayloadRequest,
) => string | null | undefined | Promise<string | null | undefined>
