import { StyleSheet } from '@react-pdf/renderer'

/**
 * Type scale and palette for the certificate.
 *
 * Helvetica is one of the fourteen fonts built into the PDF format, so nothing
 * has to be fetched or embedded at render time and the file stays small.
 */
export const palette = {
  ink: '#1c2430',
  muted: '#5b6675',
  line: '#c9d2dd',
  accent: '#365f91',
  accentSoft: '#eef2f8',
  pass: '#1a7f4b',
  fail: '#b3261e',
}

export const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 42,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    lineHeight: 1.45,
    color: palette.ink,
  },

  runningHeader: {
    position: 'absolute',
    top: 26,
    left: 42,
    right: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 0.75,
    borderBottomColor: palette.line,
    paddingBottom: 6,
  },
  runningHeaderTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: palette.accent },
  runningHeaderMeta: { fontSize: 7.5, color: palette.muted },

  // Positioned from the top like the header. Anchoring a `fixed` element with
  // `bottom` measured the box against the page's flowing content rather than the
  // page edge, which dropped it off the rendered area entirely.
  runningFooter: {
    position: 'absolute',
    top: 796,
    left: 42,
    right: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderTopWidth: 0.75,
    borderTopColor: palette.line,
    paddingTop: 6,
  },
  runningFooterText: { fontSize: 7, color: palette.muted },

  titleBlock: { marginBottom: 12, textAlign: 'center' },
  regulation: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: palette.accent },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 15, color: palette.accent, marginTop: 2 },

  referenceStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: palette.accentSoft,
    borderWidth: 0.75,
    borderColor: palette.line,
    borderRadius: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  referenceItem: { flexGrow: 1 },
  referenceLabel: { fontSize: 6.5, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  referenceValue: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginTop: 1 },

  preamble: { fontSize: 7.5, color: palette.muted, marginBottom: 14, textAlign: 'justify' },

  sectionHeading: {
    backgroundColor: palette.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginTop: 14,
    marginBottom: 6,
  },
  sectionHeadingText: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: palette.accent },
  subHeading: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, marginTop: 8, marginBottom: 4 },
  sectionIntro: { fontSize: 7, color: palette.muted, marginBottom: 6, textAlign: 'justify' },

  fieldRow: { flexDirection: 'row', gap: 14, marginBottom: 6 },
  fieldLabel: { fontSize: 6.5, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldValue: {
    fontSize: 9,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: palette.line,
  },

  checklistGrid: { flexDirection: 'row', gap: 16 },
  checklistColumn: { flexGrow: 1, flexBasis: 0 },
  checklistRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2.5 },
  checklistLabel: { flexShrink: 1, fontSize: 8 },
  checklistLabelNotApplicable: {
    flexShrink: 1,
    fontSize: 8,
    color: palette.muted,
    textDecoration: 'line-through',
  },
  checklistTag: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    color: palette.muted,
    marginLeft: 4,
    marginTop: 0.5,
  },

  legend: { flexDirection: 'row', gap: 14, marginBottom: 8, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendText: { fontSize: 6.5, color: palette.muted, marginLeft: 3 },

  table: { borderWidth: 0.75, borderColor: palette.line, borderRadius: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: palette.accentSoft },
  tableRow: { flexDirection: 'row', borderTopWidth: 0.75, borderTopColor: palette.line },
  tableCell: { paddingVertical: 4, paddingHorizontal: 6, fontSize: 8 },
  tableHeaderCell: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colCircuit: { flexGrow: 1, flexBasis: 0 },
  colResult: { width: 110 },
  resultPass: { color: palette.pass, fontFamily: 'Helvetica-Bold' },
  resultFail: { color: palette.fail, fontFamily: 'Helvetica-Bold' },
  resultNa: { color: palette.muted },

  observations: {
    borderWidth: 0.75,
    borderColor: palette.line,
    borderRadius: 2,
    padding: 8,
    minHeight: 54,
    fontSize: 8,
  },

  declaration: { fontSize: 7.5, color: palette.muted, marginTop: 10, textAlign: 'justify' },

  signatureRow: { flexDirection: 'row', gap: 20, marginTop: 12, alignItems: 'flex-end' },
  signatureBox: { flexGrow: 1 },
  signatureImage: { height: 46, objectFit: 'contain', objectPositionX: 0 },
  signatureRule: { borderTopWidth: 0.75, borderTopColor: palette.ink, marginTop: 2, paddingTop: 3 },

  calloutFail: {
    borderWidth: 0.75,
    borderColor: palette.fail,
    borderRadius: 2,
    backgroundColor: '#fdf2f1',
    padding: 7,
    marginTop: 8,
  },
  calloutFailText: { fontSize: 7.5, color: palette.fail, fontFamily: 'Helvetica-Bold' },
})
