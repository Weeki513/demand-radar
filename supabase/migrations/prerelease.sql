-- Demand Radar initial persistence layer.
-- Pending migration: do not run against production until reviewed.

create extension if not exists pgcrypto;

do $$ begin create type public.context_item_kind as enum (
  'positioning', 'icp', 'problem', 'capability', 'feature', 'differentiator', 'roadmap', 'keyword'
); exception when duplicate_object then null; end $$;
do $$ begin create type public.context_item_visibility as enum ('public', 'private'); exception when duplicate_object then null; end $$;
do $$ begin create type public.context_item_source as enum ('manual', 'ai'); exception when duplicate_object then null; end $$;
do $$ begin create type public.scan_frequency as enum ('daily', 'weekly'); exception when duplicate_object then null; end $$;
do $$ begin create type public.scan_trigger as enum ('scheduled', 'manual'); exception when duplicate_object then null; end $$;
do $$ begin create type public.scan_status as enum (
  'queued', 'collecting', 'processing', 'clustering', 'scoring', 'generating', 'completed', 'failed'
); exception when duplicate_object then null; end $$;
do $$ begin create type public.source_attempt_status as enum ('queued', 'collecting', 'completed', 'failed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.cluster_trend as enum ('new', 'rising', 'stable', 'falling'); exception when duplicate_object then null; end $$;
do $$ begin create type public.opportunity_state as enum ('existing', 'roadmap', 'unmapped'); exception when duplicate_object then null; end $$;
do $$ begin create type public.opportunity_status as enum ('new', 'watching', 'accepted', 'dismissed', 'acted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.social_platform as enum ('x', 'linkedin', 'reddit'); exception when duplicate_object then null; end $$;
do $$ begin create type public.post_status as enum ('draft', 'accepted', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.post_revision_type as enum ('autosave', 'accepted_rewrite', 'manual'); exception when duplicate_object then null; end $$;
do $$ begin create type public.signal_action_type as enum ('saved', 'dismissed', 'acted_on', 'post_created'); exception when duplicate_object then null; end $$;
do $$ begin create type public.product_event_type as enum (
  'product_created', 'context_updated', 'scan_enqueued', 'scan_completed',
  'cluster_saved', 'cluster_dismissed', 'cluster_acted_on', 'post_created', 'post_edited', 'post_rewritten'
); exception when duplicate_object then null; end $$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  public_url text not null check (public_url ~* '^https?://[^[:space:]]+$'),
  additional_context text not null default '' check (char_length(additional_context) <= 10000),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.product_context_items (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  kind public.context_item_kind not null, text text not null check (char_length(trim(text)) between 1 and 2000),
  visibility public.context_item_visibility not null default 'public', source public.context_item_source not null default 'manual',
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'), deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.source_configs (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  adapter_key text not null check (adapter_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120), enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (product_id, adapter_key, display_name)
);

create table if not exists public.scan_configs (
  product_id uuid primary key references public.products(id) on delete cascade, enabled boolean not null default true,
  frequency public.scan_frequency not null default 'daily', execution_time time without time zone not null default '09:00:00',
  timezone text not null default 'UTC' check (char_length(trim(timezone)) between 1 and 80),
  lookback_days integer not null default 30 check (lookback_days between 1 and 90), next_run_at_utc timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_runs (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  trigger public.scan_trigger not null, status public.scan_status not null default 'queued',
  stage_attempt integer not null default 0 check (stage_attempt >= 0), worker_id text,
  lease_until timestamptz, started_at timestamptz, completed_at timestamptz,
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  sources_attempted integer not null default 0 check (sources_attempted >= 0), sources_succeeded integer not null default 0 check (sources_succeeded >= 0),
  raw_signals_discovered integer not null default 0 check (raw_signals_discovered >= 0), clusters_produced integer not null default 0 check (clusters_produced >= 0),
  error_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(error_summary) = 'object'), pipeline_version text not null default 'v1',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (completed_at is null or started_at is null or completed_at >= started_at), check (status in ('completed', 'failed') or completed_at is null)
);

create table if not exists public.scan_source_attempts (
  id uuid primary key default gen_random_uuid(), scan_run_id uuid not null references public.scan_runs(id) on delete cascade,
  source_config_id uuid not null references public.source_configs(id) on delete restrict,
  status public.source_attempt_status not null default 'queued', attempt_count integer not null default 0 check (attempt_count >= 0),
  worker_id text, lease_until timestamptz, started_at timestamptz, completed_at timestamptz,
  raw_count integer not null default 0 check (raw_count >= 0), normalized_count integer not null default 0 check (normalized_count >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 120), error_message text check (error_message is null or char_length(error_message) <= 2000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (scan_run_id, source_config_id),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  source_config_id uuid not null references public.source_configs(id) on delete restrict,
  external_id text not null check (char_length(trim(external_id)) between 1 and 512), canonical_url text not null check (canonical_url ~* '^https?://[^[:space:]]+$'),
  title text not null default '' check (char_length(title) <= 1000), excerpt text not null check (char_length(trim(excerpt)) between 1 and 5000),
  context text not null default '' check (char_length(context) <= 10000), author_ref text check (author_ref is null or char_length(author_ref) <= 512),
  published_at timestamptz, collected_at timestamptz not null default now(), language text,
  engagement jsonb not null default '{}'::jsonb check (jsonb_typeof(engagement) = 'object'), content_hash text not null check (content_hash ~ '^[a-f0-9]{16,128}$'),
  provenance jsonb not null check (jsonb_typeof(provenance) = 'object'), raw_payload jsonb check (raw_payload is null or jsonb_typeof(raw_payload) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (product_id, source_config_id, external_id)
);

create table if not exists public.demand_clusters (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  stable_key text not null check (stable_key ~ '^[a-zA-Z0-9_.:-]{8,160}$'), title text not null check (char_length(trim(title)) between 1 and 240),
  score smallint not null default 0 check (score between 0 and 100), score_explanation jsonb not null default '{}'::jsonb check (jsonb_typeof(score_explanation) = 'object'),
  confidence numeric(5,4) not null default 0 check (confidence between 0 and 1), independent_signal_count integer not null default 0 check (independent_signal_count >= 0), independent_source_count integer not null default 0 check (independent_source_count >= 0),
  first_detected_at timestamptz not null default now(), last_detected_at timestamptz not null default now(), trend public.cluster_trend not null default 'new',
  related_public_context_id uuid references public.product_context_items(id) on delete set null, related_private_context_id uuid references public.product_context_items(id) on delete set null,
  opportunity_state public.opportunity_state not null default 'unmapped', opportunity_status public.opportunity_status not null default 'new',
  suggested_action text not null default '' check (char_length(suggested_action) <= 2000), centroid jsonb not null default '{}'::jsonb check (jsonb_typeof(centroid) = 'object'), algorithm_version text not null default 'v1',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (product_id, stable_key), check (last_detected_at >= first_detected_at)
);

create table if not exists public.cluster_memberships (
  id uuid primary key default gen_random_uuid(), cluster_id uuid not null references public.demand_clusters(id) on delete cascade,
  evidence_id uuid not null references public.evidence_items(id) on delete cascade, scan_run_id uuid not null references public.scan_runs(id) on delete cascade,
  similarity numeric(5,4) not null check (similarity between 0 and 1), matching_rationale text not null default '' check (char_length(matching_rationale) <= 2000),
  created_at timestamptz not null default now(), unique (scan_run_id, evidence_id)
);

create table if not exists public.cluster_snapshots (
  cluster_id uuid not null references public.demand_clusters(id) on delete cascade, day date not null,
  signal_count integer not null default 0 check (signal_count >= 0), source_count integer not null default 0 check (source_count >= 0), score smallint not null default 0 check (score between 0 and 100), confidence numeric(5,4) not null default 0 check (confidence between 0 and 1),
  created_at timestamptz not null default now(), primary key (cluster_id, day)
);

create table if not exists public.social_profiles (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, platform public.social_platform not null, enabled boolean not null default false,
  account_type text check (account_type is null or char_length(account_type) <= 80), preferred_length integer check (preferred_length is null or preferred_length between 1 and 100000), tone text not null default '' check (char_length(tone) <= 500), writing_instructions text not null default '' check (char_length(writing_instructions) <= 5000), constraints jsonb not null default '{}'::jsonb check (jsonb_typeof(constraints) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (product_id, platform)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, cluster_id uuid references public.demand_clusters(id) on delete set null, platform public.social_platform not null, status public.post_status not null default 'draft',
  editor_json jsonb not null default '{"type":"doc","content":[]}'::jsonb check (jsonb_typeof(editor_json) = 'object'), plain_text text not null default '' check (char_length(plain_text) <= 100000), character_count integer not null default 0 check (character_count >= 0), pending_rewrite_json jsonb check (pending_rewrite_json is null or jsonb_typeof(pending_rewrite_json) = 'object'), generation_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(generation_metadata) = 'object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.post_revisions (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, editor_json jsonb not null check (jsonb_typeof(editor_json) = 'object'), plain_text text not null default '' check (char_length(plain_text) <= 100000), revision_type public.post_revision_type not null, created_at timestamptz not null default now()
);

create table if not exists public.product_user_state (
  product_id uuid not null references public.products(id) on delete cascade, user_id uuid not null, last_pulse_checked_at timestamptz, last_product_opened_at timestamptz, primary key (product_id, user_id)
);

create table if not exists public.signal_actions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, cluster_id uuid not null references public.demand_clusters(id) on delete cascade, action public.signal_action_type not null, created_at timestamptz not null default now(), unique (user_id, cluster_id, action)
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, user_id uuid, event_type public.product_event_type not null, cluster_id uuid references public.demand_clusters(id) on delete set null, post_id uuid references public.posts(id) on delete set null, metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'), created_at timestamptz not null default now()
);

create index if not exists products_owner_idx on public.products(owner_id);
create index if not exists context_items_product_order_idx on public.product_context_items(product_id, deleted_at, sort_order);
create index if not exists source_configs_product_enabled_idx on public.source_configs(product_id, enabled);
create index if not exists scan_configs_due_idx on public.scan_configs(enabled, next_run_at_utc);
create index if not exists scan_runs_product_created_idx on public.scan_runs(product_id, created_at desc);
create index if not exists scan_runs_claim_idx on public.scan_runs(status, lease_until, created_at);
create unique index if not exists scan_runs_one_active_per_product_idx on public.scan_runs(product_id) where status in ('queued', 'collecting', 'processing', 'clustering', 'scoring', 'generating');
create index if not exists scan_source_attempts_claim_idx on public.scan_source_attempts(status, lease_until, created_at);
create index if not exists scan_source_attempts_run_idx on public.scan_source_attempts(scan_run_id, status);
create index if not exists evidence_product_published_idx on public.evidence_items(product_id, published_at desc);
create index if not exists evidence_product_hash_idx on public.evidence_items(product_id, content_hash);
create index if not exists evidence_source_external_idx on public.evidence_items(source_config_id, external_id);
create index if not exists clusters_product_score_idx on public.demand_clusters(product_id, score desc, updated_at desc);
create index if not exists clusters_product_opportunity_idx on public.demand_clusters(product_id, opportunity_state, opportunity_status);
create index if not exists memberships_cluster_idx on public.cluster_memberships(cluster_id, created_at desc);
create index if not exists memberships_evidence_idx on public.cluster_memberships(evidence_id, created_at desc);
create index if not exists snapshots_cluster_day_idx on public.cluster_snapshots(cluster_id, day desc);
create index if not exists posts_product_updated_idx on public.posts(product_id, updated_at desc);
create index if not exists revisions_post_created_idx on public.post_revisions(post_id, created_at desc);
create index if not exists signal_actions_cluster_idx on public.signal_actions(cluster_id, created_at desc);
create index if not exists product_events_product_created_idx on public.product_events(product_id, created_at desc);

-- PostgREST role grants are explicit; RLS remains the authorization boundary.
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.products, public.product_context_items, public.source_configs,
  public.scan_configs, public.demand_clusters, public.social_profiles, public.posts,
  public.post_revisions, public.product_user_state, public.signal_actions to authenticated;
grant all on all tables in schema public to service_role;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists context_items_set_updated_at on public.product_context_items;
create trigger context_items_set_updated_at before update on public.product_context_items for each row execute function public.set_updated_at();
drop trigger if exists source_configs_set_updated_at on public.source_configs;
create trigger source_configs_set_updated_at before update on public.source_configs for each row execute function public.set_updated_at();
drop trigger if exists scan_configs_set_updated_at on public.scan_configs;
create trigger scan_configs_set_updated_at before update on public.scan_configs for each row execute function public.set_updated_at();
drop trigger if exists scan_runs_set_updated_at on public.scan_runs;
create trigger scan_runs_set_updated_at before update on public.scan_runs for each row execute function public.set_updated_at();
drop trigger if exists scan_source_attempts_set_updated_at on public.scan_source_attempts;
create trigger scan_source_attempts_set_updated_at before update on public.scan_source_attempts for each row execute function public.set_updated_at();
drop trigger if exists evidence_items_set_updated_at on public.evidence_items;
create trigger evidence_items_set_updated_at before update on public.evidence_items for each row execute function public.set_updated_at();
drop trigger if exists demand_clusters_set_updated_at on public.demand_clusters;
create trigger demand_clusters_set_updated_at before update on public.demand_clusters for each row execute function public.set_updated_at();
drop trigger if exists social_profiles_set_updated_at on public.social_profiles;
create trigger social_profiles_set_updated_at before update on public.social_profiles for each row execute function public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();

create or replace function public.owns_product(p_product_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.products where id = p_product_id and owner_id = (select auth.uid())); $$;

create or replace function public.is_demo_product(p_product_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.products where id = p_product_id and is_demo); $$;

create or replace function public.cluster_product_id(p_cluster_id uuid)
returns uuid language sql stable security definer set search_path = public, pg_temp
as $$ select product_id from public.demand_clusters where id = p_cluster_id; $$;

create or replace function public.post_product_id(p_post_id uuid)
returns uuid language sql stable security definer set search_path = public, pg_temp
as $$ select product_id from public.posts where id = p_post_id; $$;

create or replace function public.is_service_role()
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp
as $$
  select current_setting('request.jwt.claim.role', true) in ('service_role', 'supabase_admin')
    or (current_setting('request.jwt.claim.role', true) is null and session_user in ('postgres', 'supabase_admin'));
$$;

revoke all on function public.owns_product(uuid) from public;
revoke all on function public.is_demo_product(uuid) from public;
revoke all on function public.cluster_product_id(uuid) from public;
revoke all on function public.post_product_id(uuid) from public;
revoke all on function public.is_service_role() from public;
grant execute on function public.owns_product(uuid) to authenticated, service_role;
grant execute on function public.is_demo_product(uuid) to service_role;
grant execute on function public.cluster_product_id(uuid) to authenticated, service_role;
grant execute on function public.post_product_id(uuid) to authenticated, service_role;

alter table public.products enable row level security;
alter table public.product_context_items enable row level security;
alter table public.source_configs enable row level security;
alter table public.scan_configs enable row level security;
alter table public.scan_runs enable row level security;
alter table public.scan_source_attempts enable row level security;
alter table public.evidence_items enable row level security;
alter table public.demand_clusters enable row level security;
alter table public.cluster_memberships enable row level security;
alter table public.cluster_snapshots enable row level security;
alter table public.social_profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_revisions enable row level security;
alter table public.product_user_state enable row level security;
alter table public.signal_actions enable row level security;
alter table public.product_events enable row level security;

drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists products_update on public.products;
create policy products_update on public.products for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists context_items_select on public.product_context_items;
create policy context_items_select on public.product_context_items for select to authenticated using (public.owns_product(product_id));
drop policy if exists context_items_insert on public.product_context_items;
create policy context_items_insert on public.product_context_items for insert to authenticated with check (public.owns_product(product_id));
drop policy if exists context_items_update on public.product_context_items;
create policy context_items_update on public.product_context_items for update to authenticated using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists context_items_delete on public.product_context_items;
create policy context_items_delete on public.product_context_items for delete to authenticated using (public.owns_product(product_id));

drop policy if exists source_configs_select on public.source_configs;
create policy source_configs_select on public.source_configs for select to authenticated using (public.owns_product(product_id));
drop policy if exists source_configs_insert on public.source_configs;
create policy source_configs_insert on public.source_configs for insert to authenticated with check (public.owns_product(product_id));
drop policy if exists source_configs_update on public.source_configs;
create policy source_configs_update on public.source_configs for update to authenticated using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists source_configs_delete on public.source_configs;
create policy source_configs_delete on public.source_configs for delete to authenticated using (public.owns_product(product_id));

drop policy if exists scan_configs_select on public.scan_configs;
create policy scan_configs_select on public.scan_configs for select to authenticated using (public.owns_product(product_id));
drop policy if exists scan_configs_insert on public.scan_configs;
create policy scan_configs_insert on public.scan_configs for insert to authenticated with check (public.owns_product(product_id));
drop policy if exists scan_configs_update on public.scan_configs;
create policy scan_configs_update on public.scan_configs for update to authenticated using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists scan_configs_delete on public.scan_configs;
create policy scan_configs_delete on public.scan_configs for delete to authenticated using (public.owns_product(product_id));

drop policy if exists scan_runs_select on public.scan_runs;
create policy scan_runs_select on public.scan_runs for select to authenticated using (public.owns_product(product_id));
drop policy if exists scan_source_attempts_select on public.scan_source_attempts;
create policy scan_source_attempts_select on public.scan_source_attempts for select to authenticated using (
  public.owns_product((select product_id from public.scan_runs where id = scan_run_id))
);
drop policy if exists evidence_select on public.evidence_items;
create policy evidence_select on public.evidence_items for select to authenticated using (public.owns_product(product_id));

drop policy if exists clusters_select on public.demand_clusters;
create policy clusters_select on public.demand_clusters for select to authenticated using (public.owns_product(product_id));
drop policy if exists clusters_update on public.demand_clusters;
create policy clusters_update on public.demand_clusters for update to authenticated using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists memberships_select on public.cluster_memberships;
create policy memberships_select on public.cluster_memberships for select to authenticated using (public.owns_product(public.cluster_product_id(cluster_id)));
drop policy if exists snapshots_select on public.cluster_snapshots;
create policy snapshots_select on public.cluster_snapshots for select to authenticated using (public.owns_product(public.cluster_product_id(cluster_id)));

drop policy if exists social_profiles_select on public.social_profiles;
create policy social_profiles_select on public.social_profiles for select to authenticated using (public.owns_product(product_id));
drop policy if exists social_profiles_insert on public.social_profiles;
create policy social_profiles_insert on public.social_profiles for insert to authenticated with check (public.owns_product(product_id));
drop policy if exists social_profiles_update on public.social_profiles;
create policy social_profiles_update on public.social_profiles for update to authenticated using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists social_profiles_delete on public.social_profiles;
create policy social_profiles_delete on public.social_profiles for delete to authenticated using (public.owns_product(product_id));

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (public.owns_product(product_id));
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check (public.owns_product(product_id));
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated using (public.owns_product(product_id)) with check (public.owns_product(product_id));
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated using (public.owns_product(product_id));

drop policy if exists revisions_select on public.post_revisions;
create policy revisions_select on public.post_revisions for select to authenticated using (public.owns_product(public.post_product_id(post_id)));
drop policy if exists revisions_insert on public.post_revisions;
create policy revisions_insert on public.post_revisions for insert to authenticated with check (public.owns_product(public.post_product_id(post_id)));
drop policy if exists revisions_delete on public.post_revisions;
create policy revisions_delete on public.post_revisions for delete to authenticated using (public.owns_product(public.post_product_id(post_id)));

drop policy if exists product_user_state_select on public.product_user_state;
create policy product_user_state_select on public.product_user_state for select to authenticated using (user_id = (select auth.uid()) and public.owns_product(product_id));
drop policy if exists product_user_state_insert on public.product_user_state;
create policy product_user_state_insert on public.product_user_state for insert to authenticated with check (user_id = (select auth.uid()) and public.owns_product(product_id));
drop policy if exists product_user_state_update on public.product_user_state;
create policy product_user_state_update on public.product_user_state for update to authenticated using (user_id = (select auth.uid()) and public.owns_product(product_id)) with check (user_id = (select auth.uid()) and public.owns_product(product_id));
drop policy if exists product_user_state_delete on public.product_user_state;
create policy product_user_state_delete on public.product_user_state for delete to authenticated using (user_id = (select auth.uid()) and public.owns_product(product_id));

drop policy if exists signal_actions_select on public.signal_actions;
create policy signal_actions_select on public.signal_actions for select to authenticated using (user_id = (select auth.uid()) and public.owns_product(public.cluster_product_id(cluster_id)));
drop policy if exists signal_actions_insert on public.signal_actions;
create policy signal_actions_insert on public.signal_actions for insert to authenticated with check (user_id = (select auth.uid()) and public.owns_product(public.cluster_product_id(cluster_id)));

drop policy if exists product_events_select on public.product_events;
create policy product_events_select on public.product_events for select to authenticated using (public.owns_product(product_id));

create or replace function public.enqueue_scan(p_product_id uuid, p_trigger public.scan_trigger default 'manual')
returns public.scan_runs language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_run public.scan_runs;
begin
  if not public.is_service_role() and not public.owns_product(p_product_id) then
    raise exception 'not authorized to enqueue a scan for this product' using errcode = '42501';
  end if;
  select * into v_run from public.scan_runs where product_id = p_product_id and status in ('queued','collecting','processing','clustering','scoring','generating') order by created_at desc limit 1;
  if v_run.id is not null then return v_run; end if;
  insert into public.scan_runs (product_id, trigger) values (p_product_id, p_trigger) returning * into v_run;
  insert into public.scan_source_attempts (scan_run_id, source_config_id)
    select v_run.id, id from public.source_configs where product_id = p_product_id and enabled;
  if not exists (select 1 from public.scan_source_attempts where scan_run_id = v_run.id) then
    update public.scan_runs
    set status='failed', completed_at=now(), error_summary='{"code":"NO_ENABLED_SOURCES","message":"No enabled source adapters are configured."}'::jsonb
    where id=v_run.id;
    update public.scan_configs
    set next_run_at_utc = case when frequency = 'daily' then coalesce(next_run_at_utc, now()) + interval '1 day' else coalesce(next_run_at_utc, now()) + interval '7 days' end
    where product_id = p_product_id and p_trigger = 'scheduled';
    select * into v_run from public.scan_runs where id=v_run.id;
    return v_run;
  end if;
  update public.scan_configs set next_run_at_utc = case when frequency = 'daily' then coalesce(next_run_at_utc, now()) + interval '1 day' else coalesce(next_run_at_utc, now()) + interval '7 days' end where product_id = p_product_id and p_trigger = 'scheduled';
  insert into public.product_events (product_id, user_id, event_type, metadata)
    values (p_product_id, case when public.is_service_role() then null else (select auth.uid()) end, 'scan_enqueued', jsonb_build_object('scan_run_id',v_run.id,'trigger',p_trigger));
  return v_run;
exception when unique_violation then
  select * into v_run from public.scan_runs where product_id = p_product_id and status in ('queued','collecting','processing','clustering','scoring','generating') order by created_at desc limit 1;
  if v_run.id is not null then return v_run; end if;
  raise;
end;
$$;

create or replace function public.enqueue_due_scans()
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
  v_enqueued integer := 0;
begin
  if not public.is_service_role() then
    raise exception 'scheduler function requires service_role' using errcode = '42501';
  end if;
  for v_product_id in
    select product_id from public.scan_configs
    where enabled and next_run_at_utc is not null and next_run_at_utc <= now()
    order by next_run_at_utc
  loop
    perform public.enqueue_scan(v_product_id, 'scheduled');
    v_enqueued := v_enqueued + 1;
  end loop;
  return v_enqueued;
end;
$$;

create or replace function public.claim_next_scan(p_worker_id text, p_lease_seconds integer default 120)
returns public.scan_runs language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_run public.scan_runs;
begin
  if not public.is_service_role() then raise exception 'worker function requires service_role' using errcode = '42501'; end if;
  if p_worker_id is null or char_length(trim(p_worker_id)) not between 1 and 200 then raise exception 'invalid worker id' using errcode = '22023'; end if;
  if p_lease_seconds not between 15 and 900 then raise exception 'invalid lease duration' using errcode = '22023'; end if;
  with candidate as (
    select id from public.scan_runs
    where status in ('queued','collecting','processing','clustering','scoring','generating')
      and (lease_until is null or lease_until < now())
      and (status <> 'collecting' or exists (
        select 1 from public.scan_source_attempts a
        where a.scan_run_id = scan_runs.id
          and ((a.status = 'queued' and (a.lease_until is null or a.lease_until <= now()))
            or (a.status = 'collecting' and (a.lease_until is null or a.lease_until < now())))
      ))
    order by created_at for update skip locked limit 1
  )
  update public.scan_runs r set worker_id=p_worker_id, lease_until=now()+make_interval(secs=>p_lease_seconds), started_at=coalesce(started_at,now()), status=case when status='queued' then 'collecting'::public.scan_status else status end, stage_attempt=stage_attempt+1 from candidate where r.id=candidate.id returning r.* into v_run;
  return v_run;
end;
$$;

create or replace function public.claim_scan_source_attempt(p_scan_run_id uuid, p_worker_id text, p_lease_seconds integer default 120)
returns public.scan_source_attempts language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_attempt public.scan_source_attempts;
begin
  if not public.is_service_role() then raise exception 'worker function requires service_role' using errcode = '42501'; end if;
  if p_worker_id is null or char_length(trim(p_worker_id)) not between 1 and 200 then raise exception 'invalid worker id' using errcode = '22023'; end if;
  if p_lease_seconds not between 15 and 900 then raise exception 'invalid lease duration' using errcode = '22023'; end if;
  with candidate as (
    select id from public.scan_source_attempts where scan_run_id=p_scan_run_id and ((status='queued' and (lease_until is null or lease_until <= now())) or (status='collecting' and (lease_until is null or lease_until < now()))) order by created_at for update skip locked limit 1
  )
  update public.scan_source_attempts a set status='collecting', worker_id=p_worker_id, lease_until=now()+make_interval(secs=>p_lease_seconds), started_at=coalesce(started_at,now()), attempt_count=attempt_count+1 from candidate where a.id=candidate.id returning a.* into v_attempt;
  return v_attempt;
end;
$$;

create or replace function public.complete_scan_source_attempt(
  p_attempt_id uuid, p_worker_id text, p_status public.source_attempt_status,
  p_raw_count integer default 0, p_normalized_count integer default 0,
  p_error_code text default null, p_error_message text default null
)
returns public.scan_source_attempts language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_attempt public.scan_source_attempts; v_pending integer;
begin
  if not public.is_service_role() then raise exception 'worker function requires service_role' using errcode = '42501'; end if;
  if p_status not in ('completed','failed') then raise exception 'source attempt must finish as completed or failed' using errcode = '22023'; end if;
  if p_raw_count < 0 or p_normalized_count < 0 then raise exception 'source counts cannot be negative' using errcode = '22023'; end if;
  update public.scan_source_attempts set status=p_status, completed_at=now(), lease_until=null, error_code=p_error_code, error_message=p_error_message, raw_count=p_raw_count, normalized_count=p_normalized_count
  where id=p_attempt_id and worker_id=p_worker_id and status='collecting' returning * into v_attempt;
  if v_attempt.id is null then raise exception 'source attempt is not leased by this worker' using errcode = '55000'; end if;
  select count(*) into v_pending from public.scan_source_attempts where scan_run_id=v_attempt.scan_run_id and status in ('queued','collecting');
  if v_pending = 0 then
    update public.scan_runs r set status='processing', lease_until=null, worker_id=null,
      sources_attempted=(select count(*) from public.scan_source_attempts where scan_run_id=v_attempt.scan_run_id),
      sources_succeeded=(select count(*) from public.scan_source_attempts where scan_run_id=v_attempt.scan_run_id and status='completed')
    where r.id=v_attempt.scan_run_id and r.status='collecting';
  else
    update public.scan_runs r set lease_until=null, worker_id=null
    where r.id=v_attempt.scan_run_id and r.status='collecting' and r.worker_id=p_worker_id;
  end if;
  return v_attempt;
end;
$$;

create or replace function public.retry_scan_source_attempt(
  p_attempt_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_message text,
  p_delay_seconds integer default 30
)
returns public.scan_source_attempts language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_attempt public.scan_source_attempts;
begin
  if not public.is_service_role() then raise exception 'worker function requires service_role' using errcode = '42501'; end if;
  if p_delay_seconds not between 0 and 3600 then raise exception 'invalid retry delay' using errcode = '22023'; end if;
  update public.scan_source_attempts
  set status='queued', worker_id=null, lease_until=now()+make_interval(secs=>p_delay_seconds),
      completed_at=null, error_code=p_error_code, error_message=p_error_message
  where id=p_attempt_id and worker_id=p_worker_id and status='collecting' and attempt_count < 3
  returning * into v_attempt;
  if v_attempt.id is null then
    raise exception 'source attempt is not leased by this worker or retry limit reached' using errcode = '55000';
  end if;
  update public.scan_runs
  set worker_id=null, lease_until=null
  where id=v_attempt.scan_run_id and status='collecting' and worker_id=p_worker_id;
  return v_attempt;
end;
$$;

create or replace function public.advance_scan_stage(
  p_scan_run_id uuid, p_worker_id text, p_expected_status public.scan_status,
  p_next_status public.scan_status, p_checkpoint jsonb default '{}'::jsonb
)
returns public.scan_runs language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_run public.scan_runs;
begin
  if not public.is_service_role() then raise exception 'worker function requires service_role' using errcode = '42501'; end if;
  if jsonb_typeof(p_checkpoint) <> 'object' then raise exception 'checkpoint must be an object' using errcode = '22023'; end if;
  if not ((p_expected_status='processing' and p_next_status='clustering') or (p_expected_status='clustering' and p_next_status='scoring') or (p_expected_status='scoring' and p_next_status='generating') or (p_expected_status='generating' and p_next_status='completed')) then
    raise exception 'invalid scan stage transition: % -> %', p_expected_status, p_next_status using errcode = '22023';
  end if;
  update public.scan_runs set status=p_next_status, lease_until=null, worker_id=null, completed_at=case when p_next_status='completed' then now() else completed_at end, duration_ms=case when p_next_status='completed' then extract(epoch from (now()-started_at)*1000)::bigint else duration_ms end, error_summary=error_summary || jsonb_build_object('checkpoint',p_checkpoint)
  where id=p_scan_run_id and status=p_expected_status and worker_id=p_worker_id returning * into v_run;
  if v_run.id is null then raise exception 'scan is not leased by this worker or status changed' using errcode = '55000'; end if;
  return v_run;
end;
$$;

create or replace function public.fail_scan(p_scan_run_id uuid, p_worker_id text, p_error_summary jsonb)
returns public.scan_runs language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_run public.scan_runs;
begin
  if not public.is_service_role() then raise exception 'worker function requires service_role' using errcode = '42501'; end if;
  if jsonb_typeof(p_error_summary) <> 'object' then raise exception 'error summary must be an object' using errcode = '22023'; end if;
  update public.scan_runs set status='failed', error_summary=p_error_summary, completed_at=now(), duration_ms=extract(epoch from (now()-started_at)*1000)::bigint, lease_until=null, worker_id=null
  where id=p_scan_run_id and worker_id=p_worker_id and status not in ('completed','failed') returning * into v_run;
  if v_run.id is null then raise exception 'scan is not leased by this worker or already terminal' using errcode = '55000'; end if;
  return v_run;
end;
$$;

create or replace function public.reset_demo_workspace(
  p_product_id uuid default '428ebea4-c643-4f7e-ad85-dea0841ad48e'
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid;
  v_run_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_hn uuid := 'a0000000-0000-4000-8000-000000000011';
  v_github uuid := 'a0000000-0000-4000-8000-000000000012';
  v_stack uuid := 'a0000000-0000-4000-8000-000000000013';
  v_rss uuid := 'a0000000-0000-4000-8000-000000000014';
  v_discourse uuid := 'a0000000-0000-4000-8000-000000000015';
  v_public_feature uuid := 'a0000000-0000-4000-8000-000000000101';
  v_roadmap uuid := 'a0000000-0000-4000-8000-000000000103';
  v_existing uuid := 'a0000000-0000-4000-8000-000000000201';
  v_roadmap_cluster uuid := 'a0000000-0000-4000-8000-000000000202';
  v_unmapped uuid := 'a0000000-0000-4000-8000-000000000203';
begin
  if not public.is_service_role() then
    raise exception 'demo reset requires service_role' using errcode = '42501';
  end if;

  select id into v_owner_id from auth.users
  where lower(email) = lower('demo@demandradar.pivnev.design')
  order by created_at limit 1;
  v_owner_id := coalesce(v_owner_id, '428ebea4-c643-4f7e-ad85-dea0841ad48e'::uuid);

  -- `source_configs` is intentionally retained by historical evidence, so
  -- reset the demo graph in dependency order before recreating it.
  delete from public.scan_source_attempts where scan_run_id in (select id from public.scan_runs where product_id = p_product_id);
  delete from public.evidence_items where product_id = p_product_id;
  delete from public.scan_runs where product_id = p_product_id;
  delete from public.source_configs where product_id = p_product_id;
  delete from public.products where id = p_product_id;
  insert into public.products (id, owner_id, name, public_url, additional_context, is_demo, created_at, updated_at)
  values (p_product_id, v_owner_id, 'SessionPilot', 'https://sessionpilot.example.com', 'A developer tool for reliable browser automation and authenticated sessions.', true, '2026-08-01T09:00:00Z', '2026-08-31T09:00:00Z');

  insert into public.product_context_items (id, product_id, kind, text, visibility, source, sort_order, metadata)
  values
    ('a0000000-0000-4000-8000-000000000100', p_product_id, 'capability', 'Browser automation for product teams', 'public', 'manual', 10, '{}'::jsonb),
    (v_public_feature, p_product_id, 'feature', 'Retries failed browser steps with clear logs', 'public', 'ai', 20, '{"confidence":0.94}'::jsonb),
    (v_roadmap, p_product_id, 'roadmap', 'Persistent authenticated sessions that recover after auth failures', 'private', 'manual', 30, '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000104', p_product_id, 'icp', 'Indie developers shipping integrations and internal tools', 'public', 'manual', 40, '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000105', p_product_id, 'problem', 'Automation breaks when authentication state changes', 'public', 'manual', 50, '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000106', p_product_id, 'differentiator', 'Transparent evidence and reproducible browser runs', 'public', 'ai', 60, '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000107', p_product_id, 'keyword', 'browser sessions, auth recovery, automation reliability', 'public', 'ai', 70, '{}'::jsonb);

  insert into public.source_configs (id, product_id, adapter_key, display_name, enabled, config)
  values
    (v_hn, p_product_id, 'hacker_news', 'Hacker News', true, '{"query":"browser automation authentication"}'::jsonb),
    (v_github, p_product_id, 'github_issues', 'GitHub Issues and Discussions', true, '{"repositories":["microsoft/playwright","browser-use/browser-use"]}'::jsonb),
    (v_stack, p_product_id, 'stack_exchange', 'Stack Exchange', true, '{"sites":["stackoverflow","superuser"]}'::jsonb),
    (v_rss, p_product_id, 'rss_atom', 'Developer RSS feeds', true, '{"feedUrl":"https://dev.to/feed"}'::jsonb),
    (v_discourse, p_product_id, 'discourse_browser', 'Public Discourse communities', true, '{"url":"https://meta.discourse.org/latest"}'::jsonb);
  insert into public.scan_configs (product_id, enabled, frequency, execution_time, timezone, lookback_days, next_run_at_utc)
  values (p_product_id, true, 'daily', '09:00:00', 'Asia/Tbilisi', 30, '2026-09-01T05:00:00Z');

  insert into public.scan_runs (id, product_id, trigger, status, started_at, completed_at, duration_ms, sources_attempted, sources_succeeded, raw_signals_discovered, clusters_produced, pipeline_version, created_at, updated_at)
  values (v_run_id, p_product_id, 'scheduled', 'completed', '2026-08-31T05:00:00Z', '2026-08-31T05:00:19Z', 19000, 5, 5, 12, 3, 'v1', '2026-08-31T05:00:00Z', '2026-08-31T05:00:19Z');
  insert into public.scan_source_attempts (scan_run_id, source_config_id, status, attempt_count, started_at, completed_at, raw_count, normalized_count)
  values
    (v_run_id, v_hn, 'completed', 1, '2026-08-31T05:00:01Z', '2026-08-31T05:00:04Z', 3, 3),
    (v_run_id, v_github, 'completed', 1, '2026-08-31T05:00:04Z', '2026-08-31T05:00:08Z', 3, 3),
    (v_run_id, v_stack, 'completed', 1, '2026-08-31T05:00:08Z', '2026-08-31T05:00:12Z', 2, 2),
    (v_run_id, v_rss, 'completed', 1, '2026-08-31T05:00:12Z', '2026-08-31T05:00:15Z', 2, 2),
    (v_run_id, v_discourse, 'completed', 1, '2026-08-31T05:00:15Z', '2026-08-31T05:00:18Z', 2, 2);

  insert into public.evidence_items (id, product_id, source_config_id, external_id, canonical_url, title, excerpt, context, author_ref, published_at, collected_at, language, engagement, content_hash, provenance)
  values
    ('a0000000-0000-4000-8000-000000000301', p_product_id, v_hn, 'hn-441001', 'https://news.ycombinator.com/item?id=441001', 'Keeping auth state in browser automation', 'How do you keep a browser session authenticated when a token expires halfway through a run?', 'Discussion about recovery strategies for long-running automation.', 'hn:maker-01', '2026-08-29T10:00:00Z', '2026-08-31T05:00:02Z', 'en', '{"score":42,"comments":18}'::jsonb, '1111111111111111111111111111111111', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://hn.algolia.com/api/v1/search_by_date","retrievedAt":"2026-08-31T05:00:02Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000302', p_product_id, v_github, 'github-1001', 'https://github.com/microsoft/playwright/issues/1001', 'Recover context after login redirect', 'The context is still alive but the run cannot recover after a login redirect; a persistent authenticated session would help.', 'Issue describing a repeatable auth recovery failure.', 'github:dev-1001', '2026-08-28T14:00:00Z', '2026-08-31T05:00:05Z', 'en', '{"comments":11,"reactions":27}'::jsonb, '2222222222222222222222222222222222', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://api.github.com/repos/microsoft/playwright/issues","retrievedAt":"2026-08-31T05:00:05Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000303', p_product_id, v_stack, 'stack-2001', 'https://stackoverflow.com/questions/2001', 'Playwright session expires during test', 'What is the recommended way to re-authenticate without losing the current browser state?', 'A practical question with accepted answers around session persistence.', 'stackoverflow:dev-2001', '2026-08-27T09:00:00Z', '2026-08-31T05:00:09Z', 'en', '{"score":31,"comments":7}'::jsonb, '3333333333333333333333333333333333', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://api.stackexchange.com/2.3/search/advanced","retrievedAt":"2026-08-31T05:00:09Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000304', p_product_id, v_rss, 'rss-3001', 'https://dev.to/example/authenticated-browser-sessions', 'Reliable authenticated browser sessions', 'A field report on rebuilding browser state after a provider invalidates a session.', 'Developer article with implementation notes.', 'dev:author-01', '2026-08-26T09:00:00Z', '2026-08-31T05:00:13Z', 'en', '{"reactions":56,"comments":9}'::jsonb, '4444444444444444444444444444444444', '{"transport":"rss","adapterVersion":"v1","requestUrl":"https://dev.to/feed","retrievedAt":"2026-08-31T05:00:13Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000305', p_product_id, v_discourse, 'discourse-4001', 'https://meta.discourse.org/t/session-recovery/4001', 'Session recovery after SSO changes', 'Our automation needs a safe way to recover a session after SSO changes without restarting every job.', 'Public forum topic about browser session continuity.', 'discourse:member-01', '2026-08-25T09:00:00Z', '2026-08-31T05:00:16Z', 'en', '{"likes":22,"replies":14}'::jsonb, '5555555555555555555555555555555555', '{"transport":"solari_browser","adapterVersion":"v1","requestUrl":"https://meta.discourse.org/t/session-recovery/4001","finalUrl":"https://meta.discourse.org/t/session-recovery/4001","retrievedAt":"2026-08-31T05:00:16Z","solariRunRef":"browser-run-demo-4001"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000306', p_product_id, v_hn, 'hn-441002', 'https://news.ycombinator.com/item?id=441002', 'Better visibility into flaky retries', 'Retries are useful, but teams need to know exactly which auth state was restored on each attempt.', 'A related request for transparent retry context.', 'hn:maker-02', '2026-08-30T10:00:00Z', '2026-08-31T05:00:02Z', 'en', '{"score":19,"comments":5}'::jsonb, '6666666666666666666666666666666666', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://hn.algolia.com/api/v1/search_by_date","retrievedAt":"2026-08-31T05:00:02Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000307', p_product_id, v_github, 'github-1002', 'https://github.com/microsoft/playwright/issues/1002', 'Expose retry and recovery trace', 'Can the runner expose a trace of retry decisions so we can debug existing flaky automation?', 'Issue asking for better observability of a public capability.', 'github:dev-1002', '2026-08-24T14:00:00Z', '2026-08-31T05:00:05Z', 'en', '{"comments":8,"reactions":18}'::jsonb, '7777777777777777777777777777777777', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://api.github.com/repos/microsoft/playwright/issues","retrievedAt":"2026-08-31T05:00:05Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000308', p_product_id, v_stack, 'stack-2002', 'https://stackoverflow.com/questions/2002', 'Trace browser retries', 'How do I capture retry metadata from a browser automation run?', 'Stack Overflow question matching the existing retry logs capability.', 'stackoverflow:dev-2002', '2026-08-23T09:00:00Z', '2026-08-31T05:00:09Z', 'en', '{"score":17,"comments":4}'::jsonb, '8888888888888888888888888888888888', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://api.stackexchange.com/2.3/search/advanced","retrievedAt":"2026-08-31T05:00:09Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000309', p_product_id, v_github, 'github-1003', 'https://github.com/browser-use/browser-use/issues/1003', 'Queue browser tasks until auth is restored', 'We need sessions to wait and recover when authentication is lost instead of failing the entire queue.', 'Issue expressing a demand not covered by the public feature list.', 'github:dev-1003', '2026-08-30T14:00:00Z', '2026-08-31T05:00:06Z', 'en', '{"comments":23,"reactions":41}'::jsonb, '9999999999999999999999999999999999', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://api.github.com/repos/browser-use/browser-use/issues","retrievedAt":"2026-08-31T05:00:06Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000310', p_product_id, v_rss, 'rss-3002', 'https://dev.to/example/browser-task-queue', 'Pause and resume browser jobs safely', 'A request for a queue that can pause a browser task, restore authentication, and continue.', 'Developer article proposing a persistent session queue.', 'dev:author-02', '2026-08-29T09:00:00Z', '2026-08-31T05:00:13Z', 'en', '{"reactions":38,"comments":6}'::jsonb, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '{"transport":"rss","adapterVersion":"v1","requestUrl":"https://dev.to/feed","retrievedAt":"2026-08-31T05:00:13Z"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000311', p_product_id, v_discourse, 'discourse-4002', 'https://meta.discourse.org/t/queue-auth-recovery/4002', 'Continue queued jobs after login recovery', 'Has anyone built a reliable way to continue queued jobs after a login session is repaired?', 'Forum question about resumable authenticated work.', 'discourse:member-02', '2026-08-28T09:00:00Z', '2026-08-31T05:00:16Z', 'en', '{"likes":17,"replies":10}'::jsonb, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '{"transport":"solari_browser","adapterVersion":"v1","requestUrl":"https://meta.discourse.org/t/queue-auth-recovery/4002","finalUrl":"https://meta.discourse.org/t/queue-auth-recovery/4002","retrievedAt":"2026-08-31T05:00:16Z","solariRunRef":"browser-run-demo-4002"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000312', p_product_id, v_hn, 'hn-441003', 'https://news.ycombinator.com/item?id=441003', 'Resumable browser queues', 'A founder describes losing hours when browser tasks cannot resume after authentication interruptions.', 'Founder discussion about resumable browser task queues.', 'hn:maker-03', '2026-08-27T10:00:00Z', '2026-08-31T05:00:02Z', 'en', '{"score":28,"comments":12}'::jsonb, 'cccccccccccccccccccccccccccccccc', '{"transport":"api","adapterVersion":"v1","requestUrl":"https://hn.algolia.com/api/v1/search_by_date","retrievedAt":"2026-08-31T05:00:02Z"}'::jsonb);

  insert into public.demand_clusters (id, product_id, stable_key, title, score, score_explanation, confidence, independent_signal_count, independent_source_count, first_detected_at, last_detected_at, trend, related_public_context_id, related_private_context_id, opportunity_state, opportunity_status, suggested_action, centroid, algorithm_version)
  values
    (v_existing, p_product_id, 'cluster.retry-observability', 'Transparent retry and recovery traces', 64, '{"volume":0.55,"sourceDiversity":0.75,"recency":0.82,"momentum":0.49,"engagement":0.62}'::jsonb, 0.78, 3, 3, '2026-08-12T09:00:00Z', '2026-08-30T10:00:00Z', 'stable', v_public_feature, null, 'existing', 'watching', 'Join the conversation and explain the existing retry logs.', '{"tokens":["retry","recovery","trace","logs"]}'::jsonb, 'v1'),
    (v_roadmap_cluster, p_product_id, 'cluster.auth-session-persistence', 'Persistent authenticated browser sessions', 87, '{"volume":0.91,"sourceDiversity":1.0,"recency":0.94,"momentum":0.88,"engagement":0.79}'::jsonb, 0.96, 5, 5, '2026-07-28T09:00:00Z', '2026-08-29T10:00:00Z', 'rising', null, v_roadmap, 'roadmap', 'new', 'Use this as evidence that the roadmap item may deserve higher priority.', '{"tokens":["authenticated","session","recover","auth"]}'::jsonb, 'v1'),
    (v_unmapped, p_product_id, 'cluster.resumable-browser-queues', 'Resumable browser task queues', 91, '{"volume":0.96,"sourceDiversity":0.75,"recency":0.97,"momentum":0.93,"engagement":0.84}'::jsonb, 0.91, 4, 3, '2026-08-20T09:00:00Z', '2026-08-30T14:00:00Z', 'rising', null, null, 'unmapped', 'new', 'Investigate a queue that can pause, recover, and resume browser work.', '{"tokens":["queue","pause","resume","browser","job"]}'::jsonb, 'v1');

  insert into public.cluster_memberships (cluster_id, evidence_id, scan_run_id, similarity, matching_rationale)
  values
    (v_roadmap_cluster, 'a0000000-0000-4000-8000-000000000301', v_run_id, 0.91, 'Shared auth/session recovery phrases across HN and the product roadmap.'),
    (v_roadmap_cluster, 'a0000000-0000-4000-8000-000000000302', v_run_id, 0.87, 'Shared persistent authenticated context and login recovery concepts.'),
    (v_roadmap_cluster, 'a0000000-0000-4000-8000-000000000303', v_run_id, 0.85, 'Shared re-authentication without losing browser state.'),
    (v_roadmap_cluster, 'a0000000-0000-4000-8000-000000000304', v_run_id, 0.82, 'Shared authenticated browser session continuity.'),
    (v_roadmap_cluster, 'a0000000-0000-4000-8000-000000000305', v_run_id, 0.80, 'Shared SSO/session recovery intent from a public forum.'),
    (v_existing, 'a0000000-0000-4000-8000-000000000306', v_run_id, 0.84, 'Shared retry trace and restored-state visibility.'),
    (v_existing, 'a0000000-0000-4000-8000-000000000307', v_run_id, 0.88, 'Shared retry decision trace and observability language.'),
    (v_existing, 'a0000000-0000-4000-8000-000000000308', v_run_id, 0.83, 'Shared browser retry metadata request.'),
    (v_unmapped, 'a0000000-0000-4000-8000-000000000309', v_run_id, 0.89, 'Shared queue pause/recovery/resume request.'),
    (v_unmapped, 'a0000000-0000-4000-8000-000000000310', v_run_id, 0.86, 'Shared resumable browser job queue intent.'),
    (v_unmapped, 'a0000000-0000-4000-8000-000000000311', v_run_id, 0.84, 'Shared continuation of queued jobs after login repair.'),
    (v_unmapped, 'a0000000-0000-4000-8000-000000000312', v_run_id, 0.81, 'Shared resumable browser task queue demand.');

  insert into public.cluster_snapshots (cluster_id, day, signal_count, source_count, score, confidence)
  select v_existing, current_date - day_offset, 1 + (day_offset % 3), 1 + (day_offset % 3), 48 + (day_offset % 17), 0.60 + ((day_offset % 5)::numeric / 20)
  from generate_series(0, 29) as days(day_offset);
  insert into public.cluster_snapshots (cluster_id, day, signal_count, source_count, score, confidence)
  select v_roadmap_cluster, current_date - day_offset, 2 + ((29 - day_offset) % 5), 1 + ((29 - day_offset) % 5), 55 + ((29 - day_offset) % 30), 0.68 + (((29 - day_offset) % 5)::numeric / 20)
  from generate_series(0, 29) as days(day_offset);
  insert into public.cluster_snapshots (cluster_id, day, signal_count, source_count, score, confidence)
  select v_unmapped, current_date - day_offset, 1 + ((29 - day_offset) % 6), 1 + ((29 - day_offset) % 3), 51 + ((29 - day_offset) % 40), 0.64 + (((29 - day_offset) % 6)::numeric / 20)
  from generate_series(0, 29) as days(day_offset);

  insert into public.social_profiles (product_id, platform, enabled, account_type, preferred_length, tone, writing_instructions, constraints)
  values
    (p_product_id, 'x', true, 'founder', 240, 'technical and direct', 'Avoid hype; mention evidence when useful.', '{"maxCharacters":280}'::jsonb),
    (p_product_id, 'linkedin', true, 'founder', 900, 'clear and reflective', 'Use short paragraphs and one concrete takeaway.', '{"maxCharacters":3000}'::jsonb),
    (p_product_id, 'reddit', false, 'maker', 1200, 'helpful and non-promotional', 'Lead with the problem and invite discussion.', '{"maxCharacters":40000}'::jsonb);

  insert into public.posts (id, product_id, cluster_id, platform, status, editor_json, plain_text, character_count, generation_metadata)
  values
    ('a0000000-0000-4000-8000-000000000401', p_product_id, v_unmapped, 'x', 'draft', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A recurring pattern keeps appearing across developer communities: browser tasks need to pause, recover authentication, and resume instead of starting over.\n\nThat looks like a product opportunity worth investigating."}]}]}'::jsonb, 'A recurring pattern keeps appearing across developer communities: browser tasks need to pause, recover authentication, and resume instead of starting over.\n\nThat looks like a product opportunity worth investigating.', 228, '{"privateContextExcluded":true,"seed":true}'::jsonb),
    ('a0000000-0000-4000-8000-000000000402', p_product_id, v_existing, 'linkedin', 'draft', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Teams are asking for clearer retry and recovery traces in browser automation.\n\nWe already support transparent retry logs, so this is a good moment to join the conversation with a practical example."}]}]}'::jsonb, 'Teams are asking for clearer retry and recovery traces in browser automation.\n\nWe already support transparent retry logs, so this is a good moment to join the conversation with a practical example.', 224, '{"privateContextExcluded":true,"seed":true}'::jsonb),
    ('a0000000-0000-4000-8000-000000000403', p_product_id, v_roadmap_cluster, 'linkedin', 'draft', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Authenticated browser sessions are becoming a recurring source of friction for automation teams.\n\nHere are a few practical patterns for making session recovery more reliable."}]}]}'::jsonb, 'Authenticated browser sessions are becoming a recurring source of friction for automation teams.\n\nHere are a few practical patterns for making session recovery more reliable.', 214, '{"privateContextExcluded":true,"seed":true}'::jsonb);

  insert into public.post_revisions (post_id, editor_json, plain_text, revision_type)
  select id, editor_json, plain_text, 'manual' from public.posts where product_id = p_product_id;
  insert into public.product_events (product_id, event_type, metadata)
  values
    (p_product_id, 'product_created', '{"seed":true}'::jsonb),
    (p_product_id, 'scan_completed', jsonb_build_object('scan_run_id', v_run_id, 'seed', true)),
    (p_product_id, 'post_created', '{"seed":true}'::jsonb);
end;
$$;

revoke all on function public.enqueue_scan(uuid, public.scan_trigger) from public, anon;
revoke all on function public.enqueue_due_scans() from public, anon, authenticated;
revoke all on function public.claim_next_scan(text, integer) from public, anon, authenticated;
revoke all on function public.claim_scan_source_attempt(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.complete_scan_source_attempt(uuid, text, public.source_attempt_status, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.retry_scan_source_attempt(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.advance_scan_stage(uuid, text, public.scan_status, public.scan_status, jsonb) from public, anon, authenticated;
revoke all on function public.fail_scan(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.reset_demo_workspace(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_scan(uuid, public.scan_trigger) to authenticated, service_role;
grant execute on function public.enqueue_due_scans() to service_role;
grant execute on function public.claim_next_scan(text, integer) to service_role;
grant execute on function public.claim_scan_source_attempt(uuid, text, integer) to service_role;
grant execute on function public.complete_scan_source_attempt(uuid, text, public.source_attempt_status, integer, integer, text, text) to service_role;
grant execute on function public.retry_scan_source_attempt(uuid, text, text, text, integer) to service_role;
grant execute on function public.advance_scan_stage(uuid, text, public.scan_status, public.scan_status, jsonb) to service_role;
grant execute on function public.fail_scan(uuid, text, jsonb) to service_role;
grant execute on function public.reset_demo_workspace(uuid) to service_role;

-- Optional operator setup. Enable pg_cron, pg_net and Supabase Vault first.
-- Store `demand_radar_worker_url` and `demand_radar_worker_token` in Vault;
-- never replace these placeholders with plaintext URLs or secrets in the migration.
--
-- select cron.schedule(
--   'demand-radar-scan-dispatch', '* * * * *',
--   $$ select public.enqueue_due_scans();
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'demand_radar_worker_url'),
--     headers := jsonb_build_object('content-type', 'application/json', 'x-worker-token', (select decrypted_secret from vault.decrypted_secrets where name = 'demand_radar_worker_token')),
--     body := jsonb_build_object('source', 'pg_cron')
--   ); $$
-- );
