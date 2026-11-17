'use client'

import { useDocumentInfo, useDocumentTitle, useStepNav, ViewDescription } from '@payloadcms/ui'
import type { StaticDescription } from 'payload'
import React, { useEffect } from 'react'

// The collection's description in the admin panel, which Payload shows under
// the title on the mandate list and on every tab of a mandate. On a mandate it
// also titles the page «Mandat for Team Skjemabygger», in the header and the
// breadcrumbs, instead of its ID.
//
// Payload titles a document by `useAsTitle`, which can't be a calculated field
// such as the mandate's `title` (it names the owner, a team or a unit). So the
// title is set here, from that field. Payload sets the title again whenever
// the form data changes, and the breadcrumbs whenever the title changes; both
// effects below put the mandate's title back. The title is set on the next
// tick: on the versions tab Payload resets it in the same render, after this
// component's effects.
export function MandateTitle({ description }: { description?: StaticDescription }) {
  const { id, initialData } = useDocumentInfo()
  const { title, setDocumentTitle } = useDocumentTitle()
  const { stepNav, setStepNav } = useStepNav()
  const wanted = typeof initialData?.title === 'string' ? initialData.title : null

  useEffect(() => {
    if (!wanted || title === wanted) return
    const timer = setTimeout(() => setDocumentTitle(wanted))
    return () => clearTimeout(timer)
  }, [wanted, title, setDocumentTitle])

  useEffect(() => {
    if (!wanted || id == null) return
    const i = stepNav.findIndex((item) => item.label === String(id))
    if (i === -1) return
    setStepNav(stepNav.map((item, j) => (j === i ? { ...item, label: wanted } : item)))
  }, [wanted, id, stepNav, setStepNav])

  return description ? <ViewDescription description={description} /> : null
}
