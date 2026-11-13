/**
 * A Norwegian number in pairs, as the prototype shows it: «+4791234567» →
 * «91 23 45 67». Other numbers are shown as they come.
 */
export function formatPhone(number: string): string {
  const digits = number.replace(/[\s-]/g, '')
  const local = digits.match(/^(?:\+47|0047)?(\d{8})$/)?.[1]
  return local ? local.replace(/(\d{2})(?=\d)/g, '$1 ') : number
}

/** The number for a tel: link, without spaces. */
export const telHref = (number: string) => `tel:${number.replace(/[\s-]/g, '')}`
