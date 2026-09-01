## WIP

### prerelease.sql
- Initial Demand Radar schema: product context, source configuration, scan lifecycle, evidence, clusters, trends, posts, social settings, events, indexes, updated-at triggers, and owner-scoped RLS.
- Server-only worker functions provide scan enqueueing, lease claims, source completion/retry, stage transitions, failure recording, and demo reset.
- Demo data is loaded by `supabase/seed.sql`; optional pg_cron/pg_net setup remains an operator action using Supabase Vault secrets.

## RELEASED
