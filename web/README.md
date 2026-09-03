# Electrical Safety Check — static build

Issues and archives Electrical Safety Check reports under the Victorian
Residential Tenancies Regulations 2021 and AS/NZS 3019.

Plain HTML, CSS and JavaScript. **No build step, no npm, no Node on the
server** — upload the files and they run. Everything in this folder is what
goes into `public_html`.

## Deploying to HostGator

1. **Create the database.** In Supabase, open the SQL editor and run
   `sql/schema.sql` once. It creates the three tables, the write function and
   the row level security policies.

2. **Fill in `js/config.js`.** Three values: your Supabase project URL, the
   anon key (Project Settings → API), and the organisation name that prints on
   the certificate.

   > The anon key is meant to be public. Row level security decides what it can
   > do. Never put the `service_role` key here — it bypasses every policy.

3. **Upload.** Drag the contents of this folder into `public_html` via cPanel
   File Manager or FTP. Do not upload `sql/` — it is only needed once, in
   Supabase.

4. **Open `index.html`.** If the register loads, you are done.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Register of every certificate issued, with search |
| `new.html` | The safety check form |
| `check.html` | One stored certificate — `check.html?id=…` |
| `js/config.js` | **The only file you edit.** Supabase keys, organisation name |
| `js/catalog.js` | Statutory checklist content — sections, wording, line items |
| `js/validate.js` | Every validation rule |
| `js/pdf.js` | Certificate PDF, drawn in the browser |
| `js/db.js` | Everything that talks to Supabase |
| `js/dates.js` `js/reference.js` | Date handling, certificate references |
| `js/form.js` `js/register.js` `js/detail.js` | One controller per page |
| `js/signature.js` `js/dom.js` | Signature capture, DOM helpers |
| `sql/schema.sql` | Database schema — run once in Supabase, do not upload |

## How the pieces fit together

`js/catalog.js` holds the statutory checklist content — every section, its
preamble, and its line items. The form, the validation and the PDF all read
from it, so a wording change lands in one place and cannot leave the
certificate out of step with the form.

`js/validate.js` holds every rule and touches no DOM, so the same file can be
dropped into a Supabase Edge Function later without change. See "Known gaps".

`js/pdf.js` draws the certificate. Tick marks are vector paths rather than
symbol-font glyphs, so they render identically in every PDF viewer and at every
zoom level, and survive text extraction.

Two libraries load from CDN — `pdf-lib` for the PDF and `supabase-js` for the
database. Nothing else is fetched.

## Checklist states

The statutory form asks the electrician to tick items included in the check,
strike out items that are not applicable, and mark NI against items not
inspected. Each line therefore records one of three states rather than a
checkbox:

| State | On screen | On the certificate |
| --- | --- | --- |
| `INCLUDED` | Checked | Ticked box |
| `NOT_APPLICABLE` | N/A | Empty box, label struck through |
| `NOT_INCLUDED` | NI | Empty box, labelled NI |

Every line must be answered before a certificate can be issued. The per-section
"Mark all checked" and "Rest N/A" buttons make that quick.

## Dates

Regulation intervals are applied as defaults and enforced on submit: the next
electrical check defaults to two years after the inspection, and the smoke alarm
check to twelve months, which is also the maximum the rules will accept. The
defaults track the inspection date until the electrician edits one by hand.

## Tests

Validation, date handling and certificate references are covered by
`tests/validate.test.js` in the parent folder. Node is used to run them; it is
not needed to host or to build.

```bash
node --test tests/validate.test.js
```

## Where the rules are enforced

`js/validate.js` runs in the browser for instant feedback. It is not the only
copy: certificates are written through the `create_safety_check()` database
function, and the tables refuse direct inserts, so a caller posting straight at
the REST API still meets the date ordering, the twelve-month smoke alarm cap,
the RCD row limits and the "a failure needs an observation" rule.

## Known gaps

- **No authentication.** Anyone who can reach the page can issue a certificate
  in an electrician's name. This matched the PHP version's behaviour and was
  left as-is because the right answer depends on how the team handles identity
  elsewhere. Add Supabase Auth and tighten the RLS policies when that is decided.
- **Certificates cannot be edited or voided** once issued — appropriate for a
  legal record, but there is no supersede/reissue flow yet. The schema defines
  no update or delete policy at all, so this is enforced, not merely absent.
- **No migration of existing PHP records.** The old `safety` table stored ten
  fixed RCD slots and checkbox labels as free text; importing it would need a
  mapping pass, including the `Celling fans` → `Ceiling fans` spelling fix.
- **The register reads without a key check.** Any visitor can list every
  certificate. Same authentication decision as above.
