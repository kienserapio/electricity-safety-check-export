/**
 * The statutory checklist content, defined once and consumed by the form, the
 * validation schema and the PDF renderer.
 *
 * The legacy PHP page repeated these labels in three places — the form inputs,
 * the values posted to the database and the export template — which let them
 * drift apart. Anything that needs a label now reads it from here.
 */

export const CHECKLIST_SECTIONS = [
  'EXTENT',
  'VISUAL_INSPECTION',
  'POLARITY',
  'EARTH_CONTINUITY',
] as const

export type ChecklistSection = (typeof CHECKLIST_SECTIONS)[number]

export const ITEM_STATES = ['INCLUDED', 'NOT_APPLICABLE', 'NOT_INCLUDED'] as const
export type ItemState = (typeof ITEM_STATES)[number]

export const ITEM_STATE_LABELS: Record<ItemState, string> = {
  INCLUDED: 'Checked',
  NOT_APPLICABLE: 'N/A',
  NOT_INCLUDED: 'NI',
}

export const ITEM_STATE_DESCRIPTIONS: Record<ItemState, string> = {
  INCLUDED: 'Included in the safety check',
  NOT_APPLICABLE: 'Not applicable to this installation',
  NOT_INCLUDED: 'Not included in the safety check',
}

export const TEST_RESULTS = ['PASS', 'FAIL', 'NA'] as const
export type TestResult = (typeof TEST_RESULTS)[number]

export const TEST_RESULT_LABELS: Record<TestResult, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NA: 'N/A',
}

export interface ChecklistItem {
  /** Stable identifier. Never change these — stored rows reference them. */
  key: string
  label: string
}

export interface ChecklistSectionDefinition {
  section: ChecklistSection
  /** Letter used on the printed form, e.g. "B". */
  letter: string
  title: string
  /** Sub-heading for sections that print under a shared letter. */
  subtitle?: string
  intro: string
  items: ChecklistItem[]
}

const item = (key: string, label: string): ChecklistItem => ({ key, label })

