/**
 * Renders a fully populated certificate to ./preview-certificate.pdf so the
 * export can be checked without a database or a running server.
 *
 *   npx tsx scripts/preview-certificate.tsx
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { renderToBuffer } from '@react-pdf/renderer'

import { CHECKLIST, type ChecklistSection, type ItemState } from '../src/lib/catalog'
import { parseDateOnly } from '../src/lib/dates'
import {
  SafetyCheckDocument,
  type CertificateData,
} from '../src/lib/pdf/SafetyCheckDocument'

// A generated handwriting-like stroke, so the signature placement in the PDF
// can be checked without capturing a real one.
const SAMPLE_SIGNATURE =
  'data:image/png;base64,' +
  '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'

function everyItem(state: ItemState) {
  const checklist = {} as Record<ChecklistSection, Record<string, ItemState>>
  for (const section of CHECKLIST) {
    checklist[section.section] ??= {}
    for (const item of section.items) {
      checklist[section.section][item.key] = state
    }
  }
  return checklist
}

const checklist = everyItem('INCLUDED')
// Exercise all three states so the marks and the struck-out labels are visible.
checklist.EXTENT.swimming_pool_equipment = 'NOT_APPLICABLE'
checklist.EXTENT.solar_battery_system = 'NOT_APPLICABLE'
checklist.EXTENT.garage = 'NOT_INCLUDED'
checklist.VISUAL_INSPECTION.vehicle_chargers = 'NOT_APPLICABLE'
checklist.VISUAL_INSPECTION.installation_wiring = 'NOT_INCLUDED'
checklist.POLARITY.swimming_pool_equipment = 'NOT_APPLICABLE'
checklist.EARTH_CONTINUITY.ceiling_fans = 'NOT_INCLUDED'

const data: CertificateData = {
  reference: 'ESC-2026-000042',
  organisation: 'Colney & Co',
  address: '123 Geelong Road, Footscray VIC 3011',
  previousCheckDate: parseDateOnly('2024-02-11'),
  checklist,
  rcdTests: [
    { circuit: 'Power outlets — kitchen and laundry', pushButtonTest: 'PASS', timeTest: 'PASS' },
    { circuit: 'Power outlets — bedrooms', pushButtonTest: 'PASS', timeTest: 'PASS' },
    { circuit: 'Power outlets — garage', pushButtonTest: 'FAIL', timeTest: 'FAIL' },
    { circuit: 'Lighting — ground floor', pushButtonTest: 'PASS', timeTest: 'PASS' },
    { circuit: 'Lighting — first floor', pushButtonTest: 'PASS', timeTest: 'PASS' },
    { circuit: 'Air conditioning', pushButtonTest: 'PASS', timeTest: 'NA' },
    { circuit: 'Solar inverter isolator', pushButtonTest: 'PASS', timeTest: 'PASS' },
    { circuit: 'EV charger', pushButtonTest: 'NA', timeTest: 'NA' },
  ],
  smokeAlarmsCompliant: true,
  smokeAlarmDueDate: parseDateOnly('2027-02-10')!,
  observations:
    'The RCD protecting the garage power outlets failed both the push button and time tests and ' +
    'has been isolated. Replacement of the device is required before the circuit is re-energised. ' +
    'All remaining circuits tested satisfactorily.',
  electricianName: 'Brandon Ferry',
  licenceNumber: '35346',
  inspectionDate: parseDateOnly('2026-02-11')!,
  nextInspectionDue: parseDateOnly('2028-02-11')!,
  signatureImage: SAMPLE_SIGNATURE,
  signedDate: parseDateOnly('2026-02-11')!,
}

const outputPath = process.argv[2] ?? resolve(process.cwd(), 'preview-certificate.pdf')

const buffer = await renderToBuffer(<SafetyCheckDocument data={data} />)
writeFileSync(outputPath, buffer)
console.log(`Wrote ${outputPath} (${(buffer.byteLength / 1024).toFixed(1)} kB)`)
