export const BC_MSG_SOURCE = "BC_MSG";
export const BC_MSG_VERSION = 1;

export function isBcMessage(msg) {
  return !!msg && msg.source === BC_MSG_SOURCE && msg.v === BC_MSG_VERSION && typeof msg.type === "string";
}

export function bcReply(type, payload = {}) {
  return { source: BC_MSG_SOURCE, v: BC_MSG_VERSION, type, ...payload };
}

// Optional: centralize types so you don’t typo them
export const BC_TYPES = Object.freeze({
  CTX_REQUEST: "bc_ctx_request",
  LOGOUT_REQUEST: "bc_logout_request",

  WINES_REQUEST: "wines_request",
  WINES_MUTATE: "wines_mutate",
  RUNS_COUNT_REQUEST: "runs_count_request",
  RITUAL_STATUS_REQUEST: "ritual_status_request",
  MESSAGES_UNREAD_REQUEST: "messages_unread_request",
  MESSAGE_MARK_READ: "message_mark_read",
  LEADERBOARD_REQUEST: "leaderboard_request",
  PROGRESSION_SNAPSHOT_REQUEST: "progression_snapshot_request",
  PROGRESS_REPORT_SUBMIT: "progress_report_submit",
  HARD_RESET_PROGRESSION: "hard_reset_progression",
  TOURNAMENT_CREATE: "tournament_create",
  TOURNAMENT_SNAPSHOT: "tournament_snapshot",
  TOURNAMENT_START: "tournament_start",
  TOURNAMENT_ADVANCE: "tournament_advance",
  TOURNAMENT_RESTORE: "tournament_restore",
  TOURNAMENT_CHECKPOINT: "tournament_checkpoint",

  // responses
  CTX: "bc_ctx",
  CTX_NOT_READY: "ctx_not_ready",
  CTX_REQUIRED: "ctx_required",
  AUTH_STATE: "auth_state",
  WINES_REPORT: "wines_report",
  WINES_MUTATE_RESULT: "wines_mutate_result",
  RUNS_COUNT_RESPONSE: "runs_count_response",
  RITUAL_STATUS_RESPONSE: "ritual_status_response",
  MESSAGES_UNREAD_RESPONSE: "messages_unread_response",
  MESSAGE_MARK_READ_RESULT: "message_mark_read_result",
  LEADERBOARD_RESPONSE: "leaderboard_response",
  PROGRESSION_SNAPSHOT: "progression_snapshot",
  PROGRESS_REPORT_SUBMIT_RESULT: "progress_report_submit_result",
  HARD_RESET_PROGRESSION_RESULT: "hard_reset_progression_result",
  TOURNAMENT_CREATED: "tournament_created",
  TOURNAMENT_SNAPSHOT_RESULT: "tournament_snapshot_result",
  TOURNAMENT_STARTED: "tournament_started",
  TOURNAMENT_ADVANCED: "tournament_advanced",
  TOURNAMENT_RESTORED: "tournament_restored",
  TOURNAMENT_CHECKPOINT_RESULT: "tournament_checkpoint_result",

  ERROR: "bc_error",
});
