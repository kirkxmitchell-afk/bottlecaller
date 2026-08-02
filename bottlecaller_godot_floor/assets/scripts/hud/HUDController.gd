extends CanvasLayer
class_name HUDController


# ===================================================================
# BottleCaller editable top-bar HUD controller
#
# This script updates nodes already placed in HUD.tscn.
# It does not create or position the permanent HUD artwork.
#
# Expected optional node names anywhere below HUDRoot:
#
# LevelLabel
# APProgressBar          TextureProgressBar or ProgressBar
# APValueLabel
# APLabel                existing fallback label
#
# TimerIcon
# ShiftTimer
#
# BottleFill_01 ... BottleFill_05
# BottleValueLabel
# BottleMeter            existing fallback label
#
# CoinDisplay
#
# Tier goal labels:
# TierGoalLabel
# APRequirementLabel     optional
# TablesRequirementLabel
# CoinsRequirementLabel
# WinesRequirementLabel
# StationRequirementLabel
# GoalsCompleteLabel
# ===================================================================


var hud_root: Control

var level_label: Label
var ap_label: Label
var ap_value_label: Label
var ap_progress_bar: Range

var coin_label: Label

var bottle_label: Label
var bottle_value_label: Label
var bottle_fills: Array = []
var bottle_base_scales: Dictionary = {}

var timer_label: Label
var timer_icon: CanvasItem

var tier_goal_label: Label
var tier_ap_label: Label
var tier_tables_label: Label
var tier_coins_label: Label
var tier_wines_label: Label
var tier_station_label: Label
var tier_complete_label: Label

var ap_tween: Tween
var _last_bottle_count = -1
var _last_reported_bottle_count = -1


func _ready():
	hud_root = get_node_or_null(
		"HUDRoot"
	) as Control

	if hud_root == null:
		push_error(
			"HUDController could not find HUDRoot."
		)
		return

	_resolve_top_bar_nodes()
	_resolve_tier_goal_nodes()
	_validate_top_bar_nodes()

	set_progression_hud(
		1,
		0,
		100,
		0,
		0,
		5,
		0.0,
		{}
	)


func _resolve_top_bar_nodes():
	level_label = _find_label(
		"LevelLabel"
	)

	ap_label = _find_label(
		"APLabel"
	)

	ap_value_label = _find_label(
		"APValueLabel"
	)

	var progress_node = _find_descendant(
		hud_root,
		"APProgressBar"
	)

	if progress_node is Range:
		ap_progress_bar = progress_node as Range

	coin_label = _find_label(
		"CoinDisplay"
	)

	bottle_label = _find_label(
		"BottleMeter"
	)

	bottle_value_label = _find_label(
		"BottleValueLabel"
	)

	timer_label = _find_label(
		"ShiftTimer"
	)

	timer_icon = _find_descendant(
		hud_root,
		"TimerIcon"
	) as CanvasItem

	if timer_icon != null:
		timer_icon.visible = true

	bottle_fills.clear()
	bottle_base_scales.clear()

	for index in range(1, 6):
		var node_name = (
			"BottleFill_%02d"
			% index
		)

		var fill_node = _find_descendant(
			hud_root,
			node_name
		)

		if fill_node is Control:
			var fill_control = fill_node as Control

			# Ensure the progress light always draws over the TopBar art.
			fill_control.z_as_relative = false
			fill_control.z_index = 250
			fill_control.mouse_filter = 				Control.MOUSE_FILTER_IGNORE
			fill_control.modulate = Color.WHITE
			fill_control.self_modulate = Color.WHITE
			fill_control.move_to_front()

			bottle_fills.append(
				fill_control
			)

			bottle_base_scales[
				fill_control.get_instance_id()
			] = fill_control.scale

			print(
				"BOTTLE HUD NODE FOUND: ",
				node_name,
				" | Size: ",
				fill_control.size,
				" | Position: ",
				fill_control.position,
				" | Scale: ",
				fill_control.scale
			)
		else:
			push_warning(
				"BOTTLE HUD NODE MISSING OR NOT A CONTROL: "
				+ node_name
			)

	print(
		"BOTTLE HUD READY: ",
		bottle_fills.size(),
		" / 5 slots found"
	)


