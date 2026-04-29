-- Helpful index for fast lookups by source_type / client
create index if not exists idx_client_data_sources_client_source
  on public.client_data_sources (client_id, source_type) where is_enabled = true;

-- Allow approved users to READ GA4 sources for the singleton client
drop policy if exists "Approved users can view ga4 data sources" on public.client_data_sources;
create policy "Approved users can view ga4 data sources"
on public.client_data_sources for select to authenticated
using (
  source_type = 'ga4'
  and client_id = public.get_singleton_client_id()
  and (
    public.get_profile_is_approved(auth.uid())
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- New: returns all enabled GA4 property IDs for the singleton client
create or replace function public.get_active_ga4_property_ids()
returns text[]
language sql
stable security definer
set search_path = public
as $$
  select coalesce(array_agg(ds.ga4_property_id order by ds.created_at), ARRAY[]::text[])
  from public.client_data_sources ds
  join public.clients c on c.id = ds.client_id
  where c.is_singleton = true
    and ds.source_type = 'ga4'
    and ds.is_enabled = true
    and ds.ga4_property_id is not null
    and length(trim(ds.ga4_property_id)) > 0;
$$;

revoke execute on function public.get_active_ga4_property_ids() from anon;
grant execute on function public.get_active_ga4_property_ids() to authenticated, service_role;

-- Updated: legacy single-property reader now returns the first enabled GA4 source
create or replace function public.get_active_ga4_property_id()
returns text
language sql
stable security definer
set search_path = public
as $$
  select ds.ga4_property_id
  from public.client_data_sources ds
  join public.clients c on c.id = ds.client_id
  where c.is_singleton = true
    and ds.source_type = 'ga4'
    and ds.is_enabled = true
    and ds.ga4_property_id is not null
    and length(trim(ds.ga4_property_id)) > 0
  order by ds.created_at
  limit 1;
$$;

revoke execute on function public.get_active_ga4_property_id() from anon;
grant execute on function public.get_active_ga4_property_id() to authenticated, service_role;

-- Admin-facing list of GA4 sources (label, enabled flag)
create or replace function public.list_ga4_sources()
returns table(id uuid, property_id text, label text, is_enabled boolean, created_at timestamptz)
language sql
stable security definer
set search_path = public
as $$
  select ds.id,
         ds.ga4_property_id as property_id,
         coalesce(ds.additional_config->>'label', '') as label,
         ds.is_enabled,
         ds.created_at
  from public.client_data_sources ds
  join public.clients c on c.id = ds.client_id
  where c.is_singleton = true
    and ds.source_type = 'ga4'
  order by ds.created_at;
$$;

revoke execute on function public.list_ga4_sources() from anon;
grant execute on function public.list_ga4_sources() to authenticated, service_role;