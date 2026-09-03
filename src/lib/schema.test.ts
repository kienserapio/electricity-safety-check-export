import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CHECKLIST, type ChecklistSection, type ItemState } from './catalog'
import { addYears, parseDateOnly, toDateOnly } from './dates'
import { certificateFilename, certificateReference } from './reference'
import { safetyCheckSchema } from './schema'

function yearsAgo(years: number): string {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() - years)
  return toDateOnly(date)
}

function fullChecklist(state: ItemState = 'INCLUDED') {
  const checklist: Record<string, Record<string, ItemState>> = {}
  for (const section of CHECKLIST) {
    checklist[section.section] ??= {}
    for (const item of section.items) checklist[section.section][item.key] = state
  }
  return checklist as Record<ChecklistSection, Record<string, ItemState>>
}

const INSPECTED = yearsAgo(0)

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    address: '123 Geelong Road, Footscray VIC 3011',
    previousCheckDate: '',
    checklist: fullChecklist(),
    rcdTests: [{ circuit: 'Power outlets', pushButtonTest: 'PASS', timeTest: 'PASS' }],
    smokeAlarmsCompliant: true,
    smokeAlarmDueDate: addYears(INSPECTED, 1),
    observations: '',
    electricianName: 'Brandon Ferry',
    licenceNumber: '35346',
    inspectionDate: INSPECTED,
    nextInspectionDue: addYears(INSPECTED, 2),
    signatureImage: 'data:image/png;base64,iVBORw0KGgo=',
    signedDate: INSPECTED,
    ...overrides,
  }
}

/** The first message reported against a given field path, or undefined. */
function issueFor(payload: unknown, path: string) {
  const result = safetyCheckSchema.safeParse(payload)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message
}

describe('safetyCheckSchema', () => {
  it('accepts a complete report', () => {
    const result = safetyCheckSchema.safeParse(validPayload())
    assert.equal(result.success, true, JSON.stringify(result.error?.issues, null, 2))
  })

  it('rejects a report with an unanswered checklist line', () => {
    const checklist = fullChecklist()
    delete (checklist.EXTENT as Record<string, unknown>).kitchen
    assert.ok(issueFor(validPayload({ checklist }), 'checklist.EXTENT.kitchen'))
  })

  it('rejects a report with no RCD tests', () => {
    assert.equal(
      issueFor(validPayload({ rcdTests: [] }), 'rcdTests'),
      'Record at least one RCD test.',
    )
  })

  it('rejects an RCD row with no circuit name', () => {
    const rcdTests = [{ circuit: '   ', pushButtonTest: 'PASS', timeTest: 'PASS' }]
    assert.ok(issueFor(validPayload({ rcdTests }), 'rcdTests.0.circuit'))
  })

  it('requires observations when an RCD fails', () => {
    const rcdTests = [{ circuit: 'Garage', pushButtonTest: 'FAIL', timeTest: 'PASS' }]
    assert.match(
      issueFor(validPayload({ rcdTests }), 'observations') ?? '',
      /An RCD failed/,
    )
  })

  it('requires observations when smoke alarms are not compliant', () => {
    assert.match(
      issueFor(validPayload({ smokeAlarmsCompliant: false }), 'observations') ?? '',
      /Smoke alarms are not compliant/,
    )
  })

  it('rejects an inspection date in the future', () => {
    const future = addYears(INSPECTED, 1)
    assert.match(
      issueFor(validPayload({ inspectionDate: future }), 'inspectionDate') ?? '',
      /cannot be in the future/,
    )
  })

  it('rejects a next inspection that falls before this one', () => {
    assert.match(
      issueFor(validPayload({ nextInspectionDue: yearsAgo(1) }), 'nextInspectionDue') ?? '',
      /must fall after this one/,
    )
  })

  it('rejects a smoke alarm check more than twelve months out', () => {
    assert.match(
      issueFor(validPayload({ smokeAlarmDueDate: addYears(INSPECTED, 2) }), 'smokeAlarmDueDate') ??
        '',
      /at least every 12 months/,
    )
  })

  it('rejects a previous check dated after this inspection', () => {
    assert.ok(
      issueFor(validPayload({ previousCheckDate: addYears(INSPECTED, 1) }), 'previousCheckDate'),
    )
  })

  it('rejects a missing signature', () => {
    assert.equal(
      issueFor(validPayload({ signatureImage: '' }), 'signatureImage'),
      'Sign the certificate before submitting.',
    )
  })

  it('rejects a signature that is not a PNG data URL', () => {
    assert.ok(issueFor(validPayload({ signatureImage: 'Brandon Ferry' }), 'signatureImage'))
  })

  it('rejects a calendar date that does not exist', () => {
    assert.ok(issueFor(validPayload({ signedDate: '2026-02-30' }), 'signedDate'))
  })
})

describe('date helpers', () => {
  it('parses a valid calendar date at UTC midnight', () => {
    const parsed = parseDateOnly('2026-02-11')
    assert.equal(parsed?.toISOString(), '2026-02-11T00:00:00.000Z')
  })

  it('rejects a day that does not exist in the month', () => {
    assert.equal(parseDateOnly('2026-02-30'), null)
    assert.equal(parseDateOnly('11-02-2026'), null)
  })

  it('adds years without drifting across a timezone boundary', () => {
    assert.equal(addYears('2026-02-11', 2), '2028-02-11')
  })
})

describe('certificate reference', () => {
  it('pads the serial and uses the inspection year', () => {
    assert.equal(certificateReference(42, parseDateOnly('2026-02-11')!), 'ESC-2026-000042')
  })

  it('builds a filename that names the certificate and the property', () => {
    assert.equal(
      certificateFilename('ESC-2026-000042', '123 Geelong Road, Footscray VIC 3011'),
      'ESC-2026-000042-123-geelong-road-footscray-vic-3011.pdf',
    )
  })

  it('falls back to the reference alone when the address has no usable characters', () => {
    assert.equal(certificateFilename('ESC-2026-000042', '—'), 'ESC-2026-000042.pdf')
  })
})
