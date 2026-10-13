-- NIRA back-office operational upgrade. Additive and safe to rerun.
create extension if not exists pg_trgm;

create table if not exists public.services (
    id uuid primary key default gen_random_uuid (),
    name text not null,
    description text,
    expected_duration_minutes integer check (
        expected_duration_minutes is null
        or expected_duration_minutes > 0
    ),
    is_active boolean not null default true,
    created_by uuid references public.admin_users (id) on delete set null,
    last_edited_by uuid references public.admin_users (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists services_name_lower_uidx on public.services (lower(name));

create index if not exists services_active_name_idx on public.services (is_active, name);

create table if not exists public.center_services (
    center_id uuid not null references public.centers (id) on delete cascade,
    service_id uuid not null references public.services (id) on delete restrict,
    created_at timestamptz not null default now(),
    primary key (center_id, service_id)
);

alter table public.appointments
add column if not exists service_id uuid references public.services (id) on delete set null;

alter table public.appointment_slots
add column if not exists service_id uuid references public.services (id) on delete set null;

create index if not exists appointments_status_created_idx on public.appointments (status, created_at desc);

create index if not exists appointments_service_idx on public.appointments (service_id, created_at desc);

create index if not exists appointment_slots_starts_active_idx on public.appointment_slots (starts_at, is_active);

create index if not exists appointment_slots_service_idx on public.appointment_slots (service_id, starts_at);

create index if not exists applications_type_stage_idx on public.applications (
    application_type,
    current_stage
);

create index if not exists applications_name_trgm_idx on public.applications using gin (applicant_name gin_trgm_ops);

create index if not exists centers_name_trgm_idx on public.centers using gin (name gin_trgm_ops);

create index if not exists centers_address_trgm_idx on public.centers using gin (address gin_trgm_ops);

create index if not exists faqs_question_trgm_idx on public.faqs using gin (question gin_trgm_ops);

create index if not exists tickets_issue_trgm_idx on public.tickets using gin (issue_text gin_trgm_ops);

create table if not exists public.internal_rate_limits (
    key text primary key,
    last_request_at timestamptz not null
);

revoke all on
table public.internal_rate_limits
from anon, authenticated;

create or replace function public.claim_internal_rate_limit(p_key text, p_interval_ms integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare previous_request timestamptz;
begin
  if p_key is null or btrim(p_key) = '' then
    raise exception 'rate-limit key is required';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_key));
  select last_request_at into previous_request from public.internal_rate_limits where key = p_key;
  if previous_request is not null and previous_request > clock_timestamp() - make_interval(secs => greatest(p_interval_ms, 1)::double precision / 1000) then
    return false;
  end if;
  insert into public.internal_rate_limits(key, last_request_at) values (p_key, clock_timestamp())
  on conflict (key) do update set last_request_at = excluded.last_request_at;
  return true;
end;
$$;

revoke all on function public.claim_internal_rate_limit (text, integer)
from public;

grant
execute on function public.claim_internal_rate_limit (text, integer) to service_role;

-- Every centre stores a complete Kampala-time week. Existing partial/empty
-- schedules are replaced with the operational default before adding the check.
create or replace function public.valid_weekly_hours(value jsonb)
returns boolean
language sql immutable
set search_path = public
as $$
  select jsonb_typeof(value) = 'object'
    and bool_and(
      value ? day_name
      and jsonb_typeof(value -> day_name) = 'object'
      and (value -> day_name ? 'closed')
      and (
        coalesce((value -> day_name ->> 'closed')::boolean, false)
        or (
          value -> day_name ->> 'opensAt' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          and value -> day_name ->> 'closesAt' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          and (value -> day_name ->> 'opensAt')::time < (value -> day_name ->> 'closesAt')::time
        )
      )
    )
  from unnest(array['monday','tuesday','wednesday','thursday','friday','saturday','sunday']) day_name;
$$;

update public.centers
set
    weekly_hours = jsonb_build_object (
        'monday',
        jsonb_build_object (
            'closed',
            false,
            'opensAt',
            '08:00',
            'closesAt',
            '17:00'
        ),
        'tuesday',
        jsonb_build_object (
            'closed',
            false,
            'opensAt',
            '08:00',
            'closesAt',
            '17:00'
        ),
        'wednesday',
        jsonb_build_object (
            'closed',
            false,
            'opensAt',
            '08:00',
            'closesAt',
            '17:00'
        ),
        'thursday',
        jsonb_build_object (
            'closed',
            false,
            'opensAt',
            '08:00',
            'closesAt',
            '17:00'
        ),
        'friday',
        jsonb_build_object (
            'closed',
            false,
            'opensAt',
            '08:00',
            'closesAt',
            '17:00'
        ),
        'saturday',
        jsonb_build_object (
            'closed',
            true,
            'opensAt',
            '08:00',
            'closesAt',
            '17:00'
        ),
        'sunday',
        jsonb_build_object (
            'closed',
            true,
            'opensAt',
            '08:00',
            'closesAt',
            '17:00'
        )
    )
where
    not public.valid_weekly_hours (weekly_hours);

alter table public.centers
drop constraint if exists centers_weekly_hours_valid;

alter table public.centers
add constraint centers_weekly_hours_valid check (
    public.valid_weekly_hours (weekly_hours)
);

insert into
    public.services (name, description)
select distinct
    service_name,
    'Imported from existing centre and appointment data.'
from (
        select unnest (services) as service_name
        from public.centers
        union
        select service_type
        from public.appointments
        where
            service_type is not null
            and btrim (service_type) <> ''
    ) values_to_import
where
    btrim (service_name) <> '' on conflict (lower(name)) do nothing;

insert into
    public.center_services (center_id, service_id)
select center_row.id, service_row.id
from
    public.centers center_row
    cross join lateral unnest (center_row.services) service_name
    join public.services service_row on lower(service_row.name) = lower(service_name) on conflict do nothing;

update public.appointments appointment
set
    service_id = service_row.id
from public.services service_row
where
    appointment.service_id is null
    and lower(service_row.name) = lower(appointment.service_type);

update public.appointment_slots slot
set
    service_id = appointment.service_id
from public.appointments appointment
where
    appointment.slot_id = slot.id
    and slot.service_id is null
    and appointment.service_id is not null;

drop function if exists public.search_center_ids (
    text,
    text,
    text,
    uuid,
    timestamptz,
    integer,
    integer
);

create or replace function public.search_center_ids(
  p_query text default null,
  p_district text default null,
  p_status text default null,
  p_service_id uuid default null,
  p_open_at timestamptz default null,
  p_sort text default 'name',
  p_direction text default 'asc',
  p_offset integer default 0,
  p_limit integer default 10
)
returns table(id uuid, total_count bigint)
language sql stable set search_path = public
as $$
  with matching as (
    select distinct center_row.id, center_row.name, center_row.district, center_row.created_at
    from public.centers center_row
    where (p_query is null or p_query = '' or center_row.name ilike '%' || p_query || '%' or center_row.address ilike '%' || p_query || '%')
      and (p_district is null or p_district = '' or center_row.district = p_district)
      and (p_status is null or p_status = '' or (p_status = 'active' and center_row.is_active) or (p_status = 'inactive' and not center_row.is_active))
      and (p_service_id is null or exists (select 1 from public.center_services link where link.center_id = center_row.id and link.service_id = p_service_id))
      and (p_open_at is null or (
        coalesce((center_row.weekly_hours -> lower(trim(to_char(p_open_at at time zone 'Africa/Kampala', 'Day'))) ->> 'closed')::boolean, true) = false
        and (p_open_at at time zone 'Africa/Kampala')::time >= (center_row.weekly_hours -> lower(trim(to_char(p_open_at at time zone 'Africa/Kampala', 'Day'))) ->> 'opensAt')::time
        and (p_open_at at time zone 'Africa/Kampala')::time < (center_row.weekly_hours -> lower(trim(to_char(p_open_at at time zone 'Africa/Kampala', 'Day'))) ->> 'closesAt')::time
      ))
  )
  select matching.id, count(*) over()
  from matching
  order by
    case when p_sort = 'name' and p_direction = 'asc' then matching.name end asc,
    case when p_sort = 'name' and p_direction = 'desc' then matching.name end desc,
    case when p_sort = 'district' and p_direction = 'asc' then matching.district end asc,
    case when p_sort = 'district' and p_direction = 'desc' then matching.district end desc,
    case when p_sort = 'created_at' and p_direction = 'asc' then matching.created_at end asc,
    case when p_sort = 'created_at' and p_direction = 'desc' then matching.created_at end desc,
    matching.name asc
  offset greatest(p_offset, 0) limit greatest(1, least(p_limit, 50));
$$;

revoke all on function public.search_center_ids (
    text,
    text,
    text,
    uuid,
    timestamptz,
    text,
    text,
    integer,
    integer
)
from public;

grant
execute on function public.search_center_ids (
    text,
    text,
    text,
    uuid,
    timestamptz,
    text,
    text,
    integer,
    integer
) to service_role;