import type { Metadata } from 'next'
import Link from 'next/link'

import { ORGANISATION_NAME } from '@/lib/catalog'

import './globals.css'

export const metadata: Metadata = {
  title: 'Electrical Safety Check',
  description:
    'Issue and archive Electrical Safety Check reports under the Residential Tenancies Regulations 2021.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen antialiased">
        <header className="no-print border-b border-line bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-accent">{ORGANISATION_NAME}</span>
              <span className="text-xs text-muted">Electrical Safety Check register</span>
            </Link>
            <Link
              href="/checks/new"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              New safety check
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
