-- Electrical Safety Check — Supabase schema
--
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- Shape follows the Prisma schema it replaces: one row per certificate, one row
-- per checklist line, one row per RCD test. The legacy PHP table stored the
-- checklists as comma-joined strings in single columns and capped RCD tests at
-- ten fixed slots; neither survives here.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.checklist_section as enum (
  'EXTENT', 'VISUAL_INSPECTION', 'POLARITY', 'EARTH_CONTINUITY'
);

-- Tick, strike out, or mark NI. The statutory form asks for three outcomes per
-- line, which a plain checkbox cannot express.
create type public.item_state as enum (
  'INCLUDED', 'NOT_APPLICABLE', 'NOT_INCLUDED'
);

create type public.test_result as enum ('PASS', 'FAIL', 'NA');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.safety_check (
  id uuid primary key default gen_random_uuid(),

  -- Backs the human-readable reference (ESC-<year>-<serial>). `id` is what
  -- appears in URLs so the register is not enumerable.
  serial bigint generated always as identity,

  -- A. Installation address
  address text not null,
  previous_check_date date,

  -- E. Smoke alarms
  smoke_alarms_compliant boolean not null,
  smoke_alarm_due_date date not null,

  -- F. Observations and recommendations
  observations text not null default '',

  -- G. Certification
  electrician_name text not null,
  licence_number text not null,
  inspection_date date not null,
  next_inspection_due date not null,
  signature_image text not null,
  signed_date date not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint serial_unique unique (serial),

  constraint address_length
    check (length(btrim(address)) between 1 and 500),
  constraint electrician_name_length
    check (length(btrim(electrician_name)) between 1 and 200),
  constraint licence_number_length
    check (length(btrim(licence_number)) between 1 and 100),
  constraint observations_length
    check (length(observations) <= 5000),

  -- The signature is a drawn PNG, not a typed name as the legacy form accepted.
  constraint signature_is_png
    check (signature_image like 'data:image/png;base64,%'),
  constraint signature_size
    check (length(signature_image) <= 400000),

  -- Regulation intervals and date ordering. CURRENT_DATE is only STABLE so the
  -- "not in the future" rule cannot live in a CHECK; it is enforced in
  -- create_safety_check() below.
  constraint next_after_inspection
    check (next_inspection_due > inspection_date),
  constraint smoke_due_after_inspection
    check (smoke_alarm_due_date > inspection_date),
  constraint smoke_within_twelve_months
    check (smoke_alarm_due_date <= inspection_date + interval '1 year'),
  constraint previous_before_inspection
    check (previous_check_date is null or previous_check_date < inspection_date),
  constraint signed_not_before_inspection
    check (signed_date >= inspection_date)
);

create index safety_check_address_idx on public.safety_check (address);
create index safety_check_inspection_date_idx on public.safety_check (inspection_date desc);
create index safety_check_next_due_idx on public.safety_check (next_inspection_due);

create table public.checklist_entry (
  id uuid primary key default gen_random_uuid(),
  safety_check_id uuid not null
    references public.safety_check (id) on delete cascade,
  section public.checklist_section not null,
  item_key text not null,
  state public.item_state not null,

  constraint checklist_entry_unique unique (safety_check_id, section, item_key)
);

create index checklist_entry_check_idx on public.checklist_entry (safety_check_id);

create table public.rcd_test (
  id uuid primary key default gen_random_uuid(),
  safety_check_id uuid not null
    references public.safety_check (id) on delete cascade,
  position integer not null,
  circuit text not null,
  push_button_test public.test_result not null,
  time_test public.test_result not null,

  constraint rcd_test_unique unique (safety_check_id, position),
  constraint circuit_length check (length(btrim(circuit)) between 1 and 200)
);

create index rcd_test_check_idx on public.rcd_test (safety_check_id);

-- ---------------------------------------------------------------------------
-- Write path
-- ---------------------------------------------------------------------------

