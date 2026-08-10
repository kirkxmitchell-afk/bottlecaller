extends Node
class_name ShiftServiceSystem


signal action_time_applied(action_id, duration, serviced_table_id)
signal table_patience_breached(table_id)
signal patience_stage_changed(table_id, previous_stage, new_stage)
signal walk_away_selected(table_id)


const ACTION_TIMES := {
	&"greeting": 4.0,
	&"offer_wine": 3.0,
	&"offer_food": 3.0,
	&"walk_away": 0.0,
	&"encounter_return": 2.0,
	&"pos_order_entry": 7.0,
	&"collect_mise": 4.0,
	&"lay_mise": 6.0,
	&"collect_aperitif": 4.0,
	&"serve_aperitif": 6.0,
	&"collect_wine": 5.0,
	&"serve_wine": 7.0,
	&"collect_food": 5.0,
	&"serve_food": 7.0,
	&"collect_dirty_plates": 8.0,
	&"scullery_dropoff": 7.0,
	&"print_bill": 1.0,
	&"take_payment": 5.0,
	&"close_bill": 1.0,
	&"reset_table": 10.0,
}

const PREPARATION_TIMES := {
	&"aperitif": 5.0,
	&"wine": 7.0,
	&"food": 12.0,
}

const PATIENCE_STAGE_TIMES := {
	&"waiting_first_greeting": 90.0,
	&"waiting_follow_up": 90.0,
	&"waiting_pos_order": 100.0,
	&"waiting_aperitif": 90.0,
	&"waiting_wine": 100.0,
	&"waiting_mise": 100.0,
	&"waiting_food": 120.0,
	&"waiting_to_clear": 130.0,
	&"waiting_for_bill_and_payment": 100.0,
	&"waiting_for_bill_close": 90.0,
}

const MOOD_RECOVERY := {
	&"offer_wine": 12.0,
	&"offer_food": 12.0,
	&"walk_away": 0.0,
	&"lay_mise": 16.0,
	&"serve_aperitif": 22.0,
	&"serve_wine": 25.0,
	&"serve_food": 25.0,
	&"collect_dirty_plates": 18.0,
	&"take_payment": 18.0,
}

const GREETING_MINIMUM_PERCENT = 85.0
const SUITABLE_GREETING_BONUS = 10.0

@export_range(0.0, 10.0, 0.05)
var action_time_multiplier = 1.0

@export var debug_service_time = true

var _registered_tables: Dictionary = {}
var _shift_clock_callback: Callable


func configure_shift_clock(callback: Callable) -> void:
	_shift_clock_callback = callback
	if not _shift_clock_callback.is_valid():
		push_warning("ShiftServiceSystem has no valid shift-clock callback.")


func register_table(table) -> void:
	if not is_instance_valid(table):
		push_warning("ShiftServiceSystem cannot register an invalid table.")
		return
	if not table.has_method("get_table_id"):
		push_warning("ShiftServiceSystem table has no get_table_id().")
		return

	var table_id = str(table.get_table_id()).strip_edges()
	if table_id == "":
		push_warning("ShiftServiceSystem cannot register an empty table ID.")
		return
	if _registered_tables.has(table_id):
		if _registered_tables[table_id] != table:
			push_warning("ShiftServiceSystem duplicate table ID: " + table_id)
		return

	_registered_tables[table_id] = table


func unregister_table(table) -> void:
	if not is_instance_valid(table) or not table.has_method("get_table_id"):
		return
	_registered_tables.erase(str(table.get_table_id()))


func apply_fixed_action_time(
	action_id: StringName,
	serviced_table_id: StringName = &""
) -> float:
	if not ACTION_TIMES.has(action_id):
		push_warning("Unknown service action ID: " + str(action_id))
		return 0.0

	var base_seconds = float(ACTION_TIMES[action_id])
	if base_seconds < 0.0:
		push_warning("Negative service action time: " + str(action_id))
		return 0.0
	var final_seconds = base_seconds * maxf(action_time_multiplier, 0.0)
	if final_seconds > 0.0:
		if _shift_clock_callback.is_valid():
			_shift_clock_callback.call(final_seconds)
		else:
			push_warning("Cannot advance shift clock for action: " + str(action_id))
		consume_simulated_elapsed(final_seconds, serviced_table_id)

	if action_id == &"walk_away":
		walk_away_selected.emit(str(serviced_table_id))

	action_time_applied.emit(
		str(action_id),
		final_seconds,
		str(serviced_table_id)
	)
	if debug_service_time:
		print(
			"ACTION TIME: ",
			str(action_id),
			" +",
			final_seconds,
			"s"
		)
	return final_seconds


