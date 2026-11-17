import type { PayloadRequest, Where } from 'payload'

import { findMandateOwners, type MandateOwners } from './findMandateOwners'
import { isAdmin } from './isAdmin'

type ID = number

export type { MandateOwners }

const CACHE_KEY = 'mandateOwners'

// findMandateOwners for the request's user, looked up once per request: one
// request asks several access functions.
export const mandateOwners = (req: PayloadRequest): Promise<MandateOwners> => {
  const cached = req.context[CACHE_KEY] as Promise<MandateOwners> | undefined
  if (cached) return cached
  const owners = findMandateOwners(req)
  req.context[CACHE_KEY] = owners
  return owners
}

// A query for the mandates of these teams and units, or false for none.
// `prefix` is `version.` for queries on the versions.
export const ownedBy = (owners: { teams: ID[]; units: ID[] }, prefix = ''): Where | false => {
  const or: Where[] = []
  if (owners.teams.length) or.push({ [`${prefix}team`]: { in: owners.teams } })
  if (owners.units.length) or.push({ [`${prefix}unit`]: { in: owners.units } })
  return or.length ? { or } : false
}

const includes = (owners: { teams: ID[]; units: ID[] }, owner: { team?: ID | null; unit?: ID | null }) =>
  (owner.team != null && owners.teams.includes(owner.team)) ||
  (owner.unit != null && owners.units.includes(owner.unit))

// Whether the user may approve the mandate of this team or unit.
export const mayApprove = async (req: PayloadRequest, owner: { team?: ID | null; unit?: ID | null }) =>
  isAdmin(req.user) || includes((await mandateOwners(req)).approve, owner)

// Whether the user may save drafts of the mandate of this team or unit.
export const mayEdit = async (req: PayloadRequest, owner: { team?: ID | null; unit?: ID | null }) =>
  isAdmin(req.user) || includes((await mandateOwners(req)).edit, owner)
