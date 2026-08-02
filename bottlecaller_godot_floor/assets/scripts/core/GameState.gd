extends Node


signal values_changed(
	ap,
	coins,
	bottle_meter,
	bottle_meter_max
)

signal reward_applied(
	ap_delta,
	coins_delta,
	bottle_delta
)

signal game_state_reset


var ap = 0
var coins = 0
var bottle_meter = 0
var bottle_meter_max = 5


## This autoload is prepared for later cross-scene persistence.
##
## The current restaurant shift remains owned by Main.gd. Do not make
## HUDController read this automatically until Main.gd is deliberately
## migrated to use GameState as its single source of truth.
func add_encounter_reward(
	ap_delta,
	coins_delta,
	bottle_delta
):
	ap += int(ap_delta)
	coins += int(coins_delta)
	bottle_meter += int(bottle_delta)

	coins = maxi(coins, 0)
	bottle_meter = clampi(
		bottle_meter,
		0,
		bottle_meter_max
	)

	reward_applied.emit(
		int(ap_delta),
		int(coins_delta),
		int(bottle_delta)
	)

	_emit_values_changed()


func apply_encounter_result(result):
	if not (result is Dictionary):
		push_warning(
			"GameState expected an encounter result Dictionary."
		)
		return false

	var ap_delta = int(
		result.get("apDelta", 0)
	)
	var coins_delta = int(
		result.get("coinsDelta", 0)
	)
	var bottle_delta = int(
		result.get("bottleProgressDelta", 0)
	)

	add_encounter_reward(
		ap_delta,
		coins_delta,
		bottle_delta
	)

	return true


func set_bottle_meter_max(new_max):
	bottle_meter_max = maxi(
		int(new_max),
		1
	)

	bottle_meter = clampi(
		bottle_meter,
		0,
		bottle_meter_max
	)

	_emit_values_changed()


func set_values(
	new_ap,
	new_coins,
	new_bottle_meter,
	new_bottle_meter_max = bottle_meter_max
):
	ap = int(new_ap)
	coins = maxi(
		int(new_coins),
		0
	)
	bottle_meter_max = maxi(
		int(new_bottle_meter_max),
		1
	)
	bottle_meter = clampi(
		int(new_bottle_meter),
		0,
		bottle_meter_max
	)

	_emit_values_changed()


func reset_progress():
	ap = 0
	coins = 0
	bottle_meter = 0

	game_state_reset.emit()
	_emit_values_changed()


func get_snapshot():
	return {
		"ap": ap,
		"coins": coins,
		"bottle_meter": bottle_meter,
		"bottle_meter_max": bottle_meter_max
	}


func _emit_values_changed():
	values_changed.emit(
		ap,
		coins,
		bottle_meter,
		bottle_meter_max
	)
