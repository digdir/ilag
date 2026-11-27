// The icons the site uses, from Aksel (`@navikt/aksel-icons`), the icon set
// Designsystemet uses and the prototype's icons come from. Import an icon here
// before using it, so only these end up in the build. Each is an Astro
// component that renders the SVG inline, in the text colour (`currentColor`),
// 1em in size unless styled otherwise.
// Find icons at https://aksel.nav.no/ikoner, by their English name.
import Buildings3 from '@navikt/aksel-icons/svg/Buildings3.svg'
import Compass from '@navikt/aksel-icons/svg/Compass.svg'
import PersonGroup from '@navikt/aksel-icons/svg/PersonGroup.svg'
import Wrench from '@navikt/aksel-icons/svg/Wrench.svg'

export const icons = { Buildings3, Compass, PersonGroup, Wrench }

export type IconName = keyof typeof icons
