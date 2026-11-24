// The ID behind a relationship's value, which Payload gives either as the ID
// or, populated, as the document, depending on `depth`.

/** The ID of a relationship's value, whether populated or not; null if it is empty. */
export const idOf = <ID extends number | string>(value: ID | { id: ID } | null | undefined): ID | null =>
  value == null ? null : typeof value === 'object' ? value.id : value