-- Certificates are created only through this function. It runs as the owner, so
-- the tables themselves can refuse every direct INSERT from the browser — a
-- caller cannot skip the rules by posting straight at the REST API.
--
-- Everything here is also checked in js/validate.js for instant feedback. This
-- is the copy that actually gates the write.
create or replace function public.create_safety_check(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  inspection date;
  rcd jsonb;
  entry jsonb;
  row_index integer := 0;
  rcd_count integer;
  has_failure boolean := false;
  observations text;
begin
  inspection := (payload ->> 'inspectionDate')::date;
  observations := coalesce(payload ->> 'observations', '');

  if inspection > current_date then
    raise exception 'The inspection date cannot be in the future.'
      using errcode = 'check_violation';
  end if;

  rcd_count := jsonb_array_length(coalesce(payload -> 'rcdTests', '[]'::jsonb));
  if rcd_count < 1 then
    raise exception 'Record at least one RCD test.'
      using errcode = 'check_violation';
  end if;
  if rcd_count > 60 then
    raise exception 'Sixty RCD rows is the practical limit for one report.'
      using errcode = 'check_violation';
  end if;

  for rcd in select * from jsonb_array_elements(payload -> 'rcdTests') loop
    if rcd ->> 'pushButtonTest' = 'FAIL' or rcd ->> 'timeTest' = 'FAIL' then
      has_failure := true;
    end if;
  end loop;

  -- A failed RCD or a non-compliant smoke alarm is exactly what the
  -- observations box exists for, so a report cannot go out recording a failure
  -- and nothing else.
  if has_failure and btrim(observations) = '' then
    raise exception 'An RCD failed. Record what was found and what action is recommended.'
      using errcode = 'check_violation';
  end if;

  if (payload ->> 'smokeAlarmsCompliant')::boolean is false
     and btrim(observations) = '' then
    raise exception 'Smoke alarms are not compliant. Record what was found and what is recommended.'
      using errcode = 'check_violation';
  end if;

  insert into public.safety_check (
    address, previous_check_date, smoke_alarms_compliant, smoke_alarm_due_date,
    observations, electrician_name, licence_number, inspection_date,
    next_inspection_due, signature_image, signed_date
  ) values (
    payload ->> 'address',
    nullif(payload ->> 'previousCheckDate', '')::date,
    (payload ->> 'smokeAlarmsCompliant')::boolean,
    (payload ->> 'smokeAlarmDueDate')::date,
    observations,
    payload ->> 'electricianName',
    payload ->> 'licenceNumber',
    inspection,
    (payload ->> 'nextInspectionDue')::date,
    payload ->> 'signatureImage',
    (payload ->> 'signedDate')::date
  )
  returning id into new_id;

  -- Checklist: { "EXTENT": { "kitchen": "INCLUDED", ... }, ... }
  for entry in
    select jsonb_build_object('section', section_key, 'items', section_value)
    from jsonb_each(payload -> 'checklist') as t(section_key, section_value)
  loop
    insert into public.checklist_entry (safety_check_id, section, item_key, state)
    select
      new_id,
      (entry ->> 'section')::public.checklist_section,
      item_key,
      trim(both '"' from item_value::text)::public.item_state
    from jsonb_each(entry -> 'items') as i(item_key, item_value);
  end loop;

  for rcd in select * from jsonb_array_elements(payload -> 'rcdTests') loop
    insert into public.rcd_test (
      safety_check_id, position, circuit, push_button_test, time_test
    ) values (
      new_id,
      row_index,
      rcd ->> 'circuit',
      (rcd ->> 'pushButtonTest')::public.test_result,
      (rcd ->> 'timeTest')::public.test_result
    );
    row_index := row_index + 1;
  end loop;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.safety_check enable row level security;
alter table public.checklist_entry enable row level security;
alter table public.rcd_test enable row level security;

-- The register and the certificate pages read straight from the tables.
create policy "read certificates" on public.safety_check
  for select using (true);
create policy "read checklist" on public.checklist_entry
  for select using (true);
create policy "read rcd tests" on public.rcd_test
  for select using (true);

-- No INSERT, UPDATE or DELETE policy is defined on purpose. With RLS on and no
-- policy, those are refused for everyone holding the anon key — the only way in
-- is create_safety_check(), and there is no way out at all. A certificate is a
-- legal record; edit and void flows belong behind authentication, not here.

grant execute on function public.create_safety_check(jsonb) to anon, authenticated;
