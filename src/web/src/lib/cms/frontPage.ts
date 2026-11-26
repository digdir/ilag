import { authHeaders, sdk, type FrontPage } from '@ilag/shared'

// The front page's content (3.15), as the visitor may read it: the published
// version, also for administrators, who see drafts in the admin panel.
// Depth 1 fills in the illustration.
export const getFrontPage = (cookie: string | null): Promise<FrontPage> =>
  sdk.findGlobal({ slug: 'forside', depth: 1 }, { headers: authHeaders(cookie) })
