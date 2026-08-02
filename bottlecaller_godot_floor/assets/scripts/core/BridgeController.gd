extends Node
class_name BridgeController

## Web embed bridge between the Godot floor and the BottleCaller app iframe.
## Host page (index.html) installs window.__BC_GODOT_* helpers so we only ever
## call one-line JavaScriptBridge.eval — multiline eval flashes error UI on web.

signal offer_wine_requested(payload: Dictionary)
signal v2_result_received(payload: Dictionary)
signal shift_finished(payload: Dictionary)
signal host_ready(payload: Dictionary)

const SOURCE_GODOT := "BC_GODOT"
const SOURCE_APP := "BC_APP"
const PROTOCOL_VERSION := 1

var embedded := false
var _inbox_ready := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	if OS.has_feature("web"):
		_install_js_inbox()
		embedded = true
		# Defer one frame so the HTML helpers are definitely present.
		await get_tree().process_frame
		post_to_parent("godot_ready", {
			"viewport": {
				"width": 1600,
				"height": 900,
			},
		})


func is_embedded() -> bool:
	return embedded and OS.has_feature("web")


func post_to_parent(message_type: String, payload: Dictionary = {}) -> void:
	if not OS.has_feature("web"):
		return

	var envelope := {
		"source": SOURCE_GODOT,
		"v": PROTOCOL_VERSION,
		"type": message_type,
		"payload": payload,
		"at": Time.get_unix_time_from_system(),
	}
	var envelope_json := JSON.stringify(envelope)
	var as_js_string := JSON.stringify(envelope_json)
	# One-liner only — helpers live in index.html.
	JavaScriptBridge.eval(
		"window.__BC_GODOT_POST__&&window.__BC_GODOT_POST__(" + as_js_string + ")",
		true
	)


func emit_offer_wine(payload: Dictionary) -> void:
	offer_wine_requested.emit(payload)
	post_to_parent("offer_wine", payload)


func emit_shift_complete(payload: Dictionary) -> void:
	shift_finished.emit(payload)
	post_to_parent("shift_complete", payload)


func emit_telemetry(event_type: String, payload: Dictionary = {}) -> void:
	var body := payload.duplicate(true)
	body["eventType"] = event_type
	post_to_parent("telemetry", body)


func _process(_delta: float) -> void:
	if not _inbox_ready:
		return
	_poll_inbox()


func _install_js_inbox() -> void:
	JavaScriptBridge.eval(
		"window.__BC_GODOT_INSTALL_INBOX__&&window.__BC_GODOT_INSTALL_INBOX__()",
		true
	)
	_inbox_ready = true


func _poll_inbox() -> void:
	var raw = JavaScriptBridge.eval(
		"window.__BC_GODOT_POLL__?window.__BC_GODOT_POLL__():''",
		true
	)
	if raw == null:
		return
	var text := str(raw)
	if text.strip_edges() == "":
		return

	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return

	var message_type := str(parsed.get("type", ""))
	var payload = parsed.get("payload", {})
	if typeof(payload) != TYPE_DICTIONARY:
		payload = {}

	match message_type:
		"host_hello", "resume_shift":
			host_ready.emit(payload)
		"v2_encounter_result":
			v2_result_received.emit(payload)
		_:
			pass
