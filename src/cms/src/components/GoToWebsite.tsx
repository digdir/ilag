import type { ServerProps } from 'payload'
import React from 'react'

import { webURL } from '@/urls'

// A button in the admin panel's top bar back to the frontend, on every page,
// like the frontend's «CMS» button the other way.
export function GoToWebsite({ i18n }: ServerProps) {
  return (
    <a className="btn btn--style-secondary btn--size-small btn--withoutPopup" href={webURL} style={{ margin: 0 }}>
      {i18n.language === 'en' ? 'Go to ilag' : 'Gå til ilag'}
    </a>
  )
}
