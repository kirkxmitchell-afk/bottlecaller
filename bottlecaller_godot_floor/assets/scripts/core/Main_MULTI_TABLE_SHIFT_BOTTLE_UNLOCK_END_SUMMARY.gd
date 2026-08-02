extends Node2D


# ===================================================================
# BottleCaller multi-table shift foundation
#
# Physical tables are reusable slots. GuestTableProfile resources are
# loaded into those slots throughout the shift.
#
# Main owns:
# - guest queue and arrivals
# - independent table sessions
# - encounter choices
# - elapsed shift time
# - POS / Bar / Chef / Scullery / Mise logic
# - waiter destination decisions
# - one global Mise en Place inventory slot
#
# TableController owns:
# - table visuals
# - table logical state
# - guest profile currently displayed
#
# StationController owns:
# - station visuals only
#
# WaiterController owns:
# - navigation and walk/carry animations
# ===================================================================


# -------------------------------------------------------------------
# Scene references
# -------------------------------------------------------------------

@onready var tables_container = $RestaurantFloor/Tables
@onready var stations_container = $RestaurantFloor/Stations
@onready var waiter_node = $Waiter


# -------------------------------------------------------------------
# Guest queue and table-slot configuration
# -------------------------------------------------------------------

@export_category("Guest Shift Queue")

## Assign the five resources in this exact intended shift order:
## 1. Blonde Date
## 2. African Older Gentleman
## 3. Skeptic Reader
## 4. SkepticV1
## 5. African Regular Table
## Kept untyped deliberately so restored or re-saved GuestTableProfile
## .tres resources can be assigned even when Godot's global class cache
## has changed after controller cleanup.
## A new property name deliberately avoids stale typed-array metadata
## previously serialized in main.tscn.
@export var guest_profile_resources: Array[Resource] = []

@export_range(1, 20, 1)
var target_guest_services = 5

## First guest is seated immediately. The second guest appears later,
## creating the first overlapping service.
@export_range(0.1, 60.0, 0.1)
var second_guest_arrival_delay = 8.0

## Delay after an empty table has been reset before the next guest sits.
@export_range(0.1, 60.0, 0.1)
var reseat_delay = 4.0

## Time after receipt delivery before the empty table becomes resettable.
@export_range(0.1, 30.0, 0.1)
var guest_leave_delay = 3.0


# -------------------------------------------------------------------
# Guest and service timing
# -------------------------------------------------------------------

@export_category("Guest Timing")

@export_range(1.0, 120.0, 0.5)
var guest_annoyed_seconds = 22.0

## Additional time after the neutral warning before the table becomes unhappy.
@export_range(0.5, 60.0, 0.5)
var guest_unhappy_delay = 8.0

@export_range(0.1, 30.0, 0.1)
var table_enjoy_seconds = 5.0


@export_category("Action Time Added")

## Walking consumes normal real elapsed time.
## These values add service time for stationary actions and dialogue.
@export_range(0.0, 10.0, 0.1)
var greet_action_seconds = 1.2

@export_range(0.0, 10.0, 0.1)
var offer_action_seconds = 1.2

@export_range(0.0, 10.0, 0.1)
var pos_entry_action_seconds = 2.0

@export_range(0.0, 10.0, 0.1)
var station_collection_action_seconds = 1.0

@export_range(0.0, 10.0, 0.1)
var mise_collection_action_seconds = 1.2

@export_range(0.0, 10.0, 0.1)
var mise_laying_action_seconds = 2.0

@export_range(0.0, 10.0, 0.1)
var table_reset_action_seconds = 2.5

@export_range(0.0, 10.0, 0.1)
var delivery_action_seconds = 1.0

@export_range(0.0, 10.0, 0.1)
var clearing_action_seconds = 1.6

@export_range(0.0, 10.0, 0.1)
var scullery_drop_action_seconds = 1.0

@export_range(0.0, 10.0, 0.1)
var bill_action_seconds = 1.0


@export_category("Action Time Indicator")

## Shows +seconds between the waiter and the interacted object whenever
## an action adds time to the shift.
@export var show_action_time_indicator = true

@export_range(12, 64, 1)
var action_time_indicator_font_size = 28

@export_range(0, 12, 1)
var action_time_indicator_outline_size = 5

@export_range(0.2, 3.0, 0.1)
var action_time_indicator_duration = 1.1

@export_range(0.0, 1.5, 0.1)
var action_time_indicator_hold = 0.25

@export_range(0.0, 120.0, 1.0)
var action_time_indicator_float_distance = 42.0

@export_range(0.0, 150.0, 1.0)
var action_time_indicator_vertical_offset = 18.0

@export var action_time_indicator_color = Color(
	1.0,
	0.82,
	0.28,
	1.0
)


# -------------------------------------------------------------------
# Station preparation timing
# -------------------------------------------------------------------

@export_category("Station Timing")

@export_range(0.1, 30.0, 0.1)
var bar_ready_seconds = 3.0

@export_range(0.1, 30.0, 0.1)
var bar_annoyed_seconds = 5.0

## Extra delay after the neutral Bar warning before the annoyed icon/state.
@export_range(0.1, 30.0, 0.1)
var bar_unhappy_delay = 4.0

@export_range(0.1, 30.0, 0.1)
var chef_ready_seconds = 4.0

@export_range(0.1, 30.0, 0.1)
var chef_annoyed_seconds = 6.0

## Extra delay after the neutral Chef warning before the annoyed icon/state.
@export_range(0.1, 30.0, 0.1)
var chef_unhappy_delay = 4.0

@export_range(0.1, 30.0, 0.1)
var scullery_clean_seconds = 4.0

## How long the Scullery may remain at full capacity before becoming unhappy.
@export_range(0.1, 30.0, 0.1)
var scullery_full_unhappy_seconds = 6.0

@export_range(0.1, 30.0, 0.1)
var pos_receipt_seconds = 1.25

## The Mise station holds two settings. The first collection leaves the
## stocked texture unchanged. The second collection changes it to low
## and begins this restock timer.
@export_range(0.1, 60.0, 0.1)
var mise_restock_seconds = 7.0


# -------------------------------------------------------------------
# Tier 2 unlock requirements
# -------------------------------------------------------------------

@export_category("Tier 2 Unlock Requirements")

@export_range(1, 20, 1)
var tier_2_required_guest_services = 5

@export_range(0, 500, 1)
var tier_2_required_coins = 60

@export_range(0, 20, 1)
var tier_2_required_wine_sales = 5

@export_range(0, 50, 1)
var tier_2_required_station_score = 12

@export_range(1, 500, 1)
var tier_2_required_ap = 100


@export_category("Progression Rewards")

@export_range(1, 500, 1)
var ap_meter_max = 100

@export_range(0, 100, 1)
var table_complete_ap_reward = 10

@export_range(0, 100, 1)
var wine_sale_ap_reward = 5

@export_range(0, 100, 1)
var happy_guest_ap_bonus = 3

@export_range(0, 100, 1)
var clean_station_ap_bonus = 2

@export_range(0, 100, 1)
var guest_unhappy_ap_penalty = 5

@export_range(0, 100, 1)
var station_unhappy_ap_penalty = 2

@export_range(0, 100, 1)
var table_complete_coin_reward = 5

@export_range(0, 100, 1)
var wine_sale_coin_reward = 5

@export_range(0, 100, 1)
var happy_guest_coin_bonus = 2


@export_category("Bottle Unlock Rewards")

@export var bottle_unlock_modal_scene: PackedScene

@export_range(0, 500, 1)
var starter_bottle_required_ap = 30

@export var starter_bottle_reward_id = "starter_bottle"
@export var starter_bottle_name = "Starter Bottle"
@export var starter_bottle_title = "Trainee Caller"

## Leave false for the Godot shift build so Level AP continues toward
## 100 and Tier 2. Turn on only for a special standalone demo flow.
@export var reset_ap_after_demo_reward = false

@export_range(0, 100, 1)
var clean_station_coin_bonus = 1


# -------------------------------------------------------------------
# Shift score and clock
# -------------------------------------------------------------------

## Level AP is persistent-style progression for this shift and is
## always clamped between 0 and AP Meter Max.
var ap = 0

## Shift score preserves positive and negative performance for the
## result screen and future Vite scoring integration.
var shift_score = 0

var current_level = 1
var coins = 0
var bottle_meter = 0
var bottle_meter_max = 5

var elapsed_shift_time = 0.0
var shift_is_active = true
var completed_guest_services = 0

var wine_offers = 0
var food_offers = 0
var walk_aways = 0
var annoyed_guest_events = 0
var annoyed_station_events = 0

var wine_sales_count = 0
var station_interaction_score = 0


# -------------------------------------------------------------------
# Table sessions and guest arrivals
# -------------------------------------------------------------------

var table_slots: Array = []
var table_by_id: Dictionary = {}
var table_sessions: Dictionary = {}

var next_guest_profile_index = 0
var scheduled_events: Array = []


# -------------------------------------------------------------------
# Waiter navigation and pending interaction
# -------------------------------------------------------------------

var waiter_is_moving = false

var pending_interaction_type = ""
var pending_table_node = null
var pending_table_id = ""
var pending_station_node = null
var pending_station_id = ""

var focused_table_id = ""

## The table or station used to place the floating +seconds indicator.
var action_time_target_node: Node = null


# -------------------------------------------------------------------
# Waiter normal carrying state
# -------------------------------------------------------------------

const CARRY_NONE = "none"
const CARRY_BAR_DRINK = "bar_drink"
const CARRY_FOOD = "food_plate"
const CARRY_DIRTY = "dirty_plates"
const CARRY_RECEIPT = "receipt"

var waiter_carrying = CARRY_NONE
var carrying_table_id = ""
var carrying_drink_type = ""


# -------------------------------------------------------------------
# One-slot Mise en Place inventory
# -------------------------------------------------------------------

var mise_inventory_filled = false
var mise_inventory_table_id = ""

## Retained for compatibility with the existing one-slot Mise flow.
var mise_inventory_purpose = ""

## Physical Mise station stock. One collection leaves the station
## visually stocked. The second collection makes it low and starts
## restocking.
const MISE_STOCK_CAPACITY = 2
var mise_uses_since_restock = 0
var mise_restock_in_progress = false


# -------------------------------------------------------------------
# Encounter state
# -------------------------------------------------------------------

var encounter_is_open = false
var encounter_stage = ""
var encounter_table_id = ""

var encounter_panel: Panel
var encounter_title_label: Label
var encounter_hint_label: Label
var encounter_response_label: Label

var greet_wine_button: Button
var greet_aperitif_button: Button
var greet_food_button: Button

var walk_away_button: Button
var offer_food_button: Button
var offer_wine_button: Button


# -------------------------------------------------------------------
# Station lookup and queues
# -------------------------------------------------------------------

var station_by_id: Dictionary = {}

var bar_queue: Array = []
var bar_current_order: Dictionary = {}
var bar_order_ready = false

var chef_queue: Array = []
var chef_current_order: Dictionary = {}
var chef_order_ready = false

var pos_receipt_table_id = ""
var pos_receipt_ready = false

## Scullery capacity:
## 0 dish sets = idle texture
## 1 dish set  = active texture
## 2 dish sets = full texture
var scullery_dish_sets = 0
const SCULLERY_MAX_DISH_SETS = 2


# -------------------------------------------------------------------
# Timers
# -------------------------------------------------------------------

var bar_ready_timer: Timer
var bar_annoyed_timer: Timer
var bar_unhappy_timer: Timer
var chef_ready_timer: Timer
var chef_annoyed_timer: Timer
var chef_unhappy_timer: Timer
var pos_receipt_timer: Timer
var scullery_timer: Timer
var scullery_unhappy_timer: Timer
var mise_restock_timer: Timer


# -------------------------------------------------------------------
# Runtime HUD
# -------------------------------------------------------------------

var hud_layer
var hud_root
var primary_hud_controller

var ap_label: Label
var coin_label: Label
var bottle_label: Label
var timer_label: Label

var unlock_panel: Control
var unlock_title_label: Label
var unlock_goal_label: Label
var unlock_tables_label: Label
var unlock_coins_label: Label
var unlock_wines_label: Label
var unlock_station_label: Label
var unlock_progress_label: Label

var status_panel: Control
var status_title_label: Label
var prompt_label: Label
var objective_label: Label
var tables_label: Label
var service_label: Label
var carrying_label: Label

var mise_icon: TextureRect
var mise_fallback_label: Label
var mise_label: Label

var result_panel: Panel
var result_label: Label
var result_continue_button: Button

var bottle_unlock_modal
var pending_bottle_rewards: Array[Dictionary] = []
var claimed_bottle_reward_ids: Array[String] = []
var unlocked_titles: Array[String] = []
var equipped_title = ""


# ===================================================================
# Startup and update
# ===================================================================

func _ready():
	print("MULTI-TABLE MAIN READY")

	_connect_waiter_navigation()
	_create_runtime_timers()
	_create_hud()
	_create_bottle_unlock_modal()

	_register_table_slots()
	_connect_all_stations()
	_reset_all_station_states()

	_initialize_shift_tables()
	_begin_guest_arrivals()

	_refresh_all_table_statuses()
	update_hud()


func _create_bottle_unlock_modal():
	if bottle_unlock_modal_scene == null:
		push_warning(
			"Assign BottleUnlockModal.tscn to bottle_unlock_modal_scene in Main when ready."
		)
		return

	bottle_unlock_modal = bottle_unlock_modal_scene.instantiate()

	if bottle_unlock_modal == null:
		push_warning(
			"Could not instantiate bottle_unlock_modal_scene."
		)
		return

	add_child(bottle_unlock_modal)

	if bottle_unlock_modal.has_signal("reward_claimed"):
		bottle_unlock_modal.reward_claimed.connect(
			_on_bottle_reward_claimed
		)

	if bottle_unlock_modal.has_signal("modal_closed"):
		bottle_unlock_modal.modal_closed.connect(
			_on_bottle_modal_closed
		)


