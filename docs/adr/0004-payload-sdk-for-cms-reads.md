# ADR-0004: Payload's SDK for reading the CMS

- **Status:** Proposed
- **Requirements:** TO-01, TO-02, TO-03, TO-05
- **Related:** [ADR-0001](0001-login-and-sessions.md), #41

## Context

The Astro frontend reads everything from the CMS over Payload's REST API, on
the server, as the visitor: the request carries the visitor's token
(`authHeaders` in `@ilag/shared`), so Payload's access control decides what
comes back (ADR-0001).

Until now the frontend has had two helpers of its own in `@ilag/shared`:

- `cmsFetch(path, init)` puts the CMS address in front of a path, sends it and
  returns the JSON.
- `find(collection, query, init)` fetches a page of a collection, with the
  query written as a URL string such as `where[active][equals]=true`.

The return types are whatever the caller says they are; nothing checks the
collection, the field names or the query. That was fine for a health check and
the login, but the team pages (#41) are the first real queries: filters,
sorting, joins and depth. More pages will follow the same way, so how queries
are written becomes a rule for future code.

## Options

- **Payload's SDK, `@payloadcms/sdk` (chosen).** Payload's own typed REST
  client. Queries are objects in the same shape as Payload's Local API, and the
  types come from the generated `Config`, so a wrong collection or field is a
  type error and the result has the right type. It is marked beta: «may be
  subject to change in minor versions updates prior to being stable».
- **Our own `find`, extended.** Small and ours, and it will never change
  underneath us. But we would keep writing query strings by hand and stating
  the return types, and type-safe queries would mean rebuilding much of what
  the SDK already does.
- **Payload's GraphQL API.** Asks for exactly the fields a page needs. But it
  needs a GraphQL client and generated types for each query, and adds a second
  way of talking to the CMS beside the REST calls for login.
- **Payload's Local API.** Only works inside the CMS process. The frontend is a
  separate app, so this would mean moving the pages into Next.js.

## Decision

The frontend reads collections with `sdk` from `@ilag/shared`:

- The SDK's version is pinned to exactly the same version as `payload`, and
  they are upgraded together.
- Every call passes `authHeaders(cookie)`, so the visitor's access applies.
  Without it the request is anonymous.
- Queries live in `src/web/src/lib/cms/`, one file per subject, as the
  frontend conventions already say. Pages and components don't call the SDK
  directly.
- `sdk` is created with a `fetch` wrapper that looks `fetch` up on every call.
  The SDK otherwise keeps the `fetch` it finds when it is created, and the
  tests' stubbed `fetch` would never be used.

`find` is removed, since nothing uses it anymore. `cmsFetch` stays for
endpoints that aren't collection queries: the health check, the current user
and the login providers. Login and logout keep using `fetch` directly, since
they need the `Set-Cookie` headers from the response.

## Consequences

- Queries are typed against the content model: after `pnpm generate:types`,
  renaming a field or a collection makes the queries that use it type errors
  instead of returning nothing at runtime. Nothing type-checks the frontend in
  CI yet, so for now these errors only show in the editor.
- Upgrading Payload may need changes to the queries while the SDK is in beta.
  Read the SDK's changelog on every upgrade. Since all queries are in
  `src/lib/cms/`, the changes stay there, and replacing the SDK later would
  only touch those files.
- Depth needs care. A join, such as Team's `members`, only fills in to depth 1
  unless its `maxDepth` allows more. Deeper reads also bring in every
  relationship on the way; use `populate` to keep only the fields the page
  shows (the team page went from 29 kB to 2 kB).
- Some queries Payload accepts still fail on Postgres: sorting the `members`
  join by `person.lastName` does, so members are sorted in the frontend.
- One more dependency in `@ilag/shared`.
