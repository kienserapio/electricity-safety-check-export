/**
 * Browser-local storage, for running the app with no database behind it.
 *
 * Three tiers, in order of preference:
 *
 *   IndexedDB      the normal case. No practical size limit.
 *   localStorage   when IndexedDB is refused, which is common for a page
 *                  opened straight off the disk as `file://`. Holds a few
 *                  certificates, not thousands: a signature PNG is a few
 *                  hundred kilobytes against a ~5 MB ceiling.
 *   memory         when both are refused. Dies with the tab.
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

/**
 * Set once the first write or read discovers IndexedDB is unusable.
 *
 * A page opened straight off the disk as `file://` has an opaque origin, and
 * browsers variously restrict or refuse IndexedDB there. Private windows and
 * "block all site data" settings do the same. Rather than showing a broken app,
 * the store drops a tier and the banner reports which one it landed on —
 * `persists` is false only when even localStorage was refused.
 */
export const fallback = { active: false, reason: '', persists: false }

/**
 * Second choice when IndexedDB is unreachable: localStorage, and plain memory
 * if even that is refused.
 *
 * localStorage holds a few certificates rather than thousands — a signature PNG
 * is a few hundred kilobytes against a ~5 MB ceiling — which is why it is not
 * the primary store. As a fallback it is worth having, because it means a file
 * opened straight off the disk still remembers what was issued.
 */
const shelf = (() => {
  const KEY = 'electrical-safety-check.certificates'
  const memory = []
  let usable = false

  try {
    localStorage.setItem(`${KEY}.probe`, '1')
    localStorage.removeItem(`${KEY}.probe`)
    usable = true
  } catch {
    usable = false
  }

  const toMemory = (rows) => {
    memory.length = 0
    memory.push(...rows)
  }

  return {
    get persists() {
      return usable
    },
    read() {
      if (!usable) return memory
      try {
        return JSON.parse(localStorage.getItem(KEY) || '[]')
      } catch {
        return []
      }
    },
    write(rows) {
      if (!usable) return toMemory(rows)
      try {
        localStorage.setItem(KEY, JSON.stringify(rows))
      } catch {
        // Out of quota, most likely. Drop to memory rather than losing the
        // write that is in flight.
        usable = false
        fallback.persists = false
        fallback.reason = 'This browser ran out of local storage space.'
        toMemory(rows)
      }
    },
  }
})()

let connection = null

function open() {
  if (connection) return connection

  connection = new Promise((resolve, reject) => {
    let request
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (error) {
      // Firefox throws outright on a file:// origin rather than failing async.
      reject(new Error(error.message || 'IndexedDB is not available on this page.'))
      return
    }

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
      reject(new Error('This browser refused access to local storage.'))
    request.onblocked = () =>
      reject(new Error('Another tab is holding an older version of the database.'))
  })

  return connection
}

/**
 * Resolves to a database, or null once the fallback has taken over.
 *
 * The first failure is recorded and never retried, so a page opened from disk
 * does not attempt a doomed connection on every keystroke.
 */
async function tryOpen() {
  if (fallback.active) return null

  if (typeof indexedDB === 'undefined') {
    return dropTier('This browser has no IndexedDB.')
  }

  try {
    return await open()
  } catch (error) {
    return dropTier(error.message)
  }
}

/**
 * Records why IndexedDB is out and which tier took over.
 *
 * Both callers must go through here: setting `active` without `persists` once
 * made a browser that had no IndexedDB but a perfectly good localStorage claim
 * it was saving nothing.
 */
function dropTier(reason) {
  fallback.active = true
  fallback.reason = reason
  fallback.persists = shelf.persists
  return null
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
  const db = await tryOpen()

  if (!db) {
    const rows = shelf.read()
    const serial = rows.reduce((max, row) => Math.max(max, row.serial || 0), 0) + 1
    const id = crypto.randomUUID()
    rows.push({ ...values, id, serial, createdAt: new Date().toISOString() })
    shelf.write(rows)
    return id
  }

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
  const db = await tryOpen()
  const rows = db
    ? await wrap(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())
    : shelf.read()

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
  const db = await tryOpen()
  const row = db
    ? await wrap(db.transaction(STORE, 'readonly').objectStore(STORE).get(id))
    : shelf.read().find((candidate) => candidate.id === id)
  return row ? toRecord(row) : null
}

/** Used by the register's sample-data affordance. */
export async function count() {
  const db = await tryOpen()
  if (!db) return shelf.read().length
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
  const db = await tryOpen()
  const rows = db
    ? await wrap(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())
    : shelf.read()
  return JSON.stringify({ exported: new Date().toISOString(), certificates: rows }, null, 2)
}