func _process(delta):
	if not shift_is_active:
		return

	# The clock naturally climbs while the entire shift is active.
	elapsed_shift_time += delta

	_process_scheduled_events()
	_update_guest_patience()
	_update_mise_icon()
	update_hud()


# ===================================================================
# Registration
# ===================================================================

func _register_table_slots():
	table_slots.clear()
	table_by_id.clear()
	table_sessions.clear()

	var grouped_tables = get_tree().get_nodes_in_group(
		"service_tables"
	)

	for table in grouped_tables:
		if not table.has_signal("table_clicked"):
			push_warning(
				"GROUPED NODE IS NOT A TABLE: "
				+ str(table.name)
			)
			continue

		if not table.has_method("get_table_id"):
			push_warning(
				"TABLE HAS NO get_table_id(): "
				+ str(table.name)
			)
			continue

		var table_id = str(table.get_table_id())

		if table_id == "":
			push_warning(
				"TABLE HAS EMPTY TABLE ID: "
				+ str(table.name)
			)
			continue

		if table_by_id.has(table_id):
			push_warning(
				"DUPLICATE TABLE ID: "
				+ table_id
			)
			continue

		table_slots.append(table)
		table_by_id[table_id] = table

		if not table.table_clicked.is_connected(
			_on_table_clicked
		):
			table.table_clicked.connect(
				_on_table_clicked
			)

	table_slots.sort_custom(
		func(a, b):
			return (
				str(a.get_table_id())
				< str(b.get_table_id())
			)
	)

	print(
		"REGISTERED TABLE SLOTS: ",
		table_by_id.keys()
	)


func _connect_all_stations():
	station_by_id.clear()

	var station_nodes: Array = []
	_collect_station_nodes(
		stations_container,
		station_nodes
	)

	for station in station_nodes:
		var station_id = _normalise_station_id(
			str(station.get_station_id())
		)

		if station_id == "":
			push_warning(
				"INVALID STATION ID: "
				+ str(station.name)
			)
			continue

		if station_by_id.has(station_id):
			push_warning(
				"DUPLICATE STATION ID: "
				+ station_id
			)

		station_by_id[station_id] = station

		if not station.station_clicked.is_connected(
			_on_station_clicked
		):
			station.station_clicked.connect(
				_on_station_clicked
			)

		print(
			"CONNECTED STATION: ",
			station.name,
			" | ID: ",
			station_id
		)

	print(
		"REGISTERED STATIONS: ",
		station_by_id.keys()
	)


func _collect_station_nodes(
	root_node,
	result: Array
):
	for child in root_node.get_children():
		if (
			child.has_signal("station_clicked")
			and child.has_method("get_station_id")
		):
			result.append(child)

		_collect_station_nodes(
			child,
			result
		)


# ===================================================================
# Initial table and guest setup
# ===================================================================

func _initialize_shift_tables():
	for table in table_slots:
		var table_id = str(table.get_table_id())

		table_sessions[table_id] = \
			_create_ready_table_session(table)

		if table.has_method("set_ready_for_guests"):
			table.set_ready_for_guests()
		elif table.has_method("set_empty"):
			table.set_empty()

		if table.has_method("set_status_text"):
			table.set_status_text(
				"Ready for guests"
			)


func _create_ready_table_session(table) -> Dictionary:
	return {
		"table": table,
		"table_id": str(table.get_table_id()),
		"profile": null,
		"guest_id": "",
		"phase": "ready_for_guests",

		"greeting_choice": "",
		"follow_up_choice": "",

		"food_ordered": false,
		"wine_ordered": false,
		"aperitif_ordered": false,
		"wine_delivered": false,
		"aperitif_delivered": false,
		"wine_sale_counted": false,
		"had_guest_unhappy": false,
		"station_annoyance_start": annoyed_station_events,
		"pos_entered": false,

		"mise_required": false,
		"mise_reserved": false,
		"mise_set": false,

		"bar_status": "none",
		"chef_status": "none",

		"drink_delivered": false,
		"food_delivered": false,

		"last_progress_time": elapsed_shift_time,
		"mood_state": "happy",
		"annoyed": false
	}


func _begin_guest_arrivals():
	if table_slots.is_empty():
		push_error(
			"NO TABLES FOUND IN service_tables GROUP."
		)
		return

	if guest_profile_resources.is_empty():
		push_error(
			"MAIN HAS NO GUEST PROFILES ASSIGNED."
		)
		return

	target_guest_services = min(
		target_guest_services,
		guest_profile_resources.size()
	)

	# Preload the first profile into the first physical slot, then seat
	# it immediately.
	if _preload_next_guest_profile_at_table(
		table_slots[0]
	):
		_seat_preloaded_guest_at_table(
			table_slots[0]
		)

	# Preload the second profile into the second physical slot while it
	# remains visually EMPTY. When the timer fires, only seat_guests()
	# runs, so the slot changes from empty -> seated rather than from an
	# old guest image -> a different guest image.
	if (
		target_guest_services > 1
		and table_slots.size() > 1
	):
		if _preload_next_guest_profile_at_table(
			table_slots[1]
		):
			_schedule_event(
				"seat_preloaded_guest",
				str(
					table_slots[1].get_table_id()
				),
				second_guest_arrival_delay
			)


func _preload_next_guest_profile_at_table(
	table
) -> bool:
	if next_guest_profile_index >= target_guest_services:
		return false

	if next_guest_profile_index >= guest_profile_resources.size():
		return false

	var table_id = str(
		table.get_table_id()
	)
	var session = table_sessions.get(
		table_id,
		{}
	)

	if session.is_empty():
		return false

	if session["phase"] != "ready_for_guests":
		return false

	var profile = guest_profile_resources[
		next_guest_profile_index
	]

	if (
		profile != null
		and not profile.has_method(
			"get_greeting_response"
		)
	):
		push_warning(
			"GUEST PROFILE RESOURCE DOES NOT USE GuestTableProfile.gd: "
			+ str(profile.resource_path)
		)
		profile = null

	if profile == null:
		push_warning(
			"NULL PROFILE AT QUEUE INDEX: "
			+ str(next_guest_profile_index)
		)
		next_guest_profile_index += 1
		return false

	next_guest_profile_index += 1

	if table.has_method(
		"apply_guest_profile"
	):
		table.apply_guest_profile(
			profile,
			false
		)

	session["profile"] = profile
	session["guest_id"] = profile.guest_id
	table_sessions[table_id] = session

	print(
		"GUEST PROFILE PRELOADED: ",
		profile.guest_display_name,
		" | Table: ",
		table_id,
		" | Visual remains empty"
	)

	_refresh_table_status(table_id)
	return true


func _seat_preloaded_guest_at_table(
	table
) -> bool:
	var table_id = str(
		table.get_table_id()
	)
	var session = table_sessions.get(
		table_id,
		{}
	)

	if session.is_empty():
		return false

	if session["phase"] != "ready_for_guests":
		return false

	var profile = session.get(
		"profile",
		null
	)

	if profile == null:
		return false

	if table.has_method("seat_guests"):
		table.seat_guests()

	table_sessions[table_id] = 		_create_active_guest_session(
			table,
			profile
		)

	print(
		"GUEST SEATED: ",
		profile.guest_display_name,
		" | Table: ",
		table_id
	)

	_set_prompt(
		profile.guest_display_name
		+ " has arrived at "
		+ table_id
		+ "."
	)

	_refresh_table_status(table_id)
	return true


func _seat_preloaded_guest_by_id(
	table_id: String
) -> bool:
	if not table_by_id.has(table_id):
		return true

	return _seat_preloaded_guest_at_table(
		table_by_id[table_id]
	)


func _seat_next_guest_at_table(table) -> bool:
	if next_guest_profile_index >= target_guest_services:
		return false

	if next_guest_profile_index >= guest_profile_resources.size():
		return false

	var table_id = str(table.get_table_id())
	var session = table_sessions.get(
		table_id,
		{}
	)

	if session.is_empty():
		return false

	if session["phase"] != "ready_for_guests":
		return false

	var profile = guest_profile_resources[
		next_guest_profile_index
	]

	if (
		profile != null
		and not profile.has_method(
			"get_greeting_response"
		)
	):
		push_warning(
			"GUEST PROFILE RESOURCE DOES NOT USE GuestTableProfile.gd: "
			+ str(profile.resource_path)
		)
		profile = null

	if profile == null:
		push_warning(
			"NULL PROFILE AT QUEUE INDEX: "
			+ str(next_guest_profile_index)
		)
		next_guest_profile_index += 1
		return false

	next_guest_profile_index += 1

	if table.has_method("apply_guest_profile"):
		table.apply_guest_profile(
			profile,
			false
		)

	if table.has_method("seat_guests"):
		table.seat_guests()

	table_sessions[table_id] = \
		_create_active_guest_session(
			table,
			profile
		)

	print(
		"GUEST SEATED: ",
		profile.guest_display_name,
		" | Table: ",
		table_id
	)

	_set_prompt(
		profile.guest_display_name
		+ " has arrived at "
		+ table_id
		+ "."
	)

	_refresh_table_status(table_id)
	return true


func _create_active_guest_session(
	table,
	profile
) -> Dictionary:
	return {
		"table": table,
		"table_id": str(table.get_table_id()),
		"profile": profile,
		"guest_id": profile.guest_id,
		"phase": "waiting_to_greet",

		"greeting_choice": "",
		"follow_up_choice": "",

		"food_ordered": false,
		"wine_ordered": false,
		"aperitif_ordered": false,
		"wine_delivered": false,
		"aperitif_delivered": false,
		"wine_sale_counted": false,
		"had_guest_unhappy": false,
		"station_annoyance_start": annoyed_station_events,
		"pos_entered": false,

		"mise_required": false,
		"mise_reserved": false,
		"mise_set": false,

		"bar_status": "none",
		"chef_status": "none",

		"drink_delivered": false,
		"food_delivered": false,

		"last_progress_time": elapsed_shift_time,
		"mood_state": "happy",
		"annoyed": false
	}


func _try_seat_next_guest() -> bool:
	if next_guest_profile_index >= target_guest_services:
		return false

	for table in table_slots:
		var table_id = str(table.get_table_id())
		var session = table_sessions.get(
			table_id,
			{}
		)

		if (
			not session.is_empty()
			and session["phase"] == "ready_for_guests"
		):
			return _seat_next_guest_at_table(
				table
			)

	return false


# ===================================================================
# Scheduled events
# ===================================================================

func _schedule_event(
	event_type: String,
	table_id: String,
	delay_seconds: float
):
	scheduled_events.append({
		"type": event_type,
		"table_id": table_id,
		"due_time": (
			elapsed_shift_time
			+ max(delay_seconds, 0.0)
		)
	})


func _process_scheduled_events():
	if scheduled_events.is_empty():
		return

	var remaining_events: Array = []

	for event in scheduled_events:
		if (
			float(event["due_time"])
			> elapsed_shift_time
		):
			remaining_events.append(event)
			continue

		var handled = _handle_scheduled_event(
			event
		)

		if not handled:
			event["due_time"] = \
				elapsed_shift_time + 1.0
			remaining_events.append(event)

	scheduled_events = remaining_events


func _handle_scheduled_event(
	event: Dictionary
) -> bool:
	var event_type = str(event["type"])
	var table_id = str(event["table_id"])

	match event_type:
		"guest_arrival":
			return _try_seat_next_guest()

		"seat_preloaded_guest":
			return _seat_preloaded_guest_by_id(
				table_id
			)

		"enjoy_complete":
			return _finish_table_enjoying(
				table_id
			)

		"enable_reset":
			return _enable_table_reset(
				table_id
			)

	return true


# ===================================================================
# Click and navigation routing
# ===================================================================

func _on_table_clicked(
	table_node,
	table_id,
	_encounter_id
):
	if not shift_is_active:
		return

	if waiter_is_moving:
		_set_prompt(
			"Waiter is already moving."
		)
		return

	if encounter_is_open:
		_set_prompt(
			"Finish the current guest interaction."
		)
		return

	_move_waiter_to_table(
		table_node,
		str(table_id)
	)


func _on_station_clicked(
	station_node,
	station_id
):
	if not shift_is_active:
		return

	if waiter_is_moving:
		_set_prompt(
			"Waiter is already moving."
		)
		return

	if encounter_is_open:
		_set_prompt(
			"Finish the current guest interaction."
		)
		return

	var resolved_id = _normalise_station_id(
		str(station_id)
	)

	if resolved_id == "":
		_set_prompt(
			"That station has an invalid ID."
		)
		return

	_move_waiter_to_station(
		station_node,
		resolved_id
	)


func _move_waiter_to_table(
	table_node,
	table_id: String
):
	pending_interaction_type = "table"
	pending_table_node = table_node
	pending_table_id = table_id
	pending_station_node = null
	pending_station_id = ""

	var target = table_node.global_position

	if table_node.has_method(
		"get_interaction_position"
	):
		target = table_node.get_interaction_position()

	_start_waiter_navigation(target)

	_set_prompt(
		"Waiter moving to "
		+ table_id
		+ "."
	)


func _move_waiter_to_station(
	station_node,
	station_id: String
):
	pending_interaction_type = "station"
	pending_table_node = null
	pending_table_id = ""
	pending_station_node = station_node
	pending_station_id = station_id

	var target = station_node.global_position

	if station_node.has_method(
		"get_interaction_position"
	):
		target = station_node.get_interaction_position()

	_start_waiter_navigation(target)

	_set_prompt(
		"Waiter moving to "
		+ _format_station_name(station_id)
		+ "."
	)


