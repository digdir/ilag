import type { Principle } from '@ilag/shared'

// The shapes the principle pages and components work with. src/lib/cms/principles.ts
// builds them from Payload's generated types.

/** A principle area's stored value, such as `ledelse` (PR-02, PR-06). */
export type PrincipleArea = Principle['area']

/** A principle as the list shows it (PR-01). */
export type PrincipleView = Pick<Principle, 'id' | 'number' | 'title' | 'area' | 'description'>
