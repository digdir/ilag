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
