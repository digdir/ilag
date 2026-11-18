# ADR-0006: The team type wizard's questions live in the CMS

- **Status:** Proposed
- **Requirements:** TK-03, TK-04, FS-03
- **Related:** [ADR-0004](0004-payload-sdk-for-cms-reads.md), [ADR-0005](0005-team-editors-use-the-admin-panel.md)

## Context

The team type wizard (TK-03) takes someone who is setting up a team through a
few questions to the team type that fits, and shows what must be in place for
it (TK-04). Its content is Vedlegg 1 of the specification: a small tree of
questions, each with an explanation, points to consider and two or three
answers. Each answer leads to another question or to a result.

Organisasjonslæring (VSU) owns this content and expects to change it as teams
use it. If the tree is in code, every change to a question needs a developer
and a deployment. So the questions have to be editable in the admin panel, in
a shape that VSU can understand, and that is the decision here: how to model a
tree in Payload.

What makes it a decision is that Payload has no field for a tree. A
relationship field can point at documents in a collection, but not at rows
inside an array in the same document. We tried several shapes while building
the first version, and most of the code went into working around that.

## Options

- **One collection of questions (chosen).** Each question is a document. Each
  answer has one relationship field, «Leder til», that points at another
  question or at a team type, or is left empty. Payload's own relationship
  field gives the dropdown, a link to open or create the target, titles in the
  list view, and filled-in targets for the frontend (`depth`). The collection
  has no hooks, custom validation or custom components.
- **A global holding the whole tree as arrays.** One page to edit, which fits
  «there is only one wizard». But answers can't point at rows in the same
  array, so this needed hand-written keys or row IDs, a custom React dropdown,
  custom row labels and a validator for missing targets, loops and unreachable
  questions. Around 850 lines for five questions.
- **The questions in code.** The simplest to build and test, but VSU can't
  change the content without a developer.
- **Loop protection with a step number.** Each question gets a number, and an
  answer may only lead to a higher one, which Payload enforces with
  `filterOptions`. It costs no custom code but makes editors maintain the
  numbers. Since the tree is small and only administrators edit it, a loop is
  unlikely and visible as soon as someone tries the wizard, so we left it out.

## Decision

The wizard's questions are the collection `teamtype-veiviser`
(`TeamTypeWizardQuestion`), written only with Payload's built-in fields:

- A question has a title, an explanation, «Vurder» (one point per line) and a
  «Startspørsmål» checkbox. The wizard starts at the first question with the
  box ticked.
- Each answer has a label, an explanation and «Leder til»: another question, a
  team type, or nothing.
- **A team type is the result.** The result shows the team type's description
  and «Dette må på plass», which lives on `teamtyper` as `requirements` (TK-04),
  so a team type page can show the same list later. This is the wizard's only
  link to the rest of the data model.
- **An answer that leads nowhere ends the wizard** with the answer and its
  explanation as advice, such as «team er kanskje ikke riktig arbeidsform».
  These outcomes are not team types, so they don't show up in team type lists
  and filters.
- Everyone logged in reads the questions; administrators create, change and
  delete them, like the team types. Team editors don't see the collection in
  the admin panel.
- The frontend, `/verktoy/veiviser`, keeps the answers so far in the URL
  (`?svar=1.2.1`), so back, refresh and links work without JavaScript. A path
  that no longer fits the questions starts over.

## Consequences

- VSU can change questions, answers and where they lead in the admin panel,
  and the frontend follows at once.
- Nothing stops an editor from making a loop, or from leaving a question that
  no answer leads to. The wizard then never reaches a result on that path, or
  the question is never shown. Whoever edits the tree should click through it
  afterwards. If that turns out not to be enough, a step number with
  `filterOptions` (see the options) adds the protection without custom code.
- Deleting a question or a team type that an answer leads to clears that
  answer's «Leder til», so it then ends the wizard as advice. The admin panel
  doesn't warn about it.
- Visitors who are halfway through when the tree changes start over.
- A second wizard, such as the one for existing teams in 3.3, would get its own
  collection or a field that says which wizard a question belongs to.
- The seed data creates today's tree from Vedlegg 1 as the prototype has it,
  including the prototype's extra question about fagnettverk. Where that
  differs from Vedlegg 1 is for VSU to decide in the content, not in code.
