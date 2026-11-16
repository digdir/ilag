# ADR-0005: People who edit a team's content use the admin panel

- **Status:** Proposed
- **Requirements:** TO-08, RO-06, TO-03
- **Related:** [ADR-0001](0001-login-and-sessions.md) (supersedes its decision 7)

## Context

Content about a team is to be maintained by the team itself (2.1, 2.3), and a
team lead registers and changes the roles of the members (RO-06). Until now only
administrators changed anything, and only administrators could use the admin
panel ([ADR-0001](0001-login-and-sessions.md), decision 7). Everyone else reads
ilag through the frontend.

Most people in Digdir will never need to change anything in ilag. An ordinary
team member reads about their team, but doesn't register it, add members or
give out roles. The people who do are those whose role makes them responsible
for the team's information: today the **teameier** and the **teamleder**. Later
others with such a role may follow, such as project leads for their projects
and unit leaders for their units (2.3). The CMS is a tool for them, not for
everyone.

ilag also didn't know which person a user is. Users are created by the login;
people come from the authoritative source (ADR-0003). Without a link between
them, nobody's team memberships can be found from their session.

## Options

**Where editors edit**

- **The Payload admin panel (chosen).** Payload already has forms, validation,
  relationship pickers and list views for every collection, and the access
  functions decide what each user may change. What editors see has to be cut
  down to their own content: hidden collections, filtered lists and a dashboard
  of their own.
- **Edit pages in the frontend.** Fits the frontend's look and Designsystemet,
  but every form, picker and validation message has to be built and kept in step
  with the collections. The access functions are the same either way, so this
  buys appearance, not safety. Can still be done later for single, frequent
  tasks.

**Who may edit**

- **Only roles that carry responsibility for the team's information (chosen).**
  Teameier and teamleder. Ordinary team members only read, in the frontend, and
  don't get into the admin panel at all. Fewer people with edit rights means
  fewer mistakes and a clear owner for what a team says about itself.
- **Every team member.** What 2.1 and 2.3 describe as the starting point. Most
  members would have nothing to do in the CMS, and the team's information would
  have no clear owner.

**How ilag knows who may edit a team**

- **By the roles named Teameier and Teamleder (chosen).** The memberships
  already hold who has which role in a team, so no new data is needed. The names
  are one constant in code (`TEAM_EDITOR_ROLES`); renaming the roles in Roller
  removes the rights, which the constant's comment says.
- **A flag on the role, «Kan redigere teamet».** Administrators decide which
  roles edit without a code change, but it is one more setting that grants
  access and has to be understood. Easy to move to later if the list of roles
  grows.
- **A separate list of editors on the team.** Duplicates the memberships, and
  drifts from them.

**How a user is linked to a person**

- **By email, on every login (chosen).** The token's email is matched to an
  active person's email. The link follows the person when someone leaves and
  comes back, and administrators can set it by hand for accounts that don't
  match.
- **By the source's ID in the token.** Would be exact, but Entra ID's token
  doesn't carry the SAP employee number, and which source ilag will import from
  is still open (open question 6).

## Decision

1. **Editors use the admin panel.** Besides administrators, a user who is
   teameier or teamleder in at least one team may use `/admin`. Everyone else,
   ordinary team members included, is refused and uses the frontend. The URL
   stays `/admin`; the panel's title ends in «ilag».
2. **Editors see only what they may change.**
   - Their dashboard is «Dine team»: one card per team they edit, each opening
     the team's page, which has the team's details and its members with add,
     edit and remove. Payload's collection cards are only on administrators'
     dashboards. Both are Payload dashboard widgets, so the default layout is
     chosen per user, and each user may change their own.
   - Collections they can't change are hidden from them in the panel. Lists of
     teams and memberships show only their own teams.
   - Read access through the API is unchanged: everyone signed in still reads
     all teams, people, roles and so on, which the frontend and the
     relationship pickers need.
3. **Access is enforced in the access functions** (as CLAUDE.md requires).
   Hiding and filtering in the panel are convenience. A teameier or teamleder may
   update their team and create, change and delete its memberships, and nothing
   else. A membership can't be moved to another team. Creating and deleting teams
   stays with administrators.
4. **Teameier and teamleder have the same rights** within the team, including
   giving and taking away these two roles.
5. **Users get a `person`**, set on each login from the active person with the
   same email, and settable by administrators.

## Still to be discussed

**Who gets access to the admin panel** is not settled. Teameier and teamleder
are where we start, so the solution can be tried out. Which roles should get
access, such as produkteier, prosjektleder or enhetsleder, and whether anyone
besides administrators may create teams (TO-08), will be discussed further.
Changing the roles is a change to `TEAM_EDITOR_ROLES`, or a move to a flag on
the role; the rest of this decision stays the same.

## Consequences

- When accepted, ADR-0001's status gets "Decision 7 superseded by ADR-0005".
- 2.1 and 2.3 in the specification still say team members can edit their
  team's content, list produkteier but not teameier, and TO-08 lets leaders
  create teams. The specification is left as it is until who gets access is
  settled (below); then it is changed with an entry in
  `docs/specification/decisions.md`.
- Every new kind of editor (project leads, unit leaders) follows the same
  pattern: a helper that finds what the user may edit, used by the collection's
  access functions and its list filter, and a dashboard widget for their
  content.
- Every new collection has to decide whether editors see it in the panel;
  hidden is the default for anything administrators maintain.
- Someone who is teameier or teamleder gets into the admin panel as soon as the
  membership exists, and loses access when it's removed. Nobody grants it
  separately.
- A user whose email doesn't match an active person can't edit until an
  administrator links them. A contractor who becomes an employee keeps the
  address, so the link moves to the new person, who has no memberships until
  someone adds them (open question 7).
- The admin panel's look is Payload's, not Designsystemet's (NF-04 applies to
  the frontend). If editors find it hard to use, frequent tasks can move to
  frontend pages without changing the access rules.
