// Fixed codes made from names, such as a role's `code` (Roles.ts): lowercase
// a–z, digits and hyphens, so they read well in code and URLs.

const CODE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** A code from a name: «KI-agent Æøå» → «ki-agent-aeoa». */
export const codeFromName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    // Other accents, such as é → e.
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Whether a value is a valid code, such as «teamleder». */
export const isCode = (value: unknown): value is string => typeof value === 'string' && CODE.test(value)
