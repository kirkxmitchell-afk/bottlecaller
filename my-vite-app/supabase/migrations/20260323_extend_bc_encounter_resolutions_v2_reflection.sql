begin;

create or replace view public.bc_encounter_resolutions_v2 as
select
  e.id as row_id,
  e.event_id,
  e.user_id,
  e.restaurant_id,
  e.occurred_at,
  nullif(e.payload ->> 'v', '')::integer as v,
  nullif(e.payload ->> 'mode', '') as mode,
  coalesce(
    nullif(e.payload ->> 'sessionId', ''),
    nullif(e.payload ->> 'session_id', '')
  ) as session_id,
  nullif(e.payload ->> 'seq', '')::integer as seq,
  nullif(e.payload ->> 'encounterId', '') as encounter_id,
  nullif(e.payload ->> 'encounterNumber', '')::integer as encounter_number,
  nullif(e.payload ->> 'tier', '')::integer as tier,
  nullif(e.payload ->> 'chainScore', '')::numeric as chain_score,
  nullif(e.payload ->> 'chainSignal', '') as chain_signal,
  nullif(e.payload ->> 'performanceGrade', '') as performance_grade,
  nullif(e.payload ->> 'finalDifficulty', '')::numeric as final_difficulty,
  coalesce(
    nullif(e.payload -> 'chosen' ->> 'guestType', ''),
    nullif(e.payload ->> 'chosenGuestType', ''),
    nullif(e.payload ->> 'chosen_guest_type', '')
  ) as chosen_guest_type,
  coalesce(
    nullif(e.payload -> 'chosen' ->> 'mode', ''),
    nullif(e.payload ->> 'chosenMode', ''),
    nullif(e.payload ->> 'chosen_mode', '')
  ) as chosen_mode,
  coalesce(
    nullif(e.payload -> 'chosen' ->> 'hook', ''),
    nullif(e.payload ->> 'chosenHook', ''),
    nullif(e.payload ->> 'chosen_hook', '')
  ) as chosen_hook,
  coalesce(
    nullif(e.payload -> 'actual' ->> 'guestType', ''),
    nullif(e.payload ->> 'actualGuestType', ''),
    nullif(e.payload ->> 'actual_guest_type', '')
  ) as actual_guest_type,
  coalesce(
    nullif(e.payload -> 'chosen' ->> 'guestTypeNorm', ''),
    nullif(e.payload ->> 'chosenGuestTypeNorm', ''),
    nullif(e.payload ->> 'chosen_guest_type_norm', '')
  ) as chosen_guest_type_norm,
  coalesce(
    nullif(e.payload -> 'actual' ->> 'guestTypeNorm', ''),
    nullif(e.payload ->> 'actualGuestTypeNorm', ''),
    nullif(e.payload ->> 'actual_guest_type_norm', '')
  ) as actual_guest_type_norm,
  coalesce(
    nullif(e.payload -> 'pivot' ->> 'type', ''),
    nullif(e.payload ->> 'pivotType', ''),
    nullif(e.payload ->> 'pivot_type', '')
  ) as pivot_type,
  coalesce(
    nullif(e.payload -> 'pivot' ->> 'taken', '')::boolean,
    nullif(e.payload ->> 'pivotTaken', '')::boolean,
    nullif(e.payload ->> 'pivot_taken', '')::boolean
  ) as pivot_taken,
  coalesce(
    nullif(e.payload -> 'pivot' ->> 'success', '')::boolean,
    nullif(e.payload ->> 'pivotSuccess', '')::boolean,
    nullif(e.payload ->> 'pivot_success', '')::boolean
  ) as pivot_success,
  coalesce(
    nullif(e.payload -> 'checks' ->> 'readCorrect', '')::boolean,
    nullif(e.payload ->> 'guestReadCorrect', '')::boolean,
    nullif(e.payload ->> 'readCorrect', '')::boolean,
    nullif(e.payload ->> 'read_correct', '')::boolean
  ) as read_correct,
  coalesce(
    nullif(e.payload -> 'checks' ->> 'deliveryCorrect', '')::boolean,
    nullif(e.payload ->> 'deliveryCorrect', '')::boolean,
    nullif(e.payload ->> 'delivery_correct', '')::boolean
  ) as delivery_correct,
  coalesce(
    nullif(e.payload -> 'checks' ->> 'modeStatus', ''),
    nullif(e.payload ->> 'modeStatus', ''),
    nullif(e.payload ->> 'mode_status', '')
  ) as mode_status,
  coalesce(
    nullif(e.payload -> 'checks' ->> 'hookStatus', ''),
    nullif(e.payload ->> 'hookStatus', ''),
    nullif(e.payload ->> 'hook_status', '')
  ) as hook_status,
  coalesce(
    nullif(e.payload ->> 'isGreen', '')::boolean,
    nullif(e.payload ->> 'is_green', '')::boolean,
    case nullif(e.payload ->> 'performanceGrade', '')
      when 'green' then true
      when 'yellow' then false
      when 'red' then false
      else null
    end
  ) as is_green,
  coalesce(
    nullif(e.payload ->> 'isRed', '')::boolean,
    nullif(e.payload ->> 'is_red', '')::boolean,
    case nullif(e.payload ->> 'performanceGrade', '')
      when 'red' then true
      when 'yellow' then false
      when 'green' then false
      else null
    end
  ) as is_red,
  coalesce(
    nullif(e.payload ->> 'modeOptimal', '')::boolean,
    nullif(e.payload ->> 'mode_optimal', '')::boolean,
    case
      when coalesce(
        nullif(e.payload -> 'checks' ->> 'modeStatus', ''),
        nullif(e.payload ->> 'modeStatus', ''),
        nullif(e.payload ->> 'mode_status', '')
      ) = 'right' then true
      when coalesce(
        nullif(e.payload -> 'checks' ->> 'modeStatus', ''),
        nullif(e.payload ->> 'modeStatus', ''),
        nullif(e.payload ->> 'mode_status', '')
      ) is not null then false
      else null
    end
  ) as mode_optimal,
  coalesce(
    nullif(e.payload ->> 'hookOptimal', '')::boolean,
    nullif(e.payload ->> 'hook_optimal', '')::boolean,
    case
      when coalesce(
        nullif(e.payload -> 'checks' ->> 'hookStatus', ''),
        nullif(e.payload ->> 'hookStatus', ''),
        nullif(e.payload ->> 'hook_status', '')
      ) = 'right' then true
      when coalesce(
        nullif(e.payload -> 'checks' ->> 'hookStatus', ''),
        nullif(e.payload ->> 'hookStatus', ''),
        nullif(e.payload ->> 'hook_status', '')
      ) is not null then false
      else null
    end
  ) as hook_optimal,
  case
    when jsonb_typeof(e.payload -> 'reflection') = 'object' then e.payload -> 'reflection'
    else null
  end as reflection,
  coalesce(
    case
      when jsonb_typeof(e.payload -> 'reactionSummary') = 'object' then e.payload -> 'reactionSummary'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'reaction_summary') = 'object' then e.payload -> 'reaction_summary'
      else null
    end
  ) as reaction_summary,
  coalesce(
    case
      when jsonb_typeof(e.payload -> 'stepReactionTrail') = 'array' then e.payload -> 'stepReactionTrail'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'step_reaction_trail') = 'array' then e.payload -> 'step_reaction_trail'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'reflection' -> 'stepReactionTrail') = 'array' then e.payload -> 'reflection' -> 'stepReactionTrail'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'reflection' -> 'reactionHistory') = 'array' then e.payload -> 'reflection' -> 'reactionHistory'
      else null
    end
  ) as step_reaction_trail,
  coalesce(
    case
      when jsonb_typeof(e.payload -> 'stepSpine') = 'array' then e.payload -> 'stepSpine'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'step_spine') = 'array' then e.payload -> 'step_spine'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'reflection' -> 'stepSpine') = 'array' then e.payload -> 'reflection' -> 'stepSpine'
      else null
    end
  ) as step_spine,
  coalesce(
    nullif(e.payload -> 'reflection' ->> 'aiPerception', ''),
    nullif(e.payload ->> 'aiPerception', ''),
    nullif(e.payload ->> 'ai_perception', '')
  ) as ai_perception,
  coalesce(
    nullif(e.payload -> 'reflection' ->> 'bottleServed', '')::boolean,
    nullif(e.payload ->> 'bottleServed', '')::boolean,
    nullif(e.payload ->> 'bottle_served', '')::boolean
  ) as bottle_served,
  coalesce(
    case
      when jsonb_typeof(e.payload -> 'reflection' -> 'chosenPath') = 'array' then e.payload -> 'reflection' -> 'chosenPath'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'chosenPath') = 'array' then e.payload -> 'chosenPath'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'chosen_path') = 'array' then e.payload -> 'chosen_path'
      else null
    end
  ) as chosen_path,
  coalesce(
    case
      when jsonb_typeof(e.payload -> 'reflection' -> 'bestPath') = 'array' then e.payload -> 'reflection' -> 'bestPath'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'bestPath') = 'array' then e.payload -> 'bestPath'
      else null
    end,
    case
      when jsonb_typeof(e.payload -> 'best_path') = 'array' then e.payload -> 'best_path'
      else null
    end
  ) as best_path
from public.bc_event_log e
where
  e.event_type = 'encounter_resolved'
  and coalesce(nullif(e.payload ->> 'v', '')::integer, 0) = 2;

alter view public.bc_encounter_resolutions_v2 set (security_invoker = true);

commit;