func _start_waiter_navigation(
	target: Vector2
):
	if waiter_node == null:
		push_error(
			"MAIN COULD NOT FIND WAITER."
		)
		return

	if not waiter_node.has_method(
		"navigate_to"
	):
		push_error(
			"WAITER HAS NO navigate_to()."
		)
		return

	waiter_is_moving = true

	var started = waiter_node.navigate_to(
		target
	)

	if started == false:
		waiter_is_moving = false
		_clear_pending_interaction()


func _connect_waiter_navigation():
	if waiter_node == null:
		push_error(
			"MAIN COULD NOT FIND WAITER NODE."
		)
		return

	if waiter_node.has_signal(
		"navigation_started"
	):
		if not waiter_node.navigation_started.is_connected(
			_on_waiter_navigation_started
		):
			waiter_node.navigation_started.connect(
				_on_waiter_navigation_started
			)

	if waiter_node.has_signal(
		"navigation_arrived"
	):
		if not waiter_node.navigation_arrived.is_connected(
			_on_waiter_navigation_arrived
		):
			waiter_node.navigation_arrived.connect(
				_on_waiter_navigation_arrived
			)

	if waiter_node.has_signal(
		"navigation_failed"
	):
		if not waiter_node.navigation_failed.is_connected(
			_on_waiter_navigation_failed
		):
			waiter_node.navigation_failed.connect(
				_on_waiter_navigation_failed
			)

	if waiter_node.has_signal(
		"navigation_cancelled"
	):
		if not waiter_node.navigation_cancelled.is_connected(
			_on_waiter_navigation_cancelled
		):
			waiter_node.navigation_cancelled.connect(
				_on_waiter_navigation_cancelled
			)


func _on_waiter_navigation_started(
	_requested_target,
	_resolved_target
):
	waiter_is_moving = true


func _on_waiter_navigation_arrived(
	_requested_target,
	_final_position
):
	waiter_is_moving = false

	var interaction_type = \
		pending_interaction_type
	var table_id = pending_table_id
	var station_id = pending_station_id

	_clear_pending_interaction()

	if interaction_type == "table":
		_handle_table_arrival(
			table_id
		)
	elif interaction_type == "station":
		_handle_station_arrival(
			station_id
		)


func _on_waiter_navigation_failed(
	_requested_target,
	reason
):
	waiter_is_moving = false
	_clear_pending_interaction()

	_set_prompt(
		"Waiter could not reach the target: "
		+ str(reason)
	)


func _on_waiter_navigation_cancelled():
	waiter_is_moving = false
	_clear_pending_interaction()


func _clear_pending_interaction():
	pending_interaction_type = ""
	pending_table_node = null
	pending_table_id = ""
	pending_station_node = null
	pending_station_id = ""


# ===================================================================
# Table arrival actions
# ===================================================================

func _handle_table_arrival(
	table_id: String
):
	if not table_sessions.has(table_id):
		_set_prompt(
			"Unknown table: "
			+ table_id
		)
		return

	var session = table_sessions[table_id]
	focused_table_id = table_id
	action_time_target_node = session["table"]

	# A normally carried item must return to its assigned table.
	if waiter_carrying != CARRY_NONE:
		if carrying_table_id != table_id:
			_set_prompt(
				"This item belongs to "
				+ carrying_table_id
				+ "."
			)
			return

		match waiter_carrying:
			CARRY_BAR_DRINK:
				_deliver_bar_drink(
					table_id
				)
			CARRY_FOOD:
				_deliver_food(
					table_id
				)
			CARRY_RECEIPT:
				_deliver_receipt(
					table_id
				)
			CARRY_DIRTY:
				_set_prompt(
					"Take the dirty plates to Scullery."
				)

		return

	# Mise is a separate one-slot inventory. Carrying it must never
	# block greeting or serving another table. It is assigned only when
	# the clicked table already has an active Mise requirement.
	if (
		mise_inventory_filled
		and _table_can_receive_mise(table_id)
	):
		_assign_mise_to_table(
			table_id
		)
		return

	var phase = str(session["phase"])

	match phase:
		"waiting_to_greet":
			_open_guest_encounter(
				table_id
			)

		"order_pending_pos":
			_set_prompt(
				"Order selected for "
				+ table_id
				+ ". Go to POS. You may collect Mise before or after POS."
			)

		"service_active":
			_explain_active_table_tasks(
				table_id
			)

		"eating":
			_set_prompt(
				"The guests are still eating."
			)

		"ready_to_clear":
			_collect_dirty_plates(
				table_id
			)

		"plates_collected":
			_set_prompt(
				"Take the dirty plates to Scullery."
			)

		"waiting_for_bill":
			_set_prompt(
				"Bill selected for "
				+ table_id
				+ ". Go to POS."
			)

		"leaving":
			_set_prompt(
				"The guests have left. Wait for the table to become resettable."
			)

		"reset_required":
			_reset_empty_table(
				table_id
			)

		"ready_for_guests":
			_set_prompt(
				"This table is reset and ready for the next guests."
			)

		_:
			_set_prompt(
				"Table phase: "
				+ phase
			)


func _explain_active_table_tasks(
	table_id: String
):
	var session = table_sessions[table_id]
	var tasks: Array[String] = []

	if (
		bool(session["mise_required"])
		and not bool(session["mise_set"])
	):
		if bool(session["mise_reserved"]):
			tasks.append(
				"Mise assigned — deliver food or drink to lay it"
			)
		else:
			tasks.append(
				"collect and assign Mise"
			)

	if session["bar_status"] == "ready":
		tasks.append(
			"collect drink from Bar"
		)
	elif session["bar_status"] in [
		"queued",
		"preparing"
	]:
		tasks.append(
			"wait for Bar"
		)
	elif session["bar_status"] == "collected":
		tasks.append(
			"deliver drink"
		)

	if session["chef_status"] == "ready":
		tasks.append(
			"collect food from Chef"
		)
	elif session["chef_status"] in [
		"queued",
		"preparing"
	]:
		tasks.append(
			"wait for Chef"
		)
	elif session["chef_status"] == "collected":
		tasks.append(
			"deliver food"
		)

	if tasks.is_empty():
		_set_prompt(
			"This table is waiting for its next service state."
		)
	else:
		_set_prompt(
			table_id
			+ ": "
			+ ", ".join(tasks)
			+ "."
		)


# ===================================================================
# Guest encounter panel
# ===================================================================

func _open_guest_encounter(
	table_id: String
):
	var session = table_sessions[table_id]
	var table = session["table"]
	var profile = session["profile"]

	if profile == null:
		_set_prompt(
			"This table has no guest profile."
		)
		return

	encounter_is_open = true
	encounter_stage = "greeting"
	encounter_table_id = table_id

	if table.has_method("mark_in_encounter"):
		table.mark_in_encounter()

	encounter_title_label.text = \
		profile.guest_display_name

	encounter_hint_label.text = \
		profile.guest_hint

	encounter_response_label.text = \
		"How will you greet this table?"

	_set_greeting_buttons_visible(true)
	_set_follow_up_buttons_visible(false)

	encounter_panel.visible = true

	_set_prompt(
		"Read the table and choose how to greet them."
	)


func _choose_greeting(
	choice: String
):
	if (
		not encounter_is_open
		or encounter_stage != "greeting"
	):
		return

	if not table_sessions.has(
		encounter_table_id
	):
		return

	var session = table_sessions[
		encounter_table_id
	]
	var profile = session["profile"]
	var table = session["table"]

	session["greeting_choice"] = choice
	table_sessions[encounter_table_id] = session

	_add_action_time(
		greet_action_seconds,
		choice
	)

	if table.has_method("set_deciding"):
		table.set_deciding()

	encounter_response_label.text = \
		_get_profile_greeting_response(
			profile,
			choice
		)

	encounter_stage = "follow_up"

	_set_greeting_buttons_visible(false)
	_set_follow_up_buttons_visible(true)

	_mark_table_progress(
		encounter_table_id
	)


func _choose_follow_up(
	choice: String
):
	if (
		not encounter_is_open
		or encounter_stage != "follow_up"
	):
		return

	if not table_sessions.has(
		encounter_table_id
	):
		return

	var table_id = encounter_table_id
	var session = table_sessions[table_id]
	var profile = session["profile"]
	var table = session["table"]

	session["follow_up_choice"] = choice

	_add_action_time(
		offer_action_seconds,
		choice
	)

	var guest_reply = \
		_get_profile_follow_up_response(
			profile,
			choice
		)

	if choice == "walk_away":
		walk_aways += 1
		session["phase"] = "waiting_to_greet"
		table_sessions[table_id] = session

		if table.has_method("seat_guests"):
			table.seat_guests()

		if table.has_method("set_status_text"):
			table.set_status_text(
				"Browsing — return later"
			)

		_close_encounter_panel()

		_set_prompt(
			guest_reply
			+ " Return to the table later."
		)

		return

	# All dining guests ultimately place a food order.
	session["food_ordered"] = true
	session["mise_required"] = true

	if choice == "offer_food":
		food_offers += 1

		# An aperitif greeting can convert into an aperitif before food.
		if session["greeting_choice"] == "greet_aperitif":
			session["aperitif_ordered"] = true

	elif choice == "offer_wine":
		wine_offers += 1
		session["wine_ordered"] = true

		# Greet Aperitif + Offer Wine means all three:
		# aperitif first, wine second, plus food from Chef.
		if session["greeting_choice"] == "greet_aperitif":
			session["aperitif_ordered"] = true

	session["phase"] = "order_pending_pos"
	table_sessions[table_id] = session

	if table.has_method("set_order_pending_pos"):
		table.set_order_pending_pos()

	focused_table_id = table_id
	_mark_table_progress(table_id)
	_close_encounter_panel()

	var order_summary = ""

	if (
		bool(session["aperitif_ordered"])
		and bool(session["wine_ordered"])
		and bool(session["food_ordered"])
	):
		order_summary = (
			" The service sequence is aperitif first, wine second, with food prepared by Chef."
		)

	_set_prompt(
		guest_reply
		+ order_summary
		+ " Enter the order at POS. Mise may be collected before or after POS."
	)


func _get_profile_greeting_response(
	profile,
	choice: String
) -> String:
	if (
		profile != null
		and profile.has_method(
			"get_greeting_response"
		)
	):
		return str(
			profile.get_greeting_response(
				choice
			)
		)

	# This fallback keeps the game running if an older profile resource
	# is still cached or still points to the earlier profile script.
	match choice:
		"greet_wine":
			return "We are still deciding. What would you suggest?"

		"greet_aperitif":
			return "An aperitif could be interesting. What do you have?"

		"greet_food":
			return "We are ready to hear about the food."

	return "The guest waits for your next suggestion."


func _get_profile_follow_up_response(
	profile,
	choice: String
) -> String:
	if (
		profile != null
		and profile.has_method(
			"get_follow_up_response"
		)
	):
		return str(
			profile.get_follow_up_response(
				choice
			)
		)

	# Defensive fallback for older cached GuestTableProfile resources.
	match choice:
		"walk_away":
			return "Thank you. We will call you when we are ready."

		"offer_food":
			return "Yes, let us begin with the food."

		"offer_wine":
			return "All right, bring us a suitable wine with the meal."

	return "The guest considers the suggestion."


func _close_encounter_panel():
	encounter_is_open = false
	encounter_stage = ""
	encounter_table_id = ""

	if encounter_panel != null:
		encounter_panel.visible = false


func _set_greeting_buttons_visible(
	show_buttons: bool
):
	greet_wine_button.visible = show_buttons
	greet_aperitif_button.visible = show_buttons
	greet_food_button.visible = show_buttons


func _set_follow_up_buttons_visible(
	show_buttons: bool
):
	walk_away_button.visible = show_buttons
	offer_food_button.visible = show_buttons
	offer_wine_button.visible = show_buttons


# ===================================================================
# Station arrival dispatch
# ===================================================================

func _handle_station_arrival(
	station_id: String
):
	action_time_target_node = station_by_id.get(
		station_id,
		null
	)

	match station_id:
		"pos":
			_handle_pos_arrival()
		"bar":
			_handle_bar_arrival()
		"chef":
			_handle_chef_arrival()
		"scullery":
			_handle_scullery_arrival()
		"mise_en_place":
			_handle_mise_arrival()
		_:
			_set_prompt(
				"Unknown station: "
				+ station_id
			)


# ===================================================================
# ===================================================================
# Station interaction score
# ===================================================================

func _add_station_interaction(
	points: int = 1,
	reason: String = ""
):
	station_interaction_score = max(
		station_interaction_score + points,
		0
	)

	if reason != "":
		var sign_text = (
			"+"
			if points >= 0
			else ""
		)

		print(
			"STATION INTERACTION SCORE ",
			sign_text,
			points,
			" | ",
			reason,
			" | Total: ",
			station_interaction_score
		)


func _add_level_ap(
	points: int,
	reason: String = ""
):
	var previous_ap = ap

	shift_score += points

	ap = clamp(
		ap + points,
		0,
		ap_meter_max
	)

	_check_bottle_reward_milestones(
		previous_ap,
		ap
	)

	if reason != "":
		var sign_text = (
			"+"
			if points >= 0
			else ""
		)

		print(
			"LEVEL AP ",
			sign_text,
			points,
			" | ",
			reason,
			" | Meter: ",
			ap,
			" / ",
			ap_meter_max,
			" | Shift score: ",
			shift_score
		)


func _check_bottle_reward_milestones(
	previous_ap: int,
	new_ap: int
):
	var crossed_starter = (
		previous_ap < starter_bottle_required_ap
		and new_ap >= starter_bottle_required_ap
	)

	if not crossed_starter:
		return

	var reward_data = {
		"reward_id": starter_bottle_reward_id,
		"required_ap": starter_bottle_required_ap,
		"bottle_name": starter_bottle_name,
		"title": starter_bottle_title
	}

	var reward_id = str(
		reward_data["reward_id"]
	)

	if reward_id in claimed_bottle_reward_ids:
		return

	for pending_reward in pending_bottle_rewards:
		if str(pending_reward.get("reward_id", "")) == reward_id:
			return

	pending_bottle_rewards.append(
		reward_data
	)

	print(
		"BOTTLE REWARD PENDING: ",
		reward_data
	)


