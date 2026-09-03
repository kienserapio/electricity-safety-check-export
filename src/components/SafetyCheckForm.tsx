'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { ChecklistFieldset } from '@/components/form/ChecklistFieldset'
import { Field, SectionHeading, inputClass } from '@/components/form/Field'
import { RcdTable } from '@/components/form/RcdTable'
import { SignaturePad } from '@/components/form/SignaturePad'
import { createSafetyCheck } from '@/lib/actions'
import {
  CERTIFICATION_DECLARATION,
  CHECKLIST,
  DEFAULT_RCD_CIRCUITS,
  REGULATION_PREAMBLE,
  SMOKE_ALARM_NOTE,
} from '@/lib/catalog'
import {
  ELECTRICAL_CHECK_INTERVAL_YEARS,
  SMOKE_ALARM_INTERVAL_YEARS,
  addYears,
  todayDateOnly,
} from '@/lib/dates'
import type { SafetyCheckValues } from '@/lib/schema'
import { safetyCheckSchema } from '@/lib/schema'

/**
 * Every checklist line starts unanswered, so the electrician has to make a
 * deliberate choice on each one. The schema types these as required, which is
 * true of a submitted form but not of a blank one — hence the cast.
 */
function emptyChecklist(): SafetyCheckValues['checklist'] {
  return Object.fromEntries(
    CHECKLIST.map((section) => [
      section.section,
      Object.fromEntries(section.items.map((item) => [item.key, undefined])),
    ]),
  ) as unknown as SafetyCheckValues['checklist']
}

