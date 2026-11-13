# Unit import

How Ansattmottak sends Digdir's units (the directorate, divisions,
departments and sections) to ilag. The file is an export from SAP, with SAP's
field names in the header. The design behind it is in
[ADR-0003](../adr/0003-imports-from-the-authoritative-source.md).

> **Status:** built. The columns are the ones in Ansattmottak's example file.

## In short

- Send **all** units every time, as one CSV file, in an HTTP POST.
- ilag checks every row and answers at once: `202` when the file is accepted,
  `400` with every error when it isn't.
- ilag applies an accepted file shortly after, usually within seconds.
- A unit missing from the file is marked as closed in ilag. It is not deleted.
- A file with fewer than half as many units as ilag has active is held
  until an administrator confirms it, in case it was cut off.
- The unit file and the [people file](people-import.md) can come in any
  order. Whichever comes second links people to their units.

## Request

```
POST https://<ilag>/api/enheter/import
Authorization: brukere API-Key <key>
Content-Type: text/csv; charset=utf-8

<the CSV file>
```

- **The key** belongs to ilag's integration user. Keep it on the sending
  server, for example in Windows Credential Manager, never in the script.
- **The body** is the file itself, not a form upload.
- **The file** may be at most 5 MB.

## The file

- UTF-8, with or without a byte order mark.
- The first line is the header, with SAP's field names. ilag matches them
  without regard to case or surrounding spaces, in any order. A leading
  `#TYPE …` line from older versions of `Export-Csv` is ignored.
- Comma or semicolon as separator; ilag detects which from the header. A
  value that contains the separator must be quoted. Semicolon, as in the
  [people file](people-import.md), avoids that for names with a comma.
- Values may be quoted, as `Export-Csv` does.
- One unit per line, all units in every file.

### Columns

| Column | Required | Content | Field in ilag |
| --- | --- | --- | --- |
| `orgEnhet` | yes | The unit's ID in SAP. Unique in the file. The same ID as `0001ORGEH` in the people file | `externalUnitId` |
| `Betegnelse på organisasjonsenh` | yes | The unit's full name, not SAP's short text of at most 40 characters | `name` |
| `Avdeling` | yes | The code of the division the unit is in, such as `FEL` | `code` and `level`, and `parent` |
| `Seksjon` | yes | The code of the department the unit is in, such as `FUT` | `code` and `level`, and `parent` |
| `gruppe` | no | The section's code, such as `FBA` | `code` and `level` |

`Koststed` (cost centre) is in the file but not stored, because no
requirement needs it. Other columns are ignored as well.

The file still uses the names from before the new organisation structure. Its
`Avdeling`, `Seksjon` and `gruppe` are what ilag calls divisjon, avdeling and
seksjon.

### Levels and parents

The file has no parent column. ilag works out each unit's level, code and
parent from the three code columns:

| The line has | Level | Code | Parent |
| --- | --- | --- | --- |
| `orgEnhet` `10008925` | Direktorat | none | none |
| `Avdeling` equal to `Seksjon`, and no `gruppe` | Divisjon | `Avdeling` | the directorate |
| `Seksjon` different from `Avdeling`, and no `gruppe` | Avdeling | `Seksjon` | the division with that `Avdeling` |
| a `gruppe` | Seksjon | `gruppe` | the department with that `Avdeling` and `Seksjon` |

The directorate is recognised by its ID, because its `Avdeling` and `Seksjon`
hold its name instead of a code.

### Lines ilag skips

`10013301` (BOD-ekstern) groups contractors in SAP. It is not a unit in
Digdir, so ilag skips the line, and people whose `0001ORGEH` is `10013301`
get no unit. The IDs of skipped units are a setting in ilag. If one of them
should later be shown as a unit, an administrator handles it in ilag.

### The leader

The file has no leader. An administrator sets each unit's leader in ilag's
admin panel, and the import never changes it. The leader may later come from
the people file or a new column in this file.

### Units that advise all of Digdir