func _has_pending_bottle_rewards() -> bool:
	return not pending_bottle_rewards.is_empty()


func _present_next_bottle_reward():
	if pending_bottle_rewards.is_empty():
		return

	if bottle_unlock_modal == null:
		push_warning(
			"Bottle reward pending but bottle_unlock_modal is missing."
		)
		return

	var reward_data = pending_bottle_rewards.pop_front()
	print(
		"PRESENTING BOTTLE REWARD: ",
		reward_data
	)

	if bottle_unlock_modal.has_method("show_reward"):
		bottle_unlock_modal.show_reward(
			reward_data
		)


func _on_bottle_reward_claimed(
	reward_data: Dictionary
):
	var reward_id = str(
		reward_data.get(
			"reward_id",
			""
		)
	)
	var title_name = str(
		reward_data.get(
			"title",
			""
		)
	)

	if (
		reward_id != ""
		and not reward_id in claimed_bottle_reward_ids
	):
		claimed_bottle_reward_ids.append(
			reward_id
		)

	if (
		title_name != ""
		and not title_name in unlocked_titles
	):
		unlocked_titles.append(
			title_name
		)

	if equipped_title == "" and title_name != "":
		equipped_title = title_name

	print(
		"BOTTLE REWARD CLAIMED: ",
		reward_data
	)

	if reset_ap_after_demo_reward:
		ap = 0
		update_hud()
		print(
			"DEMO AP RESET AFTER BOTTLE REWARD CLAIM."
		)

	if _has_pending_bottle_rewards():
		_present_next_bottle_reward()
	else:
		_set_prompt(
			"Reward claimed: "
			+ title_name
		)


func _on_bottle_modal_closed():
	update_hud()


func _add_coins(
	points: int,
	reason: String = ""
):
	coins = max(
		coins + points,
		0
	)

	if reason != "":
		var sign_text = (
			"+"
			if points >= 0
			else ""
		)

		print(
			"COINS ",
			sign_text,
			points,
			" | ",
			reason,
			" | Total: ",
			coins
		)


# POS: order entry and receipts
# ===================================================================

func _handle_pos_arrival():
	if waiter_carrying == CARRY_RECEIPT:
		_set_prompt(
			"Deliver the receipt to "
			+ carrying_table_id
			+ "."
		)
		return

	# A finished receipt must take priority over every new POS action.
	# Previously the focused table was resolved first, causing the POS
	# to repeatedly report that the same receipt was still printing.
	if pos_receipt_ready:
		_collect_receipt_from_pos()
		return

	# A receipt is genuinely still printing. Do not create another
	# receipt or enter another POS action until this timer finishes.
	if pos_receipt_table_id != "":
		_set_prompt(
			"POS is printing the receipt for "
			+ pos_receipt_table_id
			+ "."
		)
		return

	var table_id = _resolve_pos_target_table()

	if table_id != "":
		var phase = str(
			table_sessions[table_id]["phase"]
		)

		if phase == "order_pending_pos":
			_enter_order_at_pos(
				table_id
			)
			return

		if phase == "waiting_for_bill":
			_request_receipt(
				table_id
			)
			return

	_set_prompt(
		"Select a table that needs POS service first."
	)


func _resolve_pos_target_table() -> String:
	if table_sessions.has(
		focused_table_id
	):
		var phase = str(
			table_sessions[
				focused_table_id
			]["phase"]
		)

		if phase in [
			"order_pending_pos",
			"waiting_for_bill"
		]:
			return focused_table_id

	var candidates: Array[String] = []

	for table_id in table_sessions.keys():
		var phase = str(
			table_sessions[table_id]["phase"]
		)

		if phase in [
			"order_pending_pos",
			"waiting_for_bill"
		]:
			candidates.append(
				str(table_id)
			)

	if candidates.size() == 1:
		focused_table_id = candidates[0]
		return candidates[0]

	return ""


func _enter_order_at_pos(
	table_id: String
):
	var session = table_sessions[table_id]
	var table = session["table"]

	_add_action_time(
		pos_entry_action_seconds,
		"POS order entry"
	)

	_add_station_interaction(
		1,
		"POS order entry"
	)

	session["pos_entered"] = true
	session["phase"] = "service_active"

	var bar_tickets_added = 0

	if bool(session["aperitif_ordered"]):
		bar_queue.append({
			"table_id": table_id,
			"drink_type": "aperitif"
		})
		bar_tickets_added += 1

	if bool(session["wine_ordered"]):
		bar_queue.append({
			"table_id": table_id,
			"drink_type": "wine"
		})
		bar_tickets_added += 1

	if bar_tickets_added > 0:
		session["bar_status"] = "queued"

		print(
			"BAR SEQUENCE QUEUED: ",
			table_id,
			" | Tickets: ",
			bar_tickets_added,
			" | Aperitif: ",
			bool(session["aperitif_ordered"]),
			" | Wine: ",
			bool(session["wine_ordered"])
		)

	if bool(session["food_ordered"]):
		session["chef_status"] = "queued"

		chef_queue.append({
			"table_id": table_id
		})

	table_sessions[table_id] = session

	if (
		session["bar_status"] != "none"
		and table.has_method("set_waiting_for_bar")
	):
		table.set_waiting_for_bar()
	elif (
		session["chef_status"] != "none"
		and table.has_method("set_waiting_for_chef")
	):
		table.set_waiting_for_chef()
	elif (
		bool(session["mise_required"])
		and not bool(session["mise_set"])
		and table.has_method("set_waiting_for_mise")
	):
		table.set_waiting_for_mise()

	_set_station_state(
		"pos",
		"active",
		true
	)
	_set_station_state(
		"pos",
		"idle",
		true
	)

	_mark_table_progress(table_id)
	_start_next_bar_order()
	_start_next_chef_order()

	_set_prompt(
		"Order entered for "
		+ table_id
		+ ". Bar and Chef tickets have been sent. Food and drinks may be collected before Mise is assigned."
	)


func _request_receipt(
	table_id: String
):
	if pos_receipt_table_id != "":
		_set_prompt(
			"POS is already printing a receipt for "
			+ pos_receipt_table_id
			+ "."
		)
		return

	_add_action_time(
		bill_action_seconds,
		"request receipt"
	)

	_add_station_interaction(
		1,
		"POS receipt request"
	)

	pos_receipt_table_id = table_id
	pos_receipt_ready = false

	_set_station_state(
		"pos",
		"active",
		true
	)

	pos_receipt_timer.start(
		pos_receipt_seconds
	)

	# Requesting the bill is meaningful table progress, so the guest's
	# patience clock restarts while the POS prints the receipt.
	_mark_table_progress(table_id)

	_set_prompt(
		"POS is printing the receipt for "
		+ table_id
		+ "."
	)


func _on_pos_receipt_timer_timeout():
	if pos_receipt_table_id == "":
		return

	pos_receipt_ready = true

	_set_station_state(
		"pos",
		"ready_collection",
		true
	)

	_set_prompt(
		"Receipt ready at POS for "
		+ pos_receipt_table_id
		+ ". Click POS to collect it."
	)


func _collect_receipt_from_pos():
	if not pos_receipt_ready:
		return

	if waiter_carrying != CARRY_NONE:
		_set_prompt(
			"Deliver or drop the current item first."
		)
		return

	_add_action_time(
		station_collection_action_seconds,
		"collect receipt"
	)

	_add_station_interaction(
		1,
		"POS receipt collection"
	)

	waiter_carrying = CARRY_RECEIPT
	carrying_table_id = pos_receipt_table_id

	pos_receipt_table_id = ""
	pos_receipt_ready = false

	_set_station_state(
		"pos",
		"idle",
		true
	)

	_sync_waiter_carrying_visual()

	_set_prompt(
		"Receipt collected. Deliver it to "
		+ carrying_table_id
		+ "."
	)


# ===================================================================
# Bar queue
# ===================================================================

func _start_next_bar_order():
	if not bar_current_order.is_empty():
		return

	if bar_queue.is_empty():
		_set_station_state(
			"bar",
			"idle",
			true
		)
		return

	bar_current_order = bar_queue.pop_front()
	bar_order_ready = false

	var table_id = str(
		bar_current_order["table_id"]
	)

	if table_sessions.has(table_id):
		var session = table_sessions[table_id]
		session["bar_status"] = "preparing"
		table_sessions[table_id] = session
		_refresh_table_status(table_id)

	_set_station_state(
		"bar",
		"active",
		true
	)

	bar_ready_timer.start(
		bar_ready_seconds
	)

	print(
		"BAR PREPARING: ",
		bar_current_order
	)


func _on_bar_ready_timer_timeout():
	if bar_current_order.is_empty():
		return

	bar_order_ready = true

	var table_id = str(
		bar_current_order["table_id"]
	)

	if table_sessions.has(table_id):
		var session = table_sessions[table_id]
		session["bar_status"] = "ready"
		table_sessions[table_id] = session
		_refresh_table_status(table_id)

	_set_station_state(
		"bar",
		"ready_collection",
		true
	)

	bar_annoyed_timer.start(
		bar_annoyed_seconds
	)


func _on_bar_annoyed_timer_timeout():
	if (
		bar_current_order.is_empty()
		or not bar_order_ready
	):
		return

	_set_station_mood(
		"bar",
		"neutral",
		"Drink waiting for collection"
	)

	_set_prompt(
		"Bar needs attention. The drink for "
		+ str(bar_current_order["table_id"])
		+ " is waiting."
	)

	bar_unhappy_timer.start(
		bar_unhappy_delay
	)


func _on_bar_unhappy_timer_timeout():
	if (
		bar_current_order.is_empty()
		or not bar_order_ready
	):
		return

	annoyed_station_events += 1

	_add_station_interaction(
		-1,
		"Bar became unhappy"
	)

	_add_level_ap(
		-station_unhappy_ap_penalty,
		"Bar became unhappy"
	)

	_set_station_state(
		"bar",
		"annoyed",
		true
	)

	_set_station_mood(
		"bar",
		"annoyed",
		"Drink has waited too long"
	)

	_set_prompt(
		"Bar is unhappy. The drink for "
		+ str(bar_current_order["table_id"])
		+ " has waited too long."
	)


func _handle_bar_arrival():
	if bar_current_order.is_empty():
		_set_prompt(
			"Bar has no current order."
		)
		return

	if not bar_order_ready:
		_set_prompt(
			"Bar is still preparing the drink for "
			+ str(bar_current_order["table_id"])
			+ "."
		)
		return

	if waiter_carrying != CARRY_NONE:
		_set_prompt(
			"Deliver or drop the current item first."
		)
		return

	var table_id = str(
		bar_current_order["table_id"]
	)

	_add_action_time(
		station_collection_action_seconds,
		"collect drink"
	)

	_add_station_interaction(
		1,
		"Bar collection"
	)

	waiter_carrying = CARRY_BAR_DRINK
	carrying_table_id = table_id
	carrying_drink_type = str(
		bar_current_order["drink_type"]
	)

	if table_sessions.has(table_id):
		var session = table_sessions[table_id]
		session["bar_status"] = "collected"
		table_sessions[table_id] = session
		_mark_table_progress(table_id)

	bar_ready_timer.stop()
	bar_annoyed_timer.stop()
	bar_unhappy_timer.stop()

	bar_current_order = {}
	bar_order_ready = false

	_set_station_state(
		"bar",
		"idle",
		true
	)

	_sync_waiter_carrying_visual()
	_start_next_bar_order()

	_set_prompt(
		carrying_drink_type.capitalize()
		+ " collected. Deliver it to "
		+ table_id
		+ "."
	)


func _get_bar_status_for_table(
	table_id: String
) -> String:
	if (
		not bar_current_order.is_empty()
		and str(bar_current_order["table_id"]) == table_id
	):
		return (
			"ready"
			if bar_order_ready
			else "preparing"
		)

	for queued_order in bar_queue:
		if str(queued_order["table_id"]) == table_id:
			return "queued"

	return "delivered"


func _all_ordered_drinks_delivered(
	session: Dictionary
) -> bool:
	return (
		(
			not bool(session["aperitif_ordered"])
			or bool(session["aperitif_delivered"])
		)
		and (
			not bool(session["wine_ordered"])
			or bool(session["wine_delivered"])
		)
	)


func _deliver_bar_drink(
	table_id: String
):
	if not _prepare_mise_for_delivery(
		table_id
	):
		return

	var session = table_sessions[table_id]
	var table = session["table"]
	var delivered_drink_type = carrying_drink_type

	_add_action_time(
		delivery_action_seconds,
		"deliver " + delivered_drink_type
	)

	if delivered_drink_type == "aperitif":
		session["aperitif_delivered"] = true

		if not bool(session["food_delivered"]):
			if table.has_method("set_aperitif_served"):
				table.set_aperitif_served()
	else:
		session["wine_delivered"] = true

		if not bool(
			session.get(
				"wine_sale_counted",
				false
			)
		):
			session["wine_sale_counted"] = true
			wine_sales_count += 1
			bottle_meter = min(
				wine_sales_count,
				bottle_meter_max
			)

			print(
				"WINE SALE CONFIRMED: ",
				table_id,
				" | Bottle meter: ",
				bottle_meter,
				" / ",
				bottle_meter_max
			)

		if not bool(session["food_delivered"]):
			if table.has_method("set_wine_served"):
				table.set_wine_served()

	session["drink_delivered"] = 		_all_ordered_drinks_delivered(session)

	# Collection of drink one begins preparation of drink two.
	session["bar_status"] = 		_get_bar_status_for_table(table_id)

	table_sessions[table_id] = session

	_clear_normal_carrying()
	_mark_table_progress(table_id)

	if session["bar_status"] != "delivered":
		var next_drink = "next drink"

		if (
			not bar_current_order.is_empty()
			and str(bar_current_order["table_id"]) == table_id
		):
			next_drink = str(
				bar_current_order["drink_type"]
			)

		_set_prompt(
			delivered_drink_type.capitalize()
			+ " delivered to "
			+ table_id
			+ ". The "
			+ next_drink
			+ " is now being prepared at Bar."
		)
	else:
		_set_prompt(
			delivered_drink_type.capitalize()
			+ " delivered to "
			+ table_id
			+ ". All ordered drinks have been served."
		)