func _resolve_tier_goal_nodes():
	tier_goal_label = _find_label(
		"TierGoalLabel"
	)

	tier_ap_label = _find_label(
		"APRequirementLabel"
	)

	tier_tables_label = _find_label(
		"TablesRequirementLabel"
	)

	tier_coins_label = _find_label(
		"CoinsRequirementLabel"
	)

	tier_wines_label = _find_label(
		"WinesRequirementLabel"
	)

	tier_station_label = _find_label(
		"StationRequirementLabel"
	)

	tier_complete_label = _find_label(
		"GoalsCompleteLabel"
	)


func set_progression_hud(
	level_value: int,
	ap_value: int,
	ap_max_value: int,
	coins_value: int,
	bottle_value: int,
	bottle_max_value: int,
	elapsed_seconds: float,
	tier_progress: Dictionary = {}
):
	set_level(
		level_value
	)

	set_ap_meter(
		ap_value,
		ap_max_value
	)

	set_coins(
		coins_value
	)

	set_bottle_meter(
		bottle_value,
		bottle_max_value
	)

	set_shift_time(
		elapsed_seconds
	)

	if not tier_progress.is_empty():
		set_tier_goal_progress(
			tier_progress
		)


## Compatibility alias for Main scripts that use update_progression_hud().
func update_progression_hud(
	level_value: int,
	ap_value: int,
	ap_max_value: int,
	coins_value: int,
	bottle_value: int,
	bottle_max_value: int,
	elapsed_seconds: float,
	tier_progress: Dictionary = {}
):
	set_progression_hud(
		level_value,
		ap_value,
		ap_max_value,
		coins_value,
		bottle_value,
		bottle_max_value,
		elapsed_seconds,
		tier_progress
	)


## Compatibility with the earlier five-value HUD API.
func set_primary_hud(
	ap_value,
	coins_value,
	bottle_value,
	bottle_max_value,
	elapsed_seconds
):
	set_progression_hud(
		1,
		int(ap_value),
		100,
		int(coins_value),
		int(bottle_value),
		int(bottle_max_value),
		float(elapsed_seconds),
		{}
	)


func update_hud(
	ap_value,
	coins_value,
	bottle_value,
	bottle_max_value,
	elapsed_seconds
):
	set_primary_hud(
		ap_value,
		coins_value,
		bottle_value,
		bottle_max_value,
		elapsed_seconds
	)


func set_level(
	level_value: int
):
	if level_label != null:
		level_label.text = str(
			max(level_value, 1)
		)


func set_ap_meter(
	ap_value: int,
	ap_max_value: int
):
	var safe_max = max(
		ap_max_value,
		1
	)
	var safe_ap = clamp(
		ap_value,
		0,
		safe_max
	)

	if ap_progress_bar != null:
		ap_progress_bar.min_value = 0
		ap_progress_bar.max_value = safe_max

		if (
			ap_tween != null
			and ap_tween.is_valid()
		):
			ap_tween.kill()

		ap_tween = create_tween()
		ap_tween.tween_property(
			ap_progress_bar,
			"value",
			float(safe_ap),
			0.35
		).set_trans(
			Tween.TRANS_QUAD
		).set_ease(
			Tween.EASE_OUT
		)

	var value_text = (
		str(safe_ap)
		+ " / "
		+ str(safe_max)
	)

	if ap_value_label != null:
		ap_value_label.text = value_text

	if ap_label != null:
		ap_label.text = value_text


func set_coins(
	coins_value: int
):
	if coin_label == null:
		return

	coin_label.text = (
		"Coins: "
		+ str(max(coins_value, 0))
	)