The file doesn't say which units advise and support all of Digdir rather
than just their own division (LO-06). An administrator marks them in ilag's
admin panel, and the import never changes the marking.

### Example

From Ansattmottak's example file.

```csv
orgEnhet,Betegnelse på organisasjonsenh,Koststed,Avdeling,Seksjon,gruppe
10008925,Digitaliseringsdirektoratet,1000,Digitaliseringsdirektoratet,Digitaliseringsdirektoratet,
10002031,Fellesløsninger,7100,FEL,FEL,
10003276,FEL - Utvikling,7120,FEL,FUT,
10014302,FEL – Backend,7120,FEL,FUT,FBA
10013301,BOD-ekstern,7200,BOD-ekstern,BEK,
```

This gives the directorate, the division FEL under it, the department FUT
under FEL, and the section FBA under FUT. BOD-ekstern is skipped.

### What makes ilag refuse a file

The whole file is refused, and nothing changes, if any line that isn't
skipped:

- lacks a required column or value
- repeats an `orgEnhet` already in the file
- repeats the code of another unit at the same level: two divisions with the
  same `Avdeling`, two departments with the same `Avdeling` and `Seksjon`, or
  two sections with the same `gruppe`
- is a department whose `Avdeling` has no division in the file
- is a section whose `Avdeling` and `Seksjon` have no department in the file

ilag also refuses a file without the directorate.

## Responses

**`202 Accepted`**: the file is valid. `status` is `queued`, or `held` if it
has fewer than half as many units as ilag has active; an administrator then
has to confirm it. `units` doesn't count skipped lines.

```json
{
  "importRunId": 42,
  "status": "queued",
  "rows": 50,
  "units": 49,
  "statusUrl": "https://<ilag>/api/enheter/import/42"
}
```

**`400 Bad Request`**: the file has errors. All of them are listed.

```json
{
  "errors": [
    { "line": 3, "column": "Avdeling", "message": "No division in the file has the code «KOMM»" },
    { "line": 7, "column": "orgEnhet", "message": "«10003276» is already on line 5" }
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

`GET https://<ilag>/api/enheter/import/<importRunId>`, with the same
`Authorization` header, returns the run's status:

| Status | Meaning |
| --- | --- |
| `queued` | Waiting to be applied, usually for a few seconds |
| `held` | Far fewer rows than ilag has active; waits for an administrator |
| `running` | Being applied |
| `succeeded` | Applied. The result says what changed |
| `failed` | Nothing changed. The run has an `error`, and is tried again up to three times |
| `superseded` | A newer file arrived before this one was applied |

A finished run also has its result:

```json
{
  "importRunId": 42,
  "status": "succeeded",
  "result": {
    "created": 2,
    "updated": 46,
    "deactivated": 1,
    "skipped": ["10013301"]
  }
}
```

Polling is optional. Administrators see the same in ilag's admin panel.

## Example script

Works in Windows PowerShell 5.1 and PowerShell 7.

```powershell
$ErrorActionPreference = 'Stop'

$uri  = 'https://<ilag>/api/enheter/import'
$file = 'C:\eksport\enheter.csv'
$key  = $env:ILAG_API_KEY   # or read it from Windows Credential Manager

# Write the file as UTF-8. Windows PowerShell 5.1 otherwise writes ASCII,
# and æ, ø and å turn into question marks.
$units | Export-Csv -Path $file -NoTypeInformation -Encoding UTF8 -Delimiter ';'

try {
    # -InFile sends the file's bytes as they are. A string in -Body can be
    # re-encoded by Windows PowerShell 5.1.
    $result = Invoke-RestMethod -Method Post -Uri $uri `
        -Headers @{ Authorization = "brukere API-Key $key" } `
        -ContentType 'text/csv; charset=utf-8' `
        -InFile $file
    Write-Output "Accepted: import run $($result.importRunId), $($result.rows) units"
}
catch {
    # A 400 response lists every error in the file.
    Write-Error "ilag refused the file: $($_.ErrorDetails.Message)"
    exit 1
}
```