# ===================================================================
# Chef queue
# ===================================================================

func _start_next_chef_order():
	if not chef_current_order.is_empty():
		return

	if chef_queue.is_empty():
		_set_station_state(
			"chef",
			"idle",
			true
		)
		return

	chef_current_order = chef_queue.pop_front()
	chef_order_ready = false

	var table_id = str(
		chef_current_order["table_id"]
	)

	if table_sessions.has(table_id):
		var session = table_sessions[table_id]
		session["chef_status"] = "preparing"
		table_sessions[table_id] = session
		_refresh_table_status(table_id)

	_set_station_state(
		"chef",
		"active",
		true
	)

	chef_ready_timer.start(
		chef_ready_seconds
	)

	print(
		"CHEF PREPARING: ",
		chef_current_order
	)


func _on_chef_ready_timer_timeout():
	if chef_current_order.is_empty():
		return

	chef_order_ready = true

	var table_id = str(
		chef_current_order["table_id"]
	)

	if table_sessions.has(table_id):
		var session = table_sessions[table_id]
		session["chef_status"] = "ready"
		table_sessions[table_id] = session
		_refresh_table_status(table_id)

	_set_station_state(
		"chef",
		"ready_collection",
		true
	)

	chef_annoyed_timer.start(
		chef_annoyed_seconds
	)


func _on_chef_annoyed_timer_timeout():
	if (
		chef_current_order.is_empty()
		or not chef_order_ready
	):
		return

	_set_station_mood(
		"chef",
		"neutral",
		"Food waiting for collection"
	)

	_set_prompt(
		"Chef needs attention. Food for "
		+ str(chef_current_order["table_id"])
		+ " is waiting."
	)

	chef_unhappy_timer.start(
		chef_unhappy_delay
	)


func _on_chef_unhappy_timer_timeout():
	if (
		chef_current_order.is_empty()
		or not chef_order_ready
	):
		return

	annoyed_station_events += 1

	_add_station_interaction(
		-1,
		"Chef became unhappy"
	)

	_add_level_ap(
		-station_unhappy_ap_penalty,
		"Chef became unhappy"
	)

	_set_station_state(
		"chef",
		"annoyed",
		true
	)

	_set_station_mood(
		"chef",
		"annoyed",
		"Food has waited too long"
	)

	_set_prompt(
		"Chef is unhappy. Food for "
		+ str(chef_current_order["table_id"])
		+ " has waited too long."
	)


func _handle_chef_arrival():
	if chef_current_order.is_empty():
		_set_prompt(
			"Chef has no current order."
		)
		return

	if not chef_order_ready:
		_set_prompt(
			"Chef is still preparing food for "
			+ str(chef_current_order["table_id"])
			+ "."
		)
		return

	if waiter_carrying != CARRY_NONE:
		_set_prompt(
			"Deliver or drop the current item first."
		)
		return

	var table_id = str(
		chef_current_order["table_id"]
	)

	if not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]

	_add_action_time(
		station_collection_action_seconds,
		"collect food"
	)

	_add_station_interaction(
		1,
		"Chef collection"
	)

	waiter_carrying = CARRY_FOOD
	carrying_table_id = table_id

	session["chef_status"] = "collected"
	table_sessions[table_id] = session

	chef_ready_timer.stop()
	chef_annoyed_timer.stop()
	chef_unhappy_timer.stop()

	chef_current_order = {}
	chef_order_ready = false

	_set_station_state(
		"chef",
		"idle",
		true
	)

	_sync_waiter_carrying_visual()
	_mark_table_progress(table_id)
	_start_next_chef_order()

	_set_prompt(
		"Food collected. Deliver it to "
		+ table_id
		+ "."
	)


func _deliver_food(
	table_id: String
):
	if not _prepare_mise_for_delivery(
		table_id
	):
		return

	var session = table_sessions[table_id]
	var table = session["table"]

	_add_action_time(
		delivery_action_seconds,
		"deliver food"
	)

	session["chef_status"] = "delivered"
	session["food_delivered"] = true
	session["phase"] = "eating"
	table_sessions[table_id] = session

	if table.has_method("set_eating"):
		table.set_eating()
	elif table.has_method("set_enjoying"):
		table.set_enjoying()

	_clear_normal_carrying()
	_mark_table_progress(table_id)

	_schedule_event(
		"enjoy_complete",
		table_id,
		table_enjoy_seconds
	)

	_set_prompt(
		"Food delivered to "
		+ table_id
		+ ". The guests are eating."
	)


func _finish_table_enjoying(
	table_id: String
) -> bool:
	if not table_sessions.has(table_id):
		return true

	var session = table_sessions[table_id]

	if session["phase"] != "eating":
		return true

	if not _all_ordered_drinks_delivered(
		session
	):
		_schedule_event(
			"enjoy_complete",
			table_id,
			1.0
		)

		_set_prompt(
			table_id
			+ " is eating, but its remaining Bar service must still be completed."
		)
		return true

	session["phase"] = "ready_to_clear"
	table_sessions[table_id] = session

	var table = session["table"]

	if table.has_method(
		"set_ready_to_clear"
	):
		table.set_ready_to_clear()

	_mark_table_progress(table_id)

	_set_prompt(
		table_id
		+ " is ready to clear."
	)

	return true


# ===================================================================
# Mise en Place
# ===================================================================

func _handle_mise_arrival():
	if mise_inventory_filled:
		_set_prompt(
			"Mise inventory is already full. You may continue all normal tasks or assign it to any active table that needs it."
		)
		return

	if (
		mise_restock_in_progress
		or mise_uses_since_restock >= MISE_STOCK_CAPACITY
	):
		_set_prompt(
			"Mise en Place is low and currently restocking."
		)
		return

	var required_count = _count_tables_needing_mise()

	if required_count <= 0:
		_set_prompt(
			"No active guest table currently needs a serviette, knife and fork."
		)
		return

	_add_action_time(
		mise_collection_action_seconds,
		"collect mise"
	)

	_add_station_interaction(
		1,
		"Mise collection"
	)

	# Generic, independent one-slot inventory.
	mise_inventory_filled = true
	mise_inventory_table_id = ""
	mise_inventory_purpose = ""

	# Remove one setting from the physical station.
	mise_uses_since_restock += 1

	print(
		"MISE STOCK USED: ",
		mise_uses_since_restock,
		" / ",
		MISE_STOCK_CAPACITY
	)

	if mise_uses_since_restock >= MISE_STOCK_CAPACITY:
		mise_restock_in_progress = true

		_set_station_state(
			"mise_en_place",
			"low",
			true
		)

		_set_station_mood(
			"mise_en_place",
			"neutral",
			"Two settings used — restocking"
		)

		mise_restock_timer.start(
			mise_restock_seconds
		)

		_set_prompt(
			"Serviette, knife and fork collected. The second setting has been used, so Mise en Place is now low and restocking."
		)
	else:
		# One setting has been used, but the station remains visually
		# stocked and does not begin restocking yet.
		_set_station_state(
			"mise_en_place",
			"stocked",
			true
		)

		_set_station_mood(
			"mise_en_place",
			"happy"
		)

		_set_prompt(
			"Serviette, knife and fork collected. One setting remains; restocking has not started."
		)

	_update_mise_icon()


func _on_mise_restock_timer_timeout():
	mise_uses_since_restock = 0
	mise_restock_in_progress = false

	_set_station_state(
		"mise_en_place",
		"stocked",
		true
	)

	_set_station_mood(
		"mise_en_place",
		"happy"
	)

	print(
		"MISE RESTOCK COMPLETE: 0 / ",
		MISE_STOCK_CAPACITY,
		" settings used"
	)

	_set_prompt(
		"Mise en Place has been fully restocked."
	)


func _table_can_receive_mise(
	table_id: String
) -> bool:
	if not table_sessions.has(table_id):
		return false

	var session = table_sessions[table_id]

	return (
		bool(session["mise_required"])
		and not bool(session["mise_reserved"])
		and not bool(session["mise_set"])
	)


func _assign_mise_to_table(
	table_id: String
):
	if not mise_inventory_filled:
		return

	if not _table_can_receive_mise(table_id):
		_set_prompt(
			table_id
			+ " does not currently need an unassigned Mise setting. The inventory remains full."
		)
		return

	var session = table_sessions[table_id]
	session["mise_reserved"] = true
	table_sessions[table_id] = session

	_clear_mise_inventory()
	_mark_table_progress(table_id)
	_refresh_table_status(table_id)

	_set_prompt(
		"Mise assigned to "
		+ table_id
		+ ". It will be laid automatically with that table's next food or drink delivery."
	)


func _prepare_mise_for_delivery(
	table_id: String
) -> bool:
	if not table_sessions.has(table_id):
		return false

	var session = table_sessions[table_id]

	if not bool(session["mise_required"]):
		return true

	if bool(session["mise_set"]):
		return true

	# A previously assigned setting is laid together with this delivery.
	if bool(session["mise_reserved"]):
		session["mise_reserved"] = false
		session["mise_set"] = true
		table_sessions[table_id] = session

		_add_action_time(
			mise_laying_action_seconds,
			"lay assigned mise with delivery"
		)

		_refresh_table_status(table_id)

		print(
			"MISE LAID WITH DELIVERY: ",
			table_id
		)

		return true

	# The player is carrying a generic setting and has chosen this table
	# by attempting its matching delivery. Assign and lay it in the same
	# action.
	if mise_inventory_filled:
		session["mise_set"] = true
		table_sessions[table_id] = session

		_clear_mise_inventory()

		_add_action_time(
			mise_laying_action_seconds,
			"assign and lay mise with delivery"
		)

		_refresh_table_status(table_id)

		print(
			"MISE ASSIGNED AND LAID WITH DELIVERY: ",
			table_id
		)

		return true

	_set_prompt(
		table_id
		+ " still needs Mise. You may keep carrying the food or drink, collect a setting, then return to deliver both together."
	)

	return false


func _clear_mise_inventory():
	mise_inventory_filled = false
	mise_inventory_table_id = ""
	mise_inventory_purpose = ""
	_update_mise_icon()


# ===================================================================
# Clearing, Scullery, bill and completion
# ===================================================================

func _reset_empty_table(
	table_id: String
):
	if not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]

	if session["phase"] != "reset_required":
		_set_prompt(
			table_id
			+ " does not currently need a table reset."
		)
		return

	var table = session["table"]

	_add_action_time(
		table_reset_action_seconds,
		"reset table"
	)

	table_sessions[table_id] = \
		_create_ready_table_session(
			table
		)

	if table.has_method(
		"set_ready_for_guests"
	):
		table.set_ready_for_guests()

	if next_guest_profile_index < target_guest_services:
		_schedule_event(
			"guest_arrival",
			"",
			reseat_delay
		)

	_set_prompt(
		table_id
		+ " has been reset and is ready for the next guests."
	)


func _collect_dirty_plates(
	table_id: String
):
	if waiter_carrying != CARRY_NONE:
		_set_prompt(
			"Deliver or drop the current item first."
		)
		return

	var session = table_sessions[table_id]
	var table = session["table"]

	_add_action_time(
		clearing_action_seconds,
		"clear table"
	)

	session["phase"] = "plates_collected"
	table_sessions[table_id] = session

	if table.has_method(
		"set_plates_collected"
	):
		table.set_plates_collected()

	waiter_carrying = CARRY_DIRTY
	carrying_table_id = table_id

	_sync_waiter_carrying_visual()
	_mark_table_progress(table_id)

	_set_prompt(
		"Dirty plates collected from "
		+ table_id
		+ ". Take them to Scullery."
	)


func _handle_scullery_arrival():
	if waiter_carrying != CARRY_DIRTY:
		_set_prompt(
			"Scullery has "
			+ str(scullery_dish_sets)
			+ " / "
			+ str(SCULLERY_MAX_DISH_SETS)
			+ " dish sets."
		)
		return

	if scullery_dish_sets >= SCULLERY_MAX_DISH_SETS:
		_set_prompt(
			"Scullery is full with 2 dish sets. Keep carrying these plates until one set has been cleaned."
		)
		return

	var table_id = carrying_table_id

	_add_action_time(
		scullery_drop_action_seconds,
		"drop plates"
	)

	_add_station_interaction(
		1,
		"Scullery drop"
	)

	# One cleared table contributes exactly one dish set.
	scullery_dish_sets += 1

	_clear_normal_carrying()

	if table_sessions.has(table_id):
		var session = table_sessions[table_id]
		session["phase"] = "waiting_for_bill"
		table_sessions[table_id] = session

		var table = session["table"]

		if table.has_method(
			"set_waiting_for_bill"
		):
			table.set_waiting_for_bill()

		focused_table_id = table_id
		_mark_table_progress(table_id)

	_refresh_scullery_visual()

	# The first dish set starts the cleaning cycle. Adding the second
	# set does not restart the current timer; it waits in capacity.
	if scullery_timer.is_stopped():
		scullery_timer.start(
			scullery_clean_seconds
		)

	_set_prompt(
		"Plates from "
		+ table_id
		+ " dropped at Scullery. Capacity: "
		+ str(scullery_dish_sets)
		+ " / "
		+ str(SCULLERY_MAX_DISH_SETS)
		+ ". Go to POS for the bill."
	)


