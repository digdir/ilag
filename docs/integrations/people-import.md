# People import

How Ansattmottak sends Digdir's people to ilag. The file is an export from
SAP, with SAP's field names in the header. The design behind it is in
[ADR-0003](../adr/0003-imports-from-the-authoritative-source.md), and it works
the same way as the [unit import](unit-import.md).

> **Status:** agreed, not built yet. The columns are the ones Ansattmottak
> has said it will send.

## In short

- Send **all** people every time, as one CSV file, in an HTTP POST.
- ilag checks every row and answers at once: `202` when the file is accepted,
  `400` with every error when it isn't.
- ilag applies an accepted file shortly after, usually within seconds.
- A person missing from the file is marked as no longer working in Digdir.
  They are not deleted, so their history in teams survives.
- The people file and the [unit file](unit-import.md) can come in any order.
  Whichever comes second links people to their units.

## Request

```
POST https://<ilag>/api/personer/import
Authorization: brukere API-Key <key>
Content-Type: text/csv; charset=utf-8

<the CSV file>
```

- **The key** belongs to ilag's integration user, the same key as for the
  unit import. Keep it on the sending server, for example in Windows
  Credential Manager, never in the script.
- **The body** is the file itself, not a form upload.
- **The file** may be at most 5 MB.

## The file

- UTF-8, with or without a byte order mark.
- Semicolon as separator. ilag detects the separator from the header, so a
  comma also works, as in the unit file.
- The first line is the header, with SAP's field names. ilag matches them
  without regard to case or surrounding spaces, in any order.
- Values may be quoted, as `Export-Csv` does.
- One line per person and unit, all people in every file. See «A person in
  more than one unit».

### Columns

| Column | Meaning in SAP | Required | Field in ilag |
| --- | --- | --- | --- |
| `01050001USRID` | SAP user ID (SapUserId) | yes | `externalId` |
| `0000PERNR` | Employee number (AnsattNr) | yes | `employeeNumber`. ilag matches people on it |
| `0002VORNA` | First name (Fornavn) | yes | `firstName` |
| `0002NACHN` | Last name (Etternavn) | yes | `lastName` |
| `01050010USRID_LONG` | Email (Epost) | yes | `email`, the same address the person signs in with through Entra ID |
| `9999PLANS_TEKST` | Job title (Stillingstittel) | no | `title` |
| `0001ORGEH` | Organisational unit (OrgEnhetId) | yes | `externalUnitIds`, then `units`. The same ID as `orgEnhet` in the [unit file](unit-import.md) |
| `0001BTRTL` | Location, as an abbreviation such as `LEI` (Lokasjon) | yes | `locationCode`, then `location`: the location with that `code`. See «Locations» |
| `9999LEDER_PERNR` | The manager's employee number (LederAnsattNr) | no | `managerEmployeeNumber`, then `manager`: the person with that `employeeNumber` |
| `0001PERSG` | Employee group (AnsattType) | yes | `isEmployee`: `1` or `4` is an employee, `8` or `9` a contractor |
| `01059003USRID` | Mobile 1 (Mobil1) | no | `mobile` |
| `01059004USRID` | Mobile 2 (Mobil2) | no | `mobile`, when Mobile 1 is empty |

ilag also sets `fullName` from the first and last name, and sets `active` to
true for everyone in the file.

These columns are in the file but are not stored in ilag, because no
requirement needs them:

| Column | Meaning in SAP |
| --- | --- |
| `0001STELL` | Job ID (StillingstittelId). The title comes from `9999PLANS_TEKST` |
| `9999BEGDA` | Start date (AnsattDato) |

Other columns are ignored as well. Ansattmottak can leave the unused ones
out. The file is kept on the import run in either case, so leaving them out
means less personal data stored in ilag.

### Example

The people are made up.

```csv
0000PERNR;0001BTRTL;0001ORGEH;0001PERSG;0001STELL;0002NACHN;0002VORNA;01050001USRID;01050010USRID_LONG;01059003USRID;01059004USRID;9999BEGDA;9999LEDER_PERNR;9999PLANS_TEKST
4711;LEI;10008925;1;50001234;Nordmann;Kari;KNORDMANN;kari.nordmann@digdir.no;+4791234567;;01.03.2019;;Divisjonsdirektør
4712;OSL;10002031;1;50001240;Hansen;Ola;OHANSEN;ola.hansen@digdir.no;;+4799887766;15.08.2021;4711;Avdelingsdirektør
4720;OSL;10014302;8;50001301;Ødegård;Åse;AODEGARD;ase.odegard@digdir.no;+4790011223;;02.01.2024;4712;Seniorrådgiver
```

