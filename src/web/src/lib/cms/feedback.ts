import { authHeaders, sdk, type Feedback } from '@ilag/shared'

type NewFeedback = Pick<Feedback, 'category' | 'text' | 'page' | 'contactMe'> & { team?: number; unit?: number }

/**
 * Reports an error or gap (TB-01) as the visitor. The CMS decides who gets it
 * and stores the reporter only when they may be contacted (TB-02, TB-05).
 */
export async function sendFeedback(data: NewFeedback, cookie: string | null): Promise<void> {
  // The type requires a status; the CMS sets every new one to «ny» anyway.
  await sdk.create({ collection: 'tilbakemeldinger', data: { ...data, status: 'ny' } }, { headers: authHeaders(cookie) })
}
