import type { Media } from '@ilag/shared'

/**
 * The files from Medier that can be linked to: those the visitor may read,
 * which come back filled in rather than as an ID, and that have a URL.
 */
export const readableFiles = (files: (number | Media)[] | null | undefined): Media[] =>
  (files ?? []).filter((file): file is Media => typeof file === 'object' && Boolean(file.url))
