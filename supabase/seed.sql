-- Canonical, idempotent Demand Radar demo seed.
-- The reset function resolves the existing demo auth user by email and never handles a password.
select public.reset_demo_workspace('428ebea4-c643-4f7e-ad85-dea0841ad48e'::uuid);
