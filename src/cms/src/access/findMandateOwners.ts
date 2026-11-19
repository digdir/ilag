import type { PayloadRequest } from 'payload'

type ID = number

// The teams and units whose mandate a user may work on (ADR-0007):
// `edit` may save drafts, `approve` may also approve the mandate and make it
// current, or mark it expired. Everyone who approves also edits.
export type MandateOwners = {
  edit: { teams: ID[]; units: ID[] }
  approve: { teams: ID[]; units: ID[] }
}

// For everyone but administrators, who may do everything anyway. Teameier
// and teamleder (ADR-0005) need users linked to people, which arrives with
// #58. Until then nobody but administrators edits a mandate. Unit leaders
// follow when ADR-0005 lets them into the admin panel.
export const findMandateOwners = async (_req: PayloadRequest): Promise<MandateOwners> => ({
  edit: { teams: [], units: [] },
  approve: { teams: [], units: [] },
})
