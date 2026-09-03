/**
 * The certificate PDF, drawn with pdf-lib in the browser.
 *
 * pdf-lib has no layout engine — no flexbox, no text wrapping, no page breaks —
 * so this file provides the small amount of layout the certificate needs: a
 * cursor that measures down from the top of the page, word wrapping against a
 * measured font, and an `ensure()` that starts a new page before a block would
 * run off the bottom.
 *
 * Helvetica is one of the fourteen fonts built into the PDF format, so nothing
 * is fetched or embedded at render time and the file stays small.
 *
 * Tick marks are vector paths rather than symbol-font glyphs. The original
 * TCPDF export used ZapfDingbats characters, which meant the checked state
 * lived in a font rather than in the page content — it did not survive text
 * extraction and rendered inconsistently across viewers.
 */

import {
  CERTIFICATION_DECLARATION,
  CHECKLIST,
  REGULATION_PREAMBLE,
  SMOKE_ALARM_NOTE,
  TEST_RESULT_LABELS,
} from './catalog.js'
import { ORGANISATION_NAME } from './config.js'
import { formatDisplayDate } from './dates.js'
import { certificateFilename, certificateReference } from './reference.js'

const { PDFDocument, StandardFonts, rgb } = window.PDFLib

// A4 in points.
const PAGE_W = 595.28
const PAGE_H = 841.89

const MARGIN_X = 42
const CONTENT_TOP = 64
const CONTENT_BOTTOM = PAGE_H - 56
const CONTENT_W = PAGE_W - MARGIN_X * 2

const palette = {
  ink: hex('#1c2430'),
  muted: hex('#5b6675'),
  line: hex('#c9d2dd'),
  accent: hex('#365f91'),
  accentSoft: hex('#eef2f8'),
  pass: hex('#1a7f4b'),
  fail: hex('#b3261e'),
  failSoft: hex('#fdf2f1'),
  white: hex('#ffffff'),
}

