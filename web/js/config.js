/**
 * The only file you need to edit.
 *
 * Out of the box this runs entirely in the browser with no database, so you can
 * open the pages and use them immediately. Switch STORAGE to 'supabase' once a
 * real project exists.
 */

/**
 * 'local'    — IndexedDB in the visitor's own browser. No account, no setup.
 *              Certificates live in that one browser only: they are not shared
 *              between people or devices, and clearing site data erases them.
 *              Fine for demonstrating and for trying the form. Not a record.
 *
 * 'supabase' — Postgres, shared by everyone who opens the site. Run
 *              sql/schema.sql in the Supabase SQL editor, then fill in the two
 *              values below.
 */
export const STORAGE = 'local'

/**
 * Only read when STORAGE is 'supabase'. Both are safe to publish: the anon key
 * is designed to sit in a public page, and row level security in sql/schema.sql
 * is what decides who can read and write. Never paste the service_role key
 * here — that one bypasses every policy.
 *
 * Supabase → Project Settings → API.
 */
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY'

/** Printed on the certificate and in the page header. */
export const ORGANISATION_NAME = 'Colney & Co'
