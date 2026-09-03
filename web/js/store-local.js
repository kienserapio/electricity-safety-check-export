/**
 * Browser-local storage, for running the app with no database behind it.
 *
 * Backed by IndexedDB rather than localStorage: a signature PNG runs to a few
 * hundred kilobytes, and localStorage's ~5 MB ceiling would hold barely a dozen
 * certificates before throwing.
 *
 * Certificates written here live in one browser on one machine. Nothing is
 * shared, backed up, or visible to anyone else — see `isDurable` below, which
 * the pages use to say so on screen.
 */

import { parseDateOnly } from './dates.js'

const DB_NAME = 'electrical-safety-check'
const DB_VERSION = 1
const STORE = 'certificates'
const META = 'meta'

export const isDurable = false
export const label = 'browser storage'

let connection = null

function open() {
  if (connection) return connection

  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new Error('This browser refused access to local storage. Private browsing can do this.'))
  })

  return connection
}

/** Wraps an IndexedDB request in a promise. */
function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Local storage request failed.'))
  })
}

/** Always true — there is nothing to configure. */
export function isConfigured() {
  return true
}

/**
 * Writes a certificate and returns its id.
 *
 * The serial is allocated inside the same transaction as the insert, so two
 * certificates issued in quick succession cannot collide on a reference.
 */
export async function createSafetyCheck(values) {
  const db = await open()

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE, META], 'readwrite')
    const meta = tx.objectStore(META)
    const store = tx.objectStore(STORE)
    let id

    const read = meta.get('serial')
    read.onsuccess = () => {
      const serial = (read.result || 0) + 1
      meta.put(serial, 'serial')

      id = crypto.randomUUID()
      store.put({
        ...values,
        id,
        serial,
        createdAt: new Date().toISOString(),
      })
    }

    tx.oncomplete = () => resolve(id)
    tx.onerror = () =>
      reject(new Error(tx.error?.message || 'The certificate could not be written to this browser.'))
    tx.onabort = () =>
      reject(new Error(tx.error?.message || 'The write was aborted before anything was stored.'))
  })
}

/** Register rows, newest inspection first. `search` matches address, name or licence. */
export async function listSafetyChecks(search) {
  const db = await open()
  const rows = await wrap(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())

  const term = (search || '').trim().toLowerCase()
  const matches = term
    ? rows.filter((row) =>
        [row.address, row.electricianName, row.licenceNumber]
          .some((value) => String(value || '').toLowerCase().includes(term)),
      )
    : rows

  return matches
    .sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))
    .slice(0, 100)
    .map(toSummary)
}

/** Everything the certificate page and the PDF need. */
export async function getSafetyCheck(id) {
  const db = await open()
  const row = await wrap(db.transaction(STORE, 'readonly').objectStore(STORE).get(id))
  return row ? toRecord(row) : null
}

/** Used by the register's sample-data affordance. */
export async function count() {
  const db = await open()
  return wrap(db.transaction(STORE, 'readonly').objectStore(STORE).count())
}

function toSummary(row) {
  return {
    id: row.id,
    serial: row.serial,
    address: row.address,
    electricianName: row.electricianName,
    inspectionDate: parseDateOnly(row.inspectionDate),
    nextInspectionDue: parseDateOnly(row.nextInspectionDue),
    smokeAlarmsCompliant: row.smokeAlarmsCompliant,
  }
}

/** Dates are stored as YYYY-MM-DD strings, exactly as the Postgres path stores them. */
function toRecord(row) {
  return {
    id: row.id,
    serial: row.serial,
    address: row.address,
    previousCheckDate: row.previousCheckDate ? parseDateOnly(row.previousCheckDate) : null,
    checklist: row.checklist,
    rcdTests: row.rcdTests,
    smokeAlarmsCompliant: row.smokeAlarmsCompliant,
    smokeAlarmDueDate: parseDateOnly(row.smokeAlarmDueDate),
    observations: row.observations,
    electricianName: row.electricianName,
    licenceNumber: row.licenceNumber,
    inspectionDate: parseDateOnly(row.inspectionDate),
    nextInspectionDue: parseDateOnly(row.nextInspectionDue),
    signatureImage: row.signatureImage,
    signedDate: parseDateOnly(row.signedDate),
  }
}

/** Everything stored here, as a JSON string — the only backup this mode has. */
export async function exportAll() {
  const db = await open()
  const rows = await wrap(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())
  return JSON.stringify({ exported: new Date().toISOString(), certificates: rows }, null, 2)
}
