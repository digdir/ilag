import type { Block } from 'payload'

import { heading, markdown } from './fields'

// Cards side by side, such as the goals or the values, each with a title,
// a short text and more behind a toggle.
export const Cards: Block = {
  slug: 'cards',
  interfaceName: 'CardsBox',
  labels: { singular: 'Kort', plural: 'Kort' },
  admin: { disableBlockName: true },
  fields: [
    heading(),
    {
      name: 'colors',
      label: 'Farger',
      type: 'radio',
      required: true,
      defaultValue: 'neutral',
      options: [
        { value: 'neutral', label: 'Grå' },
        { value: 'varied', label: 'Ulike farger' },
      ],
    },
    {
      name: 'detailsLabel',
      label: 'Tekst på knappen for mer',
      type: 'text',
      defaultValue: 'Les mer',
      admin: { description: 'Vises på kort som har mer tekst, for eksempel «Vis delmål».' },
    },
    {
      name: 'cards',
      label: 'Kort',
      type: 'array',
      labels: { singular: 'Kort', plural: 'Kort' },
      fields: [
        { name: 'title', label: 'Tittel', type: 'text', required: true },
        { name: 'text', label: 'Tekst', type: 'textarea' },
        markdown('details', 'Mer', 'Vises bak knappen.'),
      ],
    },
  ],
}
