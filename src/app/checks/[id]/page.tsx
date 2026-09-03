import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CHECKLIST, ITEM_STATE_LABELS, TEST_RESULT_LABELS, type ItemState } from '@/lib/catalog'
import { formatDisplayDate } from '@/lib/dates'
import { getSafetyCheck } from '@/lib/queries'
import { certificateReference } from '@/lib/reference'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const record = await getSafetyCheck(id)
  if (!record) return { title: 'Certificate not found' }
  return {
    title: `${certificateReference(record.serial, record.inspectionDate)} — ${record.address}`,
  }
}

const STATE_CLASS: Record<ItemState, string> = {
  INCLUDED: 'bg-pass/10 text-pass',
  NOT_APPLICABLE: 'bg-slate-100 text-muted line-through',
  NOT_INCLUDED: 'bg-amber-50 text-amber-700',
}

export default async function SafetyCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const record = await getSafetyCheck(id)
  if (!record) notFound()

  const reference = certificateReference(record.serial, record.inspectionDate)
  const states = new Map(
    record.checklist.map((entry) => [`${entry.section}:${entry.itemKey}`, entry.state as ItemState]),
  )
  const failures = record.rcdTests.filter(
    (test) => test.pushButtonTest === 'FAIL' || test.timeTest === 'FAIL',
  )

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-muted hover:underline">
            ← Back to register
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{reference}</h1>
          <p className="text-sm text-muted">{record.address}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/checks/${record.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium transition hover:bg-accent-soft"
          >
            View PDF
          </a>
          <a
            href={`/checks/${record.id}/pdf?download=1`}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Download PDF
          </a>
        </div>
      </div>

      {failures.length > 0 ? (
        <div className="rounded-lg border border-fail/30 bg-fail/5 p-4 text-sm font-medium text-fail">
          {failures.length} RCD test{failures.length === 1 ? '' : 's'} failed on this installation.
        </div>
      ) : null}

      <section className="grid gap-4 rounded-lg border border-line bg-white p-5 shadow-sm sm:grid-cols-4">
        {[
          { label: 'Inspection date', value: formatDisplayDate(record.inspectionDate) },
          { label: 'Next inspection due', value: formatDisplayDate(record.nextInspectionDue) },
          { label: 'Previous check', value: formatDisplayDate(record.previousCheckDate) },
          { label: 'Smoke alarms due', value: formatDisplayDate(record.smokeAlarmDueDate) },
          { label: 'Electrician', value: record.electricianName },
          { label: 'Licence number', value: record.licenceNumber },
          {
            label: 'Smoke alarms compliant',
            value: record.smokeAlarmsCompliant ? 'Yes' : 'No',
          },
          { label: 'Signed', value: formatDisplayDate(record.signedDate) },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xs uppercase tracking-wide text-muted">{item.label}</p>
            <p className="mt-0.5 text-sm font-medium">{item.value}</p>
          </div>
        ))}
      </section>

      {CHECKLIST.map((section) => (
        <section
          key={`${section.section}`}
          className="rounded-lg border border-line bg-white p-5 shadow-sm"
        >
          <h2 className="border-b border-line pb-2 text-sm font-semibold text-accent">
            {section.letter}. {section.subtitle ?? section.title}
          </h2>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {section.items.map((item) => {
              const state = states.get(`${section.section}:${item.key}`)
              return (
                <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className={state === 'NOT_APPLICABLE' ? 'text-muted line-through' : ''}>
                    {item.label}
                  </span>
                  {state ? (
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATE_CLASS[state]}`}
                    >
                      {ITEM_STATE_LABELS[state]}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="border-b border-line pb-2 text-sm font-semibold text-accent">
          D. RCD testing
        </h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 font-semibold">Circuit protected</th>
              <th className="w-32 py-2 font-semibold">Push button</th>
              <th className="w-32 py-2 font-semibold">Time test</th>
            </tr>
          </thead>
          <tbody>
            {record.rcdTests.map((test) => (
              <tr key={test.id} className="border-b border-line/70 last:border-0">
                <td className="py-2">{test.circuit}</td>
                <td className={test.pushButtonTest === 'FAIL' ? 'py-2 font-semibold text-fail' : 'py-2'}>
                  {TEST_RESULT_LABELS[test.pushButtonTest]}
                </td>
                <td className={test.timeTest === 'FAIL' ? 'py-2 font-semibold text-fail' : 'py-2'}>
                  {TEST_RESULT_LABELS[test.timeTest]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="border-b border-line pb-2 text-sm font-semibold text-accent">
          F. Observations and recommendations
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm">
          {record.observations.trim() || (
            <span className="text-muted">No observations were recorded.</span>
          )}
        </p>
      </section>
    </div>
  )
}
