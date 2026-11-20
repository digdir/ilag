# ADR-0009: Concepts are explained automatically where they are used

- **Status:** Proposed
- **Requirements:** BG-01, BG-02, BG-06, NF-01
- **Related:** [ADR-0004](0004-payload-sdk-for-cms-reads.md), the mandates in #60

## Context

BG-06 asks for an inline explanation of a concept wherever it is used,
without the reader leaving the page. In the prototype a concept in running
text has a dotted underline and shows its definition.

The text that mentions concepts is written by many people in many places:
team, team type, tool and unit descriptions, the RAMO descriptions of roles,
and later mandates and the team contract. VSU, who maintain the concepts,
can't be expected to go through all of it each time a concept is added, and
the people who write a team description won't remember to link every
concept.

Some things shape the choice:

- Today every one of these fields is plain text (a `textarea`). Mandates
  (#60) will be markdown.
- Pages read the CMS as the visitor (ADR-0001, ADR-0004).
- Norwegian inflects nouns: «team», «teamet», «teamene», «teamets». Matching
  only the concept's name would miss most uses.
- The explanation has to work with a keyboard and on a touch screen (NF-01).
  A tooltip on hover does neither.
- Not every concept should be marked: «team» or «leveranse» would underline
  half of every page.

## Options

- **Editors link concepts by hand**, with a link or an inline node in the
  editor. Precise, but every text needs someone to remember, and a new
  concept is never marked in text that is already written. It would also
  need rich text, which the fields don't have.
- **Mark concepts in the browser, as the prototype does** (`decorateTerms`
  in `Saman.dc.html`). Walks the page's text after it is drawn and wraps
  matches. Needs no change to the pages, but the text visibly changes after
  loading, every visitor's browser does the work, and the result is hard to
  test.
- **Mark concepts on the server when the page is rendered (chosen).** The
  frontend finds the concepts in the text before the HTML is sent.

## Decision

The frontend marks concepts on the server, in one place: a `Prose`
component that every page uses to render text from the CMS.

- **Which concepts.** A concept in `begreper` has a checkbox, «Forklar
  begrepet automatisk der det brukes». Only those are marked. VSU decides.
- **Which words.** The concept's name and the forms listed in its
  `variants` field, such as «teamet» and «teamene». Two concepts may share
  a form; the word is then marked once and its popover explains both.
- **How they match.** Whole words only, ignoring case, with the longest form
  tried first, so «teamleder» wins over «team». A word is bounded by
  anything that isn't a letter, digit or hyphen, so «æ», «ø» and «å» count as
  letters.
- **How often.** The first occurrence of each concept in each text block,
  such as one description or one RAMO field. Not every occurrence, which
  would clutter the text, and not once per page, which would depend on the
  order Astro renders components in.
  A word shared by several concepts is marked while one of them is still
  unexplained.
- **Not on lists.** Only detail pages mark concepts. Cards in a list keep
  plain text.
- **How it is shown.** The word becomes a `<button>` that opens
  Designsystemet's Popover, built on the browser's `popover` attribute.
  It opens on click, Enter or Space, closes on Esc, and needs no script of
  our own. The popover shows the name and definition of each concept the
  word names.
- **Reading the concepts.** One read per request, as the visitor, shared by
  every `Prose` on the page.

The fields are plain text today, so `Prose` matches on the text itself and
Astro escapes the result. When markdown arrives with mandates, the same
matcher runs as a rehype plugin, built on `hast-util-find-and-replace`.

## Consequences

- Every page that shows text from the CMS on a detail page has to render it
  through `Prose`. Text printed directly isn't marked.
- VSU have to list a concept's inflected forms. A form that isn't listed
  isn't marked.
- Two concepts may share a form without the CMS objecting. The reader then
  sees both definitions and picks, so VSU should still prefer distinct names
  where they can. Concepts from an external catalogue (BG-04) will often
  share names with ours, and need no change to fit in.
- A word can be marked where it means something else, such as a team called
  «Prototype». The checkbox turns a concept off everywhere; there is no way
  to turn off a single occurrence yet.
- Each detail page makes one more read from the CMS. It runs alongside the
  page's own reads and returns a few fields per concept.
- The matching is one function with its own tests, and its rules are changed
  in one place.
