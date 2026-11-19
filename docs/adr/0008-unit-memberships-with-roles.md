# ADR-0008: Unit memberships with roles

- **Status:** Proposed
- **Requirements:** FO-02, LO-02, LO-03, RO-01, RO-03, NF-07
- **Related:** [ADR-0003](0003-imports-from-the-authoritative-source.md),
  [ADR-0005](0005-team-editors-use-the-admin-panel.md)

## Context

A person can be in more than one team, with different roles in each, so the
role belongs to the membership and not to the person. `teammedlemskap` models
this: one membership per person and team, with one or more roles (TO-03,
RO-05).

The same holds for units. A person can be in more than one unit in the line
(FO-02), and can have a different role in each. Someone can be linjeleder in
one section and an ordinary member of another unit, for example.

Units are modelled differently today:

- `personer.units` is a plain list of units. The people import sets it from
  the unit IDs in the SAP file (ADR-0003). There is nowhere to put a role.
- The unit's leader is a separate field, `enheter.leader`, which an
  administrator sets. It is the only role a person can have in a unit. It is
  not linked to the person's unit list, and it is called «enhetsleder» (LO-02,
  LO-03, 2.3), while Roller and section 4 of the specification call the role
  **linjeleder**.
- Roller holds the roles in teams (RO-01) and links each one to the team types
  it applies to (RO-03). Linjeleder is already in the list, with no team
  types, because it is not a role in a team.

The SAP file gives one line per person and unit. It has no role. Which units
a person belongs to comes from the source. The roles they have there do not,
for now. Open question 6 may change that.

## Options

**Where the role in a unit lives**

- **On a unit membership, like team memberships (chosen).** A new collection
  holds one membership per person and unit, with its roles. Teams and units
  then work the same way. The unit leader is a role like any other.
- **Keep `personer.units` and add a list of (unit, role) pairs to the
  person.** No new collection, but the import would rewrite the person, and
  roles set in ilag would have to survive that. Units and teams would also
  stay modelled differently.
- **Keep `enheter.leader` and add more fields like it.** Works only for a
  fixed set of roles, one person each.

**Where the memberships come from**

- **The import, with roles and extra memberships added in ilag (chosen).**
  The import creates and removes the memberships the source gives. Roles are
  set in ilag. Administrators can also add a membership the source doesn't
  have, such as a second unit someone works in.
- **Only the import.** Memberships follow the file exactly. Nobody can add a
  unit that SAP doesn't have.
- **Only in ilag.** Ignores the source for something it knows, against NF-07.

**Which role a new membership gets**

- **Medarbeider (chosen).** Almost everyone in a unit is a medarbeider there,
  so every membership shows a role from the start. Administrators only change
  the exceptions, such as the linjeleder.
- **None.** Most memberships would have no role at all.

**What the unit leader is**

- **A membership with the role linjeleder (chosen).** «Who leads this unit» is
  answered the same way as «who leads this team». Later rights for unit
  leaders (LO-03) can be found by the role's code, as ADR-0005 does with
  `teameier` and `teamleder`.
- **Keep `enheter.leader`.** Less to change, but there are then two ways to say
  who leads a unit, and they can disagree.

**Which roles can be picked where**

- **Through the role's links: team types for teams, unit levels for units
  (chosen).** Roles already list the team types they apply to (RO-03). A team
  membership accepts only roles linked to its team's type. Roles get the same
  kind of link to unit levels, and a unit membership accepts only roles linked
  to its unit's level. Both are checked when the membership is saved, not only
  in the picker. One link answers «where does this role apply» for both,
  and it can say more than a team/unit flag, such as that produkteier belongs
  in a produktteam but not in a prosjektteam.
- **A field on the role, `appliesTo`: team, unit or both.** Simpler, but it
  repeats what the team type link already says for teams, and it can disagree
  with it.
- **A role without team types can be used in units.** No new link, but
  områdeansvarlig and KI-agent also have no team types, and are not roles in
  a unit.
- **One shared list.** Anyone could give a person the role produkteier in a
  section, or linjeleder in a team.

## Decision

1. **A new collection, `enhetsmedlemskap`** (table `unit_memberships`, type
   `UnitMembership`). Each membership has a `unit`, a `person`, `roles` and a
   `source`. There is at most one membership per person and unit.
   - `roles` defaults to **Medarbeider**, both for memberships the import
     creates and for those an administrator adds. The role is found by its
     code, `medarbeider`, not its name (ADR-0005). Administrators may change
     or remove it, for example to make someone linjeleder instead.
   - `roles` may still be empty. If no role has the code `medarbeider`, the
     import creates the membership without roles and says so in its result,
     rather than refusing the file.
   - `source` is `import` or `manual`. It is set when the membership is
     created and never changed.
