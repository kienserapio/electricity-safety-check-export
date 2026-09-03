'use client'

import { Controller, useFormContext, useWatch } from 'react-hook-form'

import {
  ITEM_STATES,
  ITEM_STATE_DESCRIPTIONS,
  ITEM_STATE_LABELS,
  type ChecklistSectionDefinition,
  type ItemState,
} from '@/lib/catalog'
import type { SafetyCheckValues } from '@/lib/schema'

import { SectionHeading } from './Field'

const STATE_STYLES: Record<ItemState, string> = {
  INCLUDED: 'bg-pass text-white border-pass',
  NOT_APPLICABLE: 'bg-slate-500 text-white border-slate-500',
  NOT_INCLUDED: 'bg-amber-500 text-white border-amber-500',
}

/**
 * One statutory checklist, rendered as a three-state control per line.
 *
 * The form's own instructions ask for three outcomes — checked, not applicable,
 * or not included — which a plain checkbox cannot express. The bulk buttons keep
 * that from becoming tedious: mark the whole section, then override the lines
 * that differ.
 */
export function ChecklistFieldset({
  definition,
  showLetterHeading,
}: {
  definition: ChecklistSectionDefinition
  /** Section D covers two checklists; only the first one carries the letter. */
  showLetterHeading: boolean
}) {
  const { control, setValue, formState } = useFormContext<SafetyCheckValues>()
  const section = definition.section
  const values = useWatch({ control, name: `checklist.${section}` })

  const answered = definition.items.filter(
    (item) => values?.[item.key as keyof typeof values] != null,
  ).length
  const total = definition.items.length
  const sectionError = (formState.errors.checklist as Record<string, unknown> | undefined)?.[section]

  const markAll = (state: ItemState) => {
    for (const item of definition.items) {
      setValue(`checklist.${section}.${item.key}` as never, state as never, {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
  }

  const markRemaining = (state: ItemState) => {
    for (const item of definition.items) {
      const current = values?.[item.key as keyof typeof values]
      if (current == null) {
        setValue(`checklist.${section}.${item.key}` as never, state as never, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <SectionHeading
        letter={showLetterHeading ? definition.letter : undefined}
        title={showLetterHeading ? definition.title : definition.subtitle!}
        subtitle={showLetterHeading ? definition.subtitle : undefined}
        intro={definition.intro || undefined}
        action={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={answered === total ? 'text-pass' : 'text-muted'}>
              {answered}/{total} answered
            </span>
            <button
              type="button"
              onClick={() => markAll('INCLUDED')}
              className="rounded border border-line px-2 py-1 font-medium text-ink transition hover:bg-accent-soft"
            >
              Mark all checked
            </button>
            <button
              type="button"
              onClick={() => markRemaining('NOT_APPLICABLE')}
              className="rounded border border-line px-2 py-1 font-medium text-ink transition hover:bg-accent-soft"
            >
              Rest N/A
            </button>
          </div>
        }
      />

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {definition.items.map((item) => (
          <li key={item.key}>
            <Controller
              control={control}
              name={`checklist.${section}.${item.key}` as never}
              render={({ field }) => (
                <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent-soft/60">
                  <span className="text-sm text-ink">{item.label}</span>
                  <div
                    role="radiogroup"
                    aria-label={item.label}
                    className="flex shrink-0 overflow-hidden rounded-md border border-line"
                  >
                    {ITEM_STATES.map((state) => {
                      const active = field.value === state
                      return (
                        <button
                          key={state}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          title={ITEM_STATE_DESCRIPTIONS[state]}
                          onClick={() => field.onChange(state)}
                          className={`border-l border-line px-2 py-1 text-xs font-medium transition first:border-l-0 ${
                            active
                              ? STATE_STYLES[state]
                              : 'bg-white text-muted hover:bg-accent-soft'
                          }`}
                        >
                          {ITEM_STATE_LABELS[state]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            />
          </li>
        ))}
      </ul>

      {sectionError ? (
        <p role="alert" className="mt-3 text-xs font-medium text-fail">
          Answer every line in this section before submitting.
        </p>
      ) : null}
    </section>
  )
}
