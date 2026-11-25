import type { Block } from 'payload'

import { files, heading, markdown } from './fields'

// Governing documents as cards behind a toggle, such as the allocation letter.
export const Documents: Block = {
  slug: 'documents',
  interfaceName: 'DocumentsBox',
  labels: { singular: 'Dokumenter', plural: 'Dokumenter' },
  admin: { disableBlockName: true },
  fields: [
    heading('Vis dokumenter', 'Teksten på knappen som viser dokumentene.'),
    {
      name: 'documents',
      label: 'Dokumenter',
      type: 'array',
      labels: { singular: 'Dokument', plural: 'Dokumenter' },
      fields: [
        { name: 'title', label: 'Tittel', type: 'text', required: true },
        { name: 'tag', label: 'Merkelapp', type: 'text', admin: { description: 'For eksempel «Varig» eller «Årlig».' } },
        { name: 'summary', label: 'Sammendrag', type: 'textarea' },
        markdown('details', 'Mer om dokumentet', 'Vises bak «Les mer».'),
        files,
      ],
    },
  ],
}