func _on_scullery_timer_timeout():
	if scullery_dish_sets <= 0:
		scullery_dish_sets = 0
		_refresh_scullery_visual()
		return

	# Each completed cleaning cycle removes one table's dish set.
	scullery_dish_sets -= 1

	print(
		"SCULLERY CLEANED ONE SET | Remaining: ",
		scullery_dish_sets,
		" / ",
		SCULLERY_MAX_DISH_SETS
	)

	_refresh_scullery_visual()

	# If another set remains, begin the next cleaning cycle.
	if scullery_dish_sets > 0:
		scullery_timer.start(
			scullery_clean_seconds
		)


func _refresh_scullery_visual():
	if scullery_dish_sets <= 0:
		scullery_dish_sets = 0
		scullery_unhappy_timer.stop()

		_set_station_state(
			"scullery",
			"idle",
			true
		)

		_set_station_mood(
			"scullery",
			"happy"
		)
		return

	if scullery_dish_sets == 1:
		scullery_unhappy_timer.stop()

		_set_station_state(
			"scullery",
			"active",
			true
		)

		_set_station_mood(
			"scullery",
			"happy"
		)
		return

	scullery_dish_sets = min(
		scullery_dish_sets,
		SCULLERY_MAX_DISH_SETS
	)

	_set_station_state(
		"scullery",
		"full",
		true
	)

	_set_station_mood(
		"scullery",
		"neutral",
		"Scullery is at full capacity"
	)

	if scullery_unhappy_timer.is_stopped():
		scullery_unhappy_timer.start(
			scullery_full_unhappy_seconds
		)


func _on_scullery_unhappy_timer_timeout():
	if scullery_dish_sets < SCULLERY_MAX_DISH_SETS:
		return

	annoyed_station_events += 1

	_add_station_interaction(
		-1,
		"Scullery became unhappy"
	)

	_add_level_ap(
		-station_unhappy_ap_penalty,
		"Scullery became unhappy"
	)

	_set_station_mood(
		"scullery",
		"annoyed",
		"Scullery has remained full too long"
	)

	_set_prompt(
		"Scullery is unhappy because it has remained full."
	)


func _deliver_receipt(
	table_id: String
):
	var session = table_sessions[table_id]
	var table = session["table"]

	_add_action_time(
		delivery_action_seconds,
		"deliver receipt"
	)

	_clear_normal_carrying()

	session["phase"] = "leaving"
	table_sessions[table_id] = session

	if table.has_method("set_complete"):
		table.set_complete()
	elif table.has_method("set_empty"):
		table.set_empty()

	completed_guest_services += 1
	_mark_table_progress(table_id)

	_award_table_completion_rewards(
		table_id,
		session
	)

	print(
		"GUEST SERVICE COMPLETE: ",
		table_id,
		" | Completed: ",
		completed_guest_services,
		"/",
		target_guest_services
	)

	if completed_guest_services >= target_guest_services:
		_finish_shift()
		return

	_schedule_event(
		"enable_reset",
		table_id,
		guest_leave_delay
	)

	_set_prompt(
		table_id
		+ " completed. The table is empty for a few seconds before resetting."
	)


func _award_table_completion_rewards(
	table_id: String,
	session: Dictionary
):
	var sold_wine = bool(
		session.get(
			"wine_sale_counted",
			false
		)
	)

	var guest_stayed_happy = not bool(
		session.get(
			"had_guest_unhappy",
			false
		)
	)

	var station_annoyance_start = int(
		session.get(
			"station_annoyance_start",
			annoyed_station_events
		)
	)

	var station_service_clean = (
		annoyed_station_events
		<= station_annoyance_start
	)

	var ap_reward = table_complete_ap_reward
	var coin_reward = table_complete_coin_reward

	if sold_wine:
		ap_reward += wine_sale_ap_reward
		coin_reward += wine_sale_coin_reward

	if guest_stayed_happy:
		ap_reward += happy_guest_ap_bonus
		coin_reward += happy_guest_coin_bonus

	if station_service_clean:
		ap_reward += clean_station_ap_bonus
		coin_reward += clean_station_coin_bonus

	_add_level_ap(
		ap_reward,
		"Completed "
		+ table_id
	)

	_add_coins(
		coin_reward,
		"Completed "
		+ table_id
	)

	print(
		"TABLE REWARD: ",
		table_id,
		" | AP: ",
		ap_reward,
		" | Coins: ",
		coin_reward,
		" | Wine: ",
		sold_wine,
		" | Guest happy throughout: ",
		guest_stayed_happy,
		" | Stations clean: ",
		station_service_clean
	)


func _enable_table_reset(
	table_id: String
) -> bool:
	if not table_sessions.has(table_id):
		return true

	var session = table_sessions[table_id]

	if session["phase"] != "leaving":
		return true

	session["phase"] = "reset_required"
	session["last_progress_time"] = \
		elapsed_shift_time
	table_sessions[table_id] = session

	var table = session["table"]

	if table.has_method("set_empty"):
		table.set_empty()

	if table.has_method("set_status_text"):
		table.set_status_text(
			"Empty — reset required"
		)

	_set_prompt(
		table_id
		+ " is empty and now needs a Table Reset."
	)

	return true


# ===================================================================
# Guest patience
# ===================================================================

func _update_guest_patience():
	for table_id in table_sessions.keys():
		var session = table_sessions[table_id]
		var phase = str(session["phase"])

		if phase not in [
			"waiting_to_greet",
			"order_pending_pos",
			"service_active",
			"ready_to_clear",
			"waiting_for_bill"
		]:
			continue

		var waiting_seconds = (
			elapsed_shift_time
			- float(session["last_progress_time"])
		)

		var warning_threshold = guest_annoyed_seconds
		var unhappy_threshold = (
			guest_annoyed_seconds
			+ guest_unhappy_delay
		)

		var mood_state = str(
			session.get(
				"mood_state",
				"happy"
			)
		)

		var table = session["table"]
		var reason = _get_annoyed_reason_for_phase(
			phase
		)

		if waiting_seconds >= unhappy_threshold:
			if mood_state == "annoyed":
				continue

			session["mood_state"] = "annoyed"
			session["annoyed"] = true
			session["had_guest_unhappy"] = true
			table_sessions[table_id] = session

			annoyed_guest_events += 1

			_add_level_ap(
				-guest_unhappy_ap_penalty,
				table_id
				+ " became unhappy"
			)

			if table.has_method("set_annoyed"):
				table.set_annoyed(reason)
			elif table.has_method("set_mood_unhappy"):
				table.set_mood_unhappy(reason)

			_set_prompt(
				table_id
				+ " is now unhappy."
			)

			continue

		if waiting_seconds >= warning_threshold:
			if mood_state != "happy":
				continue

			session["mood_state"] = "neutral"
			table_sessions[table_id] = session

			if table.has_method("set_mood_warning"):
				table.set_mood_warning(reason)

			_set_prompt(
				table_id
				+ " needs attention."
			)


func _get_annoyed_reason_for_phase(
	phase: String
) -> String:
	match phase:
		"waiting_to_greet":
			return "Waiting to be greeted"
		"order_pending_pos":
			return "Waiting for the order to be entered"
		"service_active":
			return "Waiting for service"
		"ready_to_clear":
			return "Waiting to be cleared"
		"waiting_for_bill":
			return "Waiting for the bill"

	return "Waiting too long"


func _mark_table_progress(
	table_id: String
):
	if not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]
	session["last_progress_time"] = \
		elapsed_shift_time

	var previous_mood = str(
		session.get(
			"mood_state",
			"happy"
		)
	)

	session["mood_state"] = "happy"
	session["annoyed"] = false

	var table = session["table"]

	if previous_mood == "annoyed":
		var recovered = false

		if table.has_method(
			"clear_annoyed"
		):
			recovered = bool(
				table.clear_annoyed()
			)

		if (
			not recovered
			and table.has_method(
				"set_mood_happy"
			)
		):
			table.set_mood_happy()

	elif previous_mood == "neutral":
		if table.has_method(
			"set_mood_happy"
		):
			table.set_mood_happy()

	table_sessions[table_id] = session
	_refresh_table_status(table_id)


# ===================================================================
# Table status feedback
# ===================================================================

func _refresh_all_table_statuses():
	for table_id in table_sessions.keys():
		_refresh_table_status(
			str(table_id)
		)


func _refresh_table_status(
	table_id: String
):
	if not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]
	var table = session["table"]

	if not table.has_method(
		"set_status_text"
	):
		return

	if bool(session["annoyed"]):
		return

	var phase = str(session["phase"])
	var message = ""

	match phase:
		"ready_for_guests":
			message = "Ready for guests"

		"waiting_to_greet":
			message = "Greet guest"

		"order_pending_pos":
			message = "Order → POS"

		"service_active":
			if session["bar_status"] == "ready":
				message = "Drink ready"
			elif session["chef_status"] == "ready":
				message = "Food ready"
			elif (
				bool(session["mise_required"])
				and bool(session["mise_reserved"])
				and not bool(session["mise_set"])
			):
				message = "Mise assigned"
			elif (
				bool(session["mise_required"])
				and not bool(session["mise_set"])
			):
				message = "Mise needed"
			else:
				message = "Service in progress"

		"eating":
			message = "Eating"

		"ready_to_clear":
			message = "Ready to clear"

		"plates_collected":
			message = "Plates → Scullery"

		"waiting_for_bill":
			message = "Bill → POS"

		"leaving":
			message = "Guests leaving"

		"reset_required":
			message = "Empty — reset required"

		_:
			message = phase

	table.set_status_text(message)


# ===================================================================
# Station visual helpers
# ===================================================================

func _set_station_state(
	station_id: String,
	state: String,
	force_refresh = false
):
	if not station_by_id.has(station_id):
		push_warning(
			"STATION NOT FOUND: "
			+ station_id
		)
		return

	var station = station_by_id[station_id]

	if station.has_method(
		"set_station_state"
	):
		station.set_station_state(
			state,
			force_refresh
		)


func _set_station_mood(
	station_id: String,
	mood: String,
	reason: String = ""
):
	if not station_by_id.has(station_id):
		return

	var station = station_by_id[station_id]

	if station.has_method(
		"set_mood_state"
	):
		station.set_mood_state(
			mood,
			reason
		)


func _reset_all_station_states():
	_set_station_state(
		"bar",
		"idle",
		true
	)
	_set_station_state(
		"chef",
		"idle",
		true
	)
	scullery_dish_sets = 0
	_set_station_state(
		"scullery",
		"idle",
		true
	)
	_set_station_state(
		"pos",
		"idle",
		true
	)
	mise_uses_since_restock = 0
	mise_restock_in_progress = false

	if mise_restock_timer != null:
		mise_restock_timer.stop()

	_set_station_state(
		"mise_en_place",
		"stocked",
		true
	)

	for station_id in station_by_id.keys():
		_set_station_mood(
			str(station_id),
			"happy"
		)


func _normalise_station_id(
	raw_id: String
) -> String:
	var normalised = raw_id.strip_edges().to_lower()

	if normalised in [
		"bar",
		"chef",
		"scullery",
		"pos",
		"mise_en_place"
	]:
		return normalised

	if normalised in [
		"kitchen",
		"chef_station"
	]:
		return "chef"

	if normalised in [
		"mise",
		"mise-en-place",
		"mise en place"
	]:
		return "mise_en_place"

	return ""


func _format_station_name(
	station_id: String
) -> String:
	match station_id:
		"bar":
			return "Bar"
		"chef":
			return "Chef"
		"scullery":
			return "Scullery"
		"pos":
			return "POS"
		"mise_en_place":
			return "Mise en Place"

	return station_id


# ===================================================================
# Timer creation
# ===================================================================

func _create_runtime_timers():
	bar_ready_timer = _create_one_shot_timer(
		"BarReadyTimer",
		_on_bar_ready_timer_timeout
	)

	bar_annoyed_timer = _create_one_shot_timer(
		"BarAnnoyedTimer",
		_on_bar_annoyed_timer_timeout
	)

	bar_unhappy_timer = _create_one_shot_timer(
		"BarUnhappyTimer",
		_on_bar_unhappy_timer_timeout
	)

	chef_ready_timer = _create_one_shot_timer(
		"ChefReadyTimer",
		_on_chef_ready_timer_timeout
	)

	chef_annoyed_timer = _create_one_shot_timer(
		"ChefAnnoyedTimer",
		_on_chef_annoyed_timer_timeout
	)

	chef_unhappy_timer = _create_one_shot_timer(
		"ChefUnhappyTimer",
		_on_chef_unhappy_timer_timeout
	)

	pos_receipt_timer = _create_one_shot_timer(
		"POSReceiptTimer",
		_on_pos_receipt_timer_timeout
	)

	scullery_timer = _create_one_shot_timer(
		"SculleryTimer",
		_on_scullery_timer_timeout
	)

	scullery_unhappy_timer = _create_one_shot_timer(
		"SculleryUnhappyTimer",
		_on_scullery_unhappy_timer_timeout
	)

	mise_restock_timer = _create_one_shot_timer(
		"MiseRestockTimer",
		_on_mise_restock_timer_timeout
	)


func _create_one_shot_timer(
	timer_name: String,
	timeout_callback: Callable
) -> Timer:
	var timer = Timer.new()
	timer.name = timer_name
	timer.one_shot = true
	timer.autostart = false
	timer.timeout.connect(
		timeout_callback
	)
	add_child(timer)
	return timer


# ===================================================================
# Action time and carrying visuals
# ===================================================================

func _add_action_time(
	seconds: float,
	reason: String
):
	if seconds <= 0.0:
		return

	elapsed_shift_time += seconds

	_show_action_time_indicator(
		seconds
	)

	print(
		"ACTION TIME ADDED: +",
		seconds,
		"s | ",
		reason,
		" | Total: ",
		elapsed_shift_time
	)


