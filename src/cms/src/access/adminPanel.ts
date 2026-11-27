import type { PayloadRequest } from 'payload'

import { isAdmin } from './isAdmin'
import { isEditor } from './isEditor'
import { isTeamEditor } from './teamEditor'
import { isUnitLeader } from './unitLeader'

// Who may use the admin panel: administrators, redaktører, who maintain shared
// content, the teameiere and teamledere who edit their teams (TO-08, RO-06),
// and enhetsledere, who read feedback on their units (TB-02). `access.admin`
// on Brukere, and `canAccessAdmin` on the user's own user, which the frontend
// shows the CMS button by.
export const mayUseAdminPanel = async ({ req }: { req: PayloadRequest }): Promise<boolean> =>
  isAdmin(req.user) || isEditor(req.user) || (await isTeamEditor(req)) || (await isUnitLeader(req))
