import type { FieldAccess } from 'payload'

import { isAdmin } from './isAdmin'

// Who may set a field, for the fields that differ from their collection.

export const adminOnly: FieldAccess = ({ req }) => isAdmin(req.user)

// Set only by the import, which writes through the Local API and bypasses
// access control.
export const importOnly: FieldAccess = () => false