export function SafetyCheckForm() {
  const today = todayDateOnly()
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const methods = useForm<SafetyCheckValues>({
    resolver: zodResolver(safetyCheckSchema),
    mode: 'onBlur',
    defaultValues: {
      address: '',
      previousCheckDate: '',
      checklist: emptyChecklist(),
      rcdTests: DEFAULT_RCD_CIRCUITS.map((circuit) => ({
        circuit,
        pushButtonTest: 'PASS' as const,
        timeTest: 'PASS' as const,
      })),
      smokeAlarmsCompliant: true,
      smokeAlarmDueDate: addYears(today, SMOKE_ALARM_INTERVAL_YEARS),
      observations: '',
      electricianName: '',
      licenceNumber: '',
      inspectionDate: today,
      nextInspectionDue: addYears(today, ELECTRICAL_CHECK_INTERVAL_YEARS),
      signatureImage: '',
      signedDate: today,
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    getFieldState,
    formState: { errors, isSubmitting },
  } = methods

  const signature = watch('signatureImage')

  /**
   * Both follow-up dates are set by regulation — two years for the electrical
   * check, twelve months for smoke alarms — so they track the inspection date
   * until the electrician overrides one.
   */
  const onInspectionDateChange = (value: string) => {
    if (!getFieldState('nextInspectionDue').isDirty) {
      setValue('nextInspectionDue', addYears(value, ELECTRICAL_CHECK_INTERVAL_YEARS))
    }
    if (!getFieldState('smokeAlarmDueDate').isDirty) {
      setValue('smokeAlarmDueDate', addYears(value, SMOKE_ALARM_INTERVAL_YEARS))
    }
    if (!getFieldState('signedDate').isDirty) {
      setValue('signedDate', value)
    }
  }

  const onSubmit = (values: SafetyCheckValues) => {
    setFormError(null)
    startTransition(async () => {
      // A successful call redirects, so nothing below runs on the happy path.
      const result = await createSafetyCheck(values)
      if (!result) return
      setFormError(result.formError ?? 'The certificate could not be saved.')
      for (const [path, message] of Object.entries(result.fieldErrors)) {
        setError(path as never, { type: 'server', message })
      }
    })
  }

  const busy = pending || isSubmitting
  const errorCount = Object.keys(errors).length

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <header className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <p className="text-center text-sm font-semibold text-accent">
            Residential Tenancies Regulations 2021
          </p>
          <h1 className="mt-1 text-center text-xl font-bold text-accent">
            Electrical Safety Check – Report
          </h1>
          <p className="mt-4 text-xs leading-relaxed text-muted">{REGULATION_PREAMBLE}</p>
        </header>

        {formError || errorCount > 0 ? (
          <div
            role="alert"
            className="rounded-lg border border-fail/30 bg-fail/5 p-4 text-sm text-fail"
          >
            <p className="font-semibold">{formError ?? 'Some answers need attention.'}</p>
            {errorCount > 0 ? (
              <p className="mt-1 text-xs">
                {errorCount} section{errorCount === 1 ? '' : 's'} below {errorCount === 1 ? 'has' : 'have'}{' '}
                an unanswered or invalid field.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* A. Installation address */}
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <SectionHeading letter="A" title="Installation address" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Address"
              htmlFor="address"
              required
              error={errors.address?.message}
              className="sm:col-span-2"
            >
              <input
                id="address"
                {...register('address')}
                className={inputClass}
                placeholder="123 Geelong Road, Footscray VIC 3011"
                autoComplete="street-address"
              />
            </Field>
            <Field
              label="Date of previous safety check"
              htmlFor="previousCheckDate"
              hint="Leave blank if this is the first check."
              error={errors.previousCheckDate?.message}
            >
              <input
                id="previousCheckDate"
                type="date"
                {...register('previousCheckDate')}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {CHECKLIST.map((definition, index) => (
          <ChecklistFieldset
            key={definition.section}
            definition={definition}
            showLetterHeading={index === 0 || CHECKLIST[index - 1].letter !== definition.letter}
          />
        ))}

        <RcdTable />

        {/* E. Smoke alarms */}
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <SectionHeading letter="E" title="Smoke alarms" />
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">
                All smoke alarms are correctly installed, in working condition, and have been tested
                according to the manufacturer&rsquo;s instructions.
                <span className="ml-0.5 text-fail">*</span>
              </legend>
              <div className="flex gap-4">
                {[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ].map((option) => (
                  <label key={option.label} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value={String(option.value)}
                      checked={watch('smokeAlarmsCompliant') === option.value}
                      onChange={() => setValue('smokeAlarmsCompliant', option.value)}
                      className="h-4 w-4 accent-[#365f91]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field
              label="Next smoke alarm check due by"
              htmlFor="smokeAlarmDueDate"
              required
              hint={SMOKE_ALARM_NOTE}
              error={errors.smokeAlarmDueDate?.message}
            >
              <input
                id="smokeAlarmDueDate"
                type="date"
                {...register('smokeAlarmDueDate')}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* F. Observations */}
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <SectionHeading
            letter="F"
            title="Observations and recommendations for any actions to be taken"
          />
          <Field label="The following observations and recommendations are made" htmlFor="observations" error={errors.observations?.message}>
            <textarea
              id="observations"
              rows={5}
              {...register('observations')}
              className={inputClass}
              placeholder="Record any defects found, actions taken, and work recommended."
            />
          </Field>
        </section>

        {/* G. Certification */}
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <SectionHeading letter="G" title="Electrical safety check certification" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Electrical safety check completed by"
              htmlFor="electricianName"
              required
              error={errors.electricianName?.message}
            >
              <input
                id="electricianName"
                {...register('electricianName')}
                className={inputClass}
                autoComplete="name"
              />
            </Field>
            <Field
              label="Licence / registration number"
              htmlFor="licenceNumber"
              required
              error={errors.licenceNumber?.message}
            >
              <input id="licenceNumber" {...register('licenceNumber')} className={inputClass} />
            </Field>
            <Field
              label="Inspection date"
              htmlFor="inspectionDate"
              required
              error={errors.inspectionDate?.message}
            >
              <input
                id="inspectionDate"
                type="date"
                {...register('inspectionDate', {
                  onChange: (event) => onInspectionDateChange(event.target.value),
                })}
                className={inputClass}
              />
            </Field>
            <Field
              label="Next inspection due by"
              htmlFor="nextInspectionDue"
              required
              hint={`Defaults to ${ELECTRICAL_CHECK_INTERVAL_YEARS} years after the inspection date.`}
              error={errors.nextInspectionDue?.message}
            >
              <input
                id="nextInspectionDue"
                type="date"
                {...register('nextInspectionDue')}
                className={inputClass}
              />
            </Field>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted">{CERTIFICATION_DECLARATION}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Signature" required error={errors.signatureImage?.message}>
              <SignaturePad
                value={signature}
                onChange={(dataUrl) =>
                  setValue('signatureImage', dataUrl, { shouldValidate: true, shouldDirty: true })
                }
              />
            </Field>
            <Field label="Date" htmlFor="signedDate" required error={errors.signedDate?.message}>
              <input id="signedDate" type="date" {...register('signedDate')} className={inputClass} />
            </Field>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-8 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Issuing certificate…' : 'Issue certificate'}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