2. **The import manages only its own memberships.** For every person and unit
   in the file it makes sure there is a membership. If no membership exists, it
   creates one with the source `import` and the role Medarbeider. If one
   exists, whatever its source, it leaves it alone, so a role an
   administrator has changed is never put back. When a unit disappears from a person's lines, the import
   deletes that membership if its source is `import`, roles included. It never
   changes or deletes a membership with the source `manual`.
   - A person who leaves Digdir is marked inactive (ADR-0003) and keeps their
     memberships, so their history stays, as with teams.
   - `personer.externalUnitIds` stays as the raw value from the source, and
     the unit import links memberships from it when the units arrive later,
     as it links `units` today (ADR-0003, 8).
3. **Administrators set roles, and add or remove manual memberships.** They
   set the roles on any membership. They create and delete memberships with
   the source `manual`. They can't delete one with the source `import`, or
   move any membership to another person or unit, because the next import
   would put it back. Nobody else changes unit memberships for now. What a
   linjeleder may change (LO-03) is a later decision, built on ADR-0005's
   pattern.
4. **The unit leader is a membership with the role `linjeleder`.**
   `enheter.leader` is removed. The unit page shows everyone with that role in
   the unit (LO-02). A unit may have none or several. Before the field is
   removed, each existing leader becomes a membership with that role. The
   membership is manual if the import doesn't already have one for that
   person and unit.
5. **The links on the role decide where it can be used.**
   - **Teams:** a team membership accepts only roles linked to the team's
     type through `teamTypes` (RO-03), which roles already have.
   - **Units:** roles get `unitLevels`, the unit levels the role applies to
     (the same values as `enheter.level`: direktorat, divisjon, stab, tilsyn,
     avdeling, seksjon). A unit membership accepts only roles linked to its
     unit's level. In the seed data, Linjeleder and Medarbeider are linked to
     every level. Other roles are linked to none.
   - The picker on each kind of membership offers only matching roles, and
     saving a membership with a role that doesn't match is refused.
     Administrators maintain both links in Roller (RO-07).
6. **People and units read memberships through joins**, as people read team
   memberships today. `personer.units` becomes a join on `enhetsmedlemskap`,
   and `enheter.people` a join on the same collection. The frontend reads the
   unit through the membership, in Folk, the person page, the team page and the
   organisation chart.

## Consequences

- Team memberships are now checked against the team type. A membership saved
  before this, with a role that isn't linked to its team's type, stays until
  someone changes it. Then the role has to be linked or removed. Changing a
  team's type, or removing a type from a role, doesn't touch existing
  memberships either.
- Teams and units follow the same pattern: a membership per person, with the
  roles on it. Projects, when they come, can do the same.
- Personalleder (`personer.manager`, from SAP) and linjeleder in a unit are
  different things and stay separate. AL-04 keeps using the personalleder.
  Usually it is the same person, but ilag doesn't assume it.
- The API changes shape: `personer.units` and `enheter.people` return
  memberships instead of units and people, and `enheter.leader` is gone. The
  frontend and tests change in the same pull request.
- Removing `enheter.leader` drops its column in push mode. Leaders in a
  database must be copied to memberships first (decision 4). The seed sets
  leaders as memberships.
- A membership that an administrator added by hand stays after the source
  stops listing it, until an administrator removes it. Roles on an import
  membership disappear when the person leaves the unit in the source. If they
  come back, they get Medarbeider again, and any other role has to be set
  again.
- Medarbeider is the default only in units. It is not linked to any team
  type, so team memberships keep having their roles chosen when the person is
  added (TO-03).
- If the source later gives leaders or roles (open question 6), the import can
  set them on its own memberships without changing the model.
- The specification changes with the implementation, in its own commit with
  an entry in `docs/specification/decisions.md`:
  - 4.1 gets **Enhetsmedlemskap**.
  - **Enhet** no longer says the leader is registered by an administrator.
  - **Rolle** says a role is linked to the unit levels it applies to, as it
    is to team types (RO-03).
  - LO-02, LO-03 and 2.3 say linjeleder instead of enhetsleder.
