import type { User } from '../payload-types'

// Administrators maintain content that applies across Digdir and use the
// admin panel (2.3). Everyone else only reads, through the web frontend.
// Takes only the roles, so it works for `req.user` and for the client-side
// user the admin panel passes to `admin.hidden`.
export const isAdmin = (user: Pick<User, 'roles'> | null | undefined): boolean =>
  Boolean(user?.roles?.includes('admin'))
