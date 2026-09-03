/**
 * Supabase storage, for when a real database exists.
 *
 * Same three functions as store-local.js, returning the same shapes, so the
 * pages never learn which one they are talking to. Selected by setting
 * STORAGE = 'supabase' in config.js.
 *
 * This module is only imported when that setting is chosen, so the local-only
 * build never reaches out to a CDN for the client library.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js'
import { parseDateOnly } from './dates.js'

export const isDurable = true
export const label = 'Supabase'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/** False while config.js still holds its placeholder values. */
export function isConfigured() {
  return !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY')
}

/**
 * Writes a certificate and returns its id.
 *
 * The insert goes through a database function so the certificate, its checklist
 * and its RCD rows land in one transaction. The legacy page fired an insert and
 * redirected to "Form Submitted Successfully" without looking at the result, so
 * a failed write was indistinguishable from a saved one; here a failure throws
 * and the form says nothing was recorded.
 */
export async function createSafetyCheck(values) {
  const { data, error } = await supabase.rpc('create_safety_check', { payload: values })
  if (error) throw new Error(error.message)
  return data
}

/** Register rows, newest inspection first. `search` matches address, name or licence. */
export async function listSafetyChecks(search) {
  let query = supabase
    .from('safety_check')
    .select('id, serial, address, electrician_name, inspection_date, next_inspection_due, smoke_alarms_compliant')
    .order('inspection_date', { ascending: false })
    .limit(100)

  const term = (search || '').trim()
  if (term) {
    const pattern = `%${term.replace(/[%_]/g, (c) => `\\${c}`)}%`
    query = query.or(
      `address.ilike.${pattern},electrician_name.ilike.${pattern},licence_number.ilike.${pattern}`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []).map(toSummary)
}

/** Everything the certificate page and the PDF need, in one round trip. */
export async function getSafetyCheck(id) {
  const { data, error } = await supabase
    .from('safety_check')
    .select('*, checklist_entry(section, item_key, state), rcd_test(position, circuit, push_button_test, time_test)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? toRecord(data) : null
}

function toSummary(row) {
  return {
    id: row.id,
    serial: row.serial,
    address: row.address,
    electricianName: row.electrician_name,
    inspectionDate: parseDateOnly(row.inspection_date),
    nextInspectionDue: parseDateOnly(row.next_inspection_due),
    smokeAlarmsCompliant: row.smoke_alarms_compliant,
  }
}

/** snake_case columns in, the camelCase shape the rest of the app expects out. */
function toRecord(row) {
  const checklist = {}
  for (const entry of row.checklist_entry || []) {
    if (!checklist[entry.section]) checklist[entry.section] = {}
    checklist[entry.section][entry.item_key] = entry.state
  }

  const rcdTests = (row.rcd_test || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((test) => ({
      circuit: test.circuit,
      pushButtonTest: test.push_button_test,
      timeTest: test.time_test,
    }))

  return {
    id: row.id,
    serial: row.serial,
    address: row.address,
    previousCheckDate: parseDateOnly(row.previous_check_date),
    checklist,
    rcdTests,
    smokeAlarmsCompliant: row.smoke_alarms_compliant,
    smokeAlarmDueDate: parseDateOnly(row.smoke_alarm_due_date),
    observations: row.observations,
    electricianName: row.electrician_name,
    licenceNumber: row.licence_number,
    inspectionDate: parseDateOnly(row.inspection_date),
    nextInspectionDue: parseDateOnly(row.next_inspection_due),
    signatureImage: row.signature_image,
    signedDate: parseDateOnly(row.signed_date),
  }
}
