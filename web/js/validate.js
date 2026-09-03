/**
 * The single validation pass for a safety check.
 *
 * This is the vanilla-JS port of the Zod schema the Next.js version used. It is
 * deliberately kept free of DOM references so the same file can run inside a
 * Supabase Edge Function, where it becomes the copy a caller cannot skip.
 *
 * `validateSafetyCheck(payload)` returns either
 *   { ok: true,  values }                       — trimmed and normalised, or
 *   { ok: false, fieldErrors, formError }       — dotted path -> first message.
 *
 * Dotted paths match the field names used in the form markup, e.g.
 * `address`, `rcdTests.0.circuit`, `checklist.EXTENT.kitchen`.
 */

import { CHECKLIST, CHECKLIST_SECTIONS, ITEM_STATES, TEST_RESULTS } from './catalog.js'
import { DATE_PATTERN, parseDateOnly, todayDateOnly } from './dates.js'

const MAX_SIGNATURE_BYTES = 400_000
const MAX_RCD_ROWS = 60

/** Collects issues, keeping only the first message per path, as Zod did. */
class Issues {
  constructor() {
    this.fieldErrors = {}
  }

  add(path, message) {
    if (path && !(path in this.fieldErrors)) this.fieldErrors[path] = message
  }

  get count() {
    return Object.keys(this.fieldErrors).length
  }
}

function asString(value) {
  return typeof value === 'string' ? value : ''
}

/** Shared shape of every date field: right format, and a day that exists. */
function checkDate(issues, path, value, { optional = false } = {}) {
  const raw = asString(value)
  if (optional && raw === '') return null
  if (!DATE_PATTERN.test(raw)) {
    issues.add(path, 'Use the date picker (YYYY-MM-DD).')
    return null
  }
  const parsed = parseDateOnly(raw)
  if (!parsed) {
    issues.add(path, 'That date does not exist.')
    return null
  }
  return parsed
}

function checkText(issues, path, value, { min, max, minMessage, maxMessage }) {
  const trimmed = asString(value).trim()
  if (min !== undefined && trimmed.length < min) {
    issues.add(path, minMessage)
    return trimmed
  }
  if (max !== undefined && trimmed.length > max) {
    issues.add(path, maxMessage)
  }
  return trimmed
}

