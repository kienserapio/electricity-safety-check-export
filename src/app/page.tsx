import Link from 'next/link'

import { formatDisplayDate, todayDateOnly, parseDateOnly } from '@/lib/dates'
import { listSafetyChecks } from '@/lib/queries'
import { certificateReference } from '@/lib/reference'

export const dynamic = 'force-dynamic'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const checks = await listSafetyChecks(q)
  const today = parseDateOnly(todayDateOnly())!

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Safety check register</h1>
          <p className="mt-1 text-sm text-muted">
            Every certificate issued, newest inspection first.
          </p>
        </div>
        <form className="no-print flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search address, electrician or licence"
            aria-label="Search the register"
            className="w-72 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium transition hover:bg-accent-soft"
          >
            Search
          </button>
        </form>
      </div>

      {checks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-12 text-center">
          <p className="text-sm text-muted">
            {q ? `No certificates match “${q}”.` : 'No certificates have been issued yet.'}
          </p>
          <Link
            href="/checks/new"
            className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Start a safety check
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-accent-soft text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Certificate</th>
                <th className="px-4 py-3 font-semibold">Address</th>
                <th className="px-4 py-3 font-semibold">Electrician</th>
                <th className="px-4 py-3 font-semibold">Inspected</th>
                <th className="px-4 py-3 font-semibold">Next due</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => {
                const overdue = check.nextInspectionDue.getTime() < today.getTime()
                return (
                  <tr key={check.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/checks/${check.id}`} className="text-accent hover:underline">
                        {certificateReference(check.serial, check.inspectionDate)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{check.address}</td>
                    <td className="px-4 py-3 text-muted">{check.electricianName}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatDisplayDate(check.inspectionDate)}
                    </td>
                    <td className={`px-4 py-3 ${overdue ? 'font-semibold text-fail' : 'text-muted'}`}>
                      {formatDisplayDate(check.nextInspectionDue)}
                      {overdue ? ' · overdue' : ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/checks/${check.id}/pdf?download=1`}
                        className="rounded border border-line px-2 py-1 text-xs font-medium transition hover:bg-accent-soft"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
