import { z } from 'zod'

import {
  CHECKLIST,
  CHECKLIST_SECTIONS,
  ITEM_STATES,
  TEST_RESULTS,
  type ChecklistSection,
} from './catalog'
import { DATE_PATTERN, parseDateOnly, todayDateOnly } from './dates'

/**
 * The single validation schema for a safety check.
 *
 * The browser and the server both run this. The legacy page validated only in
 * the browser, so a submission with JavaScript disabled — or a direct POST —
 * wrote a blank certificate to the database.
 */

const dateOnly = z
  .string()
  .regex(DATE_PATTERN, 'Use the date picker (YYYY-MM-DD).')
  .refine((value) => parseDateOnly(value) !== null, 'That date does not exist.')

/** Blank is a valid answer — a first-ever check has no previous check date. */
const optionalDateOnly = z.union([dateOnly, z.literal('')])

const itemState = z.enum(ITEM_STATES)
const testResult = z.enum(TEST_RESULTS)

/**
 * Every catalogue item must be resolved to one of the three states. The
 * statutory form asks the electrician to tick, strike out, or mark NI — leaving
 * a line blank is not one of the options, and the old checkbox-only form could
 * not tell "not applicable" apart from "not looked at".
 */
const checklistSectionSchema = (section: ChecklistSection) => {
  const keys = CHECKLIST.filter((s) => s.section === section).flatMap((s) =>
    s.items.map((i) => i.key),
  )
  return z.object(Object.fromEntries(keys.map((key) => [key, itemState])) as Record<
    string,
    typeof itemState
  >)
}

export const checklistSchema = z.object(
  Object.fromEntries(
    CHECKLIST_SECTIONS.map((section) => [section, checklistSectionSchema(section)]),
  ) as Record<ChecklistSection, ReturnType<typeof checklistSectionSchema>>,
)

export const rcdTestSchema = z.object({
  circuit: z
    .string()
    .trim()
    .min(1, 'Name the circuit this RCD protects.')
    .max(200, 'Keep the circuit name under 200 characters.'),
  pushButtonTest: testResult,
  timeTest: testResult,
})

export const safetyCheckSchema = z
  .object({
    // A. Installation address
    address: z
      .string()
      .trim()
      .min(1, 'Enter the address of the installation.')
      .max(500, 'Keep the address under 500 characters.'),
    previousCheckDate: optionalDateOnly,

    // B, C, D checklists
    checklist: checklistSchema,

    // D. RCD testing
    rcdTests: z
      .array(rcdTestSchema)
      .min(1, 'Record at least one RCD test.')
      .max(60, 'Sixty RCD rows is the practical limit for one report.'),

    // E. Smoke alarms
    smokeAlarmsCompliant: z.boolean(),
    smokeAlarmDueDate: dateOnly,

    // F. Observations and recommendations
    observations: z.string().max(5000, 'Keep observations under 5000 characters.'),

    // G. Certification
    electricianName: z
      .string()
      .trim()
      .min(1, 'Enter the name of the electrician who completed the check.')
      .max(200),
    licenceNumber: z
      .string()
      .trim()
      .min(1, 'Enter your licence or registration number.')
      .max(100),
    inspectionDate: dateOnly,
    nextInspectionDue: dateOnly,
    signatureImage: z
      .string()
      .min(1, 'Sign the certificate before submitting.')
      .refine(
        (value) => value.startsWith('data:image/png;base64,'),
        'The signature could not be read. Clear it and sign again.',
      )
      .refine(
        (value) => value.length <= 400_000,
        'The signature image is too large. Clear it and sign again.',
      ),
    signedDate: dateOnly,
  })
  .superRefine((value, ctx) => {
    const inspection = parseDateOnly(value.inspectionDate)
    const nextDue = parseDateOnly(value.nextInspectionDue)
    const smokeDue = parseDateOnly(value.smokeAlarmDueDate)
    const previous = value.previousCheckDate ? parseDateOnly(value.previousCheckDate) : null
    const signed = parseDateOnly(value.signedDate)
    const today = parseDateOnly(todayDateOnly())

    if (inspection && today && inspection.getTime() > today.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['inspectionDate'],
        message: 'The inspection date cannot be in the future.',
      })
    }

    if (inspection && previous && previous.getTime() >= inspection.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['previousCheckDate'],
        message: 'The previous check must be earlier than this inspection.',
      })
    }

    if (inspection && nextDue && nextDue.getTime() <= inspection.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['nextInspectionDue'],
        message: 'The next inspection must fall after this one.',
      })
    }

    if (inspection && smokeDue && smokeDue.getTime() <= inspection.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['smokeAlarmDueDate'],
        message: 'The smoke alarm check is due after this inspection, not before it.',
      })
    }

    if (inspection && smokeDue) {
      const twelveMonths = new Date(inspection)
      twelveMonths.setUTCFullYear(twelveMonths.getUTCFullYear() + 1)
      if (smokeDue.getTime() > twelveMonths.getTime()) {
        ctx.addIssue({
          code: 'custom',
          path: ['smokeAlarmDueDate'],
          message: 'Smoke alarms must be tested at least every 12 months.',
        })
      }
    }

    if (inspection && signed && signed.getTime() < inspection.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['signedDate'],
        message: 'The certificate cannot be signed before the inspection took place.',
      })
    }

    // A failed RCD or a non-compliant smoke alarm is exactly the situation the
    // observations box exists for, so require it rather than letting a report go
    // out recording a failure and nothing else.
    const hasFailure = value.rcdTests.some(
      (test) => test.pushButtonTest === 'FAIL' || test.timeTest === 'FAIL',
    )
    if (hasFailure && value.observations.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['observations'],
        message: 'An RCD failed. Record what was found and what action is recommended.',
      })
    }
    if (!value.smokeAlarmsCompliant && value.observations.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['observations'],
        message: 'Smoke alarms are not compliant. Record what was found and what is recommended.',
      })
    }
  })

export type SafetyCheckValues = z.infer<typeof safetyCheckSchema>
export type RcdTestValues = z.infer<typeof rcdTestSchema>
export type ChecklistValues = SafetyCheckValues['checklist']
