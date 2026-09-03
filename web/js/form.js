/**
 * The safety check form.
 *
 * The checklist sections, their wording and their line items all come from
 * catalog.js, so the form, the validation and the certificate cannot drift
 * apart the way the legacy page's three hand-maintained copies did.
 */

import {
  CERTIFICATION_DECLARATION,
  CHECKLIST,
  DEFAULT_RCD_CIRCUITS,
  ITEM_STATES,
  ITEM_STATE_DESCRIPTIONS,
  ITEM_STATE_LABELS,
  REGULATION_PREAMBLE,
  SMOKE_ALARM_NOTE,
  TEST_RESULTS,
  TEST_RESULT_LABELS,
} from './catalog.js'
import { ORGANISATION_NAME } from './config.js'
import {
  ELECTRICAL_CHECK_INTERVAL_YEARS,
  SMOKE_ALARM_INTERVAL_YEARS,
  addYears,
  todayDateOnly,
} from './dates.js'
import { createSafetyCheck, isConfigured, isDurable, storageFallback } from './db.js'
import { el, ensureStorageBanner, pageHref, qs, render } from './dom.js'
import { createSignaturePad } from './signature.js'
import { validateSafetyCheck } from './validate.js'

let form = null

/** Every checklist line starts unanswered, so each one takes a deliberate choice. */
function blankState() {
  const today = todayDateOnly()

  return {
    address: '',
    previousCheckDate: '',
    checklist: Object.fromEntries(CHECKLIST.map((s) => [s.section, {}])),
    rcdTests: DEFAULT_RCD_CIRCUITS.map((circuit) => ({
      circuit,
      pushButtonTest: 'PASS',
      timeTest: 'PASS',
    })),
    smokeAlarmsCompliant: true,
    smokeAlarmDueDate: addYears(today, SMOKE_ALARM_INTERVAL_YEARS),
    observations: '',
    electricianName: '',
    licenceNumber: '',
    inspectionDate: today,
    nextInspectionDue: addYears(today, ELECTRICAL_CHECK_INTERVAL_YEARS),
    signatureImage: '',
    signedDate: today,
  }
}

let state = blankState()

/** Fields the electrician has edited by hand, which the date defaults stop tracking. */
let dirty = new Set()

/** Dotted path -> the elements that display that field's error. */
let errorSlots = new Map()

let alertBox = null
let submitButton = null
let banner = null
let submitWired = false

/**
 * Builds a blank form into the markup already on the page.
 *
 * The single-file build can re-enter this view after a certificate has been
 * issued, so the state is rebuilt from scratch rather than carried over — an
 * electrician starting a second check must not inherit the first one's answers.
 */
export function init() {
  form = qs('#safety-check')
  qs('[data-organisation]').textContent = ORGANISATION_NAME

  state = blankState()
  dirty = new Set()
  errorSlots = new Map()
  banner = null

  build()
}

// ---------------------------------------------------------------------------
// Field primitives
// ---------------------------------------------------------------------------

function field(path, label, control, { hint, required, className } = {}) {
  const error = el('p', { class: 'field__error', role: 'alert', hidden: true })
  errorSlots.set(path, { control, error })

  return el('div', { class: className || '' }, [
    el('label', { class: 'field__label', for: path }, [
      label,
      required ? el('span', { class: 'required' }, '*') : null,
    ]),
    control,
    hint ? el('p', { class: 'field__hint' }, hint) : null,
    error,
  ])
}

function textInput(path, options = {}) {
  const input = el('input', {
    type: options.type || 'text',
    id: path,
    name: path,
    value: state[path] || '',
    placeholder: options.placeholder,
    autocomplete: options.autocomplete,
  })

  input.addEventListener('input', () => {
    state[path] = input.value
    dirty.add(path)
    clearError(path)
    if (options.onInput) options.onInput(input.value)
  })

  return input
}

