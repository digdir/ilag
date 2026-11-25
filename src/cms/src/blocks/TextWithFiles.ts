import type { Block } from 'payload'

import { files, heading, markdown } from './fields'

// A heading, text and documents, such as the Virksomhetsplan.
export const TextWithFiles: Block = {
  slug: 'textWithFiles',
  interfaceName: 'TextWithFilesBox',
  labels: { singular: 'Tekst med filer', plural: 'Tekster med filer' },
  admin: { disableBlockName: true },
  fields: [heading(), markdown('text', 'Tekst'), files],
}
