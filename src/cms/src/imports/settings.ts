// Settings for the files from the authoritative source. See
// docs/integrations/unit-import.md.

// The directorate, at the top of the organisation chart. Its code columns
// hold its name instead of a code, so it is recognised by its ID.
export const DIRECTORATE_UNIT_ID = '10008925'

// Units in SAP that aren't units in Digdir, such as BOD-ekstern, which groups
// contractors. The unit import skips them, and people in them get no unit.
export const SKIPPED_UNIT_IDS: readonly string[] = ['10013301']

// Units directly under the directorate that aren't divisions, which the file
// can't tell apart: a support unit such as Kommunikasjon, and an authority
// such as the supervisory authority for universal design of ICT. The unit
// import gives them this level instead of «division»; their departments and
// sections are found as under a division.
export const UNIT_LEVELS: Readonly<Record<string, 'support' | 'authority'>> = {
  '10003925': 'support', // Kommunikasjon (KOM)
  '10004805': 'authority', // Tilsyn for universell utforming av IKT (TUU)
}

// The largest file the import endpoints accept.
export const MAX_FILE_BYTES = 5 * 1024 * 1024

// A file with fewer units or people than this share of the active ones is
// held until an administrator confirms it, in case the file was cut off.
export const HOLD_BELOW_SHARE = 0.5

// How long the people files, which contain personal data, are kept on their
// import runs. Unit files are kept.
export const PEOPLE_FILE_RETENTION_DAYS = 90
