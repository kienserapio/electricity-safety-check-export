/**
 * The register: every certificate issued, newest inspection first, with search.
 *
 * The legacy PHP page had no register at all — a certificate went into the
 * `safety` table and was never shown again.
 */

import { ORGANISATION_NAME } from './config.js'
import { formatDisplayDate, parseDateOnly, todayDateOnly } from './dates.js'
import { getSafetyCheck, isConfigured, isDurable, listSafetyChecks, storageFallback } from './db.js'
import { el, errorPanel, ensureStorageBanner, notice, pageHref, param, qs, render } from './dom.js'
import { downloadCertificate } from './pdf.js'
import { certificateReference } from './reference.js'

let results = null
let search = ''
let banner = null
let wired = false

/**
 * Renders the register into the markup already on the page.
 *
 * Called once per page load in the multi-page build, and again on every hash
 * change in the single-file one, so anything that attaches a listener has to be
 * guarded.
 */
export function init() {
  results = qs('#results')
  search = param('q') || ''

  qs('[data-organisation]').textContent = ORGANISATION_NAME
  qs('input[name="q"]').value = search

  if (!wired) {
    wired = true
    // The single-file build has no second page to GET, so searching moves the
    // hash and lets the router re-enter here.
    qs('#register-search').addEventListener('submit', (event) => {
      event.preventDefault()
      window.location.href = pageHref('register', { q: qs('input[name="q"]').value })
    })
  }

  if (!isDurable) {
    banner = ensureStorageBanner()
  }

  if (!isConfigured()) {
    render(
      results,
      errorPanel('Open js/config.js and fill in your Supabase project URL and anon key.'),
    )
    return
  }

  load()
}

async function load() {
  try {
    const checks = await listSafetyChecks(search)
    render(results, checks.length === 0 ? emptyState() : table(checks))
    if (storageFallback.active && banner) banner.noteFallback(storageFallback.reason, storageFallback.persists)
  } catch (error) {
    render(results, errorPanel(error.message))
  }
}

function emptyState() {
  const actions = el('div', {
    style: 'display:flex;gap:.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap',
  }, [
    el('a', { class: 'btn btn--primary', href: pageHref('new') }, 'Start a safety check'),
    // Filling the form takes a few minutes, which makes it awkward to show
    // anyone the register. Seeding is offered only for browser storage.
    !search && !isDurable ? sampleButton() : null,
  ])

  return notice(
    search ? `No certificates match “${search}”.` : 'No certificates have been issued yet.',
    actions,
  )
}

function sampleButton() {
  const button = el('button', { class: 'btn', type: 'button' }, 'Add sample certificates')

  button.addEventListener('click', async () => {
    button.disabled = true
    button.textContent = 'Adding…'
    try {
      const { addSampleCertificate } = await import('./sample.js')
      for (let i = 0; i < 4; i++) await addSampleCertificate(i)
      await load()
    } catch (error) {
      console.error(error)
      button.textContent = 'Failed'
      button.disabled = false
    }
  })

  return button
}

function table(checks) {
  const today = parseDateOnly(todayDateOnly())

  const head = el('thead', {}, el('tr', {}, [
    el('th', {}, 'Certificate'),
    el('th', {}, 'Address'),
    el('th', {}, 'Electrician'),
    el('th', {}, 'Inspected'),
    el('th', {}, 'Next due'),
    el('th', { class: 'no-print' }),
  ]))

  const body = el('tbody', {}, checks.map((check) => {
    const overdue = check.nextInspectionDue.getTime() < today.getTime()
    const reference = certificateReference(check.serial, check.inspectionDate)

    return el('tr', {}, [
      el('td', {}, el('a', { href: pageHref('check', { id: check.id }) }, reference)),
      el('td', {}, check.address),
      el('td', { class: 'muted' }, check.electricianName),
      el('td', { class: 'muted numeric' }, formatDisplayDate(check.inspectionDate)),
      el('td', { class: overdue ? 'overdue numeric' : 'muted numeric' },
        formatDisplayDate(check.nextInspectionDue) + (overdue ? ' · overdue' : '')),
      el('td', { class: 'no-print', style: 'text-align:right' }, pdfButton(check)),
    ])
  }))

  return el('div', { class: 'register-table' }, el('table', {}, [head, body]))
}

/**
 * The PDF is built in the browser from the stored record, so the row has to
 * fetch the full certificate first. The button reports its own progress rather
 * than leaving the page looking idle.
 */
function pdfButton(check) {
  const button = el('button', { class: 'btn btn--small', type: 'button' }, 'PDF')

  button.addEventListener('click', async () => {
    const original = button.textContent
    button.disabled = true
    button.textContent = 'Building…'
    try {
      const record = await getSafetyCheck(check.id)
      if (!record) throw new Error('That certificate could not be found.')
      await downloadCertificate(record)
      button.textContent = original
    } catch (error) {
      button.textContent = 'Failed'
      console.error(error)
      window.setTimeout(() => {
        button.textContent = original
      }, 3000)
    } finally {
      button.disabled = false
    }
  })

  return button
}
