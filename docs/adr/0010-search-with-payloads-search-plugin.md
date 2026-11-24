# ADR-0010: Search with Payload's search plugin

- **Status:** Proposed
- **Requirements:** FS-01, FO-03, AL-04, NF-09
- **Related:** [ADR-0001](0001-login-and-sessions.md), [ADR-0004](0004-payload-sdk-for-cms-reads.md), the trial in #86

## Context

FS-01 asks for one search across ilag: people, teams, units and content.
FO-03 asks for finding employees by name. Users expect a type-ahead: start
typing a team's name and it shows up, as in the prototype's «Søk i ilag» in
the header.

Some things shape the choice:

- The things to find live in several collections: teams, team types, units,
  people, roles and tools today, more later.
- Pages read the CMS as the visitor (ADR-0001, ADR-0004), so Payload's access
  control decides what each user may see. The search must not show anyone a
  document they couldn't open.
- People are personal data. The search may not expose more about a person
  than their own page does (AL-04), nor send it to third parties (NF-09).
- The amounts are small: hundreds of teams, units and roles, and the
  employees of one directorate. A query over all of them is cheap.
- The database is PostgreSQL, through Payload's Postgres adapter.

## Options

- **Query each collection directly.** For each keystroke, find matching
  names in every searched collection with Payload's `like`, as the visitor.
  Access control is exactly right without any work, and nothing is copied.
  But it is one request per collection per search, the results can't be
  ranked or limited across types in one place, and every new collection
  means another query in the frontend.
- **Payload's search plugin (chosen).** `@payloadcms/plugin-search` keeps a
  document in a search collection for each document in the searched
  collections, through hooks on those collections, and offers a reindex. One
  query searches everything, through Payload's API and access control. But
  the index is a copy: it has access rules of its own, and it can fall
  behind the source when a change doesn't save the indexed document.
- **PostgreSQL full-text search or `pg_trgm` behind an endpoint of our own.**
  Gives ranking and tolerance for typos. But the SQL goes past Payload, so
  the endpoint would have to repeat every collection's access rules, and the
  indexes need migrations of their own. It can be added later on top of the
  plugin's table if typos turn out to matter.
- **A search engine such as Meilisearch or Typesense.** Best ranking and
  typo tolerance, but another service to run, sync and secure, with access
  rules again outside Payload. A hosted one, such as Algolia, would send
  personal data to a third party (NF-09). Far more than the amounts need.

## Decision

We use Payload's search plugin, configured in `src/cms/src/search/`.

- **One index.** The plugin keeps a document in the collection `sok` for
  every team, team type, unit, person, role and tool. The list of searched
  collections and their priorities is `SEARCHED_COLLECTIONS` there. A
  collection is added by adding it to that list.
- **What it holds.** The title, which is the collection's
  `admin.useAsTitle`; one line of context, which the collection gives
  itself as `custom.searchSubtitle` next to the fields it reads; and whether
  the source is active. Nothing else: no contact details, memberships or
  allocation (AL-04, NF-09). A field only goes into the index if everyone
  who may read the document may see it, since the index has no field-level
  access.
- **The same read access as the source.** Whoever may read a document must
  find it, and nobody else. Since the index is a copy, its access is set by
  hand to match. A test checks this for every searched collection and every
  kind of user, so a collection added to the search, or a change to a
  collection's read access, fails until the index follows.
- **Only the plugin writes.** Nobody may create search documents. Only
  administrators may update and delete them, which is what reindexing needs.
- **Inactive documents stay.** A team, unit or person that becomes inactive
  keeps its search document, marked inactive, and the search leaves it out.
- **The frontend searches as the visitor.** The header search asks an
  endpoint in the web app, which queries `sok` with the visitor's session,
  sorted by priority so each type's hits stay together.

## Consequences

- Adding a collection to the search is a line in `SEARCHED_COLLECTIONS`,
  test data for it in the access test, and, if it wants one, a
  `custom.searchSubtitle` on the collection.
- The index can fall behind. A change that doesn't save the indexed document
  isn't seen: renaming a team type leaves its name in the subtitles of its
  teams. So do writes with `disableHooks` or straight to the database. A
  reindex, from the admin panel, puts it right.
- After deploying to a database that already has data, the index is empty
  until someone reindexes. The first deploy needs a reindex by an
  administrator.
- Every change to a searched document costs a few more queries, which adds
  up in the imports of people and units.
- When a searched collection's read access changes, the access of `sok` must
  change with it. The test makes sure we don't forget, but it compares
  documents, not fields.
- Matching is Payload's `like`: every word of the query must occur in the
  title, with no tolerance for typos. If that is not good enough, `pg_trgm`
  on the plugin's table is the next step, without changing this decision.
- We depend on the plugin following Payload's releases. Its access check for
  reindexing has a quirk: setting `create` in its overrides makes reindexing
  require it, so `create` is left to the plugin's default.
