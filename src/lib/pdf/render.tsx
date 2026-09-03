import 'server-only'

import { renderToBuffer } from '@react-pdf/renderer'

import type { ChecklistSection, ItemState } from '@/lib/catalog'
import { ORGANISATION_NAME } from '@/lib/catalog'
import type { SafetyCheckRecord } from '@/lib/queries'
import { certificateReference } from '@/lib/reference'

import { SafetyCheckDocument, type CertificateData } from './SafetyCheckDocument'

/** Reshapes a stored record into the flat view model the document renders. */
export function toCertificateData(record: SafetyCheckRecord): CertificateData {
  const checklist = {} as Record<ChecklistSection, Record<string, ItemState>>
  for (const entry of record.checklist) {
    const section = entry.section as ChecklistSection
    checklist[section] ??= {}
    checklist[section][entry.itemKey] = entry.state as ItemState
  }

  return {
    reference: certificateReference(record.serial, record.inspectionDate),
    organisation: ORGANISATION_NAME,
    address: record.address,
    previousCheckDate: record.previousCheckDate,
    checklist,
    rcdTests: record.rcdTests.map((test) => ({
      circuit: test.circuit,
      pushButtonTest: test.pushButtonTest,
      timeTest: test.timeTest,
    })),
    smokeAlarmsCompliant: record.smokeAlarmsCompliant,
    smokeAlarmDueDate: record.smokeAlarmDueDate,
    observations: record.observations,
    electricianName: record.electricianName,
    licenceNumber: record.licenceNumber,
    inspectionDate: record.inspectionDate,
    nextInspectionDue: record.nextInspectionDue,
    signatureImage: record.signatureImage,
    signedDate: record.signedDate,
  }
}

export async function renderCertificate(record: SafetyCheckRecord): Promise<Buffer> {
  return renderToBuffer(<SafetyCheckDocument data={toCertificateData(record)} />)
}
