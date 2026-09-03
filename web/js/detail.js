/**
 * One stored certificate, with the PDF built on demand from the same record.
 */

import { CHECKLIST, ITEM_STATE_LABELS, TEST_RESULT_LABELS } from './catalog.js'
import { ORGANISATION_NAME } from './config.js'
import { formatDisplayDate } from './dates.js'
import { getSafetyCheck, isConfigured, isDurable } from './db.js'
import { el, errorPanel, notice, param, qs, render, storageBanner } from './dom.js'
import { downloadCertificate } from './pdf.js'
import { certificateReference } from './reference.js'

const root = qs('#certificate')
qs('[data-organisation]').textContent = ORGANISATION_NAME

const id = param('id')

if (!isDurable) {
  qs('main').prepend(storageBanner())
}

if (!isConfigured()) {
  render(root, errorPanel('Open js/config.js and fill in your Supabase project URL and anon key.'))
} else if (!id) {
  render(root, notice('No certificate was requested.',
    el('a', { class: 'btn', href: 'index.html', style: 'margin-top:1rem' }, 'Back to register')))
} else {
  load()
}

async function load() {
  try {
    const record = await getSafetyCheck(id)
    if (!record) {
      document.title = 'Certificate not found'
      render(root, notice('That certificate could not be found.',
        el('a', { class: 'btn', href: 'index.html', style: 'margin-top:1rem' }, 'Back to register')))
      return
    }
    renderCertificate(record)
  } catch (error) {
    render(root, errorPanel(error.message))
  }
}

function renderCertificate(record) {
  const reference = certificateReference(record.serial, record.inspectionDate)
  document.title = `${reference} — ${record.address}`

  const failures = record.rcdTests.filter(
    (test) => test.pushButtonTest === 'FAIL' || test.timeTest === 'FAIL',
  )

  render(root, [
    header(record, reference),
    failures.length > 0 ? failureBanner(failures.length) : null,
    summary(record),
    ...CHECKLIST.map((section) => checklistCard(section, record.checklist[section.section] || {})),
    rcdCard(record.rcdTests),
    observationsCard(record.observations),
  ])
}

function header(record, reference) {
  return el('div', { class: 'toolbar no-print' }, [
    el('div', {}, [
      el('a', { href: 'index.html', class: 'muted', style: 'font-size:.75rem' }, '← Back to register'),
      el('h1', { class: 'page-title', style: 'margin-top:.25rem' }, reference),
      el('p', { class: 'muted' }, record.address),
    ]),
    el('div', { class: 'actions' }, [
      pdfButton(record, { inline: true, label: 'View PDF', className: 'btn' }),
      pdfButton(record, { inline: false, label: 'Download PDF', className: 'btn btn--primary' }),
    ]),
  ])
}

function pdfButton(record, { inline, label, className }) {
  const button = el('button', { class: className, type: 'button' }, label)

  button.addEventListener('click', async () => {
    button.disabled = true
    button.textContent = 'Building…'
    try {
      await downloadCertificate(record, { inline })
      button.textContent = label
    } catch (error) {
      button.textContent = 'Failed'
      console.error(error)
      window.setTimeout(() => {
        button.textContent = label
      }, 3000)
    } finally {
      button.disabled = false
    }
  })

  return button
}

function failureBanner(count) {
  return el('div', { class: 'alert', role: 'alert' },
    `${count} RCD test${count === 1 ? '' : 's'} failed on this installation.`)
}

function summary(record) {
  const items = [
    ['Inspection date', formatDisplayDate(record.inspectionDate)],
    ['Next inspection due', formatDisplayDate(record.nextInspectionDue)],
    ['Previous check', formatDisplayDate(record.previousCheckDate)],
    ['Smoke alarms due', formatDisplayDate(record.smokeAlarmDueDate)],
    ['Electrician', record.electricianName],
    ['Licence number', record.licenceNumber],
    ['Smoke alarms compliant', record.smokeAlarmsCompliant ? 'Yes' : 'No'],
    ['Signed', formatDisplayDate(record.signedDate)],
  ]

  return el('dl', { class: 'card summary-grid' },
    items.flatMap(([label, value]) => [el('dt', {}, label), el('dd', {}, value)]))
}

function checklistCard(section, states) {
  return el('section', { class: 'card' }, [
    el('div', { class: 'section-heading' },
      el('h2', { class: 'section-heading__title', style: 'border-bottom:1px solid var(--line);padding-bottom:.5rem' },
        `${section.letter}. ${section.subtitle || section.title}`)),
    el('ul', { class: 'checklist detail-list', style: 'margin-top:.75rem' },
      section.items.map((item) => {
        const state = states[item.key]
        return el('li', { dataset: { state: state || '' } }, [
          el('span', {}, item.label),
          state ? el('span', { class: 'badge', dataset: { state } }, ITEM_STATE_LABELS[state]) : null,
        ])
      })),
  ])
}

function rcdCard(tests) {
  const head = el('thead', {}, el('tr', {}, [
    el('th', {}, 'Circuit protected'),
    el('th', {}, 'Push button'),
    el('th', {}, 'Time test'),
  ]))

  const body = el('tbody', {}, tests.map((test) =>
    el('tr', {}, [
      el('td', {}, test.circuit),
      el('td', { class: test.pushButtonTest === 'FAIL' ? 'overdue' : '' },
        TEST_RESULT_LABELS[test.pushButtonTest]),
      el('td', { class: test.timeTest === 'FAIL' ? 'overdue' : '' },
        TEST_RESULT_LABELS[test.timeTest]),
    ])))

  return el('section', { class: 'card' }, [
    el('h2', { class: 'section-heading__title', style: 'border-bottom:1px solid var(--line);padding-bottom:.5rem' },
      'D. RCD testing'),
    el('div', { class: 'table-scroll', style: 'margin-top:.75rem' },
      el('table', { class: 'rcd-table' }, [head, body])),
  ])
}

function observationsCard(observations) {
  const body = observations.trim()
  return el('section', { class: 'card' }, [
    el('h2', { class: 'section-heading__title', style: 'border-bottom:1px solid var(--line);padding-bottom:.5rem' },
      'F. Observations and recommendations'),
    el('p', { class: body ? 'prewrap' : 'muted', style: 'margin-top:.75rem' },
      body || 'No observations were recorded.'),
  ])
}
