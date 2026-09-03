import type { ReactNode } from 'react'

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = '',
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-fail">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-fail">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none ' +
  'transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-slate-50'

export function SectionHeading({
  letter,
  title,
  subtitle,
  intro,
  action,
}: {
  letter?: string
  title: string
  subtitle?: string
  intro?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 className="text-base font-semibold text-accent">
          {letter ? <span className="mr-2">{letter}.</span> : null}
          {title}
        </h2>
        {action}
      </div>
      {subtitle ? <p className="mt-2 text-sm font-medium text-ink">{subtitle}</p> : null}
      {intro ? <p className="mt-2 text-xs leading-relaxed text-muted">{intro}</p> : null}
    </div>
  )
}
