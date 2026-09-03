'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'

import { TEST_RESULTS, TEST_RESULT_LABELS } from '@/lib/catalog'
import type { SafetyCheckValues } from '@/lib/schema'

import { SectionHeading, inputClass } from './Field'

/**
 * The RCD test table.
 *
 * The legacy form had ten hard-coded slots — six with fixed labels the database
 * never stored, plus four spares — so an installation with more safety switches
 * could not be recorded at all. Rows are now data.
 */
export function RcdTable() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<SafetyCheckValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'rcdTests' })
  const rowErrors = errors.rcdTests

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <SectionHeading
        title="RCD (residual current device / safety switch) testing"
        intro="Record every RCD in the installation. Add a row for each additional safety switch."
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-semibold">Circuit protected</th>
              <th className="w-40 py-2 pr-3 font-semibold">Push button test</th>
              <th className="w-40 py-2 pr-3 font-semibold">Time test</th>
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b border-line/70 align-top">
                <td className="py-2 pr-3">
                  <input
                    {...register(`rcdTests.${index}.circuit`)}
                    className={inputClass}
                    placeholder="e.g. Power outlets"
                    aria-label={`Circuit protected, row ${index + 1}`}
                  />
                  {rowErrors?.[index]?.circuit ? (
                    <p role="alert" className="mt-1 text-xs font-medium text-fail">
                      {rowErrors[index]?.circuit?.message}
                    </p>
                  ) : null}
                </td>
                <td className="py-2 pr-3">
                  <select
                    {...register(`rcdTests.${index}.pushButtonTest`)}
                    className={inputClass}
                    aria-label={`Push button test, row ${index + 1}`}
                  >
                    {TEST_RESULTS.map((result) => (
                      <option key={result} value={result}>
                        {TEST_RESULT_LABELS[result]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <select
                    {...register(`rcdTests.${index}.timeTest`)}
                    className={inputClass}
                    aria-label={`Time test, row ${index + 1}`}
                  >
                    {TEST_RESULTS.map((result) => (
                      <option key={result} value={result}>
                        {TEST_RESULT_LABELS[result]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Remove row ${index + 1}`}
                    className="rounded px-2 py-1 text-muted transition hover:bg-accent-soft hover:text-fail disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => append({ circuit: '', pushButtonTest: 'PASS', timeTest: 'PASS' })}
        className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent-soft"
      >
        Add RCD row
      </button>

      {typeof rowErrors?.message === 'string' ? (
        <p role="alert" className="mt-2 text-xs font-medium text-fail">
          {rowErrors.message}
        </p>
      ) : null}
    </section>
  )
}