func consume_real_elapsed(seconds: float) -> void:
	consume_simulated_elapsed(seconds)


func consume_simulated_elapsed(
	seconds: float,
	excluded_table_id: StringName = &""
) -> void:
	if seconds <= 0.0:
		return

	_cleanup_invalid_tables()
	var excluded_id = str(excluded_table_id)
	for table_id in _registered_tables.keys():
		var table = _registered_tables[table_id]
		if str(table_id) == excluded_id:
			continue
		if not table.has_method("consume_patience"):
			continue

		var previous_percent = float(table.get_patience_percent())
		var breached_now = bool(table.consume_patience(seconds))
		_refresh_table_mood(table)
		if breached_now:
			table_patience_breached.emit(str(table_id))
			if debug_service_time:
				print("PATIENCE BREACH: ", table_id)
		elif debug_service_time and seconds >= 1.0:
			var current_percent = float(table.get_patience_percent())
			if not is_equal_approx(previous_percent, current_percent):
				print(
					"TABLE: ", table_id,
					" patience ", roundi(previous_percent),
					"% -> ", roundi(current_percent), "%"
				)


func start_table_patience(
	table_id: StringName,
	stage_id: StringName
) -> void:
	var table = _get_table(table_id)
	if table == null:
		return
	if not PATIENCE_STAGE_TIMES.has(stage_id):
		push_warning("Unknown patience stage ID: " + str(stage_id))
		return

	if table.has_method("reset_patience_tracking"):
		table.reset_patience_tracking()
	_configure_table_stage(table, stage_id, 100.0)


func change_table_patience_stage(
	table_id: StringName,
	stage_id: StringName,
	recovery_percent: float = 0.0
) -> void:
	var table = _get_table(table_id)
	if table == null:
		return
	if not PATIENCE_STAGE_TIMES.has(stage_id):
		push_warning("Unknown patience stage ID: " + str(stage_id))
		return

	var current_percent = float(table.get_patience_percent())
	var updated_percent = clampf(current_percent + recovery_percent, 0.0, 100.0)
	_configure_table_stage(table, stage_id, updated_percent)


func apply_greeting_recovery(
	table_id: StringName,
	suitable_greeting: bool,
	next_stage: StringName = &"waiting_follow_up"
) -> void:
	var table = _get_table(table_id)
	if table == null:
		return

	var updated_percent = maxf(
		float(table.get_patience_percent()),
		GREETING_MINIMUM_PERCENT
	)
	if suitable_greeting:
		updated_percent += SUITABLE_GREETING_BONUS
	_configure_table_stage(
		table,
		next_stage,
		clampf(updated_percent, 0.0, 100.0)
	)


func restore_table_patience(
	table_id: StringName,
	recovery_id: StringName
) -> void:
	if not MOOD_RECOVERY.has(recovery_id):
		push_warning("Unknown patience recovery ID: " + str(recovery_id))
		return
	var table = _get_table(table_id)
	if table == null:
		return
	table.restore_patience_percent(float(MOOD_RECOVERY[recovery_id]))
	_refresh_table_mood(table)


func set_table_patience_paused(
	table_id: StringName,
	paused: bool
) -> void:
	var table = _get_table(table_id)
	if table != null:
		table.set_patience_paused(paused)


func set_all_table_patience_paused(paused: bool) -> void:
	_cleanup_invalid_tables()
	for table_id in _registered_tables.keys():
		set_table_patience_paused(StringName(table_id), paused)


func stop_table_patience(table_id: StringName) -> void:
	var table = _get_table(table_id)
	if table != null and table.has_method("stop_patience"):
		table.stop_patience()