func _show_action_time_indicator(
	seconds: float
):
	if not show_action_time_indicator:
		return

	if waiter_node == null:
		return

	if hud_root == null:
		return

	var waiter_world_position = \
		waiter_node.global_position

	var object_world_position = \
		_get_action_target_world_position()

	var indicator_world_position = \
		waiter_world_position.lerp(
			object_world_position,
			0.5
		)

	indicator_world_position.y -= \
		action_time_indicator_vertical_offset

	# Convert the restaurant's world-space midpoint into viewport/screen
	# coordinates because the label is displayed inside HUDRoot.
	var canvas_transform = \
		get_viewport().get_canvas_transform()

	var indicator_screen_position = \
		canvas_transform * indicator_world_position

	var indicator = Label.new()
	indicator.name = "ActionTimeIndicator"
	indicator.text = (
		"+"
		+ _format_action_seconds(seconds)
		+ "s"
	)
	indicator.size = Vector2(
		150,
		56
	)
	indicator.horizontal_alignment = \
		HORIZONTAL_ALIGNMENT_CENTER
	indicator.vertical_alignment = \
		VERTICAL_ALIGNMENT_CENTER
	indicator.mouse_filter = \
		Control.MOUSE_FILTER_IGNORE

	# Keep this within Godot's supported CanvasItem Z range.
	indicator.z_as_relative = false
	indicator.z_index = 4000

	indicator.pivot_offset = \
		indicator.size * 0.5
	indicator.scale = Vector2(
		0.72,
		0.72
	)

	indicator.add_theme_font_size_override(
		"font_size",
		action_time_indicator_font_size
	)
	indicator.add_theme_color_override(
		"font_color",
		action_time_indicator_color
	)
	indicator.add_theme_color_override(
		"font_outline_color",
		Color(
			0.0,
			0.0,
			0.0,
			0.96
		)
	)
	indicator.add_theme_constant_override(
		"outline_size",
		action_time_indicator_outline_size
	)

	hud_root.add_child(
		indicator
	)

	indicator.position = (
		indicator_screen_position
		- indicator.size * 0.5
	)

	var ending_position = (
		indicator.position
		+ Vector2(
			0,
			-action_time_indicator_float_distance
		)
	)

	var total_duration = max(
		action_time_indicator_duration,
		0.2
	)
	var hold_duration = clamp(
		action_time_indicator_hold,
		0.0,
		total_duration - 0.1
	)
	var fade_duration = max(
		total_duration - hold_duration,
		0.1
	)

	var tween = create_tween()
	tween.set_parallel(true)

	tween.tween_property(
		indicator,
		"scale",
		Vector2(
			1.12,
			1.12
		),
		0.16
	).set_trans(
		Tween.TRANS_BACK
	).set_ease(
		Tween.EASE_OUT
	)

	tween.tween_property(
		indicator,
		"position",
		ending_position,
		total_duration
	).set_trans(
		Tween.TRANS_QUAD
	).set_ease(
		Tween.EASE_OUT
	)

	tween.tween_property(
		indicator,
		"modulate",
		Color(
			1.0,
			1.0,
			1.0,
			0.0
		),
		fade_duration
	).set_delay(
		hold_duration
	)

	# Queue the label only after every parallel animation completes.
	tween.chain().tween_callback(
		indicator.queue_free
	)


func _get_action_target_world_position() -> Vector2:
	if (
		action_time_target_node == null
		or not is_instance_valid(
			action_time_target_node
		)
	):
		return (
			waiter_node.global_position
			+ Vector2(
				0,
				-70
			)
		)

	# Tables and stations already expose their precise interaction
	# location, so use it instead of guessing from sprite dimensions.
	if action_time_target_node.has_method(
		"get_interaction_position"
	):
		var interaction_position = \
			action_time_target_node.call(
				"get_interaction_position"
			)

		if interaction_position is Vector2:
			return interaction_position

	if action_time_target_node is Node2D:
		return (
			action_time_target_node
			as Node2D
		).global_position

	return waiter_node.global_position


func _format_action_seconds(
	seconds: float
) -> String:
	if is_equal_approx(
		seconds,
		round(seconds)
	):
		return str(
			int(round(seconds))
		)

	return (
		"%.1f" % seconds
	)


func _clear_normal_carrying():
	waiter_carrying = CARRY_NONE
	carrying_table_id = ""
	carrying_drink_type = ""
	_sync_waiter_carrying_visual()


func _sync_waiter_carrying_visual():
	if (
		waiter_node == null
		or not waiter_node.has_method(
			"set_carrying"
		)
	):
		return

	match waiter_carrying:
		CARRY_BAR_DRINK:
			waiter_node.set_carrying(
				"wine_bottle"
			)
		CARRY_FOOD:
			waiter_node.set_carrying(
				"food_plate"
			)
		CARRY_DIRTY:
			waiter_node.set_carrying(
				"dirty_plates"
			)
		CARRY_RECEIPT:
			waiter_node.set_carrying(
				"receipt"
			)
		_:
			# Mise uses the normal empty walk until its
			# dedicated serviette/knife/fork model is added.
			waiter_node.set_carrying(
				"none"
			)


# ===================================================================
# HUD creation
# ===================================================================

func _create_hud():
	var hud_scene = preload(
		"res://assets/scene/hud/HUD.tscn"
	)

	hud_layer = hud_scene.instantiate()
	hud_layer.name = "HUDLayer"
	add_child(hud_layer)

	primary_hud_controller = hud_layer

	hud_root = hud_layer.get_node(
		"HUDRoot"
	)

	# Existing score HUD nodes.
	ap_label = hud_root.get_node(
		"APLabel"
	)
	coin_label = hud_root.get_node(
		"CoinDisplay"
	)
	bottle_label = hud_root.get_node(
		"BottleMeter"
	)
	timer_label = hud_root.get_node(
		"ShiftTimer"
	)

	# Editable Tier-goals HUD created directly inside HUD.tscn.
	unlock_panel = hud_root.get_node(
		"TierGoalsHUD"
	)
	unlock_title_label = unlock_panel.get_node(
		"TierTitleLabel"
	)
	unlock_goal_label = unlock_panel.get_node(
		"TierGoalLabel"
	)
	unlock_tables_label = unlock_panel.get_node(
		"TablesRequirementLabel"
	)
	unlock_coins_label = unlock_panel.get_node(
		"CoinsRequirementLabel"
	)
	unlock_wines_label = unlock_panel.get_node(
		"WinesRequirementLabel"
	)
	unlock_station_label = unlock_panel.get_node(
		"StationRequirementLabel"
	)
	unlock_progress_label = unlock_panel.get_node(
		"GoalsCompleteLabel"
	)

	# Editable live-status HUD created directly inside HUD.tscn.
	status_panel = hud_root.get_node(
		"LiveStatusHUD"
	)
	mise_icon = status_panel.get_node(
		"MiseIcon"
	)
	mise_label = status_panel.get_node(
		"MiseLabel"
	)
	objective_label = status_panel.get_node(
		"TaskLabel"
	)
	service_label = status_panel.get_node(
		"LocationLabel"
	)

	# These compact-HUD fields are intentionally not shown.
	status_title_label = null
	prompt_label = null
	tables_label = null
	carrying_label = null
	mise_fallback_label = null

	# Encounter and result overlays remain runtime panels for now.
	_create_encounter_panel()
	_create_result_panel()

	print(
		"EDITABLE HUD NODES CONNECTED"
	)


func _create_encounter_panel():
	encounter_panel = Panel.new()
	encounter_panel.name = "GuestEncounterPanel"
	encounter_panel.position = Vector2(
		460,
		285
	)
	encounter_panel.size = Vector2(
		700,
		350
	)
	encounter_panel.visible = false
	hud_root.add_child(
		encounter_panel
	)

	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(
		0.02,
		0.10,
		0.06,
		0.94
	)
	panel_style.border_color = Color(
		0.95,
		0.62,
		0.18,
		1.0
	)
	panel_style.set_border_width_all(4)
	panel_style.set_corner_radius_all(18)
	encounter_panel.add_theme_stylebox_override(
		"panel",
		panel_style
	)

	encounter_title_label = Label.new()
	encounter_title_label.position = Vector2(
		30,
		20
	)
	encounter_title_label.size = Vector2(
		640,
		35
	)
	encounter_title_label.horizontal_alignment = \
		HORIZONTAL_ALIGNMENT_CENTER
	encounter_title_label.add_theme_font_size_override(
		"font_size",
		25
	)
	encounter_panel.add_child(
		encounter_title_label
	)

	encounter_hint_label = Label.new()
	encounter_hint_label.position = Vector2(
		35,
		65
	)
	encounter_hint_label.size = Vector2(
		630,
		65
	)
	encounter_hint_label.autowrap_mode = \
		TextServer.AUTOWRAP_WORD_SMART
	encounter_hint_label.horizontal_alignment = \
		HORIZONTAL_ALIGNMENT_CENTER
	encounter_hint_label.add_theme_font_size_override(
		"font_size",
		19
	)
	encounter_panel.add_child(
		encounter_hint_label
	)

	encounter_response_label = Label.new()
	encounter_response_label.position = Vector2(
		35,
		135
	)
	encounter_response_label.size = Vector2(
		630,
		60
	)
	encounter_response_label.autowrap_mode = \
		TextServer.AUTOWRAP_WORD_SMART
	encounter_response_label.horizontal_alignment = \
		HORIZONTAL_ALIGNMENT_CENTER
	encounter_response_label.add_theme_font_size_override(
		"font_size",
		18
	)
	encounter_panel.add_child(
		encounter_response_label
	)

	greet_wine_button = _make_encounter_button(
		"Greet Wine",
		Vector2(25, 230),
		func():
			_choose_greeting(
				"greet_wine"
			)
	)

	greet_aperitif_button = _make_encounter_button(
		"Greet Aperitif",
		Vector2(250, 230),
		func():
			_choose_greeting(
				"greet_aperitif"
			)
	)

	greet_food_button = _make_encounter_button(
		"Greet Food",
		Vector2(475, 230),
		func():
			_choose_greeting(
				"greet_food"
			)
	)

	walk_away_button = _make_encounter_button(
		"Walk Away",
		Vector2(25, 230),
		func():
			_choose_follow_up(
				"walk_away"
			)
	)

	offer_food_button = _make_encounter_button(
		"Offer Food",
		Vector2(250, 230),
		func():
			_choose_follow_up(
				"offer_food"
			)
	)

	offer_wine_button = _make_encounter_button(
		"Offer Wine",
		Vector2(475, 230),
		func():
			_choose_follow_up(
				"offer_wine"
			)
	)

	_set_follow_up_buttons_visible(false)


func _make_encounter_button(
	button_text: String,
	button_position: Vector2,
	callback: Callable
) -> Button:
	var button = Button.new()
	button.text = button_text
	button.position = button_position
	button.size = Vector2(
		200,
		60
	)
	button.add_theme_font_size_override(
		"font_size",
		18
	)
	button.pressed.connect(
		callback
	)
	encounter_panel.add_child(
		button
	)
	return button


func _create_result_panel():
	result_panel = Panel.new()
	result_panel.name = "ShiftResultPanel"
	result_panel.position = Vector2(
		470,
		205
	)
	result_panel.size = Vector2(
		660,
		430
	)
	result_panel.visible = false
	hud_root.add_child(
		result_panel
	)

	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(
		0.02,
		0.10,
		0.06,
		0.94
	)
	panel_style.border_color = Color(
		0.95,
		0.62,
		0.18,
		1.0
	)
	panel_style.set_border_width_all(4)
	panel_style.set_corner_radius_all(18)
	result_panel.add_theme_stylebox_override(
		"panel",
		panel_style
	)

	result_label = Label.new()
	result_label.position = Vector2(
		35,
		28
	)
	result_label.size = Vector2(
		590,
		300
	)
	result_label.autowrap_mode = \
		TextServer.AUTOWRAP_WORD_SMART
	result_label.add_theme_font_size_override(
		"font_size",
		20
	)
	result_panel.add_child(
		result_label
	)

	result_continue_button = Button.new()
	result_continue_button.name = "ContinueButton"
	result_continue_button.text = "Continue"
	result_continue_button.position = Vector2(
		240,
		360
	)
	result_continue_button.size = Vector2(
		180,
		42
	)
	result_continue_button.pressed.connect(
		_on_result_continue_pressed
	)
	result_panel.add_child(
		result_continue_button
	)


func _on_result_continue_pressed():
	if result_panel == null:
		return

	if not result_panel.visible:
		return

	result_panel.visible = false

	if _has_pending_bottle_rewards():
		_present_next_bottle_reward()
		return

	_set_prompt(
		"Shift summary closed."
	)


# ===================================================================
# HUD updates
# ===================================================================

