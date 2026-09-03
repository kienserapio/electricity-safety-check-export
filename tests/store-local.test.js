/**
 * The browser-local store's fallback tiers.
 *
 * Node has no IndexedDB, which is exactly the condition a page opened from a
 * `file://` path hits, so importing the store here exercises the fallback path
 * for free. localStorage is stubbed to check the middle tier, and removed to
 * check the last one.
 */

import assert from 'node:assert/strict'
import { describe, it, before } from 'node:test'

/** Minimal localStorage, enough for the store's probe-then-use pattern. */
function stubLocalStorage({ failWrites = false } = {}) {
  const map = new Map()
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (failWrites && !k.endsWith('.probe')) {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      }
      map.set(k, String(v))
    },
    removeItem: (k) => map.delete(k),
  }
  return map
}

const CERTIFICATE = {
  address: '14 Ballarat Road, Footscray VIC 3011',
  previousCheckDate: null,
  checklist: { EXTENT: { kitchen: 'INCLUDED' } },
  rcdTests: [{ circuit: 'Power outlets', pushButtonTest: 'PASS', timeTest: 'PASS' }],
  smokeAlarmsCompliant: true,
  smokeAlarmDueDate: '2027-02-11',
  observations: '',
  electricianName: 'Brandon Ferry',
  licenceNumber: 'REC 35346',
  inspectionDate: '2026-02-11',
  nextInspectionDue: '2028-02-11',
  signatureImage: 'data:image/png;base64,iVBORw0KGgo=',
  signedDate: '2026-02-11',
}

describe('store-local fallback', () => {
  let store

  before(async () => {
    stubLocalStorage()
    store = await import('../web/js/store-local.js')
  })

  it('reports itself as never durable', () => {
    assert.equal(store.isDurable, false)
  })

  it('needs no configuration', () => {
    assert.equal(store.isConfigured(), true)
  })

  it('falls back when IndexedDB is missing, and still persists', async () => {
    const id = await store.createSafetyCheck({ ...CERTIFICATE })
    assert.ok(id)
    assert.equal(store.fallback.active, true)
    assert.equal(store.fallback.persists, true)
  })

  it('reads back what it wrote', async () => {
    const id = await store.createSafetyCheck({ ...CERTIFICATE, address: '9 Test Street' })
    const record = await store.getSafetyCheck(id)
    assert.equal(record.address, '9 Test Street')
    // Dates come back as Dates, matching the Postgres backend's shape.
    assert.ok(record.inspectionDate instanceof Date)
    assert.equal(record.inspectionDate.toISOString().slice(0, 10), '2026-02-11')
  })

  it('allocates serials that do not collide', async () => {
    const before = await store.count()
    await store.createSafetyCheck({ ...CERTIFICATE })
    await store.createSafetyCheck({ ...CERTIFICATE })
    const rows = await store.listSafetyChecks()
    const serials = rows.map((r) => r.serial)
    assert.equal(new Set(serials).size, serials.length)
    assert.equal(await store.count(), before + 2)
  })

  it('searches address, electrician and licence', async () => {
    await store.createSafetyCheck({
      ...CERTIFICATE,
      address: '1 Needle Lane',
      electricianName: 'Haystack Hannah',
      licenceNumber: 'REC 00001',
    })
    assert.equal((await store.listSafetyChecks('needle')).length, 1)
    assert.equal((await store.listSafetyChecks('haystack')).length, 1)
    assert.equal((await store.listSafetyChecks('REC 00001')).length, 1)
    assert.equal((await store.listSafetyChecks('no-such-thing')).length, 0)
  })

  it('returns null for an unknown id rather than throwing', async () => {
    assert.equal(await store.getSafetyCheck('not-a-real-id'), null)
  })

  it('exports every stored certificate as JSON', async () => {
    const parsed = JSON.parse(await store.exportAll())
    assert.ok(Array.isArray(parsed.certificates))
    assert.ok(parsed.certificates.length > 0)
    assert.ok(parsed.exported)
  })
})

describe('store-local with no storage at all', () => {
  it('keeps working in memory when localStorage refuses writes', async () => {
    stubLocalStorage({ failWrites: true })
    // A fresh module instance, so the shelf re-probes against the new stub.
    const store = await import(`../web/js/store-local.js?nostorage=${Date.now()}`)

    const id = await store.createSafetyCheck({ ...CERTIFICATE })
    const record = await store.getSafetyCheck(id)

    assert.ok(record, 'the write still resolved and can be read back this session')
    assert.equal(store.fallback.persists, false, 'and it admits nothing is persisted')
  })
})
