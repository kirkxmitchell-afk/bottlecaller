-- BottleCaller security hardening, phase 2.
-- Apply after phase 1 and after testing the authenticated manager/player flows.
--
-- This flips the flagged analytics/read-model views to security_invoker so they
-- obey the querying user's RLS context instead of the view owner's privileges.
-- Run this only after verifying the underlying tables/views have the policies
-- needed for the current product behavior.

begin;

alter view public.bc_manager_board_v1 set (security_invoker = true);
alter view public.bc_sessions_v1 set (security_invoker = true);
alter view public.bc_restaurant_seats_v1 set (security_invoker = true);
alter view public.bc_encounter_resolutions_v1 set (security_invoker = true);
alter view public.bc_readiness_v1 set (security_invoker = true);
alter view public.bc_encounter_resolutions_v2 set (security_invoker = true);
alter view public.bc_scheduling_v1 set (security_invoker = true);
alter view public.bc_ritual_compliance_v1 set (security_invoker = true);
alter view public.bc_run_counts_v1 set (security_invoker = true);
alter view public.bc_drill_prescriptions_v1 set (security_invoker = true);
alter view public.bc_encounter_truth_v2 set (security_invoker = true);
alter view public.bc_weakest_link_v1 set (security_invoker = true);
alter view public.bc_trend_fatigue_v1 set (security_invoker = true);
alter view public.bc_drill_prescriptions_v2 set (security_invoker = true);
alter view public.bc_waiter_leaderboard_v1 set (security_invoker = true);
alter view public.bc_user_latest_v1 set (security_invoker = true);
alter view public.bc_manager_card_v1 set (security_invoker = true);
alter view public.bc_encounter_resolutions set (security_invoker = true);
alter view public.bc_totals_v1 set (security_invoker = true);

commit;