func update_hud():
	var tier_progress = {
		"ap": ap,
		"ap_required": tier_2_required_ap,
		"tables": completed_guest_services,
		"tables_required": tier_2_required_guest_services,
		"coins": coins,
		"coins_required": tier_2_required_coins,
		"wines": wine_sales_count,
		"wines_required": tier_2_required_wine_sales,
		"station_score": station_interaction_score,
		"station_required": tier_2_required_station_score,
		"goals_met": _count_tier_2_requirements_met(),
		"goals_required": 5,
		"tier_unlocked": _is_tier_2_unlocked()
	}

	var used_progression_controller = false

	if (
		primary_hud_controller != null
		and primary_hud_controller.has_method(
			"update_progression_hud"
		)
	):
		primary_hud_controller.call(
			"update_progression_hud",
			_get_display_level(),
			ap,
			ap_meter_max,
			coins,
			bottle_meter,
			bottle_meter_max,
			elapsed_shift_time,
			tier_progress
		)

		used_progression_controller = true

	if not used_progression_controller:
		if ap_label != null:
			ap_label.text = (
				str(ap)
				+ " / "
				+ str(ap_meter_max)
			)

		if coin_label != null:
			coin_label.text = (
				"Coins: "
				+ str(coins)
			)

		if bottle_label != null:
			bottle_label.text = (
				"Bottles: "
				+ str(bottle_meter)
				+ " / "
				+ str(bottle_meter_max)
			)

		if timer_label != null:
			timer_label.text = (
				"Time: "
				+ _format_time(
					elapsed_shift_time
				)
			)

		if unlock_goal_label != null:
			unlock_goal_label.text = (
				"LEVEL AP   "
				+ str(ap)
				+ " / "
				+ str(tier_2_required_ap)
				+ "\nComplete all five goals to unlock Tier 2."
			)

		if unlock_tables_label != null:
			unlock_tables_label.text = (
				"TABLES   "
				+ str(completed_guest_services)
				+ " / "
				+ str(tier_2_required_guest_services)
			)

		if unlock_coins_label != null:
			unlock_coins_label.text = (
				"COINS   "
				+ str(coins)
				+ " / "
				+ str(tier_2_required_coins)
			)

		if unlock_wines_label != null:
			unlock_wines_label.text = (
				"WINES SOLD   "
				+ str(wine_sales_count)
				+ " / "
				+ str(tier_2_required_wine_sales)
			)

		if unlock_station_label != null:
			unlock_station_label.text = (
				"STATION SCORE   "
				+ str(station_interaction_score)
				+ " / "
				+ str(tier_2_required_station_score)
			)

		if unlock_progress_label != null:
			if _is_tier_2_unlocked():
				unlock_progress_label.text = 					"TIER 2 UNLOCKED"
			else:
				unlock_progress_label.text = (
					"GOALS COMPLETE   "
					+ str(
						_count_tier_2_requirements_met()
					)
					+ " / 5"
				)

	if objective_label != null:
		objective_label.text = (
			"TASK\n"
			+ _get_current_objective()
		)

	if service_label != null:
		service_label.text = (
			"LOCATION\n"
			+ _get_current_location_hint()
		)


func _get_display_level() -> int:
	if _is_tier_2_unlocked():
		return 2

	return current_level


func _update_mise_icon():
	if mise_icon == null:
		return

	var required_count = \
		_count_tables_needing_mise()

	var has_texture = \
		mise_icon.texture != null

	if mise_inventory_filled:
		mise_icon.visible = has_texture

		if mise_fallback_label != null:
			mise_fallback_label.visible = not has_texture
			mise_fallback_label.modulate = Color(
				1,
				1,
				1,
				1
			)

		mise_icon.modulate = Color(
			1,
			1,
			1,
			1
		)

		mise_label.visible = true
		mise_label.text = "MISE EQUIPPED"
		return

	if required_count > 0:
		var pulse = (
			sin(
				elapsed_shift_time * 6.0
			)
			+ 1.0
		) * 0.5

		var alpha = lerp(
			0.28,
			0.72,
			pulse
		)

		mise_icon.visible = has_texture
		mise_icon.modulate = Color(
			1,
			1,
			1,
			alpha
		)

		if mise_fallback_label != null:
			mise_fallback_label.visible = not has_texture
			mise_fallback_label.modulate = Color(
				1,
				1,
				1,
				alpha
			)

		mise_label.visible = true
		mise_label.text = (
			"MISE NEEDED  ×"
			+ str(required_count)
		)
		return

	mise_icon.visible = false

	if mise_fallback_label != null:
		mise_fallback_label.visible = false

	mise_label.visible = false
	mise_label.text = ""


func _count_tables_needing_mise() -> int:
	var count = 0

	for table_id in table_sessions.keys():
		var session = table_sessions[table_id]

		if (
			bool(session["mise_required"])
			and not bool(session["mise_reserved"])
			and not bool(session["mise_set"])
		):
			count += 1

	return count


func _count_tier_2_requirements_met() -> int:
	var met = 0

	if ap >= tier_2_required_ap:
		met += 1

	if completed_guest_services >= tier_2_required_guest_services:
		met += 1

	if coins >= tier_2_required_coins:
		met += 1

	if wine_sales_count >= tier_2_required_wine_sales:
		met += 1

	if station_interaction_score >= tier_2_required_station_score:
		met += 1

	return met


func _is_tier_2_unlocked() -> bool:
	return _count_tier_2_requirements_met() >= 5


func _get_focus_description() -> String:
	if focused_table_id == "":
		return "Choose any waiting table or station"

	if not table_sessions.has(
		focused_table_id
	):
		return focused_table_id

	return (
		focused_table_id
		+ " — "
		+ str(
			table_sessions[
				focused_table_id
			]["phase"]
		).replace("_", " ").capitalize()
	)


func _get_current_location_hint() -> String:
	if encounter_is_open and focused_table_id != "":
		return focused_table_id

	if waiter_carrying == CARRY_BAR_DRINK:
		return carrying_table_id + " table"

	if waiter_carrying == CARRY_FOOD:
		return carrying_table_id + " table"

	if waiter_carrying == CARRY_RECEIPT:
		return carrying_table_id + " table"

	if waiter_carrying == CARRY_DIRTY:
		if scullery_dish_sets >= SCULLERY_MAX_DISH_SETS:
			return "Wait for Scullery capacity"
		return "Scullery Station"

	if pos_receipt_ready:
		return "POS Station → " + pos_receipt_table_id

	if not bar_current_order.is_empty() and bar_order_ready:
		return "Bar Station → " + str(bar_current_order["table_id"])

	if not chef_current_order.is_empty() and chef_order_ready:
		return "Chef Station → " + str(chef_current_order["table_id"])

	if mise_inventory_filled:
		if mise_inventory_table_id != "":
			return mise_inventory_table_id + " table"
		return "Any active table needing Mise"

	if _count_tables_needing_mise() > 0:
		return "Mise en Place Station"

	if focused_table_id != "":
		var phase = str(table_sessions[focused_table_id]["phase"])

		if phase == "order_pending_pos":
			return "POS Station → " + focused_table_id

		if phase == "waiting_for_bar":
			return "Bar Station → " + focused_table_id

		if phase == "waiting_for_food":
			return "Chef Station → " + focused_table_id

		return focused_table_id

	return "Choose a waiting table or needed station"


func _get_carrying_description() -> String:
	var normal_item = "Nothing"

	if waiter_carrying != CARRY_NONE:
		if carrying_table_id == "":
			normal_item = \
				waiter_carrying.replace(
					"_",
					" "
				).capitalize()
		else:
			normal_item = (
				waiter_carrying.replace(
					"_",
					" "
				).capitalize()
				+ " for "
				+ carrying_table_id
			)

	if mise_inventory_filled:
		if normal_item == "Nothing":
			return "Mise — unassigned"

		return (
			normal_item
			+ " + Mise — unassigned"
		)

	return normal_item


func _get_current_objective() -> String:
	if encounter_is_open:
		if encounter_stage == "greeting":
			return "Choose Greet Wine, Greet Aperitif or Greet Food."

		if encounter_stage == "follow_up":
			return "Choose Walk Away, Offer Food or Offer Wine."

	if waiter_carrying == CARRY_BAR_DRINK:
		var drink_objective = (
			"Deliver the "
			+ carrying_drink_type
			+ " to "
			+ carrying_table_id
			+ "."
		)

		if mise_inventory_filled:
			drink_objective += (
				" The equipped Mise can be assigned and laid there with the delivery."
			)

		return drink_objective

	if waiter_carrying == CARRY_FOOD:
		var food_objective = (
			"Deliver the food to "
			+ carrying_table_id
			+ "."
		)

		if mise_inventory_filled:
			food_objective += (
				" The equipped Mise can be assigned and laid there with the delivery."
			)

		return food_objective

	if waiter_carrying == CARRY_DIRTY:
		if scullery_dish_sets >= SCULLERY_MAX_DISH_SETS:
			return "Scullery is full. Keep carrying the plates until one dish set has been cleaned."

		return (
			"Take the dirty plates to Scullery. Capacity: "
			+ str(scullery_dish_sets)
			+ " / "
			+ str(SCULLERY_MAX_DISH_SETS)
			+ ". Equipped Mise does not block this task."
		)

	if waiter_carrying == CARRY_RECEIPT:
		return (
			"Deliver the receipt to "
			+ carrying_table_id
			+ ". Equipped Mise does not block this task."
		)

	if mise_inventory_filled:
		return (
			"Continue any normal task, or click an active table needing Mise to assign it."
		)

	if pos_receipt_ready:
		return (
			"Click POS to collect the receipt for "
			+ pos_receipt_table_id
			+ "."
		)

	if bar_order_ready and not bar_current_order.is_empty():
		return (
			"Collect the "
			+ str(bar_current_order["drink_type"])
			+ " from Bar for "
			+ str(bar_current_order["table_id"])
			+ ". Mise may be assigned before or after collection."
		)

	if chef_order_ready and not chef_current_order.is_empty():
		var chef_table_id = str(
			chef_current_order["table_id"]
		)

		return (
			"Collect the food from Chef for "
			+ chef_table_id
			+ ". Mise is only required when the order is delivered."
		)

	if table_sessions.has(focused_table_id):
		var session = table_sessions[
			focused_table_id
		]
		var phase = str(session["phase"])

		match phase:
			"waiting_to_greet":
				return (
					"Greet "
					+ focused_table_id
					+ "."
				)

			"order_pending_pos":
				return (
					"Enter the order for "
					+ focused_table_id
					+ " at POS."
				)

			"service_active":
				if (
					bool(session["mise_required"])
					and bool(session["mise_reserved"])
					and not bool(session["mise_set"])
				):
					return (
						"Mise is assigned to "
						+ focused_table_id
						+ ". Collect and deliver its food or drink to lay it."
					)

				if (
					bool(session["mise_required"])
					and not bool(session["mise_set"])
				):
					return (
						"Collect and assign Mise to "
						+ focused_table_id
						+ ". Food and drink may be collected first."
					)

				return (
					"Monitor Bar and Chef service for "
					+ focused_table_id
					+ "."
				)

			"ready_to_clear":
				return (
					"Clear "
					+ focused_table_id
					+ "."
				)

			"waiting_for_bill":
				return (
					"Request the bill for "
					+ focused_table_id
					+ " at POS."
				)

			"reset_required":
				return (
					"Click "
					+ focused_table_id
					+ " to perform a Table Reset."
				)

	for table_id in table_sessions.keys():
		var session = table_sessions[table_id]
		var phase = str(session["phase"])

		if phase == "waiting_to_greet":
			return "Choose a newly seated table and greet the guests."

		if phase == "order_pending_pos":
			return "Choose a table with an order and enter it at POS."

		if phase == "ready_to_clear":
			return "Choose a table that is ready to clear."

		if phase == "waiting_for_bill":
			return "Choose a table waiting for its bill, then visit POS."

		if phase == "reset_required":
			return "Click the empty table to perform a Table Reset."

	return "Choose any waiting table or station and keep the shift moving."


func _format_time(
	total_time: float
) -> String:
	var total_seconds = int(
		floor(total_time)
	)
	var minutes = int(
		floor(
			float(total_seconds) / 60.0
		)
	)
	var seconds = total_seconds % 60

	return (
		str(minutes).pad_zeros(2)
		+ ":"
		+ str(seconds).pad_zeros(2)
	)


func _set_prompt(
	message: String
):
	# Prompts remain available in the Output log, while the compact
	# status artwork displays only Task, Location and the Mise alert.
	if prompt_label != null:
		prompt_label.text = message
		prompt_label.visible = false

	print(
		"PROMPT: ",
		message
	)


# ===================================================================
# Shift completion
# ===================================================================

func _finish_shift():
	shift_is_active = false

	if waiter_node != null:
		if waiter_node.has_method(
			"stop_navigation"
		):
			waiter_node.stop_navigation(
				false
			)

	waiter_is_moving = false
	_close_encounter_panel()

	result_label.text = (
		"SHIFT COMPLETE\n\n"
		+ "Guest services: "
		+ str(completed_guest_services)
		+ " / "
		+ str(target_guest_services)
		+ "\n"
		+ "Total time: "
		+ _format_time(elapsed_shift_time)
		+ "\n"
		+ "Wine offers: "
		+ str(wine_offers)
		+ "\n"
		+ "Food offers: "
		+ str(food_offers)
		+ "\n"
		+ "Walk aways: "
		+ str(walk_aways)
		+ "\n"
		+ "Guest annoyance events: "
		+ str(annoyed_guest_events)
		+ "\n"
		+ "Station annoyance events: "
		+ str(annoyed_station_events)
		+ "\n"
		+ "Level AP: "
		+ str(ap)
		+ " / "
		+ str(ap_meter_max)
		+ "\n"
		+ "Shift performance score: "
		+ str(shift_score)
		+ "\n"
		+ "Coins: "
		+ str(coins)
		+ "\n"
		+ "Bottle progress: "
		+ str(bottle_meter)
		+ " / "
		+ str(bottle_meter_max)
		+ "\n"
		+ "Station score: "
		+ str(station_interaction_score)
		+ " / "
		+ str(tier_2_required_station_score)
		+ "\n"
		+ (
			"TIER 2 UNLOCKED"
			if _is_tier_2_unlocked()
			else "Tier 2 requirements incomplete"
		)
		+ "
"
		+ "Current title: "
		+ (
			equipped_title
			if equipped_title != ""
			else "None"
		)
	)

	result_panel.visible = true

	if _has_pending_bottle_rewards():
		_set_prompt(
			"Shift complete. Press Continue to view your bottle reward."
		)
	else:
		_set_prompt(
			"Shift complete in "
			+ _format_time(elapsed_shift_time)
			+ "."
		)
