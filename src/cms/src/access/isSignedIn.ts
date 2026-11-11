import type { PayloadRequest } from 'payload'

import { isIntegration } from './isIntegration'

// Someone logged in to read ilag: everyone but the integration user, which
// may only call the import endpoints (ADR-0003).
export const isSignedIn = (user: PayloadRequest['user']): boolean =>
  Boolean(user) && !isIntegration(user)