function clearError(path) {
  const slot = errorSlots.get(path)
  if (!slot) return
  slot.error.hidden = true
  slot.error.textContent = ''
  slot.control?.removeAttribute?.('aria-invalid')
}

function showErrors(fieldErrors) {
  for (const slot of errorSlots.values()) {
    slot.error.hidden = true
    slot.error.textContent = ''
    slot.control?.removeAttribute?.('aria-invalid')
  }

  let first = null
  const shown = new Set()

  for (const [path, message] of Object.entries(fieldErrors)) {
    // Checklist errors are reported once per section rather than per line.
    const slot = errorSlots.get(path) || errorSlots.get(sectionOf(path))
    if (!slot) continue
    slot.error.hidden = false
    slot.error.textContent = path.startsWith('checklist.')
      ? 'Answer every line in this section before submitting.'
      : message
    slot.control?.setAttribute?.('aria-invalid', 'true')
    shown.add(slot.error)
    if (!first) first = slot.error
  }

  // The count is of messages the electrician can actually see. Counting raw
  // field paths would report 51 problems above eight visible messages, because
  // a whole unanswered checklist section collapses into one of them.
  return { first, count: shown.size }
}

function sectionOf(path) {
  const parts = path.split('.')
  return parts[0] === 'checklist' ? `checklist.${parts[1]}` : parts.slice(0, 2).join('.')
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function heading(title, { letter, intro, action } = {}) {
  return el('div', { class: 'section-heading' }, [
    el('div', { class: 'section-heading__row' }, [
      el('h2', { class: 'section-heading__title' }, letter ? `${letter}. ${title}` : title),
      action,
    ]),
    intro ? el('p', { class: 'section-heading__intro' }, intro) : null,
  ])
}

function addressSection() {
  return el('section', { class: 'card' }, [
    heading('Installation address', { letter: 'A' }),
    el('div', { class: 'grid grid--3' }, [
      field('address', 'Address',
        textInput('address', {
          placeholder: '123 Geelong Road, Footscray VIC 3011',
          autocomplete: 'street-address',
        }),
        { required: true, className: 'span-2' }),
      field('previousCheckDate', 'Date of previous safety check',
        textInput('previousCheckDate', { type: 'date' }),
        { hint: 'Leave blank if this is the first check.' }),
    ]),
  ])
}

/**
 * One statutory checklist, rendered as a three-state control per line.
 *
 * The form's own instructions ask for three outcomes — checked, not applicable,
 * or not included — which a plain checkbox cannot express. The bulk buttons keep
 * that from becoming tedious: mark the whole section, then override the lines
 * that differ.
 */
function checklistSection(definition, showLetter) {
  const section = definition.section
  const answers = state.checklist[section]
  const tally = el('span', { class: 'tally' })
  const rows = new Map()

  const refreshTally = () => {
    const answered = definition.items.filter((item) => answers[item.key]).length
    tally.textContent = `${answered}/${definition.items.length} answered`
    tally.dataset.complete = String(answered === definition.items.length)
  }

  const setState = (key, value) => {
    answers[key] = value
    const row = rows.get(key)
    row.li.dataset.state = value
    for (const button of row.buttons) {
      button.setAttribute('aria-checked', String(button.dataset.state === value))
    }
    refreshTally()
    clearError(`checklist.${section}`)
  }

  const list = el('ul', { class: 'checklist' }, definition.items.map((item) => {
    const buttons = ITEM_STATES.map((value) =>
      el('button', {
        type: 'button',
        role: 'radio',
        'aria-checked': 'false',
        dataset: { state: value },
        title: ITEM_STATE_DESCRIPTIONS[value],
        onClick: () => setState(item.key, value),
      }, ITEM_STATE_LABELS[value]))

    const li = el('li', { class: 'checklist__row' }, [
      el('span', { class: 'checklist__label' }, item.label),
      el('div', { class: 'states', role: 'radiogroup', 'aria-label': item.label }, buttons),
    ])

    rows.set(item.key, { li, buttons })
    return li
  }))

  const markAll = (value) => definition.items.forEach((item) => setState(item.key, value))
  const markRemaining = (value) =>
    definition.items.forEach((item) => {
      if (!answers[item.key]) setState(item.key, value)
    })

  const error = el('p', { class: 'field__error', role: 'alert', hidden: true })
  errorSlots.set(`checklist.${section}`, { control: null, error })

  refreshTally()

  return el('section', { class: 'card' }, [
    heading(showLetter ? definition.title : definition.subtitle, {
      letter: showLetter ? definition.letter : undefined,
      intro: definition.intro || undefined,
      action: el('div', { style: 'display:flex;flex-wrap:wrap;gap:.5rem;align-items:center' }, [
        tally,
        el('button', { type: 'button', class: 'btn btn--small', onClick: () => markAll('INCLUDED') },
          'Mark all checked'),
        el('button', { type: 'button', class: 'btn btn--small', onClick: () => markRemaining('NOT_APPLICABLE') },
          'Rest N/A'),
      ]),
    }),
    showLetter && definition.subtitle
      ? el('p', { class: 'field__label', style: 'margin-bottom:.5rem' }, definition.subtitle)
      : null,
    list,
    error,
  ])
}

/**
 * The RCD test table.
 *
 * The legacy form had ten hard-coded slots — six with fixed labels the database
 * never stored, plus four spares — so an installation with more safety switches
 * could not be recorded at all. Rows are now data.
 */
function rcdSection() {
  const body = el('tbody')
  const error = el('p', { class: 'field__error', role: 'alert', hidden: true })
  errorSlots.set('rcdTests', { control: null, error })

  const redraw = () => {
    // Row indices appear in error paths, so they are rebuilt whenever the set
    // of rows changes.
    for (const key of [...errorSlots.keys()]) {
      if (key.startsWith('rcdTests.')) errorSlots.delete(key)
    }

    render(body, state.rcdTests.map((row, index) => {
      const circuit = el('input', {
        type: 'text',
        value: row.circuit,
        placeholder: 'e.g. Power outlets',
        'aria-label': `Circuit protected, row ${index + 1}`,
      })
      const circuitError = el('p', { class: 'field__error', role: 'alert', hidden: true })
      errorSlots.set(`rcdTests.${index}.circuit`, { control: circuit, error: circuitError })

      circuit.addEventListener('input', () => {
        row.circuit = circuit.value
        clearError(`rcdTests.${index}.circuit`)
      })

      const select = (key) => {
        const control = el('select', {
          'aria-label': `${key === 'pushButtonTest' ? 'Push button test' : 'Time test'}, row ${index + 1}`,
        }, TEST_RESULTS.map((result) =>
          el('option', { value: result, selected: row[key] === result }, TEST_RESULT_LABELS[result])))
        control.value = row[key]
        control.addEventListener('change', () => {
          row[key] = control.value
        })
        return control
      }

      const remove = el('button', {
        type: 'button',
        class: 'btn btn--small',
        'aria-label': `Remove row ${index + 1}`,
        disabled: state.rcdTests.length === 1,
        onClick: () => {
          state.rcdTests.splice(index, 1)
          redraw()
        },
      }, '×')

      return el('tr', {}, [
        el('td', {}, [circuit, circuitError]),
        el('td', {}, select('pushButtonTest')),
        el('td', {}, select('timeTest')),
        el('td', { style: 'text-align:right' }, remove),
      ])
    }))
  }

  redraw()

  return el('section', { class: 'card' }, [
    heading('RCD (residual current device / safety switch) testing', {
      intro: 'Record every RCD in the installation. Add a row for each additional safety switch.',
    }),
    el('div', { class: 'table-scroll' }, el('table', { class: 'rcd-table' }, [
      el('thead', {}, el('tr', {}, [
        el('th', {}, 'Circuit protected'),
        el('th', {}, 'Push button test'),
        el('th', {}, 'Time test'),
        el('th', {}),
      ])),
      body,
    ])),
    el('button', {
      type: 'button',
      class: 'btn',
      style: 'margin-top:.75rem',
      onClick: () => {
        state.rcdTests.push({ circuit: '', pushButtonTest: 'PASS', timeTest: 'PASS' })
        redraw()
      },
    }, 'Add RCD row'),
    error,
  ])
}

function smokeAlarmSection() {
  const options = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ].map((option) => {
    const input = el('input', {
      type: 'radio',
      name: 'smokeAlarmsCompliant',
      checked: state.smokeAlarmsCompliant === option.value,
    })
    input.addEventListener('change', () => {
      state.smokeAlarmsCompliant = option.value
      clearError('observations')
    })
    return el('label', {}, [input, option.label])
  })

  return el('section', { class: 'card' }, [
    heading('Smoke alarms', { letter: 'E' }),
    el('div', { class: 'grid grid--2' }, [
      el('fieldset', {}, [
        el('legend', {}, [
          'All smoke alarms are correctly installed, in working condition, and have been tested ' +
          'according to the manufacturer’s instructions.',
          el('span', { class: 'required' }, '*'),
        ]),
        el('div', { class: 'radio-row' }, options),
      ]),
      field('smokeAlarmDueDate', 'Next smoke alarm check due by',
        textInput('smokeAlarmDueDate', { type: 'date' }),
        { required: true, hint: SMOKE_ALARM_NOTE }),
    ]),
  ])
}

