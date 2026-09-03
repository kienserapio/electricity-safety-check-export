/**
 * Human-readable certificate reference, e.g. ESC-2026-000042.
 *
 * Derived from the record's autoincrementing serial and the year of inspection
 * so it is stable, sortable and unique without a second write after insert.
 */
export function certificateReference(serial: number, inspectionDate: Date): string {
  const year = inspectionDate.getUTCFullYear()
  return `ESC-${year}-${String(serial).padStart(6, '0')}`
}

/** Filename for the exported PDF. Safe on every platform, and self-describing. */
export function certificateFilename(reference: string, address: string): string {
  const slug = address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug ? `${reference}-${slug}.pdf` : `${reference}.pdf`
}
