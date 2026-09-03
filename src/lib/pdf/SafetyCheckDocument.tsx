import { Document, Image, Page, Text, View } from '@react-pdf/renderer'

import {
  CERTIFICATION_DECLARATION,
  CHECKLIST,
  REGULATION_PREAMBLE,
  SMOKE_ALARM_NOTE,
  TEST_RESULT_LABELS,
  type ChecklistSection,
  type ItemState,
  type TestResult,
} from '@/lib/catalog'
import { formatDisplayDate } from '@/lib/dates'

import { CheckedMark, NotApplicableMark, NotIncludedMark, RadioMark } from './marks'
import { palette, styles } from './styles'

export interface CertificateRcdTest {
  circuit: string
  pushButtonTest: TestResult
  timeTest: TestResult
}

export interface CertificateData {
  reference: string
  organisation: string
  address: string
  previousCheckDate: Date | null
  checklist: Record<ChecklistSection, Record<string, ItemState>>
  rcdTests: CertificateRcdTest[]
  smokeAlarmsCompliant: boolean
  smokeAlarmDueDate: Date
  observations: string
  electricianName: string
  licenceNumber: string
  inspectionDate: Date
  nextInspectionDue: Date
  signatureImage: string
  signedDate: Date
}

function ChecklistRow({ label, state }: { label: string; state: ItemState | undefined }) {
  return (
    <View style={styles.checklistRow} wrap={false}>
      {state === 'INCLUDED' ? (
        <CheckedMark />
      ) : state === 'NOT_APPLICABLE' ? (
        <NotApplicableMark />
      ) : (
        <NotIncludedMark />
      )}
      <Text
        style={
          state === 'NOT_APPLICABLE' ? styles.checklistLabelNotApplicable : styles.checklistLabel
        }
      >
        {label}
      </Text>
      {state === 'NOT_INCLUDED' ? <Text style={styles.checklistTag}>NI</Text> : null}
    </View>
  )
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <CheckedMark />
        <Text style={styles.legendText}>Included in the safety check</Text>
      </View>
      <View style={styles.legendItem}>
        <NotApplicableMark />
        <Text style={styles.legendText}>Not applicable to this installation</Text>
      </View>
      <View style={styles.legendItem}>
        <NotIncludedMark />
        <Text style={styles.legendText}>NI — not included in the safety check</Text>
      </View>
    </View>
  )
}

function ChecklistBlock({
  section,
  states,
  showLetterHeading,
  showLegend,
}: {
  section: (typeof CHECKLIST)[number]
  states: Record<string, ItemState>
  /** Section D covers two checklists, so only the first one prints the letter. */
  showLetterHeading: boolean
  showLegend?: boolean
}) {
  const half = Math.ceil(section.items.length / 2)
  const columns = [section.items.slice(0, half), section.items.slice(half)]

  // A fragment, not a wrapping View: `minPresenceAhead` is only honoured on
  // nodes the page itself lays out, so nesting the heading would let it strand
  // at the foot of a page with its list overleaf.
  return (
    <>
      {showLetterHeading ? (
        <View style={styles.sectionHeading} minPresenceAhead={96}>
          <Text style={styles.sectionHeadingText}>
            {section.letter}. {section.title.toUpperCase()}
          </Text>
        </View>
      ) : null}
      {section.intro ? <Text style={styles.sectionIntro}>{section.intro}</Text> : null}
      {section.subtitle ? <Text style={styles.subHeading} minPresenceAhead={96}>
          {section.subtitle}
        </Text> : null}
      {showLegend ? <Legend /> : null}
      <View style={styles.checklistGrid}>
        {columns.map((column, index) => (
          <View key={index} style={styles.checklistColumn}>
            {column.map((item) => (
              <ChecklistRow key={item.key} label={item.label} state={states[item.key]} />
            ))}
          </View>
        ))}
      </View>
    </>
  )
}

function resultStyle(result: TestResult) {
  if (result === 'PASS') return styles.resultPass
  if (result === 'FAIL') return styles.resultFail
  return styles.resultNa
}

