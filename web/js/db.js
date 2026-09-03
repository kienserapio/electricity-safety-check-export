/**
 * Picks the storage backend and hands the pages one interface.
 *
 * `STORAGE` in config.js decides. Both backends expose the same three
 * functions and return the same shapes, so no page knows the difference:
 *
 *   store-local.js     IndexedDB in the visitor's browser. No setup.
 *   store-supabase.js  Postgres. Needs a project and the schema applied.
 *
 * The Supabase module is imported only when it is selected, so a local build
 * never fetches the client library from a CDN.
 */

import { STORAGE } from './config.js'
import * as local from './store-local.js'

const backend = STORAGE === 'supabase' ? await import('./store-supabase.js') : local

/** Whether writes survive leaving this browser. False for the local backend. */
export const isDurable = backend.isDurable

/** Human-readable name of the backend in use, for the on-screen banner. */
export const storageLabel = backend.label

export function isConfigured() {
  return backend.isConfigured()
}

export function createSafetyCheck(values) {
  return backend.createSafetyCheck(values)
}

export function listSafetyChecks(search) {
  return backend.listSafetyChecks(search)
}

export function getSafetyCheck(id) {
  return backend.getSafetyCheck(id)
}

/** Only present on the local backend; the register uses it to offer a sample. */
export const exportAll = local.exportAll
