import type { Block } from 'payload'

import { heading, markdown } from './fields'

// A short list in a half-width box, such as the user groups or the roles.
export const List: Block = {
  slug: 'list',
  interfaceName: 'ListBox',
  labels: { singular: 'Liste', plural: 'Lister' },
  admin: { disableBlockName: true },
  fields: [
    heading(),
    { name: 'chips', label: 'Merkelapper', type: 'textarea', admin: { description: 'Én per linje. Vises som merkelapper over teksten.' } },
    markdown('text', 'Tekst'),
  ],
}