### A person in more than one unit

A person usually has one line. ilag can link a person to more than one unit
(FO-02), so a person may also have one line per unit: the same `0000PERNR`
with a different `0001ORGEH` on each line. ilag links the person to every
unit on their lines.

The other values come from the person's first line. If a later line has
different values, ilag uses the first line's and lists the employee number in
the import's result.

### Locations

Locations are not in a file. Administrators register them in ilag's admin
panel, with the same abbreviation as `0001BTRTL` in the `code` field. A person
whose code has no location yet is listed in the import's result, and is
linked by the first import after the location is registered.

### Leaving, coming back, and becoming an employee

ilag matches people on the employee number.

- **Someone who leaves** is missing from the file, and ilag marks them as no
  longer working in Digdir.
- **Someone who comes back** keeps their employee number. ilag finds them
  again, marks them as active and keeps their history in teams. A new SAP user
  ID replaces the old one.
- **A contractor who becomes an employee** gets a new SAP user ID and a new
  employee number, but keeps their email. ilag then sees a new person, and
  marks the contractor as no longer working in Digdir. Their history in teams
  stays with the contractor. The two share the email, so ilag only requires
  an email to be unique in the file, not among people who have left.

### What makes ilag refuse a file

The whole file is refused, and nothing changes, if any row:

- lacks a required column or value
- repeats both the `0000PERNR` and the `0001ORGEH` of another line
- has a `01050001USRID` or an email that another line has with a different
  `0000PERNR`
- has an email that isn't valid
- has a `0001PERSG` other than `1`, `4`, `8` or `9`

These are **not** errors, because the unit file may come later, the location
may not be registered yet, or the manager may be outside the file. They are listed in the import's result:

- a `0001ORGEH` that isn't a unit in ilag. A unit the unit import skips,
  such as `10013301` (BOD-ekstern), is not listed: the person just gets no
  unit
- a `0001BTRTL` that isn't the code of a location registered in ilag
- a `9999LEDER_PERNR` that isn't the `0000PERNR` of a person in the file

A `9999LEDER_PERNR` equal to the person's own `0000PERNR` means the person has
no manager in ilag.

## Responses

**`202 Accepted`**: the file is valid and queued.

```json
{
  "importRunId": 43,
  "rows": 415,
  "people": 412,
  "statusUrl": "https://<ilag>/api/personer/import/43"
}
```

**`400 Bad Request`**: the file has errors. All of them are listed.

```json
{
  "errors": [
    { "line": 3, "column": "01050010USRID_LONG", "message": "«kari.nordmann» is not a valid email" },
    { "line": 9, "column": "0001ORGEH", "message": "«4712» is already in unit «10002031» on line 2" }
  ]
}
```

| Status | Meaning |
| --- | --- |
| `401` | The key is missing or wrong |
| `403` | The key belongs to a user that may not import |
| `413` | The file is larger than 5 MB |
| `415` | The body isn't `text/csv` |

### Status of an import

`GET https://<ilag>/api/personer/import/<importRunId>`, with the same
`Authorization` header, returns the run's status: `queued`, `running`,
`succeeded`, `failed` or `superseded` (a newer file arrived before this one
started). A finished run also has its result:

```json
{
  "status": "succeeded",
  "result": {
    "created": 3,
    "updated": 407,
    "deactivated": 2,
    "unknownUnits": ["10099999"],
    "unknownLocations": [],
    "unknownManagers": ["4799"],
    "differingLines": ["4720"]
  }
}
```

Polling is optional. Administrators see the same in ilag's admin panel.

## Example script

Works in Windows PowerShell 5.1 and PowerShell 7.

```powershell
$ErrorActionPreference = 'Stop'

$uri  = 'https://<ilag>/api/personer/import'
$file = 'C:\eksport\personer.csv'
$key  = $env:ILAG_API_KEY   # or read it from Windows Credential Manager

try {
    # -InFile sends the file's bytes as they are. A string in -Body can be
    # re-encoded by Windows PowerShell 5.1, and æ, ø and å are lost.
    $result = Invoke-RestMethod -Method Post -Uri $uri `
        -Headers @{ Authorization = "brukere API-Key $key" } `
        -ContentType 'text/csv; charset=utf-8' `
        -InFile $file
    Write-Output "Accepted: import run $($result.importRunId), $($result.rows) people"
}
catch {
    # A 400 response lists every error in the file.
    Write-Error "ilag refused the file: $($_.ErrorDetails.Message)"
    exit 1
}
```
