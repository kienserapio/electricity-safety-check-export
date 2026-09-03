# Electrical Safety Check

Issues and archives Electrical Safety Check reports under the Victorian
Residential Tenancies Regulations 2021 and AS/NZS 3019.

A licenced electrician fills in the check on site, signs it, and the app stores
the record and produces the PDF certificate that goes to the rental provider.

This replaces `electric-safety-check (1).php`, which is kept in this directory
for reference along with a sample of the old TCPDF export (`Invoices-4.pdf`).

## Stack

| Piece      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19 + TypeScript      |
| Validation | Zod 4, shared by the browser and the server action   |
| Forms      | React Hook Form                                      |
| Database   | PostgreSQL via Prisma 7                              |
| PDF        | `@react-pdf/renderer`, rendered in a route handler   |
| Styling    | Tailwind CSS 4                                       |

## Getting started

```bash
npm install
cp .env.example .env          # then point DATABASE_URL at your Postgres
npm run db:migrate            # creates the schema
npm run dev                   # http://localhost:3000
```

`npm run preview:pdf` writes a fully populated sample certificate to
`preview-certificate.pdf` without needing a database — useful when working on
the export.

## Routes

| Route                  | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `/`                    | Register of every certificate issued, with search           |
| `/checks/new`          | The safety check form                                       |
| `/checks/[id]`         | A stored certificate                                        |
| `/checks/[id]/pdf`     | The PDF, inline; add `?download=1` to save it               |

## How the pieces fit together

`src/lib/catalog.ts` holds the statutory checklist content — every section, its
preamble, and its line items. The form, the validation schema and the PDF all
read from it, so a wording change lands in one place and cannot leave the export
out of step with the form.

`src/lib/schema.ts` is the only validation schema. The browser runs it for
instant feedback and the server action runs it again before writing, so a
submission that skips the browser cannot store an incomplete certificate.

`src/lib/pdf/` renders the certificate. Tick marks are vector paths rather than
symbol-font glyphs, so they render identically in every PDF viewer and at every
zoom level.

## Checklist states

The statutory form asks the electrician to tick items included in the check,
strike out items that are not applicable, and mark NI against items not
inspected. Each line therefore records one of three states rather than a
checkbox:

| State            | On screen | On the certificate                    |
| ---------------- | --------- | ------------------------------------- |
| `INCLUDED`       | Checked   | Ticked box                            |
| `NOT_APPLICABLE` | N/A       | Empty box, label struck through       |
| `NOT_INCLUDED`   | NI        | Empty box, labelled NI                |

Every line must be answered before a certificate can be issued. The per-section
"Mark all checked" and "Rest N/A" buttons make that quick.

## Dates

Regulation intervals are applied as defaults and enforced on submit: the next
electrical check defaults to two years after the inspection, and the smoke alarm
check to twelve months, which is also the maximum the schema will accept.

## Tests

```bash
npm test        # validation rules, date handling, certificate references
npm run typecheck
```

## Notes for deployment

- The PDF route sets `runtime = 'nodejs'`; `@react-pdf/renderer` needs Node
  streams and will not run on the edge.
- Certificate references are `ESC-<inspection year>-<zero-padded serial>` and are
  derived from the record, not stored, so they cannot drift.
- There is no authentication yet. See "Known gaps" below.

## Known gaps

- **No authentication or authorisation.** Anyone who can reach the app can issue
  a certificate in an electrician's name. This matched the PHP version's
  behaviour and was left as-is because the right answer depends on how the team
  handles identity elsewhere.
- **Certificates cannot be edited or voided** once issued — appropriate for a
  legal record, but there is no supersede/reissue flow yet.
- **No migration of existing PHP records.** The old `safety` table stored ten
  fixed RCD slots and checkbox labels as free text; importing it would need a
  mapping pass, including the `Celling fans` → `Ceiling fans` spelling fix.