func set_bottle_meter(
	bottle_value: int,
	bottle_max_value: int
):
	var safe_max = max(
		bottle_max_value,
		1
	)
	var safe_value = clamp(
		bottle_value,
		0,
		safe_max
	)

	var bottle_text = (
		str(safe_value)
		+ " / "
		+ str(safe_max)
	)

	if bottle_value_label != null:
		bottle_value_label.text = bottle_text

	if bottle_label != null:
		bottle_label.text = (
			"Bottles: "
			+ bottle_text
		)

	var visible_states: Array[String] = []

	for index in range(
		bottle_fills.size()
	):
		var fill = bottle_fills[index] as Control
		var should_show = (
			index < safe_value
		)

		if should_show:
			# Explicitly restore every visual property which could make
			# the indicator technically visible but impossible to see.
			fill.modulate = Color.WHITE
			fill.self_modulate = Color.WHITE
			fill.z_as_relative = false
			fill.z_index = 250
			fill.move_to_front()
			fill.show()

			var instance_id = fill.get_instance_id()
			var base_scale = bottle_base_scales.get(
				instance_id,
				Vector2.ONE
			) as Vector2

			if fill.scale == Vector2.ZERO:
				fill.scale = base_scale

			visible_states.append(
				str(index + 1) + ":ON"
			)
		else:
			fill.hide()
			visible_states.append(
				str(index + 1) + ":OFF"
			)

		if (
			should_show
			and _last_bottle_count >= 0
			and index >= _last_bottle_count
			and index < safe_value
		):
			_pop_bottle_fill(
				fill
			)

	if safe_value != _last_reported_bottle_count:
		print(
			"BOTTLE HUD UPDATE: ",
			safe_value,
			" / ",
			safe_max,
			" | Found: ",
			bottle_fills.size(),
			" | ",
			visible_states
		)

		_last_reported_bottle_count = safe_value

	_last_bottle_count = safe_value


func _pop_bottle_fill(
	fill: Control
):
	var instance_id = fill.get_instance_id()
	var base_scale = bottle_base_scales.get(
		instance_id,
		Vector2.ONE
	) as Vector2

	# These imported light graphics use a large 1920x1080 canvas with a
	# small scale. Changing pivot_offset to the centre of that canvas
	# moves the visible light far away from its intended HUD circle.
	# Keep the exact editor transform and animate opacity only.
	fill.show()
	fill.scale = base_scale
	fill.modulate = Color.WHITE
	fill.self_modulate = Color(
		1.0,
		1.0,
		1.0,
		0.28
	)
	fill.z_as_relative = false
	fill.z_index = 250
	fill.move_to_front()

	var tween = create_tween()

	tween.tween_property(
		fill,
		"self_modulate",
		Color(
			1.0,
			1.0,
			1.0,
			1.0
		),
		0.14
	).set_trans(
		Tween.TRANS_QUAD
	).set_ease(
		Tween.EASE_OUT
	)

	tween.tween_property(
		fill,
		"self_modulate",
		Color(
			1.0,
			1.0,
			1.0,
			0.62
		),
		0.10
	).set_trans(
		Tween.TRANS_QUAD
	).set_ease(
		Tween.EASE_IN_OUT
	)

	tween.tween_property(
		fill,
		"self_modulate",
		Color.WHITE,
		0.14
	).set_trans(
		Tween.TRANS_QUAD
	).set_ease(
		Tween.EASE_OUT
	)




func set_shift_time(
	elapsed_seconds: float
):
	if timer_icon != null:
		timer_icon.visible = true

	if timer_label == null:
		return

	timer_label.text = (
		"Time: "
		+ _format_time(
			elapsed_seconds
		)
	)