function hex(value) {
  const n = parseInt(value.slice(1), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/**
 * A page with a top-down cursor.
 *
 * pdf-lib measures from the bottom-left, which is awkward for a document that
 * flows downward, so `y` here is distance from the top of the page and every
 * draw call converts on the way out.
 */
class Layout {
  constructor(doc, fonts) {
    this.doc = doc
    this.regular = fonts.regular
    this.bold = fonts.bold
    this.pages = []
    this.newPage()
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.pages.push(this.page)
    this.y = CONTENT_TOP
    return this.page
  }

  /** Starts a new page if `height` more would run past the bottom margin. */
  ensure(height) {
    if (this.y + height > CONTENT_BOTTOM) this.newPage()
  }

  font(bold) {
    return bold ? this.bold : this.regular
  }

  /** Splits `text` into lines that fit `maxWidth`, honouring existing newlines. */
  wrap(text, { size, bold = false, maxWidth }) {
    const font = this.font(bold)
    const lines = []
    for (const paragraph of String(text).split('\n')) {
      const words = paragraph.split(/\s+/).filter(Boolean)
      if (words.length === 0) {
        lines.push('')
        continue
      }
      let current = words[0]
      for (const word of words.slice(1)) {
        const candidate = `${current} ${word}`
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate
        } else {
          lines.push(current)
          current = word
        }
      }
      lines.push(current)
    }
    return lines
  }

  /** Height a block of text will occupy, without drawing it. */
  heightOf(text, { size, bold = false, maxWidth, lineHeight = 1.45 }) {
    return this.wrap(text, { size, bold, maxWidth }).length * size * lineHeight
  }

  /**
   * Draws wrapped text at the cursor (or at `top`, leaving the cursor alone) and
   * returns the height used.
   */
  text(text, options) {
    const {
      size = 8.5,
      bold = false,
      color = palette.ink,
      maxWidth = CONTENT_W,
      x = MARGIN_X,
      top = null,
      lineHeight = 1.45,
      align = 'left',
      advance = true,
    } = options || {}

    const font = this.font(bold)
    const lines = this.wrap(text, { size, bold, maxWidth })
    const step = size * lineHeight
    // Sits the glyph box in the middle of the line box.
    const baselineOffset = (step - size) / 2 + size * 0.72
    let cursor = top === null ? this.y : top

    for (const line of lines) {
      let drawX = x
      if (align !== 'left') {
        const width = font.widthOfTextAtSize(line, size)
        drawX = align === 'center' ? x + (maxWidth - width) / 2 : x + maxWidth - width
      }
      this.page.drawText(line, {
        x: drawX,
        y: PAGE_H - cursor - baselineOffset,
        size,
        font,
        color,
      })
      cursor += step
    }

    const used = lines.length * step
    if (advance && top === null) this.y += used
    return used
  }

  rect(x, top, width, height, options = {}) {
    this.page.drawRectangle({
      x,
      y: PAGE_H - top - height,
      width,
      height,
      ...(options.fill ? { color: options.fill } : {}),
      ...(options.border
        ? { borderColor: options.border, borderWidth: options.borderWidth ?? 0.75 }
        : {}),
    })
  }

  line(x1, top, x2, options = {}) {
    this.page.drawLine({
      start: { x: x1, y: PAGE_H - top },
      end: { x: x2, y: PAGE_H - top },
      thickness: options.thickness ?? 0.75,
      color: options.color ?? palette.line,
    })
  }

  /** SVG paths are drawn in a top-down space anchored at (x, top). */
  svg(path, x, top, options = {}) {
    this.page.drawSvgPath(path, {
      x,
      y: PAGE_H - top,
      ...(options.fill ? { color: options.fill } : { color: undefined }),
      ...(options.stroke ? { borderColor: options.stroke } : {}),
      ...(options.strokeWidth ? { borderWidth: options.strokeWidth } : {}),
    })
  }
}

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

const BOX = 8

function checkedMark(l, x, top) {
  l.rect(x + 0.4, top + 0.4, 7.2, 7.2, { fill: palette.pass })
  l.svg('M2 4.2 L3.4 5.7 L6.1 2.5', x, top, {
    stroke: palette.white,
    strokeWidth: 1.2,
  })
}

function notApplicableMark(l, x, top) {
  l.rect(x + 0.4, top + 0.4, 7.2, 7.2, { fill: palette.white, border: palette.line, borderWidth: 0.7 })
  l.svg('M1.6 6.4 L6.4 1.6', x, top, { stroke: palette.muted, strokeWidth: 0.9 })
}

function notIncludedMark(l, x, top) {
  l.rect(x + 0.4, top + 0.4, 7.2, 7.2, { fill: palette.white, border: palette.line, borderWidth: 0.7 })
}

function stateMark(l, x, top, state) {
  if (state === 'INCLUDED') checkedMark(l, x, top)
  else if (state === 'NOT_APPLICABLE') notApplicableMark(l, x, top)
  else notIncludedMark(l, x, top)
}

function radioMark(l, x, top, selected) {
  l.page.drawCircle({
    x: x + 4,
    y: PAGE_H - top - 4,
    size: 3.4,
    color: palette.white,
    borderColor: selected ? palette.pass : palette.line,
    borderWidth: 0.8,
  })
  if (selected) {
    l.svg('M2.2 4.1 L3.5 5.4 L5.9 2.6', x, top, {
      stroke: palette.pass,
      strokeWidth: 1.1,
    })
  }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * Space a heading must have beneath it before it is allowed to sit on a page.
 * Without this a heading strands at the foot of one page with its content
 * overleaf — the case `minPresenceAhead` covered in the react-pdf version.
 */
const KEEP_WITH_NEXT = 96

function sectionHeading(l, text) {
  const height = 17
  l.ensure(height + 20 + KEEP_WITH_NEXT)
  l.y += 14
  l.rect(MARGIN_X, l.y, CONTENT_W, height, { fill: palette.accentSoft })
  l.rect(MARGIN_X, l.y, 3, height, { fill: palette.accent })
  l.text(text.toUpperCase(), {
    size: 9.5,
    bold: true,
    color: palette.accent,
    x: MARGIN_X + 7,
    maxWidth: CONTENT_W - 14,
    top: l.y + 3.5,
  })
  l.y += height + 6
}

function subHeading(l, text) {
  l.ensure(30 + KEEP_WITH_NEXT)
  l.y += 8
  l.text(text, { size: 8.5, bold: true })
  l.y += 4
}

/** A label above a value with a hairline rule under it, as on the printed form. */
function labelledValue(l, x, top, width, label, value) {
  l.text(label.toUpperCase(), {
    size: 6.5,
    color: palette.muted,
    x,
    maxWidth: width,
    top,
  })
  const valueTop = top + 6.5 * 1.45
  const height = l.text(value, { size: 9, x, maxWidth: width, top: valueTop })
  l.line(x, valueTop + height + 3, x + width)
  return valueTop + height + 3 - top
}

function fieldRow(l, fields) {
  const gap = 14
  const totalFlex = fields.reduce((sum, f) => sum + (f.flex || 1), 0)
  const usable = CONTENT_W - gap * (fields.length - 1)

  // Measure first so the whole row moves to the next page together.
  let tallest = 0
  let x = MARGIN_X
  const placed = fields.map((field) => {
    const width = (usable * (field.flex || 1)) / totalFlex
    const entry = { ...field, x, width }
    x += width + gap
    const height = 6.5 * 1.45 + l.heightOf(field.value, { size: 9, maxWidth: width }) + 3
    tallest = Math.max(tallest, height)
    return entry
  })

  l.ensure(tallest + 6)
  for (const field of placed) {
    labelledValue(l, field.x, l.y, field.width, field.label, field.value)
  }
  l.y += tallest + 6
}

function legend(l) {
  const entries = [
    ['INCLUDED', 'Included in the safety check'],
    ['NOT_APPLICABLE', 'Not applicable to this installation'],
    ['NOT_INCLUDED', 'NI — not included in the safety check'],
  ]
  l.ensure(14)
  let x = MARGIN_X
  for (const [state, label] of entries) {
    stateMark(l, x, l.y + 1, state)
    l.text(label, { size: 6.5, color: palette.muted, x: x + BOX + 3, maxWidth: 200, top: l.y + 1 })
    x += BOX + 3 + l.regular.widthOfTextAtSize(label, 6.5) + 14
  }
  l.y += 14
}

/** One statutory checklist, in two columns like the printed form. */
function checklistBlock(l, section, states, { showLetter, showLegend }) {
  const gap = 16
  const colWidth = (CONTENT_W - gap) / 2
  const labelWidth = colWidth - BOX - 4
  const half = Math.ceil(section.items.length / 2)
  const columns = [section.items.slice(0, half), section.items.slice(half)]

  const rowHeight = (item) =>
    Math.max(BOX, l.heightOf(item.label, { size: 8, maxWidth: labelWidth })) + 2.5

  const columnHeights = columns.map((column) =>
    column.reduce((sum, item) => sum + rowHeight(item), 0),
  )
  const gridHeight = Math.max(...columnHeights)

  // The heading, its wording and the start of the list are measured together
  // and moved as one, so a section never opens at the foot of a page with its
  // items overleaf.
  const preamble =
    (showLetter ? 14 + 17 + 6 : 0) +
    (section.intro ? l.heightOf(section.intro, { size: 7, maxWidth: CONTENT_W }) + 6 : 0) +
    (section.subtitle ? 8 + 8.5 * 1.45 + 4 : 0) +
    (showLegend ? 14 : 0)

  // The tallest checklist is 20 items over two columns, so a whole block always
  // fits on a fresh page and can be moved rather than split.
  l.ensure(preamble + gridHeight)

  if (showLetter) sectionHeading(l, `${section.letter}. ${section.title}`)
  if (section.intro) {
    l.text(section.intro, { size: 7, color: palette.muted })
    l.y += 6
  }
  if (section.subtitle) subHeading(l, section.subtitle)
  if (showLegend) legend(l)

  const blockTop = l.y
  columns.forEach((column, index) => {
    const x = MARGIN_X + index * (colWidth + gap)
    let top = blockTop
    for (const item of column) {
      const state = states[item.key]
      stateMark(l, x, top + 1.5, state)
      l.text(item.label, {
        size: 8,
        x: x + BOX + 4,
        maxWidth: labelWidth,
        top,
        color: state === 'NOT_APPLICABLE' ? palette.muted : palette.ink,
      })
      if (state === 'NOT_APPLICABLE') {
        // pdf-lib has no text-decoration, so the strike-through is a rule drawn
        // across the measured width of the label.
        const width = Math.min(l.regular.widthOfTextAtSize(item.label, 8), labelWidth)
        l.line(x + BOX + 4, top + 5.8, x + BOX + 4 + width, { thickness: 0.5, color: palette.muted })
      }
      if (state === 'NOT_INCLUDED') {
        const width = l.regular.widthOfTextAtSize(item.label, 8)
        l.text('NI', {
          size: 6,
          bold: true,
          color: palette.muted,
          x: Math.min(x + BOX + 4 + width + 4, x + colWidth - 10),
          maxWidth: 12,
          top: top + 0.5,
        })
      }
      top += rowHeight(item)
    }
  })

  l.y = blockTop + Math.max(...columnHeights)
}

function rcdTable(l, tests) {
  subHeading(l, 'RCD (residual current device / safety switch) testing')

  const resultWidth = 110
  const circuitWidth = CONTENT_W - resultWidth * 2
  const headerHeight = 15

  l.ensure(headerHeight + 18)
  const tableTop = l.y
  l.rect(MARGIN_X, l.y, CONTENT_W, headerHeight, { fill: palette.accentSoft })
  const headers = [
    ['Circuit protected', MARGIN_X + 6, circuitWidth],
    ['Push button test', MARGIN_X + circuitWidth + 6, resultWidth],
    ['Time test', MARGIN_X + circuitWidth + resultWidth + 6, resultWidth],
  ]
  for (const [label, x, width] of headers) {
    l.text(label.toUpperCase(), {
      size: 6.5,
      bold: true,
      color: palette.muted,
      x,
      maxWidth: width - 12,
      top: l.y + 4,
    })
  }
  l.y += headerHeight

  let sectionTop = tableTop
  for (const test of tests) {
    const circuitHeight = l.heightOf(test.circuit, { size: 8, maxWidth: circuitWidth - 12 })
    const rowHeight = Math.max(circuitHeight, 8 * 1.45) + 8

    if (l.y + rowHeight > CONTENT_BOTTOM) {
      // Close the border around what has been drawn, then carry on overleaf.
      l.rect(MARGIN_X, sectionTop, CONTENT_W, l.y - sectionTop, { border: palette.line })
      l.newPage()
      sectionTop = l.y
    }

    l.line(MARGIN_X, l.y, MARGIN_X + CONTENT_W)
    l.text(test.circuit, {
      size: 8,
      x: MARGIN_X + 6,
      maxWidth: circuitWidth - 12,
      top: l.y + 4,
    })

    const results = [
      [test.pushButtonTest, MARGIN_X + circuitWidth + 6],
      [test.timeTest, MARGIN_X + circuitWidth + resultWidth + 6],
    ]
    for (const [result, x] of results) {
      l.text(TEST_RESULT_LABELS[result], {
        size: 8,
        bold: result !== 'NA',
        color: result === 'PASS' ? palette.pass : result === 'FAIL' ? palette.fail : palette.muted,
        x,
        maxWidth: resultWidth - 12,
        top: l.y + 4,
      })
    }
    l.y += rowHeight
  }

  l.rect(MARGIN_X, sectionTop, CONTENT_W, l.y - sectionTop, { border: palette.line })
}

function failCallout(l, count) {
  const message = `${count} RCD test${count === 1 ? '' : 's'} failed. See observations and recommendations below.`
  const height = l.heightOf(message, { size: 7.5, bold: true, maxWidth: CONTENT_W - 14 }) + 14
  l.ensure(height + 8)
  l.y += 8
  l.rect(MARGIN_X, l.y, CONTENT_W, height, { fill: palette.failSoft, border: palette.fail })
  l.text(message, {
    size: 7.5,
    bold: true,
    color: palette.fail,
    x: MARGIN_X + 7,
    maxWidth: CONTENT_W - 14,
    top: l.y + 7,
  })
  l.y += height
}

function smokeAlarms(l, data) {
  sectionHeading(l, 'E. Smoke alarms')

  const gap = 14
  const leftWidth = ((CONTENT_W - gap) * 2) / 3
  const rightX = MARGIN_X + leftWidth + gap
  const rightWidth = CONTENT_W - leftWidth - gap

  const statement =
    'All smoke alarms are correctly installed and in working condition, and have been tested according to the ' +
    "manufacturer's instructions."
  const statementHeight = l.heightOf(statement, { size: 8, maxWidth: leftWidth })

  l.ensure(statementHeight + 40)
  const top = l.y

  l.text(statement, { size: 8, maxWidth: leftWidth, top })
  const radioTop = top + statementHeight + 4
  radioMark(l, MARGIN_X, radioTop, data.smokeAlarmsCompliant)
  l.text('Yes', { size: 8, x: MARGIN_X + BOX + 4, maxWidth: 30, top: radioTop })
  radioMark(l, MARGIN_X + 50, radioTop, !data.smokeAlarmsCompliant)
  l.text('No', { size: 8, x: MARGIN_X + 50 + BOX + 4, maxWidth: 30, top: radioTop })

  const usedRight = labelledValue(
    l,
    rightX,
    top,
    rightWidth,
    'Next smoke alarm check due by',
    formatDisplayDate(data.smokeAlarmDueDate),
  )
  l.text(SMOKE_ALARM_NOTE, {
    size: 6.5,
    color: palette.muted,
    x: rightX,
    maxWidth: rightWidth,
    top: top + usedRight + 4,
  })

  l.y = top + Math.max(statementHeight + 4 + BOX + 6, usedRight + 20) + 6
}

function observations(l, text) {
  sectionHeading(l, 'F. Observations and recommendations for any actions to be taken')
  const body =
    text.trim() || 'No observations or recommendations were recorded for this installation.'
  const height = Math.max(54, l.heightOf(body, { size: 8, maxWidth: CONTENT_W - 16 }) + 16)
  l.ensure(height)
  l.rect(MARGIN_X, l.y, CONTENT_W, height, { border: palette.line })
  l.text(body, { size: 8, x: MARGIN_X + 8, maxWidth: CONTENT_W - 16, top: l.y + 8 })
  l.y += height
}

async function certification(l, data, signature) {
  sectionHeading(l, 'G. Electrical safety check certification')

  fieldRow(l, [
    { label: 'Safety check completed by', value: data.electricianName },
    { label: 'Licence / registration number', value: data.licenceNumber },
  ])
  fieldRow(l, [
    { label: 'Inspection date', value: formatDisplayDate(data.inspectionDate) },
    { label: 'Next inspection due by', value: formatDisplayDate(data.nextInspectionDue) },
  ])

  l.y += 4
  const declarationHeight = l.heightOf(CERTIFICATION_DECLARATION, { size: 7.5, maxWidth: CONTENT_W })
  l.ensure(declarationHeight + 90)
  l.text(CERTIFICATION_DECLARATION, { size: 7.5, color: palette.muted })
  l.y += 12

  const signatureHeight = 46
  const dateWidth = 150
  const signatureWidth = CONTENT_W - dateWidth - 20

  l.ensure(signatureHeight + 24)
  const top = l.y

  if (signature) {
    // Fit inside the box without distortion, anchored left as on the form.
    const scale = Math.min(signatureWidth / signature.width, signatureHeight / signature.height)
    l.page.drawImage(signature, {
      x: MARGIN_X,
      y: PAGE_H - top - signatureHeight,
      width: signature.width * scale,
      height: signature.height * scale,
    })
  }

  const ruleTop = top + signatureHeight + 2
  l.line(MARGIN_X, ruleTop, MARGIN_X + signatureWidth, { color: palette.ink })
  l.text(`SIGNATURE — ${data.electricianName}`.toUpperCase(), {
    size: 6.5,
    color: palette.muted,
    x: MARGIN_X,
    maxWidth: signatureWidth,
    top: ruleTop + 3,
  })

  labelledValue(
    l,
    MARGIN_X + signatureWidth + 20,
    ruleTop - 20,
    dateWidth,
    'Date',
    formatDisplayDate(data.signedDate),
  )

  l.y = ruleTop + 16
}

/** Header and footer are drawn last, once the total page count is known. */
function runningFurniture(l, data) {
  const total = l.pages.length
  l.pages.forEach((page, index) => {
    const original = l.page
    l.page = page

    l.text('Electrical Safety Check – Report', {
      size: 8,
      bold: true,
      color: palette.accent,
      maxWidth: CONTENT_W / 2,
      top: 26,
    })
    l.text(`${data.reference} · ${data.address}`, {
      size: 7.5,
      color: palette.muted,
      x: MARGIN_X + CONTENT_W / 2,
      maxWidth: CONTENT_W / 2,
      top: 27,
      align: 'right',
    })
    l.line(MARGIN_X, 44, MARGIN_X + CONTENT_W)

    l.line(MARGIN_X, 796, MARGIN_X + CONTENT_W)
    l.text(`${data.organisation} · Issued ${formatDisplayDate(data.signedDate)}`, {
      size: 7,
      color: palette.muted,
      maxWidth: CONTENT_W / 2,
      top: 802,
    })
    l.text(`Page ${index + 1} of ${total}`, {
      size: 7,
      color: palette.muted,
      x: MARGIN_X + CONTENT_W / 2,
      maxWidth: CONTENT_W / 2,
      top: 802,
      align: 'right',
    })

    l.page = original
  })
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Renders a stored record to PDF bytes. */
export async function renderCertificate(record) {
  const reference = certificateReference(record.serial, record.inspectionDate)
  const data = { ...record, reference, organisation: ORGANISATION_NAME }

  const doc = await PDFDocument.create()
  doc.setTitle(`Electrical Safety Check ${reference}`)
  doc.setAuthor(ORGANISATION_NAME)
  doc.setSubject(`Electrical Safety Check – Report for ${record.address}`)
  doc.setKeywords([
    'electrical safety check',
    'Residential Tenancies Regulations 2021',
    'AS/NZS 3019',
  ])
  doc.setCreator(ORGANISATION_NAME)
  doc.setProducer(ORGANISATION_NAME)

  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }

  let signature = null
  if (record.signatureImage) {
    try {
      signature = await doc.embedPng(record.signatureImage)
    } catch {
      // A certificate missing its signature image is still worth producing; the
      // ruled signature line prints empty.
      signature = null
    }
  }

  const l = new Layout(doc, fonts)

  l.text('Residential Tenancies Regulations 2021', {
    size: 9.5,
    bold: true,
    color: palette.accent,
    align: 'center',
  })
  l.text('Electrical Safety Check – Report', {
    size: 15,
    bold: true,
    color: palette.accent,
    align: 'center',
  })
  l.y += 10

  // Reference strip
  const stripHeight = 26
  l.rect(MARGIN_X, l.y, CONTENT_W, stripHeight, {
    fill: palette.accentSoft,
    border: palette.line,
  })
  const strip = [
    ['Certificate', reference],
    ['Inspection date', formatDisplayDate(record.inspectionDate)],
    ['Next inspection due', formatDisplayDate(record.nextInspectionDue)],
  ]
  strip.forEach(([label, value], index) => {
    const width = CONTENT_W / 3
    const x = MARGIN_X + 10 + index * width
    l.text(label.toUpperCase(), {
      size: 6.5,
      color: palette.muted,
      x,
      maxWidth: width - 10,
      top: l.y + 6,
    })
    l.text(value, { size: 9, bold: true, x, maxWidth: width - 10, top: l.y + 14 })
  })
  l.y += stripHeight + 12

  l.text(REGULATION_PREAMBLE, { size: 7.5, color: palette.muted })
  l.y += 6

  sectionHeading(l, 'A. Installation address')
  fieldRow(l, [
    { label: 'Address', value: record.address, flex: 2 },
    {
      label: 'Date of previous safety check',
      value: record.previousCheckDate
        ? formatDisplayDate(record.previousCheckDate)
        : 'None recorded',
    },
  ])

  CHECKLIST.forEach((section, index) => {
    checklistBlock(l, section, record.checklist[section.section] || {}, {
      showLetter: index === 0 || CHECKLIST[index - 1].letter !== section.letter,
      showLegend: index === 0,
    })
  })

  rcdTable(l, record.rcdTests)

  const failures = record.rcdTests.filter(
    (test) => test.pushButtonTest === 'FAIL' || test.timeTest === 'FAIL',
  )
  if (failures.length > 0) failCallout(l, failures.length)

  smokeAlarms(l, record)
  observations(l, record.observations)
  await certification(l, record, signature)

  runningFurniture(l, data)

  return doc.save()
}

/** Renders and hands the file to the browser. */
export async function downloadCertificate(record, { inline = false } = {}) {
  const bytes = await renderCertificate(record)
  const reference = certificateReference(record.serial, record.inspectionDate)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  if (inline) {
    window.open(url, '_blank')
    // Give the new tab time to take the blob before it is revoked.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return
  }

  const link = document.createElement('a')
  link.href = url
  link.download = certificateFilename(reference, record.address)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
