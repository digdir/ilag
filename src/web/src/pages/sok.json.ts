import type { APIRoute } from 'astro'

import { search } from '../lib/cms/search'

// The hits for the search in the header (FS-01), as JSON. The middleware
// keeps it to those logged in, and the CMS answers as the visitor.
export const GET: APIRoute = async ({ url, request }) => {
  const hits = await search(url.searchParams.get('q') ?? '', request.headers.get('cookie'))
  return Response.json(hits, { headers: { 'Cache-Control': 'private, no-store' } })
}
