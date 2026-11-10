# People import

How Ansattmottak sends Digdir's people to ilag. The file is an export from
SAP, with SAP's field names in the header. The design behind it is in
[ADR-0003](../adr/0003-imports-from-the-authoritative-source.md), and it works
the same way as the [unit import](unit-import.md).

> **Status:** proposed, not built yet. The columns are the ones Ansattmottak
> has said it will send. The points under «Still to confirm» need an answer
> from Ansattmottak before the import is built.

## In short

- Send **all** people every time, as one CSV file, in an HTTP POST.
- ilag checks every row and answers at once: `202` when the file is accepted,
  `400` with every error when it isn't.
- ilag applies an accepted file shortly after, usually within seconds.
- A person missing from the file is marked as no longer working in Digdir.
  They are not deleted, so their history in teams survives.

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
- One person per line, all people in every file.

### Columns

| Column | Meaning in SAP | Required | Field in ilag |
| --- | --- | --- | --- |
| `0000PERNR` | Employee number (AnsattNr) | yes | `externalId` and `employeeNumber`. Unique in the file |
| `0002VORNA` | First name (Fornavn) | yes | `firstName` |
| `0002NACHN` | Last name (Etternavn) | yes | `lastName` |
| `01050010USRID_LONG` | Email (Epost) | yes | `email`. Unique in the file |
| `9999PLANS_TEKST` | Job title (Stillingstittel) | no | `title` |
| `0001ORGEH` | Organisational unit (OrgEnhetId) | yes | `externalUnitIds`, then `units`. The same ID as `externalUnitId` in the unit file |
| `0001BTRTL` | Location (Lokasjon) | yes | `externalLocationId`, then `location` |
| `9999LEDER_PERNR` | The manager's employee number (LederAnsattNr) | no | `externalManagerId`, then `manager` |
| `0001PERSG` | Employee group (AnsattType) | yes | `isEmployee`. See «Still to confirm» |
| `01059003USRID` | Mobile 1 (Mobil1) | no | `mobile` |
| `01059004USRID` | Mobile 2 (Mobil2) | no | `mobile`, when Mobile 1 is empty |

ilag also sets `fullName` from the first and last name, and sets `active` to
true for everyone in the file.

These columns are in the file but are not stored in ilag, because no
requirement needs them:

| Column | Meaning in SAP |
| --- | --- |
| `01050001USRID` | SAP user ID (SapUserId) |
| `0001STELL` | Job ID (StillingstittelId). The title comes from `9999PLANS_TEKST` |
| `9999BEGDA` | Start date (AnsattDato) |

Other columns are ignored as well. Ansattmottak can leave the unused ones
out. The file is kept on the import run in either case, so leaving them out
means less personal data stored in ilag.

### Example

The people are made up.

```csv
0000PERNR;0001BTRTL;0001ORGEH;0001PERSG;0001STELL;0002NACHN;0002VORNA;01050001USRID;01050010USRID_LONG;01059003USRID;01059004USRID;9999BEGDA;9999LEDER_PERNR;9999PLANS_TEKST
4711;0001;100;1;50001234;Nordmann;Kari;KNORDMANN;kari.nordmann@digdir.no;+4791234567;;01.03.2019;;Divisjonsdirektør
4712;0002;110;1;50001240;Hansen;Ola;OHANSEN;ola.hansen@digdir.no;;+4799887766;15.08.2021;4711;Avdelingsdirektør
4720;0002;111;1;50001301;Ødegård;Åse;AODEGARD;ase.odegard@digdir.no;+4790011223;;02.01.2024;4712;Seniorrådgiver
```

### What makes ilag refuse a file

The whole file is refused, and nothing changes, if any row:

- lacks a required column or value
- repeats a `0000PERNR` already in the file
- repeats an email already in the file, or has an email that isn't valid
- has a `0001PERSG` that isn't one of the agreed employee groups

These are **not** errors, because the other files may come later or the
person may be outside the file. They are listed in the import's result:

- a `0001ORGEH` that isn't a unit in ilag
- a `0001BTRTL` that isn't a location in ilag
- a `9999LEDER_PERNR` that isn't a person in the file

A `9999LEDER_PERNR` equal to the person's own `0000PERNR` means the person has
no manager in ilag.

## Responses

**`202 Accepted`**: the file is valid and queued.

```json
{
  "importRunId": 43,
  "rows": 412,
  "statusUrl": "https://<ilag>/api/personer/import/43"
}
```

**`400 Bad Request`**: the file has errors. All of them are listed.

```json
{
  "errors": [
    { "line": 3, "column": "01050010USRID_LONG", "message": "«kari.nordmann» is not a valid email" },
    { "line": 9, "column": "0000PERNR", "message": "«4712» is already on line 2" }
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
    "unknownUnits": ["199"],
    "unknownLocations": [],
    "unknownManagers": ["4799"]
  }
}
```

Polling is optional. Administrators see the same in ilag's admin panel.

## Still to confirm

- [ ] **Employee groups.** Which `0001PERSG` values does the file use, and
  which of them are employees? Are contractors (innleide) in the file at all?
  If they aren't, ilag needs another source for them, since a person is either
  an employee or a contractor (section 4.1 of the specification).
- [ ] **One unit per person.** `0001ORGEH` holds one unit. A person can belong
  to more than one unit (FO-02). Does SAP ever have more than one for a
  person, and if so, how would it come in the file?
- [ ] **Locations.** Is `0001BTRTL` the same ID the location file will use?
  There is no location contract yet.
- [ ] **Mobile 1 and 2.** ilag stores one mobile number. The proposal is
  Mobile 1, then Mobile 2 when Mobile 1 is empty.
- [ ] **The email.** Is `01050010USRID_LONG` always the person's Digdir email,
  the one they sign in with through Entra ID?
- [ ] **Unit file columns.** If the unit file also comes from SAP, it should
  use SAP's names too, and the [unit contract](unit-import.md) changes to
  match.
- [ ] **A durable ID.** Does `0000PERNR` stay the same when a contractor
  becomes an employee, or when someone leaves and comes back? Open question 7
  in the specification.

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
