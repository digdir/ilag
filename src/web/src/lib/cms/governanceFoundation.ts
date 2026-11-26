import { authHeaders, sdk, type GovernanceFoundation } from '@ilag/shared'

// The styringsfundament (SF-01), as the visitor may read it: the published
// version, also for administrators, who see drafts in the admin panel.
// Depth 1 fills in the files.
export const getGovernanceFoundation = (cookie: string | null): Promise<GovernanceFoundation> =>
  sdk.findGlobal({ slug: 'styringsfundament', depth: 1 }, { headers: authHeaders(cookie) })
