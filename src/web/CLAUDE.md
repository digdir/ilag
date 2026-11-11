@AGENTS.md

## Conventions

- **Pages** (`src/pages/`) have Norwegian URLs and sit in a folder for their
  main menu group, as in the prototype's `NAV_GROUPS`: `styring/`, `folk/`,
  `organisering/` and `verktoy/`. A subject gets its own folder there, such as
  `organisering/team/` with `index.astro` (`/organisering/team`) and
  `[id].astro`. A page fetches its data through `src/lib/cms/` and arranges
  components; markup that is repeated or has a meaning of its own goes in a
  component.
- **Queries** (`src/lib/cms/`, one file per subject, such as `teams.ts`) read
  the CMS with `sdk` and `authHeaders` from `@ilag/shared`, as the visitor:
  `sdk.find({ collection: 'team' }, { headers: authHeaders(cookie) })`. They
  return what the pages need, in the shape the components take. Other helpers
  go elsewhere in `src/lib/`.
- **Components** (`src/components/`) are one per file, named in PascalCase after
  what they show (`TeamCard.astro`). They take typed `Props` and never fetch, so
  they can be used anywhere. Look there before making a new one, and extend an
  existing component with a prop rather than making a near copy.
- **Behaviour** in the browser, such as filtering a list, goes in the
  component's own `<script>`, with plain DOM and no framework. Pages render
  everything on the server first, so they still work without it.
- **Split a component** when it does more than one thing or gets hard to read
  (as a rule of thumb, around 100 lines), into smaller components in the same
  folder.
- **Styles:** Designsystemet's `ds-*` classes and `data-color`/`data-size`
  first. Your own CSS goes in the component's `<style>`, with `--ds-*` tokens.
- **Tests:** every page gets a render test in `tests/`, through Astro's
  container API with `fetch` stubbed (see `tests/team.test.ts`).
