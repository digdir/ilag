import type { RamoField, RoleWithTypes } from '../types/role'

// How the role pages describe a role, from what the CMS has on it.

/** The role's RAMO description (RO-02) in order, leaving out what isn't written yet. */
export function ramo(
  role: Pick<RoleWithTypes, 'role' | 'responsibility' | 'authority' | 'tasks'>,
): RamoField[] {
  return [
    { label: 'Rolle', value: role.role },
    { label: 'Ansvar', value: role.responsibility },
    { label: 'Myndighet', value: role.authority },
    { label: 'Oppgaver', value: role.tasks },
  ].flatMap(({ label, value }) => (value?.trim() ? [{ label, value: value.trim() }] : []))
}
