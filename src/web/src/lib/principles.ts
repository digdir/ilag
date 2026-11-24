import type { PrincipleArea } from '../types/principle'

// The principle areas (PR-02, PR-06) by their stored value, in the order the
// chips show them. The same values as PRINCIPLE_AREAS in the CMS
// (collections/Principles.ts).
export const PRINCIPLE_AREA_LABELS: Record<PrincipleArea, string> = {
  felles: 'Alle i Digdir',
  ledelse: 'Ledelse',
  arkitektur: 'Arkitektur',
}

/** The area's label, such as «Ledelse». */
export const principleAreaLabel = (area: PrincipleArea) => PRINCIPLE_AREA_LABELS[area]
