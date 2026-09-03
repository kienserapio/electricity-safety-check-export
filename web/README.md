# Electrical Safety Check — static build

Issues and archives Electrical Safety Check reports under the Victorian
Residential Tenancies Regulations 2021 and AS/NZS 3019.

Plain HTML, CSS and JavaScript. **No build step, no npm, no Node on the
server** — upload the files and they run. Everything in this folder is what
goes into `public_html`.

## Two storage modes

`STORAGE` in `js/config.js` decides where certificates go. Everything else in
the app is identical either way.

| | `'local'` (default) | `'supabase'` |
| --- | --- | --- |
| Setup | **None** | A project, plus `sql/schema.sql` |
| Where certificates live | The visitor's own browser | Postgres |
| Shared between people | No | Yes |
| Shared between devices | No | Yes |
| Survives clearing site data | **No** | Yes |
| Cost | Free | Supabase pricing |
| Good for | Demonstrating, trying the form | Actual use |

`'local'` mode is fully working software, not a stub — the register, search,
certificate pages and PDFs all behave exactly as they will in production. It
just keeps the data in one browser. Every page shows an amber banner saying so,
because a demo that looks like the real thing is the one way this app could
mislead someone.

## Running it now, with no database

Upload this folder's contents to `public_html` and open `index.html`. That is
the whole deployment — local mode needs nothing else.

To try it on your own machine first, serve the folder rather than
double-clicking the file. The pages use ES modules, which browsers refuse to
load from a `file://` path:

```bash
cd web
python3 -m http.server 8000     # then open http://localhost:8000
```

Then:

1. Set `ORGANISATION_NAME` in `js/config.js` if you want your own name on the
   certificate.
2. On an empty register, **Add sample certificates** seeds four complete
   records so you can see the register, a certificate page and the PDF without
   filling the form. Sample data goes through the same validation as anything
   an electrician types.

## Switching to Supabase later

1. **Create the database.** In Supabase, open the SQL editor and run
   `sql/schema.sql` once. It creates the three tables, the write function and
   the row level security policies.

2. **Edit `js/config.js`.** Set `STORAGE = 'supabase'`, then fill in the
   project URL and the anon key (Project Settings → API).

   > The anon key is meant to be public. Row level security decides what it can
   > do. Never put the `service_role` key here — it bypasses every policy.

3. **Re-upload `js/config.js`.** Nothing else changes.

Certificates already sitting in someone's browser do **not** move across. There
is no import path, so switch before real certificates are issued — or treat the
browser-stored ones as throwaway.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Register of every certificate issued, with search |
| `new.html` | The safety check form |
| `check.html` | One stored certificate — `check.html?id=…` |
| `js/config.js` | **The only file you edit.** Storage mode, Supabase keys, organisation name |
| `js/catalog.js` | Statutory checklist content — sections, wording, line items |
| `js/validate.js` | Every validation rule |
| `js/pdf.js` | Certificate PDF, drawn in the browser |
| `js/db.js` | Picks a storage backend; the pages talk only to this |
| `js/store-local.js` | IndexedDB backend — no setup, browser-only |
| `js/store-supabase.js` | Postgres backend — loaded only when selected |
| `js/sample.js` | Builds sample certificates for the empty register |
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

`js/db.js` picks a backend and re-exports three functions. Both backends return
identically shaped records, so no page — and neither the PDF nor the register —
knows which one is behind it. The Supabase module is loaded with a dynamic
import, so a local build never fetches the client library from a CDN.

`js/pdf.js` draws the certificate. Tick marks are vector paths rather than
symbol-font glyphs, so they render identically in every PDF viewer and at every
zoom level, and survive text extraction.

`pdf-lib` loads from a CDN for the PDF. `supabase-js` loads only when
`STORAGE` is `'supabase'`. In local mode those are the only two network
requests the app makes, and the second one never fires.

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

In **`'supabase'`** mode, `js/validate.js` runs in the browser for instant
feedback and is not the only copy: certificates are written through the
`create_safety_check()` database function, and the tables refuse direct
inserts, so a caller posting straight at the REST API still meets the date
ordering, the twelve-month smoke alarm cap, the RCD row limits and the
"a failure needs an observation" rule.

In **`'local'`** mode `js/validate.js` is the only gate, because there is no
server to hold a second copy. Anyone willing to open the developer console can
write whatever they like into their own browser. That is one more reason local
mode is for demonstrating rather than for keeping records.

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
