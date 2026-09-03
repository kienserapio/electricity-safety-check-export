'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { CHECKLIST_SECTIONS } from './catalog'
import { parseDateOnly } from './dates'
import { prisma } from './prisma'
import { safetyCheckSchema } from './schema'

export interface SubmitResult {
  ok: false
  /** Dotted field path -> first message, ready to hand to react-hook-form. */
  fieldErrors: Record<string, string>
  formError?: string
}

/**
 * Validates and stores a safety check, then redirects to the saved record.
 *
 * Validation runs here as well as in the browser: this is the only copy that a
 * caller cannot skip.
 */
export async function createSafetyCheck(payload: unknown): Promise<SubmitResult> {
  const parsed = safetyCheckSchema.safeParse(payload)

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.')
      if (path && !(path in fieldErrors)) fieldErrors[path] = issue.message
    }
    return {
      ok: false,
      fieldErrors,
      formError: 'Some answers need attention before this certificate can be issued.',
    }
  }

  const values = parsed.data
  const inspectionDate = parseDateOnly(values.inspectionDate)!

  const checklistRows = CHECKLIST_SECTIONS.flatMap((section) =>
    Object.entries(values.checklist[section]).map(([itemKey, state]) => ({
      section,
      itemKey,
      state,
    })),
  )

  let created: { id: string }
  try {
    created = await prisma.safetyCheck.create({
      data: {
        address: values.address,
        previousCheckDate: values.previousCheckDate
          ? parseDateOnly(values.previousCheckDate)
          : null,
        smokeAlarmsCompliant: values.smokeAlarmsCompliant,
        smokeAlarmDueDate: parseDateOnly(values.smokeAlarmDueDate)!,
        observations: values.observations,
        electricianName: values.electricianName,
        licenceNumber: values.licenceNumber,
        inspectionDate,
        nextInspectionDue: parseDateOnly(values.nextInspectionDue)!,
        signatureImage: values.signatureImage,
        signedDate: parseDateOnly(values.signedDate)!,
        checklist: { create: checklistRows },
        rcdTests: {
          create: values.rcdTests.map((test, index) => ({
            position: index,
            circuit: test.circuit,
            pushButtonTest: test.pushButtonTest,
            timeTest: test.timeTest,
          })),
        },
      },
      select: { id: true },
    })
  } catch (error) {
    // The legacy page redirected to "Form Submitted Successfully" whether or not
    // the insert worked, so a failed write looked identical to a saved one.
    console.error('Failed to store safety check', error)
    return {
      ok: false,
      fieldErrors: {},
      formError: 'The certificate could not be saved. Nothing was recorded — please try again.',
    }
  }

  revalidatePath('/')
  redirect(`/checks/${created.id}`)
}
