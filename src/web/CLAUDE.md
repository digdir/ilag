@AGENTS.md

## Conventions

- **Pages** (`src/pages/`) have Norwegian URLs (`/team`, `/team/[id]`). A page
  fetches its data through `src/lib/cms/` and arranges components; markup that is
  repeated or has a meaning of its own goes in a component.
- **Queries** (`src/lib/cms/`, one file per subject, such as `teams.ts`) read
  the CMS with `sdk` and `authHeaders` from `@ilag/shared`, as the visitor:
  `sdk.find({ collection: 'team' }, { headers: authHeaders(cookie) })`. They
  return what the pages need, in the shape the components take. Other helpers
  go elsewhere in `src/lib/`.
- **Components** (`src/components/`) are one per file, named in PascalCase after
  what they show (`TeamCard.astro`). They take typed `Props` and never fetch, so
  they can be used anywhere. Look there before making a new one, and extend an
  existing component with a prop rather than making a near copy.
- **Split a component** when it does more than one thing or gets hard to read
  (as a rule of thumb, around 100 lines), into smaller components in the same
  folder.
- **Styles:** Designsystemet's `ds-*` classes and `data-color`/`data-size`
  first. Your own CSS goes in the component's `<style>`, with `--ds-*` tokens.
- **Tests:** every page gets a render test in `tests/`, through Astro's
  container API with `fetch` stubbed (see `tests/team.test.ts`).
