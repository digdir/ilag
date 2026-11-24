import type { User } from '../payload-types'

import { isAdmin } from './isAdmin'

// Redaktører maintain the content shared across Digdir that has no owner of
// its own, such as tools, principles and concepts, alongside the
// administrators. An administrator gives the role under Brukere. Takes only the
// roles, like isAdmin, so it works for `req.user` and for the client-side user
// the admin panel passes to `admin.hidden`.
export const isEditor = (user: Pick<User, 'roles'> | null | undefined): boolean =>
  Boolean(user?.roles?.includes('editor'))

// Administrators and redaktører: who may create, change and delete shared
// content.
export const canEditSharedContent = (user: Pick<User, 'roles'> | null | undefined): boolean =>
  isAdmin(user) || isEditor(user)
