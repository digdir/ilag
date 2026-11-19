# ADR-0007: Mandates as a versioned collection with approval

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
- a mandate on the unit page (LO-02) as well as the team page (TO-04). A
  mandate belongs to one team or one unit, and each has at most one. A shared
  mandate would need approval from several leaders, so units that share one
  in the prototype, such as the three departments of Utvikling og drift, get
  one each.

ADR-0005 (Proposed) decides that teameiere and teamledere edit their team's
content in the Payload admin panel. It links each user to a person by email
when they log in, and finds the teams a user edits from their memberships with
the roles Teameier and Teamleder (`src/cms/src/access/teamEditor.ts`). A
mandate is part of a team's content, so this record builds on it. Who
approves the mandate is narrower than who edits the team: only the teameier.

The specification's data model had mandates as generic «Innhold» of the type
«mandat».

## Options

- **A group of fields on Teams and Units.** The fewest moving parts. But
  approval would be field access on collections that already have their own
  rules, and Units is partly locked by the import (ADR-0003). Versions in Payload are per
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

For the link between a mandate and its team or unit:

- **On Team and Unit, a `mandate` relationship to the mandate.** Reads
  naturally from the team. But the link would follow the team's and the
  unit's edit rights, not the mandate's:
  - A teamleder may edit the team (ADR-0005), so they could point it at
    another mandate document that nobody has approved, and get around the rule
    that only the teameier approves.
  - Units are only updated by administrators, and the import owns most of
    their fields (ADR-0003). Unit leaders would need write access to Units.
  - Two teams could point at the same mandate unless that field were unique
    too, and a mandate could exist that no team or unit points at.
  - Access to a mandate would first need a lookup of which team or unit
    points at it.
  - Creating a mandate would be two writes, the mandate and then the team,
    each with its own access check, and a failed second write leaves an
    orphan.
- **On the mandate, a relationship to its team or unit (chosen).** The link
  is covered by the mandate's own access rules and version history. A mandate
  can't exist without an owner, and a unique index stops a second mandate for
  the same team or unit. Access is a plain query (`{ team: { in: … } }`), and
  creating a mandate is one write. Teams and Units read it through a join.
  The join returns a list, so the reader takes its only item.

For the status (draft, current or expired):

- **A `status` select of our own.** One field to read and filter on. But
  draft and current only mirror Payload's `_status`, so a hook has to keep the
  two in step on every save, publish and restore, and a path it misses leaves
  them disagreeing. The select also gets the same enum name in Postgres as
  `_status` unless renamed.
- **Payload's `_status`, and a date for expiry (chosen).** `_status` already
  says whether a version is a draft or approved. Only expiry is ours: an
  `expiredAt` date, which also says when. The status is calculated from the
  two for display. It can't be filtered on as one field; queries use
  `_status` and `expiredAt`.

## Decision

### The collection

`mandater` (`dbName: 'mandates'`, interface `Mandate`), with:

| Field | Type | Label |
| --- | --- | --- |
| `team` | relationship to `team`, unique | Team |
| `unit` | relationship to `enheter`, unique | Enhet |
| `problem` | textarea, markdown | Hva skal vi løse? |
| `outcomes` | textarea, markdown | Hva skal vi oppnå? |
| `expectations` | textarea, markdown | Hva forventes av oss? |
| `collaboration` | textarea, markdown | Hvordan samarbeider vi med andre? |
| `approvedAt` | date | Godkjent |
| `expiredAt` | date | Utgått |
| `approvedBy` | relationship to `personer`, set by the CMS | Godkjent av |
| `status` | virtual: `draft`, `current`, `expired` | Status |
| `complete`, `missingFields` | virtual | |

Payload adds `_status` (`draft` or `published`) for the drafts.

- **Owner.** Exactly one of `team` and `unit` is set; validation refuses
  both or neither. Two plain relationships rather than one polymorphic
  relationship: each is a column of its own, so a unique index in the
  database stops a second mandate for the same team or unit. A polymorphic
  relationship is stored in a separate table, where it can't be unique.
  The owner is set when the mandate is created and can't be changed after
  that, the same way a membership can't be moved to another team in
  ADR-0005: a mandate can't be moved to a team or unit whose leaders didn't
  approve it. A `beforeChange` hook always keeps the original owner. Field
  access makes the owner read-only in the admin panel, except while a
  version is restored: a restore builds its data from the old version and
  drops the fields the user may not update, which would leave the mandate
  without an owner.
  Teams and Units get a `mandate` join, so the frontend fetches it with the
  rest, and the team's page in the admin panel shows it.
