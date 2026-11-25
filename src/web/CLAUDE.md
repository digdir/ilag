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
- **Types** the frontend works with, such as `Member`, go in `src/types/`, one
  file per subject (`types/team.ts`). Queries build them from the generated
  Payload types in `@ilag/shared`; never copy a generated type there by hand.
- **Components** (`src/components/`) are one per file, named in PascalCase after
  what they show (`TeamCard.astro`). Components for one subject go in a folder
  named like its pages folder (`components/team/` for `organisering/team/`);
  ones used across subjects, such as `Avatar.astro`, stay at the top. They take typed `Props` and never fetch, so
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
- **Finding elements in tests:** find elements as a visitor would, which also
  checks that screen readers get them right. Render tests use the Testing
  Library queries that `parse` in `tests/dom.ts` returns; the Playwright tests
  use the matching `page.getBy*` locators. In order of preference:
  1. By role and accessible name: `getByRole('button', { name: 'Logg ut' })`.
  2. Form fields by their label: `getByLabelText('E-post')` (Playwright:
     `getByLabel`).
  3. Content that isn't interactive by its text: `getByText('Kari Nordmann')`.
  4. `data-testid` (`getByTestId`), only when none of these finds the element
     reliably: its role changes (a main menu item is a link without
     JavaScript and a button with it), it has no unique name (repeated cards
     or rows), or its wording isn't settled. Name the id after what the
     element is, in lowercase kebab-case with Norwegian path segments
     (`menu-organisering`). A script that swaps an element for another, such
     as `SiteMenu`'s, copies the id.

  Never match rendered HTML with regular expressions; it breaks when the
  markup changes. Existing tests that do move to these queries when they are
  next changed.