function observationsSection() {
  const textarea = el('textarea', {
    id: 'observations',
    rows: 5,
    placeholder: 'Record any defects found, actions taken, and work recommended.',
  })
  textarea.value = state.observations
  textarea.addEventListener('input', () => {
    state.observations = textarea.value
    clearError('observations')
  })

  return el('section', { class: 'card' }, [
    heading('Observations and recommendations for any actions to be taken', { letter: 'F' }),
    field('observations', 'The following observations and recommendations are made', textarea),
  ])
}

function certificationSection() {
  const canvas = el('canvas', { class: 'signature-pad', role: 'img', 'aria-label': 'Signature' })
  const status = el('span', {}, 'Sign above using a finger, stylus or mouse.')

  const pad = createSignaturePad(canvas, {
    onChange: (dataUrl) => {
      state.signatureImage = dataUrl
      status.textContent = dataUrl ? 'Signed.' : 'Sign above using a finger, stylus or mouse.'
      clearError('signatureImage')
    },
  })

  const signatureError = el('p', { class: 'field__error', role: 'alert', hidden: true })
  errorSlots.set('signatureImage', { control: canvas, error: signatureError })

  return el('section', { class: 'card' }, [
    heading('Electrical safety check certification', { letter: 'G' }),
    el('div', { class: 'grid grid--2' }, [
      field('electricianName', 'Electrical safety check completed by',
        textInput('electricianName', { autocomplete: 'name' }), { required: true }),
      field('licenceNumber', 'Licence / registration number',
        textInput('licenceNumber'), { required: true }),
      field('inspectionDate', 'Inspection date',
        textInput('inspectionDate', { type: 'date', onInput: onInspectionDateChange }),
        { required: true }),
      field('nextInspectionDue', 'Next inspection due by',
        textInput('nextInspectionDue', { type: 'date' }),
        {
          required: true,
          hint: `Defaults to ${ELECTRICAL_CHECK_INTERVAL_YEARS} years after the inspection date.`,
        }),
    ]),
    el('p', { class: 'certificate-header__preamble' }, CERTIFICATION_DECLARATION),
    el('div', { class: 'grid grid--2', style: 'margin-top:1rem' }, [
      el('div', {}, [
        el('label', { class: 'field__label' }, ['Signature', el('span', { class: 'required' }, '*')]),
        canvas,
        el('div', { class: 'signature-meta' }, [
          status,
          el('button', { type: 'button', class: 'btn btn--small', onClick: () => pad.clear() }, 'Clear'),
        ]),
        signatureError,
      ]),
      field('signedDate', 'Date', textInput('signedDate', { type: 'date' }), { required: true }),
    ]),
  ])
}

