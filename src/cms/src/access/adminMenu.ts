import type { CollectionAdminOptions } from 'payload'

import { isAdmin } from './isAdmin'
import { canEditSharedContent } from './isEditor'

// For `admin.hidden`: a collection is only in the admin panel's menu for those
// who can change it. Not access control; read access is unchanged. The admin
// panel passes its client-side user, which has no `collection` and types its
// fields as `any`, so only the roles are handed on.
type Hidden = Exclude<CollectionAdminOptions['hidden'], boolean | undefined>

// Collections only administrators change.
export const hiddenUnlessAdmin: Hidden = ({ user }) => !isAdmin({ roles: user?.roles })

// Shared content that redaktører change too.
export const hiddenUnlessSharedContentEditor: Hidden = ({ user }) =>
  !canEditSharedContent({ roles: user?.roles })
