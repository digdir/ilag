import type { Field } from 'payload'

import { MARKDOWN_HELP } from '../collections/Mandates'

// Fields the boxes share.

/** The box's heading, prefilled so the editor sees what it is for. */
export const heading = (defaultValue?: string, description?: string): Field => ({
  name: 'heading',
  label: 'Overskrift',
  type: 'text',
  required: true,
  defaultValue,
  admin: { description },
})

/** Text in markdown, such as a list or links to pages elsewhere, rendered without raw HTML (ADR-0007). */
export const markdown = (name: string, label: string, description?: string): Field => ({
  name,
  label,
  type: 'textarea',
  admin: { description: description ? `${description} ${MARKDOWN_HELP}` : MARKDOWN_HELP },
})

/** Documents uploaded to Medier, such as PDFs, linked with their alternative text. */
export const files: Field = {
  name: 'files',
  label: 'Filer',
  type: 'upload',
  relationTo: 'medier',
  hasMany: true,
  admin: { description: 'Lenkes til med filens alternative tekst, som «Tildelingsbrev 2026 (PDF)».' },
}
