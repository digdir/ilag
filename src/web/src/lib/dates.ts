// Dates as the pages show them, in Norwegian.

const dateFormat = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Oslo',
})

/**
 * The day something happened in Norway, as «15. september 2026». It also
 * fits the days from the admin panel's day pickers, such as a mandate's
 * approval: they are stored at midnight UTC, which is the same day in Norway.
 */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

const shortDateFormat = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Oslo',
})

/** The day in short, without the year, as «15. sep.», for lists of recent things. */
export const formatShortDate = (iso: string) => shortDateFormat.format(new Date(iso))
