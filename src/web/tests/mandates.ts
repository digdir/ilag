// Mandates as the CMS returns them in the `mandate` join on Team and Unit.

export const approvedMandate = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  problem: 'Det er vanskelig å lage **gode** skjema. Se [innsikten](https://example.com/innsikt).',
  outcomes: '- Et nytt skjema på under en dag.\n- Alle skjema er universelt utformet.',
  expectations: 'Teamet eier skjemaverktøyet.',
  collaboration: 'Samarbeider med Team Innlogging.',
  approvedAt: '2026-09-15T00:00:00.000Z',
  _status: 'published',
  status: 'current',
  complete: true,
  missingFields: [],
  ...overrides,
})

export const joined = (...docs: unknown[]) => ({ docs, hasNextPage: false })