export const CHECKLIST: ChecklistSectionDefinition[] = [
  {
    section: 'EXTENT',
    letter: 'B',
    title: 'Extent of the installation and limitations of the inspection and testing',
    intro:
      'Details of those parts of the installation and limitations of the safety check covered by this certificate. ' +
      'Mark each part as checked, not applicable, or not included in the safety check.',
    items: [
      item('main_switchboard', 'Main switchboard'),
      item('main_earthing_system', 'Main earthing system'),
      item('kitchen', 'Kitchen'),
      item('bathroom_main', 'Bathroom (main)'),
      item('bathrooms_other', 'Other bathrooms/ensuites'),
      item('bedroom_main', 'Bedroom (main)'),
      item('bedrooms_other', 'Other bedrooms'),
      item('living_room', 'Living room'),
      item('living_areas_other', 'Other living areas'),
      item('laundry', 'Laundry'),
      item('garage', 'Garage'),
      item('solar_battery_system', 'Solar/battery system'),
      item('electric_water_heater', 'Electric water heater'),
      item('dishwasher', 'Dishwasher'),
      item('space_heaters', 'Electric room/space heaters'),
      item('swimming_pool_equipment', 'Swimming pool equipment'),
    ],
  },
  {
    section: 'VISUAL_INSPECTION',
    letter: 'C',
    title: 'Safety check – visual inspection',
    intro:
      'As far as practicable a VISUAL INSPECTION of the following items has been carried out per the requirements of ' +
      'section 3 and 4 of AS/NZS 3019:2007 Electrical installations — Periodic verification.',
    items: [
      item('consumers_mains', 'Consumers mains'),
      item('switchboards', 'Switchboards'),
      item('exposed_earth_electrode', 'Exposed earth electrode'),
      item('metallic_water_pipe_bond', 'Metallic water pipe bond'),
      item('rcds', 'RCDs (safety switches)'),
      item('circuit_protection', 'Circuit protection (circuit breakers / fuses)'),
      item('socket_outlets', 'Socket-outlets'),
      item('light_fittings', 'Light fittings'),
      item('electric_water_heater', 'Electric water heater'),
      item('air_conditioners', 'Air conditioners'),
      item('space_heaters', 'Space heaters'),
      item('cooking_equipment', 'Cooking equipment'),
      item('dishwasher', 'Dishwasher'),
      item('exhaust_fans', 'Exhaust fans'),
      item('ceiling_fans', 'Ceiling fans'),
      item('washing_machine_dryer', 'Washing machine/dryer'),
      item('installation_wiring', 'Installation wiring'),
      item('renewable_systems', 'Solar and other renewable systems'),
      item('swimming_pool_equipment', 'Swimming pool equipment'),
      item('vehicle_chargers', 'Vehicle chargers'),
    ],
  },
  {
    section: 'POLARITY',
    letter: 'D',
    title: 'Safety check – verified by testing',
    subtitle: 'Polarity and correct connections testing',
    intro:
      'As far as practicable TESTING of the following items has been carried out per the requirements of section 4 of ' +
      'AS/NZS 3019:2007 Electrical installations — Periodic verification.',
    items: [
      item('consumers_mains', 'Consumers mains'),
      item('circuit_protection', 'Circuit protection (circuit breakers / fuses)'),
      item('rcds', 'RCDs (safety switches)'),
      item('socket_outlets', 'Socket-outlets'),
      item('light_fittings', 'Light fittings'),
      item('electric_water_heater', 'Electric water heater'),
      item('air_conditioners', 'Air conditioners'),
      item('cooking_equipment', 'Cooking equipment'),
      item('dishwasher', 'Dishwasher'),
      item('renewable_systems', 'Solar and other renewable systems'),
      item('swimming_pool_equipment', 'Swimming pool equipment'),
      item('vehicle_chargers', 'Vehicle chargers'),
    ],
  },
  {
    section: 'EARTH_CONTINUITY',
    letter: 'D',
    title: 'Safety check – verified by testing',
    subtitle: 'Earth continuity testing',
    intro: '',
    items: [
      item('mains_earth_conductor', 'Mains earth conductor'),
      item('switchboard_enclosure', 'Switchboard enclosure'),
      item('metallic_water_pipe_bond', 'Metallic water pipe bond'),
      item('socket_outlets', 'Socket-outlets'),
      item('light_fittings', 'Light fittings'),
      item('exhaust_fans', 'Exhaust fans'),
      item('ceiling_fans', 'Ceiling fans'),
      item('electric_water_heater', 'Electric water heater'),
      item('air_conditioners', 'Air conditioners'),
      item('cooking_equipment', 'Cooking equipment'),
      item('dishwasher', 'Dishwasher'),
      item('renewable_systems', 'Solar and other renewable systems'),
      item('swimming_pool_equipment', 'Swimming pool equipment'),
      item('vehicle_chargers', 'Vehicle chargers'),
    ],
  },
]

export const CHECKLIST_BY_SECTION = new Map(CHECKLIST.map((s) => [s.section, s]))

/** Circuits pre-populated in the RCD table. The electrician can add or remove rows. */
export const DEFAULT_RCD_CIRCUITS = [
  'Power outlets',
  'Power outlets',
  'Power outlets',
  'Lighting',
  'Lighting',
  'Other',
]

/**
 * Resolves an item key back to its printed label. Returns the key itself if the
 * catalogue no longer contains it, so historical records still render.
 */
export function itemLabel(section: ChecklistSection, key: string): string {
  return CHECKLIST_BY_SECTION.get(section)?.items.find((i) => i.key === key)?.label ?? key
}

export const REGULATION_PREAMBLE =
  'This electrical safety check is for electrical safety purposes only and is in accordance with the requirements of ' +
  'the Residential Tenancies Regulations 2021 and is prepared in accordance with section 2 of the Australian/New Zealand ' +
  'Standard AS/NZS 3019, Electrical installations — Periodic verification, to confirm that the installation is not damaged ' +
  'or has not deteriorated so as to impair electrical safety, and to identify installation defects and departures from the ' +
  'requirements that may give rise to danger.'

export const CERTIFICATION_DECLARATION =
  'I, the above named licenced electrician, have carried out an electrical safety check of this residential tenancy per the ' +
  'requirements of the Residential Tenancies Regulations 2021 and as set out in the Australian/New Zealand Standard ' +
  'AS/NZS 3019, Electrical installations — Periodic verification, and have recorded my observations and recommendations.'

export const SMOKE_ALARM_NOTE =
  "All smoke alarms must be tested according to the manufacturer's instructions at least once every 12 months."

export const ORGANISATION_NAME =
  process.env.NEXT_PUBLIC_ORGANISATION_NAME?.trim() || 'Colney & Co'