func set_tier_goal_progress(
	progress: Dictionary
):
	var ap_value = int(
		progress.get(
			"ap",
			0
		)
	)
	var ap_required = int(
		progress.get(
			"ap_required",
			100
		)
	)

	if str(progress.get("authority_mode", "")) == "profile":
		var profile_tier = int(
			progress.get("profile_tier", 1)
		)
		var unlocked_skill_count = int(
			progress.get("unlocked_skill_count", 0)
		)
		if tier_ap_label != null:
			tier_ap_label.text = (
				"PROFILE AP   "
				+ str(ap_value)
				+ " / "
				+ str(ap_required)
			)
		elif tier_goal_label != null:
			tier_goal_label.text = (
				"PROFILE AP   "
				+ str(ap_value)
				+ " / "
				+ str(ap_required)
			)

		if tier_tables_label != null:
			tier_tables_label.text = (
				"SHIFT TABLES   "
				+ str(int(progress.get("tables", 0)))
			)
		if tier_coins_label != null:
			tier_coins_label.text = (
				"GODOT COINS   "
				+ str(int(progress.get("coins", 0)))
			)
		if tier_wines_label != null:
			tier_wines_label.text = (
				"SHIFT WINE SALES   "
				+ str(int(progress.get("wines", 0)))
			)
		if tier_station_label != null:
			tier_station_label.text = (
				"SHIFT STATION SCORE   "
				+ str(int(progress.get("station_score", 0)))
			)
		if tier_complete_label != null:
			tier_complete_label.text = (
				"PROFILE TIER   "
				+ str(profile_tier)
				+ "   |   SKILL UNLOCKS   "
				+ str(unlocked_skill_count)
			)
		return

	var tables_value = int(
		progress.get(
			"tables",
			0
		)
	)
	var tables_required = int(
		progress.get(
			"tables_required",
			5
		)
	)

	var coins_value = int(
		progress.get(
			"coins",
			0
		)
	)
	var coins_required = int(
		progress.get(
			"coins_required",
			60
		)
	)

	var wines_value = int(
		progress.get(
			"wines",
			0
		)
	)
	var wines_required = int(
		progress.get(
			"wines_required",
			5
		)
	)

	var station_value = int(
		progress.get(
			"station_score",
			0
		)
	)
	var station_required = int(
		progress.get(
			"station_required",
			12
		)
	)

	var goals_met = int(
		progress.get(
			"goals_met",
			0
		)
	)
	var goals_required = int(
		progress.get(
			"goals_required",
			5
		)
	)

	var tier_unlocked = bool(
		progress.get(
			"tier_unlocked",
			false
		)
	)

	if tier_ap_label != null:
		tier_ap_label.text = (
			"LEVEL AP   "
			+ str(ap_value)
			+ " / "
			+ str(ap_required)
		)
	elif tier_goal_label != null:
		tier_goal_label.text = (
			"LEVEL AP   "
			+ str(ap_value)
			+ " / "
			+ str(ap_required)
			+ "\nComplete all five goals to unlock Tier 2."
		)

	if tier_tables_label != null:
		tier_tables_label.text = (
			"TABLES   "
			+ str(tables_value)
			+ " / "
			+ str(tables_required)
		)

	if tier_coins_label != null:
		tier_coins_label.text = (
			"COINS   "
			+ str(coins_value)
			+ " / "
			+ str(coins_required)
		)

	if tier_wines_label != null:
		tier_wines_label.text = (
			"WINES SOLD   "
			+ str(wines_value)
			+ " / "
			+ str(wines_required)
		)

	if tier_station_label != null:
		tier_station_label.text = (
			"STATION SCORE   "
			+ str(station_value)
			+ " / "
			+ str(station_required)
		)

	if tier_complete_label != null:
		if tier_unlocked:
			tier_complete_label.text = \
				"TIER 2 UNLOCKED"
		else:
			tier_complete_label.text = (
				"GOALS COMPLETE   "
				+ str(goals_met)
				+ " / "
				+ str(goals_required)
			)


func _find_label(
	node_name: String
) -> Label:
	var node = _find_descendant(
		hud_root,
		node_name
	)

	if node is Label:
		return node as Label

	return null


func _find_descendant(
	root: Node,
	target_name: String
) -> Node:
	if root == null:
		return null

	if str(root.name) == target_name:
		return root

	for child in root.get_children():
		var found = _find_descendant(
			child,
			target_name
		)

		if found != null:
			return found

	return null


func _format_time(
	elapsed_seconds: float
) -> String:
	var safe_time = maxf(
		elapsed_seconds,
		0.0
	)
	var total_seconds = int(
		floor(safe_time)
	)
	var minutes = int(
		float(total_seconds) / 60.0
	)
	var seconds = total_seconds % 60

	return (
		str(minutes).pad_zeros(2)
		+ ":"
		+ str(seconds).pad_zeros(2)
	)


func _validate_top_bar_nodes():
	if ap_progress_bar == null:
		push_warning(
			"HUDController: APProgressBar is missing. AP text will still update."
		)

	if level_label == null:
		push_warning(
			"HUDController: LevelLabel is missing."
		)

	if bottle_fills.size() < 5:
		push_warning(
			"HUDController found "
			+ str(bottle_fills.size())
			+ " / 5 BottleFill nodes."
		)

	if timer_icon == null:
		push_warning(
			"HUDController: TimerIcon is missing."
		)
