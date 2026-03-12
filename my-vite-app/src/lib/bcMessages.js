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
  RUNS_COUNT_REQUEST: "runs_count_request",
  MESSAGES_UNREAD_REQUEST: "messages_unread_request",
  MESSAGE_MARK_READ: "message_mark_read",
  LEADERBOARD_REQUEST: "leaderboard_request",

  // responses
  CTX: "bc_ctx",
  AUTH_STATE: "auth_state",
  WINES_REPORT: "wines_report",
  RUNS_COUNT_RESPONSE: "runs_count_response",
  MESSAGES_UNREAD_RESPONSE: "messages_unread_response",
  MESSAGE_MARK_READ_RESULT: "message_mark_read_result",
  LEADERBOARD_RESPONSE: "leaderboard_response",

  ERROR: "bc_error",
});
