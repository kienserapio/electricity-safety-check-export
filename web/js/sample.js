/**
 * A fully populated sample certificate.
 *
 * Filling the real form takes a few minutes, which makes it awkward to show
 * someone the register, the certificate page and the PDF. This writes one
 * complete record so all three have something to display.
 *
 * Offered only when certificates are kept in the browser — there is no reason
 * to seed fiction into a real database.
 */

import { CHECKLIST } from './catalog.js'
import { addYears, todayDateOnly } from './dates.js'
import { createSafetyCheck } from './db.js'
import { validateSafetyCheck } from './validate.js'

const ADDRESSES = [
  '14 Ballarat Road, Footscray VIC 3011',
  '221B Sydney Road, Brunswick VIC 3056',
  '7/58 Nicholson Street, Coburg VIC 3058',
  '92 Geelong Road, Seddon VIC 3011',
  '3 Rosamond Road, Maidstone VIC 3012',
]

const ELECTRICIANS = [
  { name: 'Brandon Ferry', licence: 'REC 35346' },
  { name: 'Alicia Nguyen', licence: 'REC 41882' },
  { name: 'Marcus Whitfield', licence: 'REC 28104' },
]

/** Draws a plausible signature so the PDF has something real to embed. */
function drawSignature(name) {
  const canvas = document.createElement('canvas')
  canvas.width = 420
  canvas.height = 130

  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = '#1c2430'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Seed the wobble from the name so each electrician signs consistently.
  let seed = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0)
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }

  ctx.beginPath()
  ctx.moveTo(24, 90)
  let x = 24
  while (x < 380) {
    const step = 26 + next() * 22
    const peak = 30 + next() * 45
    ctx.quadraticCurveTo(x + step / 2, peak, x + step, 70 + next() * 30)
    x += step
  }
  ctx.stroke()

  // The trailing flourish most signatures end on.
  ctx.beginPath()
  ctx.moveTo(30, 104)
  ctx.quadraticCurveTo(200, 118, 360, 96)
  ctx.lineWidth = 1.6
  ctx.stroke()

  return canvas.toDataURL('image/png')
}

/**
 * Answers every checklist line, mostly checked, with a scattering of N/A and NI
 * so the three states are all visible on the certificate.
 */
function checklist() {
  const answers = {}
  for (const section of CHECKLIST) {
    answers[section.section] = {}
    section.items.forEach((item, index) => {
      const every = index % 7
      answers[section.section][item.key] =
        every === 3 ? 'NOT_APPLICABLE' : every === 5 ? 'NOT_INCLUDED' : 'INCLUDED'
    })
  }
  return answers
}

function pick(list, offset) {
  return list[offset % list.length]
}

/**
 * Writes one sample certificate and returns its id.
 *
 * `offset` varies the address, electrician and inspection date so repeated
 * calls build a register worth looking at rather than five identical rows.
 */
export async function addSampleCertificate(offset = 0) {
  const electrician = pick(ELECTRICIANS, offset)
  const inspection = addYears(todayDateOnly(), 0)

  // Walk the inspection back a few days per sample so the register sorts.
  const inspectionDate = new Date(inspection)
  inspectionDate.setUTCDate(inspectionDate.getUTCDate() - offset * 11)
  const inspected = inspectionDate.toISOString().slice(0, 10)

  const failing = offset % 3 === 1

  const payload = {
    address: pick(ADDRESSES, offset),
    previousCheckDate: addYears(inspected, -2),
    checklist: checklist(),
    rcdTests: [
      { circuit: 'Power outlets — kitchen and living', pushButtonTest: 'PASS', timeTest: 'PASS' },
      { circuit: 'Power outlets — bedrooms', pushButtonTest: 'PASS', timeTest: 'PASS' },
      {
        circuit: 'Lighting — ground floor',
        pushButtonTest: failing ? 'FAIL' : 'PASS',
        timeTest: 'PASS',
      },
      { circuit: 'Lighting — upper floor', pushButtonTest: 'PASS', timeTest: 'NA' },
      { circuit: 'Air conditioning', pushButtonTest: 'PASS', timeTest: 'PASS' },
      { circuit: 'Solar inverter isolator', pushButtonTest: 'PASS', timeTest: 'PASS' },
    ],
    smokeAlarmsCompliant: !failing,
    smokeAlarmDueDate: addYears(inspected, 1),
    observations: failing
      ? 'Ground floor lighting RCD did not trip on the push button test and is recommended for ' +
        'replacement before the property is re-let. Hallway smoke alarm is beyond its ten year ' +
        'service life and was not replaced during this visit.'
      : 'No defects found. All circuits tested within tolerance.',
    electricianName: electrician.name,
    licenceNumber: electrician.licence,
    inspectionDate: inspected,
    nextInspectionDue: addYears(inspected, 2),
    signatureImage: drawSignature(electrician.name),
    signedDate: inspected,
  }

  // Sample data goes through the same rules as anything an electrician types,
  // so a sample can never be something the form itself would have rejected.
  const result = validateSafetyCheck(payload)
  if (!result.ok) {
    throw new Error(`The sample certificate is not valid: ${JSON.stringify(result.fieldErrors)}`)
  }

  return createSafetyCheck(result.values)
}
