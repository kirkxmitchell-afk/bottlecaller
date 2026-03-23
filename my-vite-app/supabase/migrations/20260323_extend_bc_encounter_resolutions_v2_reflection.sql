begin;

create or replace view public.bc_encounter_resolutions_v2 as
select
  id as row_id,
  event_id,
  user_id,
  restaurant_id,
  occurred_at,
  (payload ->> 'v')::integer as v,
  payload ->> 'mode' as mode,
  payload ->> 'sessionId' as session_id,
  nullif(payload ->> 'seq', '')::integer as seq,
  payload ->> 'encounterId' as encounter_id,
  nullif(payload ->> 'encounterNumber', '')::integer as encounter_number,
  nullif(payload ->> 'tier', '')::integer as tier,
  nullif(payload ->> 'chainScore', '')::numeric as chain_score,
  payload ->> 'chainSignal' as chain_signal,
  payload ->> 'performanceGrade' as performance_grade,
  nullif(payload ->> 'finalDifficulty', '')::integer as final_difficulty,
  payload #>> '{chosen,guestType}' as chosen_guest_type,
  payload #>> '{chosen,mode}' as chosen_mode,
  payload #>> '{chosen,hook}' as chosen_hook,
  payload #>> '{actual,guestType}' as actual_guest_type,
  lower(regexp_replace(coalesce(payload #>> '{chosen,guestType}', ''), '[\\s-]+', '_', 'g')) as chosen_guest_type_norm,
  lower(regexp_replace(coalesce(payload #>> '{actual,guestType}', ''), '[\\s-]+', '_', 'g')) as actual_guest_type_norm,
  payload #>> '{pivot,type}' as pivot_type,
  coalesce((payload #>> '{pivot,taken}')::boolean, false) as pivot_taken,
  coalesce((payload #>> '{pivot,success}')::boolean, false) as pivot_success,
  coalesce((payload #>> '{checks,readCorrect}')::boolean, false) as read_correct,
  coalesce((payload #>> '{checks,deliveryCorrect}')::boolean, false) as delivery_correct,
  lower(coalesce(payload #>> '{checks,modeStatus}', '')) as mode_status,
  lower(coalesce(payload #>> '{checks,hookStatus}', '')) as hook_status,
  lower(coalesce(payload ->> 'chainSignal', '')) = 'green' as is_green,
  lower(coalesce(payload ->> 'chainSignal', '')) = 'red' as is_red,
  lower(coalesce(payload #>> '{checks,modeStatus}', '')) = 'optimal' as mode_optimal,
  lower(coalesce(payload #>> '{checks,hookStatus}', '')) = 'optimal' as hook_optimal,
  case
    when jsonb_typeof(payload -> 'reflection') = 'object' then payload -> 'reflection'
    else null
  end as reflection,
  case
    when jsonb_typeof(payload -> 'reactionSummary') = 'object' then payload -> 'reactionSummary'
    when jsonb_typeof(payload -> 'reaction_summary') = 'object' then payload -> 'reaction_summary'
    else null
  end as reaction_summary,
  case
    when jsonb_typeof(payload -> 'stepReactionTrail') = 'array' then payload -> 'stepReactionTrail'
    when jsonb_typeof(payload -> 'step_reaction_trail') = 'array' then payload -> 'step_reaction_trail'
    when jsonb_typeof(payload -> 'reflection' -> 'stepReactionTrail') = 'array' then payload -> 'reflection' -> 'stepReactionTrail'
    when jsonb_typeof(payload -> 'reflection' -> 'reactionHistory') = 'array' then payload -> 'reflection' -> 'reactionHistory'
    else null
  end as step_reaction_trail,
  case
    when jsonb_typeof(payload -> 'stepSpine') = 'array' then payload -> 'stepSpine'
    when jsonb_typeof(payload -> 'step_spine') = 'array' then payload -> 'step_spine'
    when jsonb_typeof(payload -> 'reflection' -> 'stepSpine') = 'array' then payload -> 'reflection' -> 'stepSpine'
    else null
  end as step_spine,
  coalesce(
    payload -> 'reflection' ->> 'aiPerception',
    payload ->> 'aiPerception',
    payload ->> 'ai_perception'
  ) as ai_perception,
  coalesce(
    (payload -> 'reflection' ->> 'bottleServed')::boolean,
    (payload ->> 'bottleServed')::boolean,
    (payload ->> 'bottle_served')::boolean
  ) as bottle_served,
  case
    when jsonb_typeof(payload -> 'reflection' -> 'chosenPath') = 'array' then payload -> 'reflection' -> 'chosenPath'
    when jsonb_typeof(payload -> 'chosenPath') = 'array' then payload -> 'chosenPath'
    when jsonb_typeof(payload -> 'chosen_path') = 'array' then payload -> 'chosen_path'
    else null
  end as chosen_path,
  case
    when jsonb_typeof(payload -> 'reflection' -> 'bestPath') = 'array' then payload -> 'reflection' -> 'bestPath'
    when jsonb_typeof(payload -> 'bestPath') = 'array' then payload -> 'bestPath'
    when jsonb_typeof(payload -> 'best_path') = 'array' then payload -> 'best_path'
    else null
  end as best_path
from bc_event_log e
where event_type = 'encounter_resolved';

alter view public.bc_encounter_resolutions_v2 set (security_invoker = true);

commit;