export function validateSafetyCheck(payload) {
  const issues = new Issues()
  const input = payload && typeof payload === 'object' ? payload : {}

  // A. Installation address
  const address = checkText(issues, 'address', input.address, {
    min: 1,
    max: 500,
    minMessage: 'Enter the address of the installation.',
    maxMessage: 'Keep the address under 500 characters.',
  })

  const previousCheckDateRaw = asString(input.previousCheckDate)
  const previous = checkDate(issues, 'previousCheckDate', previousCheckDateRaw, { optional: true })

  // B, C and D checklists — every catalogue line must resolve to one of the
  // three states. The statutory form asks the electrician to tick, strike out,
  // or mark NI; leaving a line blank is not one of the options.
  const checklist = {}
  for (const section of CHECKLIST_SECTIONS) {
    checklist[section] = {}
    const definition = CHECKLIST.find((s) => s.section === section)
    const answers = (input.checklist && input.checklist[section]) || {}
    for (const item of definition.items) {
      const state = answers[item.key]
      if (!ITEM_STATES.includes(state)) {
        issues.add(`checklist.${section}.${item.key}`, 'Answer every line in this section.')
        continue
      }
      checklist[section][item.key] = state
    }
  }

  // D. RCD testing
  const rcdInput = Array.isArray(input.rcdTests) ? input.rcdTests : []
  if (rcdInput.length < 1) {
    issues.add('rcdTests', 'Record at least one RCD test.')
  } else if (rcdInput.length > MAX_RCD_ROWS) {
    issues.add('rcdTests', 'Sixty RCD rows is the practical limit for one report.')
  }

  const rcdTests = rcdInput.map((row, index) => {
    const source = row && typeof row === 'object' ? row : {}
    const circuit = checkText(issues, `rcdTests.${index}.circuit`, source.circuit, {
      min: 1,
      max: 200,
      minMessage: 'Name the circuit this RCD protects.',
      maxMessage: 'Keep the circuit name under 200 characters.',
    })
    for (const field of ['pushButtonTest', 'timeTest']) {
      if (!TEST_RESULTS.includes(source[field])) {
        issues.add(`rcdTests.${index}.${field}`, 'Choose a test result.')
      }
    }
    return {
      circuit,
      pushButtonTest: source.pushButtonTest,
      timeTest: source.timeTest,
    }
  })

  // E. Smoke alarms
  const smokeAlarmsCompliant = input.smokeAlarmsCompliant
  if (typeof smokeAlarmsCompliant !== 'boolean') {
    issues.add('smokeAlarmsCompliant', 'Record whether the smoke alarms are compliant.')
  }
  const smokeDue = checkDate(issues, 'smokeAlarmDueDate', input.smokeAlarmDueDate)

  // F. Observations and recommendations
  const observations = asString(input.observations)
  if (observations.length > 5000) {
    issues.add('observations', 'Keep observations under 5000 characters.')
  }

  // G. Certification
  const electricianName = checkText(issues, 'electricianName', input.electricianName, {
    min: 1,
    max: 200,
    minMessage: 'Enter the name of the electrician who completed the check.',
    maxMessage: 'Keep the name under 200 characters.',
  })
  const licenceNumber = checkText(issues, 'licenceNumber', input.licenceNumber, {
    min: 1,
    max: 100,
    minMessage: 'Enter your licence or registration number.',
    maxMessage: 'Keep the licence number under 100 characters.',
  })

  const inspection = checkDate(issues, 'inspectionDate', input.inspectionDate)
  const nextDue = checkDate(issues, 'nextInspectionDue', input.nextInspectionDue)
  const signed = checkDate(issues, 'signedDate', input.signedDate)

  const signatureImage = asString(input.signatureImage)
  if (signatureImage.length === 0) {
    issues.add('signatureImage', 'Sign the certificate before submitting.')
  } else if (!signatureImage.startsWith('data:image/png;base64,')) {
    issues.add('signatureImage', 'The signature could not be read. Clear it and sign again.')
  } else if (signatureImage.length > MAX_SIGNATURE_BYTES) {
    issues.add('signatureImage', 'The signature image is too large. Clear it and sign again.')
  }

  // Cross-field rules. These run on whatever parsed cleanly above, so a bad
  // date reports its own problem rather than a confusing ordering error.
  const today = parseDateOnly(todayDateOnly())

  if (inspection && today && inspection.getTime() > today.getTime()) {
    issues.add('inspectionDate', 'The inspection date cannot be in the future.')
  }

  if (inspection && previous && previous.getTime() >= inspection.getTime()) {
    issues.add('previousCheckDate', 'The previous check must be earlier than this inspection.')
  }

  if (inspection && nextDue && nextDue.getTime() <= inspection.getTime()) {
    issues.add('nextInspectionDue', 'The next inspection must fall after this one.')
  }

  if (inspection && smokeDue && smokeDue.getTime() <= inspection.getTime()) {
    issues.add('smokeAlarmDueDate', 'The smoke alarm check is due after this inspection, not before it.')
  }

  if (inspection && smokeDue) {
    const twelveMonths = new Date(inspection)
    twelveMonths.setUTCFullYear(twelveMonths.getUTCFullYear() + 1)
    if (smokeDue.getTime() > twelveMonths.getTime()) {
      issues.add('smokeAlarmDueDate', 'Smoke alarms must be tested at least every 12 months.')
    }
  }

  if (inspection && signed && signed.getTime() < inspection.getTime()) {
    issues.add('signedDate', 'The certificate cannot be signed before the inspection took place.')
  }

  // A failed RCD or a non-compliant smoke alarm is exactly the situation the
  // observations box exists for, so require it rather than letting a report go
  // out recording a failure and nothing else.
  const hasFailure = rcdTests.some(
    (test) => test.pushButtonTest === 'FAIL' || test.timeTest === 'FAIL',
  )
  if (hasFailure && observations.trim().length === 0) {
    issues.add('observations', 'An RCD failed. Record what was found and what action is recommended.')
  }
  if (smokeAlarmsCompliant === false && observations.trim().length === 0) {
    issues.add('observations', 'Smoke alarms are not compliant. Record what was found and what is recommended.')
  }

  if (issues.count > 0) {
    return {
      ok: false,
      fieldErrors: issues.fieldErrors,
      formError: 'Some answers need attention before this certificate can be issued.',
    }
  }

  return {
    ok: true,
    values: {
      address,
      previousCheckDate: previousCheckDateRaw || null,
      checklist,
      rcdTests,
      smokeAlarmsCompliant,
      smokeAlarmDueDate: asString(input.smokeAlarmDueDate),
      observations,
      electricianName,
      licenceNumber,
      inspectionDate: asString(input.inspectionDate),
      nextInspectionDue: asString(input.nextInspectionDue),
      signatureImage,
      signedDate: asString(input.signedDate),
    },
  }
}
