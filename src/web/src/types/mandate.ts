import type { Mandate } from '@ilag/shared'

// The shape the mandate section works with. src/lib/cms/mandates.ts builds it
// from the mandate that Team and Unit join in.

/** One of the four fields from the mandate template (TO-09, Vedlegg 3). */
export type MandateField = {
  name: 'problem' | 'outcomes' | 'expectations' | 'collaboration'
  label: string
  /** The field as HTML from its markdown, or null if it isn't filled in. */
  html: string | null
}

/** A team's or a unit's mandate, as the visitor may see it. */
export type MandateView = {
  /** Utkast or gjeldende (TO-16, LO-04). Readers only ever get an approved one. */
  status: NonNullable<Mandate['status']>
  /** The date of the approval, as an ISO date at midnight UTC; null for a draft. */
  approvedAt: string | null
  /** The four fields, in the template's order. */
  fields: MandateField[]
  /** The labels of the fields that are empty (TO-10). */
  missing: string[]
}
