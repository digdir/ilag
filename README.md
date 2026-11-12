# ilag

Prototype of the ilag application.

- `prototype/` — the original clickable HTML prototype. Reference/spec only; not part of the build. Published to <https://digdir.github.io/ilag/> on every change.
- `src/cms/` — Payload 3 (on Next.js 16), admin UI and REST/GraphQL API.
- `src/web/` — Astro 7 frontend (SSR via `@astrojs/node`).
- `src/shared/` — generated Payload types + the REST client (`@payloadcms/sdk`) shared by the frontend.
- `agent/` — an [agentctl](https://github.com/digdir/digdir-agents/tree/main/agentctl) Agent for developing ilag in a sandbox; see [`agent/README.md`](agent/README.md).

## Requirements

- Node 24 (`nvm use` — pinned in `.nvmrc`; Astro 7 requires >= 22.23.4)
- pnpm 12
- Docker (PostgreSQL only)

## Getting started

```bash
nvm use
pnpm install
pnpm setup      # creates .env files, generates a PAYLOAD_SECRET
pnpm db:up      # PostgreSQL 17 in Docker on localhost:5432
pnpm dev        # CMS on :3000, frontend on :4321
```

On first run, open http://localhost:3000/admin to create the first user, who
becomes an administrator. Every page on http://localhost:4321 needs a login;
the front page then verifies that the frontend can reach the CMS.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run CMS and frontend together |
| `pnpm dev:cms` / `pnpm dev:web` | Run one of them |
| `pnpm dev:stop` | Stop both dev servers (Astro runs as a detached daemon, so Ctrl+C alone leaves it running) |
| `pnpm build` | Production build of both |
| `pnpm setup` | Create missing `.env` files from the examples (safe to re-run) |
| `pnpm db:up` / `pnpm db:down` | Start/stop PostgreSQL |
| `pnpm db:reset` | Drop the volume and start a fresh database |
| `pnpm db:seed` | Fill the database with test data: an administrator (`admin@example.com`, password `ilag`), locations, roles and teams, and units and people imported from the files in `src/cms/scripts/seed-files/`. The imports mark other units and people inactive |
| `pnpm db:seed:reset` | Delete the test data and create it again |
| `pnpm db:seed:clear` | Delete the test data, and leave everything else |
| `pnpm generate:types` | Regenerate Payload types into `src/shared` |
| `pnpm make-admin <email>` | Make an existing user an administrator |
| `pnpm lint` | ESLint for the CMS |
| `pnpm check:web` | Type-check the frontend (`astro check`); `astro dev` and `astro build` don't |
| `pnpm test` | All non-browser tests (CMS + frontend) |
| `pnpm test:int` | CMS integration tests (vitest, Payload Local API) |
| `pnpm test:web` | Frontend render tests (vitest, Astro container API) |
| `pnpm test:e2e` | End-to-end tests (Playwright, needs browsers installed) |

## Ports

| Service | Port |
| --- | --- |
| PostgreSQL | 5432 |
| Payload / Next.js | 3000 |
| Astro | 4321 |

## Tests

`pnpm test` runs both non-browser suites:

- `pnpm test:int` — CMS integration tests using Payload's Local API directly. No
  dev server needed, but the database must be up. They run in a database of
  their own, `<your database>_test` (`ilag_dev_test`), which they drop and
  create on every run, so they never touch your development data.
- `pnpm test:web` — frontend tests that render `.astro` pages through Astro's
  container API with `fetch` stubbed, so they need neither a server nor a database.
  They cover the seam to the CMS: the URL that gets requested, the rendered
  result, and the failure path when the CMS is unreachable.

`pnpm test:e2e` drives a real browser against the CMS and reuses a dev server on
:3000 if one is running. Install the browser once first:

```bash
pnpm --filter cms exec playwright install chromium
```

The e2e tests seed and then delete a `dev@payloadcms.com` user in whatever
database `DATABASE_URL` points at, so don't run them against anything but a
local database.

CI (`.github/workflows/ci.yml`) runs `pnpm lint`, `pnpm check:web`, `pnpm test` and `pnpm test:e2e`
on every pull request to `main`, each against its own throwaway PostgreSQL.

## Login

Nothing is available without logging in (NF-11). The reasons for the design
are in [ADR-0001](docs/adr/0001-login-and-sessions.md). Payload owns the session: the
Astro middleware (`src/web/src/middleware.ts`) asks Payload who the
`payload-token` cookie belongs to and sends everyone else to `/logg-inn`. What a
logged-in user may see is decided by the collections' access functions.

- **Entra ID** (NF-02) is the main way in. The CMS runs the OpenID Connect flow
  (`src/cms/src/auth/`) and creates the user on their first login. Someone whose
  email matches an existing user gets linked to that user.
- **Email and password** (NF-12) is Payload's own login, the fallback for when
  Entra ID doesn't work. Users created by Entra ID have a random password, so
  this only works for users an administrator has given a password.

Only administrators use the admin panel and change users and media. The first
user in an empty database becomes one; make others with `pnpm make-admin
<email>` or in the admin panel. Users from before roles existed have no role,
so run `pnpm make-admin` for yourself once.

To log in with Entra ID locally, set `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID` and
`ENTRA_CLIENT_SECRET` in `src/cms/.env`; ask the team for the values. The app
registration has `http://localhost:3000/api/brukere/oauth/entra/callback` as a
redirect URI, and the optional claims `given_name` and `family_name` in the ID
token (*Token configuration*), which fill in the user's first and last name on
every login. Without them only email and password is offered. The tests run
the Entra ID flow against a mock provider, so they don't need them.

Pages that read from the CMS pass the visitor's session on, so Payload's access
control applies: `sdk.find({ collection: 'personer' }, { headers: authHeaders(cookie) })` from
`@ilag/shared`. Payload ignores its cookie on server-to-server requests, so
`authHeaders` sends the token in the `Authorization` header instead.

## Imports

Units and people come from SAP through Ansattmottak, which posts a CSV file to
`POST /api/enheter/import` or `POST /api/personer/import`. The design is in
[ADR-0003](docs/adr/0003-imports-from-the-authoritative-source.md), and the
files are described in the [unit](docs/integrations/unit-import.md) and
[people](docs/integrations/people-import.md) contracts. The code is in
`src/cms/src/imports/`.

- **The integration user** sends the files. In the admin panel, create a user
  under *Brukere* with a long random password, give it only the role
  *Integrasjon*, tick *Enable API Key* and copy the key before you save. It can
  call the import endpoints and nothing else, and cannot log in.
- **Import runs** (*Importkjøringer*) show every file that arrived, what it
  changed and any errors. A file with fewer than half as many units or people as
  are active is held: set its status to *I kø* to apply it.
- **Jobs** run in the CMS every 10 seconds, in the `imports` queue. People files
  are removed from their runs after 90 days; unit files are kept.

To try it locally, post a file with the key:

```bash
curl -X POST http://localhost:3000/api/enheter/import \
  -H "Authorization: brukere API-Key <key>" \
  -H "Content-Type: text/csv; charset=utf-8" \
  --data-binary @enheter.csv
```

## Database schema

In development the Postgres adapter pushes the schema from the collection configs
on startup — no migration files needed while the content model is in flux. Before
anything is shared or deployed, snapshot it:

```bash
pnpm --filter cms payload migrate:create
```

and run `pnpm --filter cms payload migrate` on deploy with push disabled.

## Environment variables

`pnpm setup` creates both `.env` files from the committed `.env.example`
templates and generates a `PAYLOAD_SECRET` for this machine. Existing files are
left alone, so it is safe to re-run.

`PAYLOAD_SECRET` is not shared between developers: it signs session tokens and
encrypts encrypted fields, so each environment has its own. Changing it after
the fact logs everyone out and makes existing API keys and encrypted values
unreadable, so keep it stable once an environment is running.

The database credentials in the examples are local-only throwaways that match
`docker-compose.yml`.
