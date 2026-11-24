import type { Mandate, Team, Unit } from '@ilag/shared'

import type { MandateField, MandateView } from '../../types/mandate'
import { renderMarkdown } from '../markdown'

// The mandate that Team and Unit join in (TO-04, LO-02). The join applies the
// mandate's read access, so readers get the approved version only, and those
// who may edit it also a mandate that has never been approved.

/** The template's fields, in its order, with the labels the admin panel uses (Mandates.ts in the CMS). */
export const MANDATE_FIELDS: { name: MandateField['name']; label: string }[] = [
  { name: 'problem', label: 'Hva skal vi løse?' },
  { name: 'outcomes', label: 'Hva skal vi oppnå?' },
  { name: 'expectations', label: 'Hva forventes av oss?' },
  { name: 'collaboration', label: 'Hvordan samarbeider vi med andre?' },
]

/** The mandate from a team's or a unit's join, or null if there is none the visitor may see. */
export function mandateFrom(join: Team['mandate'] | Unit['mandate']): MandateView | null {
  const mandate = join?.docs?.find((d): d is Mandate => typeof d === 'object')
  return mandate ? toMandate(mandate) : null
}

export function toMandate(mandate: Mandate): MandateView {
  const fields = MANDATE_FIELDS.map(({ name, label }) => {
    const text = mandate[name]?.trim()
    return { name, label, html: text ? renderMarkdown(text) : null }
  })
  return {
    status: mandate.status ?? (mandate._status === 'published' ? 'current' : 'draft'),
    approvedAt: mandate.approvedAt ?? null,
    fields,
    missing: fields.filter((f) => !f.html).map((f) => f.label),
  }
}
