# ADR-0006: Mandates as a versioned collection with approval

- **Status:** Proposed
- **Requirements:** TO-04, TO-09, TO-10, TO-16, TO-17, LO-02, LO-03, LO-04
- **Related:** [ADR-0005](0005-team-editors-use-the-admin-panel.md) (#57, Proposed), which this builds on;
  its implementation in #58

## Context

A mandate says why a team or a unit exists, what it is to achieve and what is
expected of it. The specification asks for:

- the four core fields of Digdir's mandate template (Vedlegg 3), written in
  markdown (TO-09):
  - «Hva skal vi løse?»
  - «Hva skal vi oppnå?»
  - «Hva forventes av oss?»
  - «Hvordan samarbeider vi med andre?»
- whether the mandate is complete, and which fields are missing (TO-10, LO-04)
- a status of draft, current or expired, and the date it was approved (TO-16)
- every version kept, drafts as well as approved versions (TO-17)
- the team owner (teameier) and the team lead (teamleder) edit a team's
  mandate, and only the team owner approves it and makes it current
  (TO-09, TO-16). The unit leader edits the unit's mandate (LO-03).
- a mandate on the unit page (LO-02) as well as the team page (TO-04). Units
  can share one mandate: the prototype has a single mandate for the three
  departments of Utvikling og drift.

ADR-0005 (Proposed) decides that teameiere and teamledere edit their team's
content in the Payload admin panel. It links each user to a person by email
when they log in, and finds the teams a user edits from their memberships with
the roles named Teameier and Teamleder (`src/cms/src/access/teamEditor.ts`). A
mandate is part of a team's content, so this record builds on it. Who
approves the mandate is narrower than who edits the team: only the teameier.

The specification's data model had mandates as generic «Innhold» of the type
«mandat».

## Options

- **A group of fields on Teams and Units.** The fewest moving parts. But a
  mandate can't be shared between units. Approval would be field access on
  collections that already have their own rules. Versions in Payload are per
  collection, so turning them on would version every change to a team or unit,
  not only the mandate.
- **Generic content with a content type («Innhold» and «Innholdstype»).** One
  model for mandate, strategy and other text. But TO-09 wants fixed fields, and
  generic content would hold the fields as untyped data, with completeness,
  approval and access rules written per type anyway.
- **A collection of its own, `mandater`, with Payload's versions and drafts
  (chosen).** Typed fields, its own access functions, and the history and the
  difference between draft and approved that Payload already has, in the admin
  panel where editors already work.

For the history there are two ways to use Payload:

- **Versions without drafts, and a new document for each new revision.** Each
  document is one revision of a mandate. «Expired» means replaced. But what is
  one mandate then exists only as a convention between documents, and readers
  have to pick the current one themselves.
- **One document per mandate, with drafts (chosen).** The published version is
  the approved mandate, and a draft can be worked on without changing what
  everyone else sees. Every save is a version.

## Decision

### The collection

`mandater` (`dbName: 'mandates'`, interface `Mandate`), with:

| Field | Type | Label |
| --- | --- | --- |
| `owners` | relationship to `team` and `enheter`, many | Eier |
| `problem` | textarea, markdown | Hva skal vi løse? |
| `outcomes` | textarea, markdown | Hva skal vi oppnå? |
| `expectations` | textarea, markdown | Hva forventes av oss? |
| `collaboration` | textarea, markdown | Hvordan samarbeider vi med andre? |
| `status` | select: `draft`, `current`, `expired` | Status |
| `approvedAt` | date | Godkjent |
| `approvedBy` | relationship to `personer`, set by the CMS | Godkjent av |
| `completeness` | virtual: `{ complete, missing[] }` | |

- **Owners.** Either exactly one team, or one or more units. A hook refuses a
  mix of the two, and a second mandate for a team or unit that already has one.
  Teams and Units get a `mandate` join, so the frontend fetches it with the
  rest, and the team's page in the admin panel shows it.
- **Versions.** `versions: { drafts: true, maxPerDoc: 0 }`: drafts, and every
  version kept (TO-17). Payload's default keeps only the last 100.
- **Markdown.** The fields are plain textareas holding markdown, with a short
  note on formatting under each. The frontend renders it on the server with
  markdown-it with raw HTML turned off, so nobody can put HTML or scripts on a
  page; links are limited to the schemes markdown-it allows.
- **Completeness (TO-10, LO-04).** A virtual field calculated when the mandate
  is read: which of the four fields are empty. It is never stored, so it can't
  go stale. The four fields are `required`, which Payload checks only when
  publishing, so a draft can be incomplete but an approved mandate can't.

### Status and approval

The status and Payload's own `_status` (draft or published) work together:

- **Draft.** Saving with Payload's «Save draft». Readers keep seeing the
  published version, if there is one. A mandate that has never been approved
  is a draft and isn't shown to readers.
- **Current.** Approving publishes the draft with `status: 'current'`. The
  approver gives `approvedAt`, which defaults to today but can be earlier,
  for a mandate approved in a meeting before it was registered. The CMS sets
  `approvedBy` to the approver's person, since Payload's versions don't record
  who saved them.
- **Expired.** The team owner publishes the mandate with `status: 'expired'`
  when it no longer applies, for example when a team is closed. It stays
  readable, marked as expired.

When a new version is approved, the previous one is not changed: it is in the
version history with its own approval date. The history shows earlier approved
versions as replaced; «expired» is only for a mandate that no longer applies at
all.

### Access

Access lives in the collection's access functions, as everywhere else:

| | Read published | Read drafts and versions | Save drafts | Approve or expire |
| --- | --- | --- | --- | --- |
| Signed in | ✓ | approved versions only | | |
| Teamleder of the owning team | ✓ | ✓ | ✓ | |
| Teameier of the owning team | ✓ | ✓ | ✓ | ✓ |
| Administrator | ✓ | ✓ | ✓ | ✓ |

- **Who edits** comes from ADR-0005: `editableTeamIds` in
  `src/cms/src/access/teamEditor.ts`. **Who approves** needs the teams where the
  user is Teameier only, so the helper gets a variant for one role, matched on
  the role's name like the rest of ADR-0005.
- `update` lets editors in, and refuses `_status: 'published'` unless the user
  may approve. The admin panel asks the same access function with
  `_status: 'published'` and only shows «Publish» when it is allowed, so a
  teamleder sees «Save draft» only. `status`, `approvedAt` and `approvedBy`
  have field access of their own, so a teamleder can't change them in a draft
  either.
- `readVersions` returns a query: published versions to everyone signed in,
  drafts only to editors.
- In the admin panel the collection is shown to team editors, with the list
  filtered to their own teams, as ADR-0005 does for teams and memberships.
- **Unit mandates.** ADR-0005 leaves unit leaders out of the admin panel for
  now. Until that is settled, only administrators edit and approve unit
  mandates. Unit leaders (LO-03) then follow the same pattern, with a
  `unitsEditedBy` helper.

## Consequences

- This depends on ADR-0005 and its implementation (#58). If ADR-0005 changes
  who edits or where, this record changes with it.
- Readers only ever see an approved mandate. Tests have to check that a draft
  saved on top of an approved mandate doesn't reach readers, and that a
  teamleder can't publish through the REST API.
- The history grows with every save. Mandates are short text, so keeping all
  versions is cheap. The admin panel shows the history and can compare
  versions.
- Payload's button says «Publish», not «Godkjenn». Renaming it needs a custom
  component; that can come when editors try it.
- Markdown is markup, and NF-06 asks for editing without it. Plain text is
  valid markdown, so nobody has to use it; a preview in the admin panel is a
  custom field component that can come later.
- Who approves a unit's mandate isn't in the specification yet.
- The four fields left out of the template («Andre rammer») can be added later
  as optional fields without changing this design.
- Team contracts (TO-11) can follow the same pattern, with TO-13 as field
  access on the personal user manual.