func get_action_time(action_id: StringName) -> float:
	if not ACTION_TIMES.has(action_id):
		push_warning("Unknown service action ID: " + str(action_id))
		return 0.0
	return float(ACTION_TIMES[action_id]) * maxf(action_time_multiplier, 0.0)


func get_preparation_time(preparation_id: StringName) -> float:
	if not PREPARATION_TIMES.has(preparation_id):
		push_warning("Unknown preparation ID: " + str(preparation_id))
		return 0.0
	return maxf(float(PREPARATION_TIMES[preparation_id]), 0.0)


func get_recovery_value(recovery_id: StringName) -> float:
	if not MOOD_RECOVERY.has(recovery_id):
		push_warning("Unknown patience recovery ID: " + str(recovery_id))
		return 0.0
	return maxf(float(MOOD_RECOVERY[recovery_id]), 0.0)


func get_stage_duration(
	stage_id: StringName,
	guest_multiplier: float = 1.0
) -> float:
	if not PATIENCE_STAGE_TIMES.has(stage_id):
		push_warning("Unknown patience stage ID: " + str(stage_id))
		return 0.0
	var resolved_multiplier = guest_multiplier
	if resolved_multiplier <= 0.0:
		push_warning("Invalid guest patience multiplier; using 1.0.")
		resolved_multiplier = 1.0
	return float(PATIENCE_STAGE_TIMES[stage_id]) * resolved_multiplier


func get_mood_from_patience(percent: float) -> StringName:
	var clamped_percent = clampf(percent, 0.0, 100.0)
	# Wider green/yellow so mood does not drop through the bands as fast.
	if clamped_percent >= 45.0:
		return &"green"
	if clamped_percent >= 25.0:
		return &"yellow"
	if clamped_percent >= 10.0:
		return &"orange"
	if clamped_percent > 0.0:
		return &"red"
	return &"annoyed"


func _configure_table_stage(
	table,
	stage_id: StringName,
	patience_percent: float
) -> void:
	if not PATIENCE_STAGE_TIMES.has(stage_id):
		push_warning("Unknown patience stage ID: " + str(stage_id))
		return

	var previous_stage = StringName(table.current_patience_stage)
	var duration = get_stage_duration(
		stage_id,
		float(table.guest_patience_multiplier)
	)
	table.configure_patience_stage(stage_id, duration, patience_percent)
	_refresh_table_mood(table)
	patience_stage_changed.emit(
		str(table.get_table_id()),
		str(previous_stage),
		str(stage_id)
	)
	if debug_service_time and previous_stage != stage_id:
		print(
			"PATIENCE STAGE: ", table.get_table_id(),
			" ", str(previous_stage), " -> ", str(stage_id)
		)


func _refresh_table_mood(table) -> void:
	if not is_instance_valid(table):
		return
	var mood = get_mood_from_patience(float(table.get_patience_percent()))
	if table.has_method("set_patience_mood_band"):
		table.set_patience_mood_band(
			mood,
			_get_stage_reason(StringName(table.current_patience_stage))
		)


func _get_stage_reason(stage_id: StringName) -> String:
	match stage_id:
		&"waiting_first_greeting":
			return "Waiting to be greeted"
		&"waiting_follow_up":
			return "Waiting for a follow-up"
		&"waiting_pos_order":
			return "Waiting for the order to be entered"
		&"waiting_aperitif":
			return "Waiting for an aperitif"
		&"waiting_wine":
			return "Waiting for wine"
		&"waiting_mise":
			return "Waiting for mise en place"
		&"waiting_food":
			return "Waiting for food"
		&"waiting_to_clear":
			return "Waiting to be cleared"
		&"waiting_for_bill_and_payment":
			return "Waiting for the bill and payment"
		&"waiting_for_bill_close":
			return "Waiting for the bill to be closed"
	return "Waiting for service"


func _get_table(table_id: StringName):
	_cleanup_invalid_tables()
	var key = str(table_id)
	if not _registered_tables.has(key):
		push_warning("ShiftServiceSystem has no registered table: " + key)
		return null
	return _registered_tables[key]


func _cleanup_invalid_tables() -> void:
	for table_id in _registered_tables.keys():
		if not is_instance_valid(_registered_tables[table_id]):
			_registered_tables.erase(table_id)
