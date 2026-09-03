import { getSafetyCheck } from '@/lib/queries'
import { renderCertificate } from '@/lib/pdf/render'
import { certificateFilename, certificateReference } from '@/lib/reference'

// @react-pdf/renderer draws on Node streams and buffers, so this handler cannot
// run on the edge runtime.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const record = await getSafetyCheck(id)

  if (!record) {
    return new Response('Certificate not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const pdf = await renderCertificate(record)
  const reference = certificateReference(record.serial, record.inspectionDate)
  const filename = certificateFilename(reference, record.address)

  // `inline` opens it in the browser's viewer; `?download=1` saves it. The old
  // export always landed as "Invoices-4.pdf", which told the recipient nothing.
  const disposition = new URL(request.url).searchParams.has('download')
    ? 'attachment'
    : 'inline'

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'private, no-store',
    },
  })
}
