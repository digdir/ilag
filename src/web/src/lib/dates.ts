// Dates as the pages show them, in Norwegian.

// Days from the admin panel's day pickers, such as a mandate's approval, are
// stored at midnight UTC, so they are formatted in UTC to keep the day.
const dayFormat = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** A day stored at midnight UTC, as «15. september 2026». */
export const formatDay = (iso: string) => dayFormat.format(new Date(iso))

/** A moment, such as when something was last changed, as the day it was in Norway. */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo' })
