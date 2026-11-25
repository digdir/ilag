import type { Block } from 'payload'

import { heading } from './fields'

// A short statement shown large, such as the vision or the mission.
export const Statement: Block = {
  slug: 'statement',
  interfaceName: 'StatementBox',
  labels: { singular: 'Utsagn', plural: 'Utsagn' },
  admin: { disableBlockName: true },
  fields: [
    heading(),
    { name: 'text', label: 'Utsagn', type: 'textarea', required: true },
    {
      name: 'style',
      label: 'Stil',
      type: 'radio',
      required: true,
      defaultValue: 'accent',
      options: [
        { value: 'dark', label: 'Mørk' },
        { value: 'accent', label: 'Blå' },
      ],
    },
  ],
}
