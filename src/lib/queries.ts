import 'server-only'

import { prisma } from './prisma'

/** Everything the PDF and the detail page need, in one round trip. */
export const safetyCheckInclude = {
  checklist: { orderBy: { itemKey: 'asc' } },
  rcdTests: { orderBy: { position: 'asc' } },
} as const

export async function getSafetyCheck(id: string) {
  return prisma.safetyCheck.findUnique({
    where: { id },
    include: safetyCheckInclude,
  })
}

export async function listSafetyChecks(search?: string) {
  const term = search?.trim()
  return prisma.safetyCheck.findMany({
    where: term
      ? {
          OR: [
            { address: { contains: term, mode: 'insensitive' } },
            { electricianName: { contains: term, mode: 'insensitive' } },
            { licenceNumber: { contains: term, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { inspectionDate: 'desc' },
    take: 100,
    select: {
      id: true,
      serial: true,
      address: true,
      electricianName: true,
      inspectionDate: true,
      nextInspectionDue: true,
      smokeAlarmsCompliant: true,
    },
  })
}

export type SafetyCheckRecord = NonNullable<Awaited<ReturnType<typeof getSafetyCheck>>>
export type SafetyCheckSummary = Awaited<ReturnType<typeof listSafetyChecks>>[number]