- **Versions.** `versions: { drafts: true, maxPerDoc: 0 }`: drafts, and every
  version kept (TO-17). Payload's default keeps only the last 100.
- **Markdown.** The fields are plain textareas holding markdown, with a short
  note on formatting under each. The frontend renders it on the server with
  markdown-it with raw HTML turned off, so nobody can put HTML or scripts on a
  page; links are limited to the schemes markdown-it allows.
- **Completeness (TO-10, LO-04).** Virtual fields calculated when the mandate
  is read: whether it is complete, and which of the four fields are empty. It is never stored, so it can't
  go stale. The four fields are `required`, which Payload checks only when
  publishing, so a draft can be incomplete but an approved mandate can't.

### Status and approval

Payload's `_status` says whether a version is a draft or approved
(published), and `expiredAt` whether an approved mandate has expired. The
calculated `status` is `draft` for a draft, `expired` for a published mandate
with `expiredAt`, and `current` otherwise.

- **Draft.** Saving with Payload's «Save draft». Readers keep seeing the
  published version, if there is one. A mandate that has never been approved
  is a draft and isn't shown to readers. A draft has no `approvedAt` or
  `expiredAt`: approving it is a new approval.
- **Current.** Approving publishes the draft. The approver gives
  `approvedAt`, which defaults to today but can be earlier, for a mandate
  approved in a meeting before it was registered. A new approval clears
  `expiredAt`. The CMS sets `approvedBy` to the approver's person, since
  Payload's versions don't record who saved them; this needs users linked to
  people, so it comes with ADR-0005's implementation (#58).
- **Expired.** The team owner publishes the mandate with `expiredAt` when it
  no longer applies, for example when a team is closed. It keeps the date of
  the approval that ends, stays readable, and is marked as expired.

A hook sets the dates; only approvers publish, so only they set them.

When a new version is approved, the previous one is not changed: it is in the
version history with its own approval date. The history shows earlier approved
versions as replaced; «expired» is only for a mandate that no longer applies at
all.

### Guarding the drafts

Payload decides whether a save is a draft from the operation's `draft`
argument (`?draft=true` in REST), which neither access functions nor
`beforeChange` hooks see. Without it, a save writes straight to the published
mandate, even when `_status` stays `published`, and one with
`_status: 'draft'` unpublishes it. Restoring a version without it writes the
old version as published, or unpublishes the mandate if the version was a
draft. Left alone, an editor could change or hide the approved mandate
without approval.

- A `beforeOperation` hook, which does see `draft`, lets every change through
  the API be either a draft save or a publish, and every restore only a
  draft. Restored text is approved again like any other draft.
- Unpublishing is refused for everyone, administrators included. A mandate
  that no longer applies is expired, not hidden.

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
  user is Teameier only, so the helper gets a variant for one role.
- **Roles are matched by a stable code, not by name.** Roller gets a `code`
  (`teameier`, `teamleder`) that the access functions match on. The name is
  text for people and can be changed or translated without changing anyone's
  rights. The code is required, unique, and can't be changed once set. This
  replaces matching on names in ADR-0005, as suggested in the review of #58;
  if #58 is merged before that changes, this implementation makes the switch.
- `update` lets editors in, and refuses `_status: 'published'` unless the user
  may approve. The admin panel asks the same access function with
  `_status: 'published'` and only shows «Publish» when it is allowed, so a
  teamleder sees «Save draft» only. A draft never carries `approvedAt` or
  `expiredAt`, so a teamleder can't set them either.
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
  saved on top of an approved mandate doesn't reach readers, also through the
  `mandate` join on Teams and Units, and that a teamleder can't publish
  through the REST API.
- The history grows with every save. Mandates are short text, so keeping all
  versions is cheap. The admin panel shows the history and can compare
  versions.
- The admin panel still shows «Unpublish», and «Restore» for draft versions,
  which only restores as published. Both are refused with a message. Hiding
  them needs custom components.
- A restored version keeps the old version's `createdAt`; the history is
  sorted by `updatedAt`.
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
