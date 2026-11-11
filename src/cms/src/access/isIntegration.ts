import type { PayloadRequest } from 'payload'

// The integration user sends files from the authoritative source (ADR-0003).
// It may call the import endpoints and nothing else.
export const isIntegration = (user: PayloadRequest['user']): boolean =>
  Boolean(user?.roles?.includes('integration'))