function LabelledValue({ label, value, flex = 1 }: { label: string; value: string; flex?: number }) {
  return (
    <View style={{ flexGrow: flex, flexBasis: 0 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  )
}

export function SafetyCheckDocument({ data }: { data: CertificateData }) {
  const failedTests = data.rcdTests.filter(
    (test) => test.pushButtonTest === 'FAIL' || test.timeTest === 'FAIL',
  )

  return (
    <Document
      title={`Electrical Safety Check ${data.reference}`}
      author={data.organisation}
      subject={`Electrical Safety Check – Report for ${data.address}`}
      keywords="electrical safety check, Residential Tenancies Regulations 2021, AS/NZS 3019"
      creator={data.organisation}
      producer={data.organisation}
    >
      <Page size="A4" style={styles.page}>
        {/* Repeated on every page so a detached sheet is still identifiable. */}
        <View style={styles.runningHeader} fixed>
          <Text style={styles.runningHeaderTitle}>Electrical Safety Check – Report</Text>
          <Text style={styles.runningHeaderMeta}>
            {data.reference} · {data.address}
          </Text>
        </View>

        <View style={styles.runningFooter} fixed>
          <Text style={styles.runningFooterText}>
            {data.organisation} · Issued {formatDisplayDate(data.signedDate)}
          </Text>
          <Text
            style={styles.runningFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.regulation}>Residential Tenancies Regulations 2021</Text>
          <Text style={styles.title}>Electrical Safety Check – Report</Text>
        </View>

        <View style={styles.referenceStrip}>
          <View style={styles.referenceItem}>
            <Text style={styles.referenceLabel}>Certificate</Text>
            <Text style={styles.referenceValue}>{data.reference}</Text>
          </View>
          <View style={styles.referenceItem}>
            <Text style={styles.referenceLabel}>Inspection date</Text>
            <Text style={styles.referenceValue}>{formatDisplayDate(data.inspectionDate)}</Text>
          </View>
          <View style={styles.referenceItem}>
            <Text style={styles.referenceLabel}>Next inspection due</Text>
            <Text style={styles.referenceValue}>{formatDisplayDate(data.nextInspectionDue)}</Text>
          </View>
        </View>

        <Text style={styles.preamble}>{REGULATION_PREAMBLE}</Text>

        {/* A. Installation address */}
        <View style={styles.sectionHeading} minPresenceAhead={96}>
          <Text style={styles.sectionHeadingText}>A. INSTALLATION ADDRESS</Text>
        </View>
        <View style={styles.fieldRow}>
          <LabelledValue label="Address" value={data.address} flex={2} />
          <LabelledValue
            label="Date of previous safety check"
            value={data.previousCheckDate ? formatDisplayDate(data.previousCheckDate) : 'None recorded'}
          />
        </View>

        {CHECKLIST.map((section, index) => (
          <ChecklistBlock
            key={`${section.section}`}
            section={section}
            states={data.checklist[section.section] ?? {}}
            showLetterHeading={index === 0 || CHECKLIST[index - 1].letter !== section.letter}
            showLegend={index === 0}
          />
        ))}

        {/* D. RCD testing */}
        <Text style={styles.subHeading} minPresenceAhead={96}>
          RCD (residual current device / safety switch) testing
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colCircuit]}>Circuit protected</Text>
            <Text style={[styles.tableHeaderCell, styles.colResult]}>Push button test</Text>
            <Text style={[styles.tableHeaderCell, styles.colResult]}>Time test</Text>
          </View>
          {data.rcdTests.map((test, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCell, styles.colCircuit]}>{test.circuit}</Text>
              <Text style={[styles.tableCell, styles.colResult, resultStyle(test.pushButtonTest)]}>
                {TEST_RESULT_LABELS[test.pushButtonTest]}
              </Text>
              <Text style={[styles.tableCell, styles.colResult, resultStyle(test.timeTest)]}>
                {TEST_RESULT_LABELS[test.timeTest]}
              </Text>
            </View>
          ))}
        </View>

        {failedTests.length > 0 ? (
          <View style={styles.calloutFail}>
            <Text style={styles.calloutFailText}>
              {failedTests.length} RCD test{failedTests.length === 1 ? '' : 's'} failed. See
              observations and recommendations below.
            </Text>
          </View>
        ) : null}

        {/* E. Smoke alarms */}
        <View style={styles.sectionHeading} minPresenceAhead={96}>
          <Text style={styles.sectionHeadingText}>E. SMOKE ALARMS</Text>
        </View>
        <View style={styles.fieldRow}>
          <View style={{ flexGrow: 2, flexBasis: 0 }}>
            <Text style={{ fontSize: 8, marginBottom: 4 }}>
              All smoke alarms are correctly installed and in working condition, and have been
              tested according to the manufacturer&apos;s instructions.
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={styles.legendItem}>
                <RadioMark selected={data.smokeAlarmsCompliant} />
                <Text style={{ fontSize: 8 }}>Yes</Text>
              </View>
              <View style={styles.legendItem}>
                <RadioMark selected={!data.smokeAlarmsCompliant} />
                <Text style={{ fontSize: 8 }}>No</Text>
              </View>
            </View>
          </View>
          <View style={{ flexGrow: 1, flexBasis: 0 }}>
            <Text style={styles.fieldLabel}>Next smoke alarm check due by</Text>
            <Text style={styles.fieldValue}>{formatDisplayDate(data.smokeAlarmDueDate)}</Text>
            <Text style={{ fontSize: 6.5, color: palette.muted, marginTop: 4 }}>
              {SMOKE_ALARM_NOTE}
            </Text>
          </View>
        </View>

        {/* F. Observations */}
        <View style={styles.sectionHeading} wrap={false} minPresenceAhead={96}>
          <Text style={styles.sectionHeadingText}>
            F. OBSERVATIONS AND RECOMMENDATIONS FOR ANY ACTIONS TO BE TAKEN
          </Text>
        </View>
        <View style={styles.observations}>
          <Text>
            {data.observations.trim() ||
              'No observations or recommendations were recorded for this installation.'}
          </Text>
        </View>

        {/* G. Certification */}
        <View style={styles.sectionHeading} wrap={false} minPresenceAhead={96}>
          <Text style={styles.sectionHeadingText}>G. ELECTRICAL SAFETY CHECK CERTIFICATION</Text>
        </View>
        <View style={styles.fieldRow}>
          <LabelledValue label="Safety check completed by" value={data.electricianName} />
          <LabelledValue label="Licence / registration number" value={data.licenceNumber} />
        </View>
        <View style={styles.fieldRow}>
          <LabelledValue label="Inspection date" value={formatDisplayDate(data.inspectionDate)} />
          <LabelledValue
            label="Next inspection due by"
            value={formatDisplayDate(data.nextInspectionDue)}
          />
        </View>

        <Text style={styles.declaration}>{CERTIFICATION_DECLARATION}</Text>

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBox}>
            {data.signatureImage ? (
              <Image src={data.signatureImage} style={styles.signatureImage} />
            ) : (
              <View style={{ height: 46 }} />
            )}
            <View style={styles.signatureRule}>
              <Text style={styles.fieldLabel}>Signature — {data.electricianName}</Text>
            </View>
          </View>
          <View style={{ width: 150 }}>
            <Text style={styles.fieldLabel}>Date</Text>
            <Text style={styles.fieldValue}>{formatDisplayDate(data.signedDate)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