/**
 * Both follow-up dates are set by regulation — two years for the electrical
 * check, twelve months for smoke alarms — so they track the inspection date
 * until the electrician overrides one.
 */
function onInspectionDateChange(value) {
  const follow = [
    ['nextInspectionDue', ELECTRICAL_CHECK_INTERVAL_YEARS],
    ['smokeAlarmDueDate', SMOKE_ALARM_INTERVAL_YEARS],
    ['signedDate', 0],
  ]

  for (const [path, years] of follow) {
    if (dirty.has(path)) continue
    const next = years === 0 ? value : addYears(value, years)
    state[path] = next
    const slot = errorSlots.get(path)
    if (slot?.control) slot.control.value = next
  }
}

// ---------------------------------------------------------------------------
// Assembly and submit
// ---------------------------------------------------------------------------

function build() {
  alertBox = el('div', { class: 'alert', role: 'alert', hidden: true })
  submitButton = el('button', { type: 'submit', class: 'btn btn--primary btn--submit' },
    'Issue certificate')

  render(form, [
    el('header', { class: 'card card--pad certificate-header' }, [
      el('p', { class: 'certificate-header__regulation' }, 'Residential Tenancies Regulations 2021'),
      el('h1', { class: 'certificate-header__title' }, 'Electrical Safety Check – Report'),
      el('p', { class: 'certificate-header__preamble' }, REGULATION_PREAMBLE),
    ]),
    alertBox,
    addressSection(),
    ...CHECKLIST.map((definition, index) =>
      checklistSection(definition, index === 0 || CHECKLIST[index - 1].letter !== definition.letter)),
    rcdSection(),
    smokeAlarmSection(),
    observationsSection(),
    certificationSection(),
    el('div', { style: 'display:flex;justify-content:flex-end' }, submitButton),
  ])

  if (!isDurable) {
    banner = ensureStorageBanner()
    if (storageFallback.active) banner.noteFallback(storageFallback.reason, storageFallback.persists)
  }

  if (!isConfigured()) {
    fail('Open js/config.js and fill in your Supabase project URL and anon key before issuing certificates.')
    submitButton.disabled = true
  }

  // The single-file build re-enters init() on every hash change, but the form
  // element itself persists, so the handler is attached only once.
  if (!submitWired) {
    submitWired = true
    form.addEventListener('submit', onSubmit)
  }
}

function fail(message, detail) {
  alertBox.hidden = false
  render(alertBox, [
    el('p', { class: 'alert__title' }, message),
    detail ? el('p', { class: 'alert__detail' }, detail) : null,
  ])
}

async function onSubmit(event) {
  event.preventDefault()
  alertBox.hidden = true

  const result = validateSafetyCheck(state)

  if (!result.ok) {
    const { first, count } = showErrors(result.fieldErrors)
    fail(result.formError,
      `${count} field${count === 1 ? '' : 's'} below ${count === 1 ? 'needs' : 'need'} attention.`)
    ;(first || alertBox).scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  submitButton.disabled = true
  submitButton.textContent = 'Issuing certificate…'

  try {
    const id = await createSafetyCheck(result.values)
    window.location.href = pageHref('check', { id })
  } catch (error) {
    // The legacy page redirected to "Form Submitted Successfully" whether or not
    // the insert worked, so a failed write looked identical to a saved one.
    console.error('Failed to store safety check', error)
    fail('The certificate could not be saved. Nothing was recorded — please try again.', error.message)
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' })
    submitButton.disabled = false
    submitButton.textContent = 'Issue certificate'
  }
}
