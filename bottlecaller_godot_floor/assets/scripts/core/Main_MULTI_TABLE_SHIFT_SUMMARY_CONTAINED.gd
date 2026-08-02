extends Node2D


const GUEST_PARTY_SCENE = preload(
	"res://assets/scene/characters/GuestParty.tscn"
)


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
@onready var characters_container = $RestaurantFloor/Characters
@onready var guest_entrance = $RestaurantFloor/GuestEntrance
@onready var waiter_node = $Waiter
@onready var shift_service_system = $ShiftServiceSystem


# -------------------------------------------------------------------
# Guest queue and table-slot configuration
# -------------------------------------------------------------------

@export_category("Guest Shift Queue")

## Assign the five resources in this exact intended shift order:
## 1. Window Date (blonde_date)
## 2. Known Regular (african_older_gentleman)
## 3. Guarded Reader (skeptic_reader)
## 4. Precision Guest (skeptic_v1)
## 5. Regular Couple (african_regular_table)
## Kept untyped deliberately so restored or re-saved GuestTableProfile
## .tres resources can be assigned even when Godot's global class cache
## has changed after controller cleanup.
## A new property name deliberately avoids stale typed-array metadata
## previously serialized in main.tscn.
@export var guest_profile_resources: Array[Resource] = []

@export_range(1, 20, 1)
var target_guest_services = 5

## The first guest party appears immediately. The second appears later,
## creating the first overlapping service without bypassing table readiness.
@export_range(0.1, 60.0, 0.1)
var second_guest_arrival_delay = 8.0

## Fallback delay if an outgoing guest party cannot be animated.
@export_range(0.1, 30.0, 0.1)
var guest_leave_delay = 3.0

## Guests remain visible at the entrance before an automatic walk can begin.
@export_range(0.5, 5.0, 0.1)
var guest_entrance_pause = 1.5

## Separates couple footsteps and animation phases so both people do not
## move as one duplicated sprite.
@export_range(0.0, 1.0, 0.01)
var couple_follow_delay = 0.20

const GUEST_ENTRANCE_SLOT_OFFSETS = [
	Vector2.ZERO,
	Vector2(-78.0, 30.0),
	Vector2(78.0, 30.0)
]


# -------------------------------------------------------------------
# Guest and service timing
# -------------------------------------------------------------------

@export_category("Guest Timing")

@export_range(0.1, 30.0, 0.1)
var table_enjoy_seconds = 5.0

## After food + all ordered drinks are served, guests drink before ready-to-clear.
@export_range(0.1, 60.0, 0.1)
var table_drinking_seconds = 8.0


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
var bar_annoyed_seconds = 5.0

## Extra delay after the neutral Bar warning before the annoyed icon/state.
@export_range(0.1, 30.0, 0.1)
var bar_unhappy_delay = 4.0

@export_range(0.1, 30.0, 0.1)
var chef_annoyed_seconds = 6.0

## Extra delay after the neutral Chef warning before the annoyed icon/state.
@export_range(0.1, 30.0, 0.1)
var chef_unhappy_delay = 4.0

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
var weak_wine_sale_coin_reward = 3

@export_range(0, 100, 1)
var premium_wine_sale_coin_reward = 8

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
var coins_at_shift_start = 0
var bottle_meter = 0
var bottle_meter_max = 5

const SKILL_UNLOCK_FOOD_RECOVERY = "food_recovery_1"
const SKILL_UNLOCK_APERITIF_CONVERSION = "aperitif_conversion_1"

var player_authority_snapshot_applied = false
var profile_authority_points_at_shift_start = 0
var profile_tier = 1
var profile_ap_tier_unlocked = 1
var profile_rules_tier_to_serve = 1
var unlocked_skill_ids: Array[String] = []
var profile_skill_measurements: Dictionary = {}
var shift_run_id = ""
var processed_v2_result_ids: Dictionary = {}
var v2_authority_delta_total = 0
var interaction_authority_events: Array = []

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

## When embedded in the BottleCaller web app, Offer Wine pauses the
## floor and hands the matching guest into the V2 encounter harness.
var waiting_for_v2_encounter = false
var pending_v2_table_id = ""
var pending_v2_guest_reply = ""
var bridge_controller: Node = null


# -------------------------------------------------------------------
# Table sessions and guest arrivals
# -------------------------------------------------------------------

var table_slots: Array = []
var table_by_id: Dictionary = {}
var table_sessions: Dictionary = {}

var next_guest_profile_index = 0
var scheduled_events: Array = []
var guest_parties_by_id: Dictionary = {}
var guest_party_id_by_table: Dictionary = {}
var departing_guest_parties_by_id: Dictionary = {}
var departing_guest_party_id_by_table: Dictionary = {}
var next_guest_party_serial = 1


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
const CARRY_PAYMENT = "payment"

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
var station_speech_last_time: Dictionary = {}

const STATION_ATTENTION_TEXTURE = preload(
	"res://assets/icons/bottlecaller_tier1_icons_exact_rgba/icon_exclamation.png"
)

var bar_queue: Array = []
var bar_current_order: Dictionary = {}
var bar_order_ready = false

var chef_queue: Array = []
var chef_current_order: Dictionary = {}
var chef_order_ready = false

# -------------------------------------------------------------------
# Timers
# -------------------------------------------------------------------

var bar_ready_timer: Timer
var bar_annoyed_timer: Timer
var bar_unhappy_timer: Timer
var chef_ready_timer: Timer
var chef_annoyed_timer: Timer
var chef_unhappy_timer: Timer
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

	_configure_shift_service_system()
	_connect_web_bridge()
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


func _connect_web_bridge():
	bridge_controller = get_node_or_null("BridgeController")
	if bridge_controller == null:
		return

	if bridge_controller.has_signal("v2_result_received"):
		bridge_controller.v2_result_received.connect(
			_on_bridge_v2_result_received
		)

	if bridge_controller.has_signal("host_ready"):
		bridge_controller.host_ready.connect(
			_on_bridge_host_ready
		)


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
	shift_service_system.consume_real_elapsed(delta)

	_process_scheduled_events()
	_update_guest_arrivals()
	_update_mise_icon()
	update_hud()


func _configure_shift_service_system() -> void:
	if shift_service_system == null:
		push_error("MAIN COULD NOT FIND ShiftServiceSystem.")
		return

	shift_service_system.configure_shift_clock(_advance_shift_clock)
	shift_service_system.table_patience_breached.connect(
		_on_table_patience_breached
	)
	shift_service_system.walk_away_selected.connect(
		_on_walk_away_selected
	)


func _advance_shift_clock(seconds: float) -> void:
	if seconds < 0.0:
		push_warning("Cannot move the shift clock backwards.")
		return
	elapsed_shift_time += seconds


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
		shift_service_system.register_table(table)

		if table.has_method("set_attention_texture"):
			table.set_attention_texture(
				STATION_ATTENTION_TEXTURE
			)

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

		if station.has_method("set_attention_texture"):
			station.set_attention_texture(
				STATION_ATTENTION_TEXTURE
			)

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

	_refresh_station_attention_alerts()


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
	for table_index in range(table_slots.size()):
		var table = table_slots[table_index]
		var table_id = str(table.get_table_id())

		table_sessions[table_id] = \
			_create_ready_table_session(table)

		# Reserve the first guest assigned to each physical slot so its
		# guest-specific empty-table artwork is present before entry.
		if table_index < guest_profile_resources.size():
			_prepare_table_for_profile(
				table,
				guest_profile_resources[table_index]
			)

		if table.has_method("set_ready_for_guests"):
			table.set_ready_for_guests()
		elif table.has_method("set_empty"):
			table.set_empty()

		if table.has_method("set_status_text"):
			table.set_status_text(
				"Ready for guests"
			)


func _prepare_table_for_profile(table, profile) -> bool:
	if not is_instance_valid(table) or profile == null:
		return false

	if not table.has_method("apply_guest_profile"):
		push_warning(
			"TABLE CANNOT LOAD ASSIGNED GUEST PROFILE: "
			+ str(table)
		)
		return false

	return bool(table.apply_guest_profile(profile, false))


func _create_ready_table_session(table) -> Dictionary:
	return {
		"table": table,
		"table_id": str(table.get_table_id()),
		"profile": null,
		"guest_id": "",
		"phase": "ready_for_guests",

		"greeting_choice": "",
		"follow_up_choice": "",
		"object_path_kind": "",
		"object_success": false,
		"aperitif_opportunity_used": false,
		"greeting_accepted": false,
		"greeting_recovered": false,
		"allowed_follow_ups": [],
		"required_skill_id": "",

		"food_ordered": false,
		"wine_ordered": false,
		"aperitif_ordered": false,
		"wine_delivered": false,
		"aperitif_delivered": false,
		"wine_sale_counted": false,
		"wine_sale_pending": false,
		"wine_coin_reward_pending": 0,
		"v2_result_id": "",
		"v2_outcome": "",
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
		"paid": false,

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

	# The first party appears at the entrance immediately. Because its
	# assigned table is already open, it walks there automatically after
	# the entrance pause.
	_spawn_next_guest_for_table(table_slots[0])

	# The second party enters later but is still assigned deliberately to
	# the second physical slot. Seating never chooses a table merely because
	# a repeating timer fired.
	if (
		target_guest_services > 1
		and table_slots.size() > 1
	):
		_schedule_event(
			"spawn_guest",
			str(table_slots[1].get_table_id()),
			second_guest_arrival_delay
		)


func _spawn_next_guest_for_table(table) -> bool:
	if next_guest_profile_index >= target_guest_services:
		return false

	if next_guest_profile_index >= guest_profile_resources.size():
		return false

	var table_id = str(table.get_table_id())
	if guest_party_id_by_table.has(table_id):
		return false

	var profile_index = next_guest_profile_index
	var profile = guest_profile_resources[profile_index]
	if (
		profile == null
		or not profile.has_method("get_greeting_response")
	):
		push_warning(
			"INVALID GUEST PROFILE AT QUEUE INDEX: "
			+ str(profile_index)
		)
		next_guest_profile_index += 1
		return false

	var character_asset_key = str(
		profile.get("floor_character_key")
	).strip_edges()
	if character_asset_key == "":
		push_warning(
			"GUEST PROFILE HAS NO FLOOR CHARACTER KEY: "
			+ str(profile.guest_id)
		)
		return false

	# The table belongs on the floor before this party appears at the
	# entrance. Applying a profile without seating keeps its empty art.
	if not _prepare_table_for_profile(table, profile):
		return false

	var party_id = (
		"guest_party_"
		+ str(next_guest_party_serial)
	)
	var party = GUEST_PARTY_SCENE.instantiate()
	characters_container.add_child(party)
	party.couple_follow_delay = couple_follow_delay

	var entrance_position = _next_guest_entrance_position()
	if not party.configure(
		party_id,
		table_id,
		profile,
		profile_index,
		character_asset_key,
		entrance_position
	):
		party.queue_free()
		return false

	party.party_selected.connect(_on_guest_party_selected)
	party.party_arrived.connect(_on_guest_party_arrived)
	party.party_walk_failed.connect(_on_guest_party_walk_failed)
	party.set_selectable(false)

	var requires_player_seating = \
		not _is_table_open_for_guest(table_id)
	guest_parties_by_id[party_id] = {
		"party": party,
		"party_id": party_id,
		"table_id": table_id,
		"profile": profile,
		"guest_index": profile_index,
		"state": "waiting",
		"ready_time": elapsed_shift_time + guest_entrance_pause,
		"requires_player_seating": requires_player_seating
	}
	guest_party_id_by_table[table_id] = party_id
	next_guest_profile_index += 1
	next_guest_party_serial += 1

	_set_prompt(
		str(profile.guest_display_name)
		+ " has arrived at the entrance."
	)
	return true


func _next_guest_entrance_position() -> Vector2:
	var waiting_count = 0
	for record in guest_parties_by_id.values():
		if str(record.get("state", "")) == "waiting":
			waiting_count += 1

	var slot_count = GUEST_ENTRANCE_SLOT_OFFSETS.size()
	var slot_index = waiting_count % slot_count
	var queue_row = waiting_count / slot_count
	return (
		guest_entrance.global_position
		+ GUEST_ENTRANCE_SLOT_OFFSETS[slot_index]
		+ Vector2(0.0, -float(queue_row) * 70.0)
	)


func _update_guest_arrivals():
	for party_id in guest_parties_by_id.keys():
		var record: Dictionary = guest_parties_by_id[party_id]
		if str(record.get("state", "")) != "waiting":
			continue

		var party = record.get("party")
		if not is_instance_valid(party):
			continue

		if elapsed_shift_time < float(record.get("ready_time", 0.0)):
			party.set_selectable(false)
			continue

		var table_id = str(record.get("table_id", ""))
		if not _is_table_open_for_guest(table_id):
			party.set_selectable(false)
			continue

		if bool(record.get("requires_player_seating", false)):
			party.set_selectable(true)
		else:
			_start_guest_party_walk(str(party_id))


func _is_table_open_for_guest(table_id: String) -> bool:
	if not table_sessions.has(table_id):
		return false

	var session: Dictionary = table_sessions[table_id]
	return (
		str(session.get("phase", "")) == "ready_for_guests"
		and session.get("profile", null) == null
	)


func _on_guest_party_selected(
	party_id: String,
	table_id: String
):
	if not guest_parties_by_id.has(party_id):
		return

	if not _is_table_open_for_guest(table_id):
		var phase = "unavailable"
		if table_sessions.has(table_id):
			phase = str(table_sessions[table_id].get("phase", phase))
		_set_prompt(
			"The assigned table is not open yet: "
			+ phase.replace("_", " ")
			+ "."
		)
		return

	_start_guest_party_walk(party_id)


func _start_guest_party_walk(party_id: String) -> bool:
	if not guest_parties_by_id.has(party_id):
		return false

	var record: Dictionary = guest_parties_by_id[party_id]
	if str(record.get("state", "")) != "waiting":
		return false

	var table_id = str(record.get("table_id", ""))
	if not _is_table_open_for_guest(table_id):
		return false

	var table = table_by_id.get(table_id)
	var party = record.get("party")
	if not is_instance_valid(table) or not is_instance_valid(party):
		return false

	var session: Dictionary = table_sessions[table_id]
	session["phase"] = "guest_walking_to_table"
	session["profile"] = record["profile"]
	session["guest_id"] = record["profile"].guest_id
	session["guest_index"] = int(record["guest_index"])
	table_sessions[table_id] = session

	record["state"] = "walking"
	guest_parties_by_id[party_id] = record
	party.set_selectable(false)

	var target_position = table.global_position
	if table.has_method("get_interaction_position"):
		target_position = table.get_interaction_position()

	party.begin_walk(target_position)
	_refresh_table_status(table_id)
	_set_prompt(
		str(record["profile"].guest_display_name)
		+ " is walking to "
		+ table_id
		+ "."
	)
	return true


func _on_guest_party_arrived(
	party_id: String,
	table_id: String
):
	if not guest_parties_by_id.has(party_id):
		return

	var record: Dictionary = guest_parties_by_id[party_id]
	var profile = record.get("profile")
	var table = table_by_id.get(table_id)
	var party = record.get("party")
	if profile == null or not is_instance_valid(table):
		return

	if table.has_method("apply_guest_profile"):
		table.apply_guest_profile(profile, false)
	if table.has_method("seat_guests"):
		table.seat_guests()

	table_sessions[table_id] = _create_active_guest_session(
		table,
		profile,
		int(record.get("guest_index", -1))
	)
	shift_service_system.start_table_patience(
		StringName(table_id),
		&"waiting_first_greeting"
	)
	guest_parties_by_id.erase(party_id)
	guest_party_id_by_table.erase(table_id)
	if is_instance_valid(party):
		party.queue_free()

	_set_prompt(
		str(profile.guest_display_name)
		+ " is seated at "
		+ table_id
		+ "."
	)
	_refresh_table_status(table_id)


func _on_guest_party_walk_failed(
	party_id: String,
	table_id: String,
	reason: String
):
	if not guest_parties_by_id.has(party_id):
		return

	var record: Dictionary = guest_parties_by_id[party_id]
	record["state"] = "waiting"
	record["requires_player_seating"] = true
	record["ready_time"] = elapsed_shift_time
	guest_parties_by_id[party_id] = record

	if table_by_id.has(table_id):
		var table = table_by_id[table_id]
		table_sessions[table_id] = _create_ready_table_session(table)
		if table.has_method("set_ready_for_guests"):
			table.set_ready_for_guests()

	_set_prompt(
		"Guests could not reach "
		+ table_id
		+ ". Select them to retry. "
		+ reason
	)
	_refresh_table_status(table_id)


func _create_active_guest_session(
	table,
	profile,
	profile_index = -1
) -> Dictionary:
	var resolved_profile_index = int(profile_index)
	if resolved_profile_index < 0:
		resolved_profile_index = max(next_guest_profile_index - 1, 0)

	return {
		"table": table,
		"table_id": str(table.get_table_id()),
		"profile": profile,
		"guest_id": profile.guest_id,
		"guest_index": resolved_profile_index,
		"phase": "waiting_to_greet",

		"greeting_choice": "",
		"follow_up_choice": "",
		"object_path_kind": "",
		"object_success": false,
		"aperitif_opportunity_used": false,
		"greeting_accepted": false,
		"greeting_recovered": false,
		"allowed_follow_ups": [],
		"required_skill_id": "",

		"food_ordered": false,
		"wine_ordered": false,
		"aperitif_ordered": false,
		"wine_delivered": false,
		"aperitif_delivered": false,
		"wine_sale_counted": false,
		"wine_sale_pending": false,
		"wine_coin_reward_pending": 0,
		"v2_result_id": "",
		"v2_outcome": "",
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
		"paid": false,

		"floor_dialogue_count": 0,
		"floor_dialogue_last_time": -999.0,

		"last_progress_time": elapsed_shift_time,
		"mood_state": "happy",
		"annoyed": false
	}


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
		"spawn_guest":
			if not table_by_id.has(table_id):
				return true
			if (
				next_guest_profile_index >= target_guest_services
				or next_guest_profile_index >= guest_profile_resources.size()
				or guest_party_id_by_table.has(table_id)
			):
				return true
			return _spawn_next_guest_for_table(
				table_by_id[table_id]
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


func _face_waiter_toward_node(target_node) -> void:
	if waiter_node == null or target_node == null:
		return
	if not waiter_node.has_method("face_towards"):
		return

	var look_at = target_node.global_position
	if target_node.has_method("get_guest_head_anchor_global"):
		look_at = target_node.get_guest_head_anchor_global()
	elif target_node.has_method("get_interaction_position"):
		# Stations: face the station body, not the stand-point.
		look_at = target_node.global_position

	waiter_node.face_towards(look_at, true)


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
	_face_waiter_toward_node(session.get("table", null))

	# A normally carried item must return to its assigned table.
	if waiter_carrying != CARRY_NONE:
		if carrying_table_id != table_id:
			var owned_item := "Item"
			if waiter_carrying == CARRY_BAR_DRINK and carrying_drink_type != "":
				owned_item = carrying_drink_type.capitalize()
			elif waiter_carrying == CARRY_FOOD:
				owned_item = "Food"
			elif waiter_carrying == CARRY_RECEIPT:
				owned_item = "Bill"
			elif waiter_carrying == CARRY_PAYMENT:
				owned_item = "Payment"
			elif waiter_carrying == CARRY_DIRTY:
				owned_item = "Dirty plates"
			_set_prompt(
				owned_item
				+ " belongs to "
				+ carrying_table_id
				+ ". Deliver it there first."
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
				_deliver_bill_and_take_payment(
					table_id
				)
			CARRY_PAYMENT:
				_set_prompt(
					"Return the payment to POS and close the bill."
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

		"drinking":
			if _table_has_outstanding_bar_work(table_id):
				session["phase"] = "eating"
				table_sessions[table_id] = session
				_refresh_table_status(table_id)
				_schedule_event(
					"enjoy_complete",
					table_id,
					1.0
				)
				_set_prompt(
					table_id
					+ " still needs its Bar drink. Collect it and deliver before clearing."
				)
			else:
				_set_prompt(
					"The guests are drinking. Wait before clearing."
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

		"waiting_for_bill_close":
			_set_prompt(
				"Return the payment for "
				+ table_id
				+ " to POS and close the bill."
			)

		"leaving":
			_set_prompt(
				"The guests are walking back to the BottleCaller entrance."
			)

		"reset_required":
			_reset_empty_table(
				table_id
			)

		"ready_for_guests":
			_set_prompt(
				"This table is reset and ready for the next guests."
			)

		"guest_walking_to_table":
			_set_prompt(
				"The assigned guests are walking to this table."
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
	# Aperitif is a once-per-table opening, whether accepted or rejected.
	if bool(session.get("aperitif_opportunity_used", false)):
		greet_aperitif_button.visible = false
	_set_follow_up_buttons_visible(false)

	_position_encounter_panel_above_table(table)
	encounter_panel.visible = true

	_set_prompt(
		"Read the table and choose how to greet them."
	)


func _evaluate_object_path(
	greeting: String,
	offer: String
) -> Dictionary:
	# Mirrors Vite guestProfiles.evaluateObjectPath:
	# food↔food, wine↔wine, aperitif once then convert via offer.
	if offer == "walk_away":
		return {
			"kind": "walk_away",
			"object_success": false,
			"aperitif_opportunity_used": false,
		}

	if greeting == "greet_aperitif":
		return {
			"kind": "aperitif",
			"object_success": (
				offer == "offer_food"
				or offer == "offer_wine"
			),
			"aperitif_opportunity_used": true,
		}

	if greeting == "greet_food" and offer == "offer_food":
		return {
			"kind": "food",
			"object_success": true,
			"aperitif_opportunity_used": false,
		}

	if greeting == "greet_wine" and offer == "offer_wine":
		return {
			"kind": "wine",
			"object_success": true,
			"aperitif_opportunity_used": false,
		}

	return {
		"kind": "mismatch",
		"object_success": false,
		"aperitif_opportunity_used": false,
	}


func _has_skill_unlock(skill_id: String) -> bool:
	return unlocked_skill_ids.has(skill_id)


func _get_session_guest_type(session: Dictionary) -> String:
	var profile = session.get("profile", null)
	if profile == null:
		return ""
	return str(profile.guest_type).strip_edges().to_lower()


func _get_greeting_access(
	session: Dictionary,
	choice: String
) -> Dictionary:
	var guest_type = _get_session_guest_type(session)

	if choice == "greet_wine":
		return {
			"accepted": true,
			"recovered": false,
			"allowed_follow_ups": ["offer_wine"],
			"required_skill_id": "",
			"reason": "wine_greeting_opens_wine_offer",
		}

	if choice == "greet_food":
		if guest_type == "regular":
			return {
				"accepted": true,
				"recovered": false,
				"allowed_follow_ups": ["offer_food"],
				"required_skill_id": "",
				"reason": "regular_accepts_food_greeting",
			}

		var food_recovered = (
			profile_tier >= 2
			and _has_skill_unlock(SKILL_UNLOCK_FOOD_RECOVERY)
		)
		return {
			"accepted": food_recovered,
			"recovered": food_recovered,
			"allowed_follow_ups": (
				["offer_food"] if food_recovered else []
			),
			"required_skill_id": SKILL_UNLOCK_FOOD_RECOVERY,
			"reason": (
				"food_recovery_unlocked"
				if food_recovered
				else "guest_rejects_food_greeting"
			),
		}

	if choice == "greet_aperitif":
		if guest_type == "tourist":
			return {
				"accepted": true,
				"recovered": false,
				"allowed_follow_ups": [
					"offer_food",
					"offer_wine",
				],
				"required_skill_id": "",
				"reason": "tourist_accepts_aperitif_greeting",
			}

		var aperitif_recovered = (
			profile_tier >= 2
			and _has_skill_unlock(
				SKILL_UNLOCK_APERITIF_CONVERSION
			)
		)
		return {
			"accepted": aperitif_recovered,
			"recovered": aperitif_recovered,
			"allowed_follow_ups": (
				["offer_food", "offer_wine"]
				if aperitif_recovered
				else []
			),
			"required_skill_id": SKILL_UNLOCK_APERITIF_CONVERSION,
			"reason": (
				"aperitif_conversion_unlocked"
				if aperitif_recovered
				else "guest_rejects_aperitif_greeting"
			),
		}

	return {
		"accepted": false,
		"recovered": false,
		"allowed_follow_ups": [],
		"required_skill_id": "",
		"reason": "unknown_greeting",
	}


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

	# A completed aperitif conversion may occur only once per table.
	if (
		choice == "greet_aperitif"
		and bool(session.get("aperitif_opportunity_used", false))
	):
		_set_prompt(
			"This table already used its aperitif opportunity."
		)
		return

	session["greeting_choice"] = choice
	var access = _get_greeting_access(session, choice)
	session["greeting_accepted"] = bool(
		access.get("accepted", false)
	)
	session["greeting_recovered"] = bool(
		access.get("recovered", false)
	)
	session["allowed_follow_ups"] = access.get(
		"allowed_follow_ups",
		[]
	)
	session["required_skill_id"] = str(
		access.get("required_skill_id", "")
	)
	table_sessions[encounter_table_id] = session

	interaction_authority_events.append({
		"tableId": encounter_table_id,
		"guestId": str(session.get("guest_id", "")),
		"guestType": _get_session_guest_type(session),
		"greeting": choice,
		"accepted": bool(session["greeting_accepted"]),
		"recovered": bool(session["greeting_recovered"]),
		"requiredSkillId": str(session["required_skill_id"]),
		"profileTier": profile_tier,
	})

	_apply_fixed_action(
		&"greeting",
		StringName(encounter_table_id)
	)
	shift_service_system.apply_greeting_recovery(
		StringName(encounter_table_id),
		bool(session["greeting_accepted"])
		or bool(session["greeting_recovered"])
	)
	_sync_session_patience_mood(encounter_table_id)

	if table.has_method("set_deciding"):
		table.set_deciding()

	encounter_response_label.text = \
		_get_profile_greeting_response(
			profile,
			choice
		)
	if bool(session["greeting_recovered"]):
		encounter_response_label.text += (
			" You recover the opening and keep the relevant offer available."
		)
	elif not bool(session["greeting_accepted"]):
		if choice == "greet_aperitif":
			session["aperitif_opportunity_used"] = true
			session["greeting_choice"] = ""
			session["allowed_follow_ups"] = []
			table_sessions[encounter_table_id] = session

			encounter_response_label.text += (
				" They decline the aperitif. Continue with a food or wine greeting."
			)
			encounter_stage = "greeting"
			shift_service_system.change_table_patience_stage(
				StringName(encounter_table_id),
				&"waiting_first_greeting"
			)
			_sync_session_patience_mood(encounter_table_id)
			_set_greeting_buttons_visible(true)
			greet_aperitif_button.visible = false
			_set_follow_up_buttons_visible(false)
			_mark_table_progress(encounter_table_id)
			_set_prompt(
				"The aperitif was declined. Choose Greet Food or Greet Wine."
			)
			return

		encounter_response_label.text += (
			" They do not engage with that opening. Step away and return later."
		)

	encounter_stage = "follow_up"

	_set_greeting_buttons_visible(false)
	_set_follow_up_buttons_visible(false)
	walk_away_button.visible = true
	var allowed_follow_ups: Array = session.get(
		"allowed_follow_ups",
		[]
	)
	offer_food_button.visible = allowed_follow_ups.has(
		"offer_food"
	)
	offer_wine_button.visible = allowed_follow_ups.has(
		"offer_wine"
	)

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
	var allowed_follow_ups: Array = session.get(
		"allowed_follow_ups",
		[]
	)

	if (
		choice != "walk_away"
		and not allowed_follow_ups.has(choice)
	):
		_set_prompt(
			"That offer is not available from this greeting."
		)
		return

	session["follow_up_choice"] = choice

	var path = _evaluate_object_path(
		str(session.get("greeting_choice", "")),
		choice
	)
	session["object_path_kind"] = str(path.get("kind", ""))
	session["object_success"] = bool(path.get("object_success", false))
	if (
		bool(session.get("greeting_recovered", false))
		and allowed_follow_ups.has(choice)
	):
		session["object_path_kind"] = "skill_recovery"
		session["object_success"] = true
	if bool(path.get("aperitif_opportunity_used", false)):
		session["aperitif_opportunity_used"] = true

	# Object-path beat: sparse guest bubble from depiction + path outcome.
	_maybe_show_table_guest_dialogue(
		table_id,
		"positive" if bool(session["object_success"]) else "negative",
		false
	)

	var action_id = StringName(choice)
	_apply_fixed_action(action_id, StringName(table_id))
	if choice != "walk_away":
		shift_service_system.restore_table_patience(
			StringName(table_id),
			action_id
		)
		_sync_session_patience_mood(table_id)

	var guest_reply = \
		_get_profile_follow_up_response(
			profile,
			choice
		)

	if (
		choice != "walk_away"
		and not bool(session["object_success"])
		and str(session.get("object_path_kind", "")) == "mismatch"
	):
		guest_reply = (
			"That does not quite follow from how you greeted us. "
			+ guest_reply
		)

	if choice == "walk_away":
		walk_aways += 1
		session["phase"] = "waiting_to_greet"
		table_sessions[table_id] = session

		if table.has_method("resume_waiting_to_greet"):
			table.resume_waiting_to_greet("Browsing — return later")

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

		# Embedded web flow: hand the matching guest into V2, then resume.
		if _begin_v2_wine_offer(
			table_id,
			session,
			guest_reply
		):
			return

		session["wine_ordered"] = true

		# Greet Aperitif + Offer Wine means all three:
		# aperitif first, wine second, plus food from Chef.
		if session["greeting_choice"] == "greet_aperitif":
			session["aperitif_ordered"] = true

	_complete_follow_up_order(
		table_id,
		session,
		guest_reply
	)


func _resolve_party_shape(
	explicit_shape: String,
	guest_id: String,
	guest_hint: String
) -> String:
	var normalised = str(explicit_shape).strip_edges().to_lower()
	if normalised == "single" or normalised == "couple":
		return normalised

	var blob = (
		str(guest_id)
		+ " "
		+ str(guest_hint)
	).to_lower()

	if (
		"couple" in blob
		or "date" in blob
		or "two of us" in blob
		or "together" in blob
	):
		return "couple"

	return "single"


func _get_floor_dialogue_line(
	table_id: String,
	tone: String
) -> String:
	if not table_sessions.has(table_id):
		return ""

	var session = table_sessions[table_id]
	var profile = session.get("profile", null)
	var guest_type = "tourist"
	var party_shape = "single"
	var guest_id = str(session.get("guest_id", ""))
	var depiction = ""

	if profile != null:
		guest_type = str(profile.guest_type)
		depiction = str(profile.guest_hint)
		party_shape = _resolve_party_shape(
			str(profile.party_shape),
			guest_id,
			depiction
		)

	var positive: bool = tone == "positive"
	var couple: bool = party_shape == "couple"
	var depiction_l = depiction.to_lower()

	# Depiction-aware overrides (same seeds as Vite guestProfiles).
	if guest_id == "blonde_date" or depiction_l.find("window") >= 0 or depiction_l.find("date") >= 0:
		if positive:
			if couple:
				return "This already feels special."
			return "This already feels special for me."
		if couple:
			return "That pulled us out of the moment."
		return "That pulled me out of the moment."
	if guest_id == "african_older_gentleman" or depiction_l.find("known african regular") >= 0:
		if positive:
			return "Yes — that is my lane."
		return "Not my usual standard."
	if guest_id == "skeptic_reader" or depiction_l.find("bookish") >= 0 or depiction_l.find("guarded") >= 0:
		if positive:
			return "One clear reason. Good."
		return "That was not precise enough."
	if guest_id == "skeptic_v1" or depiction_l.find("precision") >= 0:
		if positive:
			return "Alright. That actually fits."
		return "Don't guess."
	if guest_id == "african_regular_table" or depiction_l.find("regular couple") >= 0:
		if positive:
			return "You know our bottle."
		return "That is not our bottle."

	match guest_type:
		"tourist":
			if positive:
				if couple:
					return "This already feels more local."
				return "This already feels more local for me."
			if couple:
				return "That was a bit much for us."
			return "That was a bit much for me."
		"regular":
			if positive:
				if couple:
					return "Yes — that is our lane."
				return "Yes — that is my lane."
			if couple:
				return "Not our usual standard."
			return "Not my usual standard."
		"skeptic":
			if positive:
				return "Alright. That actually fits."
			return "That did not make sense."
		_:
			if positive:
				return "Thank you."
			return "Hmm."


func _maybe_show_table_guest_dialogue(
	table_id: String,
	tone: String,
	force: bool = false
) -> bool:
	if not table_sessions.has(table_id):
		return false

	var session = table_sessions[table_id]
	var table = session.get("table", null)
	if table == null or not table.has_method("show_guest_speech"):
		return false

	var count = int(session.get("floor_dialogue_count", 0))
	var last_time = float(session.get("floor_dialogue_last_time", -999.0))

	# Sparse: at most one spontaneous bubble every ~18s unless forced.
	if not force and count > 0 and (elapsed_shift_time - last_time) < 18.0:
		return false

	# Cap chatter — still allow a forced closing beat.
	if not force and count >= 2:
		return false

	var line = _get_floor_dialogue_line(table_id, tone)
	if line == "":
		return false

	table.show_guest_speech(line)
	session["floor_dialogue_count"] = count + 1
	session["floor_dialogue_last_time"] = elapsed_shift_time
	table_sessions[table_id] = session
	return true


func _ensure_table_had_guest_dialogue(
	table_id: String
) -> void:
	if not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]
	if int(session.get("floor_dialogue_count", 0)) > 0:
		return

	var tone = "positive"
	if bool(session.get("annoyed", false)) or bool(session.get("had_guest_unhappy", false)):
		tone = "negative"
	elif not bool(session.get("object_success", true)):
		tone = "negative"

	_maybe_show_table_guest_dialogue(table_id, tone, true)


func _get_station_mood_state(station_id: String) -> String:
	if not station_by_id.has(station_id):
		return "happy"

	var station = station_by_id[station_id]
	if station == null:
		return "happy"

	if station.has_method("get_mood_state"):
		return str(station.get_mood_state())

	return "happy"


func _get_station_speech_line(
	station_id: String,
	tone: String
) -> String:
	var positive: bool = tone == "positive"

	match station_id:
		"bar":
			if positive:
				return "Good timing — take it."
			return "Don't leave drinks waiting."
		"chef":
			if positive:
				return "Hot and ready — nice."
			return "Food's waiting on you."
		_:
			if positive:
				return "Good timing."
			return "You're late."


func _maybe_show_station_speech(
	station_id: String,
	tone: String,
	force: bool = false
) -> bool:
	if station_id != "bar" and station_id != "chef":
		return false

	if not station_by_id.has(station_id):
		return false

	var station = station_by_id[station_id]
	if station == null or not station.has_method("show_station_speech"):
		return false

	if not force:
		var last_key = station_id + ":" + tone
		var last_time = float(
			station_speech_last_time.get(last_key, -999.0)
		)
		if elapsed_shift_time - last_time < 10.0:
			return false

	var line = _get_station_speech_line(station_id, tone)
	if line == "":
		return false

	station.show_station_speech(line)
	station_speech_last_time[station_id + ":" + tone] = elapsed_shift_time
	return true


func _bridge_is_embedded() -> bool:
	return (
		bridge_controller != null
		and bridge_controller.has_method("is_embedded")
		and bool(bridge_controller.is_embedded())
	)


func _begin_v2_wine_offer(
	table_id: String,
	session: Dictionary,
	guest_reply: String
) -> bool:
	if not _bridge_is_embedded():
		return false

	if waiting_for_v2_encounter:
		return true

	var profile = session.get("profile", null)
	var guest_id = str(session.get("guest_id", ""))
	if guest_id == "" and profile != null:
		guest_id = str(profile.guest_id)

	var guest_display_name = ""
	if profile != null:
		guest_display_name = str(profile.guest_display_name)

	waiting_for_v2_encounter = true
	pending_v2_table_id = table_id
	pending_v2_guest_reply = guest_reply
	table_sessions[table_id] = session
	shift_service_system.set_table_patience_paused(
		StringName(table_id),
		true
	)

	_close_encounter_panel()
	_set_prompt(
		"Opening the wine encounter for "
		+ (
			guest_display_name
			if guest_display_name != ""
			else "this guest"
		)
		+ "..."
	)

	if bridge_controller.has_method("emit_offer_wine"):
		var guest_type = ""
		var party_shape = "single"
		var guest_hint = ""
		if profile != null:
			guest_type = str(profile.guest_type)
			guest_hint = str(profile.guest_hint)
			party_shape = str(profile.party_shape)
			party_shape = _resolve_party_shape(
				party_shape,
				guest_id,
				guest_hint
			)
		bridge_controller.emit_offer_wine({
			"guestId": guest_id,
			"tableId": table_id,
			"guestDisplayName": guest_display_name,
			"guestType": guest_type,
			"partyShape": party_shape,
			"depiction": guest_hint,
			"guestHint": guest_hint,
			"greetingChoice": str(session.get("greeting_choice", "")),
			"objectPathKind": str(session.get("object_path_kind", "")),
			"objectSuccess": bool(session.get("object_success", false)),
			"guestIndex": int(
				session.get("guest_index", -1)
			),
			"ap": ap,
			"shiftScore": shift_score,
			"mode": "demo",
		})

	if bridge_controller.has_method("emit_telemetry"):
		bridge_controller.emit_telemetry(
			"offer_wine_selected",
			{
				"guestId": guest_id,
				"tableId": table_id,
				"guestDisplayName": guest_display_name,
			}
		)

	return true


func _on_bridge_host_ready(payload: Dictionary = {}):
	var incoming_shift_run_id = str(
		payload.get("shiftRunId", "")
	)
	if shift_run_id == "" and incoming_shift_run_id != "":
		shift_run_id = incoming_shift_run_id

	var player_authority = payload.get(
		"playerAuthority",
		{}
	)
	if typeof(player_authority) != TYPE_DICTIONARY:
		return

	var progression = player_authority.get(
		"progression",
		{}
	)
	var skills = player_authority.get("skills", {})
	var economy = player_authority.get("economy", {})

	if typeof(progression) == TYPE_DICTIONARY:
		profile_tier = max(
			profile_tier,
			int(progression.get("tierToServe", 1))
		)
		profile_ap_tier_unlocked = max(
			profile_ap_tier_unlocked,
			int(progression.get("apTierUnlocked", 1))
		)
		profile_rules_tier_to_serve = max(
			profile_rules_tier_to_serve,
			int(progression.get("rulesTierToServe", 1))
		)

	var shift_has_progress = (
		shift_score != 0
		or completed_guest_services > 0
		or wine_offers > 0
		or food_offers > 0
		or walk_aways > 0
	)

	if (
		not player_authority_snapshot_applied
		or not shift_has_progress
	):
		if typeof(progression) == TYPE_DICTIONARY:
			profile_authority_points_at_shift_start = max(
				profile_authority_points_at_shift_start,
				int(round(float(
					progression.get("authorityPoints", 0)
				)))
			)
		if typeof(economy) == TYPE_DICTIONARY:
			coins = max(
				coins,
				int(economy.get("godotCoins", 0))
			)
			coins_at_shift_start = coins

	if typeof(skills) == TYPE_DICTIONARY:
		var incoming_unlocks = skills.get(
			"unlockedSkillIds",
			[]
		)
		if typeof(incoming_unlocks) == TYPE_ARRAY:
			unlocked_skill_ids.clear()
			for skill_id in incoming_unlocks:
				var normalised_skill_id = str(
					skill_id
				).strip_edges()
				if (
					normalised_skill_id != ""
					and not unlocked_skill_ids.has(
						normalised_skill_id
					)
				):
					unlocked_skill_ids.append(
						normalised_skill_id
					)

		var incoming_measurements = skills.get(
			"measurements",
			{}
		)
		if typeof(incoming_measurements) == TYPE_DICTIONARY:
			profile_skill_measurements = (
				incoming_measurements as Dictionary
			).duplicate(true)

	player_authority_snapshot_applied = true
	current_level = profile_tier
	update_hud()


func _get_v2_wine_coin_reward(
	payload: Dictionary
) -> int:
	if not bool(payload.get("wineSold", false)):
		return 0

	match str(payload.get("outcome", "")).to_lower():
		"premium_success":
			return premium_wine_sale_coin_reward
		"standard_success":
			return wine_sale_coin_reward
		"weak_success":
			return weak_wine_sale_coin_reward

	return 0


func _on_bridge_v2_result_received(payload: Dictionary = {}):
	if not waiting_for_v2_encounter:
		return

	var result_id = str(payload.get("resultId", ""))
	if result_id != "" and processed_v2_result_ids.has(result_id):
		return
	if result_id != "":
		processed_v2_result_ids[result_id] = true

	var table_id = pending_v2_table_id
	var guest_reply = pending_v2_guest_reply
	if table_id != "":
		_apply_fixed_action(
			&"encounter_return",
			StringName(table_id)
		)
		shift_service_system.set_table_patience_paused(
			StringName(table_id),
			false
		)
	waiting_for_v2_encounter = false
	pending_v2_table_id = ""
	pending_v2_guest_reply = ""

	var authority_delta = int(
		round(float(payload.get("authorityDelta", 0)))
	)

	# Object-path mismatch (e.g. greet food → offer wine) weakens wine AP credit.
	var object_success = true
	if table_id != "" and table_sessions.has(table_id):
		object_success = bool(
			table_sessions[table_id].get("object_success", true)
		)
	if payload.has("objectSuccess"):
		object_success = bool(payload.get("objectSuccess", true))
	if not object_success and authority_delta > 0:
		authority_delta = int(round(float(authority_delta) * 0.5))

	if authority_delta != 0:
		_add_level_ap(
			authority_delta,
			"v2_encounter:"
			+ str(payload.get("encounterId", ""))
		)
	v2_authority_delta_total += authority_delta

	var skill_measurements = payload.get(
		"skillMeasurements",
		{}
	)
	if typeof(skill_measurements) == TYPE_DICTIONARY:
		profile_skill_measurements = (
			skill_measurements as Dictionary
		).duplicate(true)
	var v2_coin_reward = _get_v2_wine_coin_reward(payload)

	if bridge_controller != null and bridge_controller.has_method("emit_telemetry"):
		bridge_controller.emit_telemetry(
			"v2_encounter_returned",
			{
				"guestId": str(payload.get("guestId", "")),
				"encounterId": str(payload.get("encounterId", "")),
				"authorityDelta": authority_delta,
				"outcome": str(payload.get("outcome", "")),
				"wineCoinRewardPending": v2_coin_reward,
				"ap": ap,
			}
		)

	if table_id == "" or not table_sessions.has(table_id):
		_set_prompt(
			"Wine encounter complete. Return to the floor."
		)
		return

	var session = table_sessions[table_id]
	var wine_sold = bool(payload.get("wineSold", false))
	session["wine_ordered"] = wine_sold
	session["food_ordered"] = true
	session["mise_required"] = true

	if session.get("greeting_choice", "") == "greet_aperitif":
		session["aperitif_ordered"] = true

	# Bottle meter only advances when wine is actually delivered later.
	# Aperitif sales never count as wine sales here.
	if wine_sold:
		session["wine_sale_pending"] = true
		session["wine_coin_reward_pending"] = v2_coin_reward
	session["v2_result_id"] = result_id
	session["v2_outcome"] = str(payload.get("outcome", ""))

	_maybe_show_table_guest_dialogue(
		table_id,
		"positive" if wine_sold else "negative",
		true
	)

	_complete_follow_up_order(
		table_id,
		session,
		guest_reply
	)


func _complete_follow_up_order(
	table_id: String,
	session: Dictionary,
	guest_reply: String
):
	var table = session.get("table", null)

	session["phase"] = "order_pending_pos"
	table_sessions[table_id] = session
	_refresh_service_patience_stage(table_id)

	if table != null and table.has_method("set_order_pending_pos"):
		table.set_order_pending_pos()

	focused_table_id = table_id
	_mark_table_progress(table_id)
	_close_encounter_panel()

	var order_summary = ""

	if (
		bool(session.get("aperitif_ordered", false))
		and bool(session.get("wine_ordered", false))
		and bool(session.get("food_ordered", false))
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
	_face_waiter_toward_node(action_time_target_node)

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


# POS: order entry, bill printing and payment close
# ===================================================================

func _handle_pos_arrival():
	if waiter_carrying == CARRY_PAYMENT:
		_close_bill_at_pos()
		return

	if waiter_carrying == CARRY_RECEIPT:
		_set_prompt(
			"Deliver the bill to "
			+ carrying_table_id
			+ " and take payment."
		)
		return

	var pending_orders: Array[String] = []
	var pending_bills: Array[String] = []

	for table_id in table_sessions.keys():
		var phase = str(
			table_sessions[table_id]["phase"]
		)

		if phase == "order_pending_pos":
			pending_orders.append(str(table_id))
		elif phase == "waiting_for_bill":
			pending_bills.append(str(table_id))

	pending_orders.sort()
	pending_bills.sort()

	# Enter every pending order in one POS visit. Mid-shift table focus must
	# never stamp another table's bar/chef tickets (skeptic left vs right).
	if pending_orders.size() > 0:
		for table_id in pending_orders:
			_enter_order_at_pos(table_id, false)

		_start_next_bar_order()
		_start_next_chef_order()
		_restore_ready_bar_status()

		var order_list := ", ".join(
			PackedStringArray(pending_orders)
		)
		_set_prompt(
			"Orders entered for "
			+ order_list
			+ ". Bar and Chef tickets have been sent. Food and drinks may be collected before Mise is assigned."
		)
		_refresh_station_attention_alerts()
		return

	var bill_table_id := _resolve_pos_bill_target_table(pending_bills)
	if bill_table_id != "":
		_print_bill(bill_table_id)
		return

	_set_prompt(
		"Select a table that needs POS service first."
	)


func _resolve_pos_bill_target_table(
	pending_bills: Array[String]
) -> String:
	if pending_bills.size() == 1:
		focused_table_id = pending_bills[0]
		return pending_bills[0]

	if (
		pending_bills.size() > 1
		and pending_bills.has(focused_table_id)
	):
		return focused_table_id

	return ""


func _enter_order_at_pos(
	table_id: String,
	start_station_queues: bool = true
):
	var session = table_sessions[table_id]
	var table = session["table"]

	_apply_fixed_action(&"pos_order_entry")

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
	_refresh_service_patience_stage(table_id)

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

	if start_station_queues:
		_start_next_bar_order()
		_start_next_chef_order()

		_set_prompt(
			"Order entered for "
			+ table_id
			+ ". Bar and Chef tickets have been sent. Food and drinks may be collected before Mise is assigned."
		)


func _print_bill(
	table_id: String
):
	if waiter_carrying != CARRY_NONE:
		_set_prompt(
			"Deliver or drop the current item before printing a bill."
		)
		return

	_apply_fixed_action(&"print_bill")

	_add_station_interaction(
		1,
		"POS bill print"
	)

	waiter_carrying = CARRY_RECEIPT
	carrying_table_id = table_id

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
	_hide_station_mood("pos")
	_refresh_station_attention_alerts()

	_sync_waiter_carrying_visual()

	_set_prompt(
		"Bill printed. Deliver it to "
		+ carrying_table_id
		+ " and take payment."
	)


func _close_bill_at_pos() -> void:
	var table_id = carrying_table_id
	if not table_sessions.has(table_id):
		push_warning("Payment belongs to an unknown table: " + table_id)
		_clear_normal_carrying()
		return

	var session: Dictionary = table_sessions[table_id]
	if str(session.get("phase", "")) != "waiting_for_bill_close":
		_set_prompt(table_id + " is not ready for bill close.")
		return

	_apply_fixed_action(&"close_bill")
	_add_station_interaction(1, "POS bill close")
	_set_station_state("pos", "active", true)
	_set_station_state("pos", "idle", true)
	_clear_normal_carrying()
	session["paid"] = true
	table_sessions[table_id] = session
	shift_service_system.stop_table_patience(StringName(table_id))
	_complete_paid_table(table_id)


# ===================================================================
# Bar queue
# ===================================================================

func _start_next_bar_order():
	if not bar_current_order.is_empty():
		_restore_ready_bar_status()
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
		# Keep "collected" while a drink for this table is still in hand
		# (e.g. aperitif carried while wine begins preparing).
		if not (
			waiter_carrying == CARRY_BAR_DRINK
			and carrying_table_id == table_id
		):
			session["bar_status"] = "preparing"
			table_sessions[table_id] = session
			_refresh_table_status(table_id)

	_set_station_state(
		"bar",
		"getting_wine" if str(bar_current_order.get("drink_type", "")) == "wine" else "active",
		true
	)

	var drink_type = StringName(
		str(bar_current_order.get("drink_type", "aperitif"))
	)
	bar_ready_timer.start(
		shift_service_system.get_preparation_time(drink_type)
	)

	print(
		"BAR PREPARING: ",
		bar_current_order
	)


func _restore_ready_bar_status() -> void:
	if bar_current_order.is_empty() or not bar_order_ready:
		return

	var table_id = str(bar_current_order.get("table_id", ""))
	if table_id == "" or not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]
	# Do not clobber an in-hand collection for this table.
	if (
		waiter_carrying == CARRY_BAR_DRINK
		and carrying_table_id == table_id
	):
		return

	if str(session.get("bar_status", "")) != "ready":
		session["bar_status"] = "ready"
		table_sessions[table_id] = session
		_refresh_table_status(table_id)

	var drink_type = str(bar_current_order.get("drink_type", ""))
	_set_station_state(
		"bar",
		"wine_ready" if drink_type == "wine" else "ready_collection",
		true
	)


func _on_bar_ready_timer_timeout():
	if bar_current_order.is_empty():
		return

	bar_order_ready = true
	print(
		"PREPARATION COMPLETE: ",
		str(bar_current_order.get("drink_type", "drink")),
		" for ",
		str(bar_current_order.get("table_id", ""))
	)

	var table_id = str(
		bar_current_order["table_id"]
	)

	if table_sessions.has(table_id):
		var session = table_sessions[table_id]
		session["bar_status"] = "ready"
		table_sessions[table_id] = session
		_refresh_table_status(table_id)

	var drink_type = str(
		bar_current_order.get("drink_type", "")
	)
	_set_station_state(
		"bar",
		"wine_ready" if drink_type == "wine" else "ready_collection",
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

	_maybe_show_station_speech("bar", "negative", false)

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

	_maybe_show_station_speech("bar", "negative", true)

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

	var bar_mood_before = _get_station_mood_state("bar")

	var drink_type = str(bar_current_order.get("drink_type", ""))
	var collection_action: StringName = (
		&"collect_wine"
		if drink_type == "wine"
		else &"collect_aperitif"
	)
	_apply_fixed_action(collection_action)

	_add_station_interaction(
		1,
		"Bar collection"
	)

	waiter_carrying = CARRY_BAR_DRINK
	carrying_table_id = table_id
	carrying_drink_type = drink_type

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

	# Ahead = collected while still happy; slow = collected after warning/unhappy.
	if bar_mood_before == "happy":
		_maybe_show_station_speech("bar", "positive", true)
	elif bar_mood_before == "annoyed" or bar_mood_before == "neutral":
		_maybe_show_station_speech("bar", "negative", true)

	_sync_waiter_carrying_visual()
	_start_next_bar_order()

	_set_prompt(
		carrying_drink_type.capitalize()
		+ " collected. Deliver it to "
		+ table_id
		+ "."
	)


func _table_has_outstanding_bar_work(table_id: String) -> bool:
	var normalised_id = str(table_id)

	if (
		waiter_carrying == CARRY_BAR_DRINK
		and carrying_table_id == normalised_id
	):
		return true

	if (
		not bar_current_order.is_empty()
		and str(bar_current_order.get("table_id", "")) == normalised_id
	):
		return true

	for queued_order in bar_queue:
		if str(queued_order.get("table_id", "")) == normalised_id:
			return true

	return false


func _get_bar_status_for_table(
	table_id: String,
	ignore_carrying: bool = false
) -> String:
	var normalised_id = str(table_id)

	if (
		not ignore_carrying
		and waiter_carrying == CARRY_BAR_DRINK
		and carrying_table_id == normalised_id
	):
		return "collected"

	if (
		not bar_current_order.is_empty()
		and str(bar_current_order.get("table_id", "")) == normalised_id
	):
		return (
			"ready"
			if bar_order_ready
			else "preparing"
		)

	for queued_order in bar_queue:
		if str(queued_order.get("table_id", "")) == normalised_id:
			return "queued"

	if table_sessions.has(normalised_id):
		var session = table_sessions[normalised_id]
		if not _ordered_drink_flags_delivered(session):
			# Ordered drinks still outstanding even if the ticket is mid-hand-off.
			return "queued"

	return "delivered"


func _ordered_drink_flags_delivered(
	session: Dictionary
) -> bool:
	return (
		(
			not bool(session.get("aperitif_ordered", false))
			or bool(session.get("aperitif_delivered", false))
		)
		and (
			not bool(session.get("wine_ordered", false))
			or bool(session.get("wine_delivered", false))
		)
	)


func _all_ordered_drinks_delivered(
	session: Dictionary
) -> bool:
	var table_id = str(session.get("table_id", ""))
	# Never treat drinks as complete while Bar still holds/carries work for
	# this table (e.g. POS entered another order while a drink was waiting).
	if table_id != "" and _table_has_outstanding_bar_work(table_id):
		return false

	return _ordered_drink_flags_delivered(session)


func _table_service_fully_delivered(
	session: Dictionary
) -> bool:
	return (
		bool(session.get("food_delivered", false))
		and _all_ordered_drinks_delivered(session)
	)


func _cancel_enjoy_events(table_id: String) -> void:
	var remaining_events: Array = []
	for event in scheduled_events:
		if (
			str(event.get("type", "")) == "enjoy_complete"
			and str(event.get("table_id", "")) == table_id
		):
			continue
		remaining_events.append(event)
	scheduled_events = remaining_events


func _begin_table_drinking(table_id: String) -> void:
	if not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]
	if not _table_service_fully_delivered(session):
		return

	var phase = str(session.get("phase", ""))
	if phase == "drinking" or phase == "ready_to_clear":
		return

	_cancel_enjoy_events(table_id)

	session["phase"] = "drinking"
	session["bar_status"] = "delivered"
	table_sessions[table_id] = session
	_refresh_service_patience_stage(table_id)

	_ensure_table_had_guest_dialogue(table_id)

	var table = session.get("table", null)
	if table != null:
		# Prefer wine visual while drinking if wine was served.
		if (
			bool(session.get("wine_delivered", false))
			and table.has_method("set_wine_served")
		):
			table.set_wine_served()
		elif table.has_method("set_eating"):
			table.set_eating()
		if table.has_method("set_status_text"):
			table.set_status_text("Drinking")

	_schedule_event(
		"enjoy_complete",
		table_id,
		table_drinking_seconds
	)
	_mark_table_progress(table_id)
	_set_prompt(
		table_id
		+ " is drinking. Wait before clearing."
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

	if delivered_drink_type == "aperitif":
		if not bool(session.get("aperitif_ordered", false)):
			_set_prompt(
				table_id
				+ " did not order an aperitif."
			)
			return
		if bool(session.get("aperitif_delivered", false)):
			_set_prompt(
				table_id
				+ " already received its aperitif."
			)
			return
	elif delivered_drink_type == "wine":
		if not bool(session.get("wine_ordered", false)):
			_set_prompt(
				table_id
				+ " did not order wine."
			)
			return
		if bool(session.get("wine_delivered", false)):
			_set_prompt(
				table_id
				+ " already received its wine."
			)
			return
		if (
			bool(session.get("aperitif_ordered", false))
			and not bool(session.get("aperitif_delivered", false))
		):
			_set_prompt(
				table_id
				+ " still needs its aperitif before wine."
			)
			return
	else:
		_set_prompt(
			"Unknown drink type. Return it to the Bar."
		)
		return

	var service_action: StringName = (
		&"serve_wine"
		if delivered_drink_type == "wine"
		else &"serve_aperitif"
	)
	_apply_fixed_action(service_action, StringName(table_id))

	if delivered_drink_type == "aperitif":
		session["aperitif_delivered"] = true

		if not bool(session["food_delivered"]):
			if table.has_method("set_aperitif_served"):
				table.set_aperitif_served()
	elif delivered_drink_type == "wine":
		session["wine_delivered"] = true

		# Only delivered wine advances the bottle meter — never aperitif.
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
	else:
		# Unknown drink type — do not treat as a wine bottle sale.
		pass

	session["drink_delivered"] = _all_ordered_drinks_delivered(session)

	# Resolve status after the hand-off leaves this table, not while still carrying.
	_clear_normal_carrying()
	session["bar_status"] = _get_bar_status_for_table(table_id)
	table_sessions[table_id] = session
	_refresh_service_patience_stage(table_id, service_action)

	# Delivery beat — sparse positive reaction when service lands.
	_maybe_show_table_guest_dialogue(table_id, "positive", false)

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
	elif _table_service_fully_delivered(session):
		_begin_table_drinking(table_id)
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
		shift_service_system.get_preparation_time(&"food")
	)

	print(
		"CHEF PREPARING: ",
		chef_current_order
	)


func _on_chef_ready_timer_timeout():
	if chef_current_order.is_empty():
		return

	chef_order_ready = true
	print(
		"PREPARATION COMPLETE: food for ",
		str(chef_current_order.get("table_id", ""))
	)

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

	_maybe_show_station_speech("chef", "negative", false)

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

	_maybe_show_station_speech("chef", "negative", true)

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
	var chef_mood_before = _get_station_mood_state("chef")

	_apply_fixed_action(&"collect_food")

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

	if chef_mood_before == "happy":
		_maybe_show_station_speech("chef", "positive", true)
	elif chef_mood_before == "annoyed" or chef_mood_before == "neutral":
		_maybe_show_station_speech("chef", "negative", true)

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

	_apply_fixed_action(&"serve_food", StringName(table_id))
	shift_service_system.restore_table_patience(
		StringName(table_id),
		&"serve_food"
	)

	session["chef_status"] = "delivered"
	session["food_delivered"] = true
	session["phase"] = "eating"
	table_sessions[table_id] = session
	_refresh_service_patience_stage(table_id)

	if table.has_method("set_eating"):
		table.set_eating()
	elif table.has_method("set_enjoying"):
		table.set_enjoying()

	_clear_normal_carrying()
	_mark_table_progress(table_id)

	if _table_service_fully_delivered(session):
		# Third/final item was food — drink dwell before clear.
		_begin_table_drinking(table_id)
	else:
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
	var phase = str(session.get("phase", ""))

	if phase == "drinking":
		# Recover if drinking started while Bar still had work for this table.
		if (
			not _all_ordered_drinks_delivered(session)
			or _table_has_outstanding_bar_work(table_id)
		):
			session["phase"] = "eating"
			table_sessions[table_id] = session

			var recover_table = session.get("table", null)
			if recover_table != null and recover_table.has_method("set_status_text"):
				recover_table.set_status_text("Eating — wait for drinks")

			_schedule_event(
				"enjoy_complete",
				table_id,
				1.0
			)
			_set_prompt(
				table_id
				+ " still needs its Bar drink before it can finish drinking."
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
		_refresh_service_patience_stage(table_id)

		_set_prompt(
			table_id
			+ " is ready to clear."
		)
		return true

	if phase != "eating":
		return true

	if not _all_ordered_drinks_delivered(
		session
	):
		session["phase"] = "eating"
		table_sessions[table_id] = session

		var waiting_table = session.get("table", null)
		if waiting_table != null and waiting_table.has_method("set_status_text"):
			waiting_table.set_status_text("Eating — wait for drinks")

		_schedule_event(
			"enjoy_complete",
			table_id,
			1.0
		)

		var bar_hint = table_id
		if _table_has_outstanding_bar_work(table_id):
			bar_hint = (
				table_id
				+ " still has a drink at Bar or in hand"
			)

		_set_prompt(
			bar_hint
			+ ". Finish Bar service before drinking/clearing."
		)
		return true

	# Food enjoy finished and drinks are complete — drinking dwell next.
	_begin_table_drinking(table_id)
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

	_apply_fixed_action(&"collect_mise")

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

		_apply_fixed_action(&"lay_mise", StringName(table_id))
		_refresh_service_patience_stage(table_id, &"lay_mise")

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

		_apply_fixed_action(&"lay_mise", StringName(table_id))
		_refresh_service_patience_stage(table_id, &"lay_mise")

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

func _purge_station_work_for_table(table_id: String) -> void:
	var normalised_id = str(table_id)

	var remaining_bar: Array = []
	for queued_order in bar_queue:
		if str(queued_order.get("table_id", "")) != normalised_id:
			remaining_bar.append(queued_order)
	bar_queue = remaining_bar

	var remaining_chef: Array = []
	for queued_order in chef_queue:
		if str(queued_order.get("table_id", "")) != normalised_id:
			remaining_chef.append(queued_order)
	chef_queue = remaining_chef

	if (
		waiter_carrying != CARRY_NONE
		and carrying_table_id == normalised_id
	):
		_clear_normal_carrying()

	if (
		not bar_current_order.is_empty()
		and str(bar_current_order.get("table_id", "")) == normalised_id
	):
		bar_ready_timer.stop()
		bar_annoyed_timer.stop()
		bar_unhappy_timer.stop()
		bar_current_order = {}
		bar_order_ready = false
		_hide_station_mood("bar")
		_start_next_bar_order()

	if (
		not chef_current_order.is_empty()
		and str(chef_current_order.get("table_id", "")) == normalised_id
	):
		chef_ready_timer.stop()
		chef_annoyed_timer.stop()
		chef_unhappy_timer.stop()
		chef_current_order = {}
		chef_order_ready = false
		_hide_station_mood("chef")
		_start_next_chef_order()


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

	_apply_fixed_action(&"reset_table", StringName(table_id))

	_purge_station_work_for_table(table_id)

	table_sessions[table_id] = \
		_create_ready_table_session(
			table
		)

	if table.has_method(
		"set_ready_for_guests"
	):
		table.set_ready_for_guests()

	if table.has_method("set_attention_required"):
		table.set_attention_required(false)

	_set_prompt(
		table_id
		+ " has been reset. Select the waiting guests to seat them."
	)
	_refresh_table_status(table_id)


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

	_apply_fixed_action(&"collect_dirty_plates", StringName(table_id))

	session["phase"] = "plates_collected"
	table_sessions[table_id] = session
	_refresh_service_patience_stage(
		table_id,
		&"collect_dirty_plates"
	)

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
		_set_prompt("Bring dirty plates here for cleaning.")
		return

	var table_id = carrying_table_id

	_set_station_state("scullery", "full", true)
	_set_station_state("scullery", "active", true)
	_apply_fixed_action(&"scullery_dropoff")

	_add_station_interaction(
		1,
		"Scullery clean"
	)

	_clear_normal_carrying()
	_set_station_state("scullery", "idle", true)
	_set_station_mood("scullery", "happy")

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

	_set_prompt(
		"Plates from "
		+ table_id
		+ " cleaned at Scullery. Go to POS for the bill."
	)
	_refresh_station_attention_alerts()


func _deliver_bill_and_take_payment(
	table_id: String
):
	if not table_sessions.has(table_id):
		return

	var session: Dictionary = table_sessions[table_id]
	if str(session.get("phase", "")) != "waiting_for_bill":
		_set_prompt(table_id + " is not waiting for its bill.")
		return

	_apply_fixed_action(&"take_payment", StringName(table_id))
	waiter_carrying = CARRY_PAYMENT
	carrying_table_id = table_id
	session["phase"] = "waiting_for_bill_close"
	table_sessions[table_id] = session

	var table = session["table"]
	if table.has_method("set_waiting_for_bill_close"):
		table.set_waiting_for_bill_close()

	_refresh_service_patience_stage(table_id, &"take_payment")
	_sync_waiter_carrying_visual()
	_set_prompt(
		"Payment taken from "
		+ table_id
		+ ". Return to POS and close the bill."
	)


func _complete_paid_table(
	table_id: String
):
	if not table_sessions.has(table_id):
		return

	var session = table_sessions[table_id]
	var table = session["table"]

	session["phase"] = "leaving"
	session["paid"] = true
	table_sessions[table_id] = session
	shift_service_system.stop_table_patience(StringName(table_id))

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

	if _begin_guest_departure(table_id, session):
		_set_prompt(
			table_id
			+ " completed. The guests are walking to the BottleCaller entrance."
		)
		return

	# Never leave table turnover or final shift completion blocked if an
	# outgoing character asset cannot be created.
	_schedule_event(
		"enable_reset",
		table_id,
		guest_leave_delay
	)
	_set_prompt(
		table_id
		+ " completed. Guest departure animation was unavailable; table reset will follow."
	)


func _begin_guest_departure(
	table_id: String,
	session: Dictionary
) -> bool:
	if departing_guest_party_id_by_table.has(table_id):
		return true

	var profile = session.get("profile", null)
	var table = session.get("table", null)
	if profile == null or not is_instance_valid(table):
		return false

	var character_asset_key = str(
		profile.get("floor_character_key")
	).strip_edges()
	if character_asset_key == "":
		return false

	var party_id = (
		"departing_guest_party_"
		+ str(next_guest_party_serial)
	)
	var party = GUEST_PARTY_SCENE.instantiate()
	characters_container.add_child(party)
	party.couple_follow_delay = couple_follow_delay

	var table_position = table.global_position
	if table.has_method("get_interaction_position"):
		table_position = table.get_interaction_position()

	if not party.configure(
		party_id,
		table_id,
		profile,
		int(session.get("guest_index", -1)),
		character_asset_key,
		table_position
	):
		party.queue_free()
		return false

	party.party_departed.connect(_on_guest_party_departed)
	party.party_walk_failed.connect(
		_on_departing_guest_party_walk_failed
	)
	party.set_selectable(false)

	departing_guest_parties_by_id[party_id] = {
		"party": party,
		"table_id": table_id,
		"retry_count": 0,
	}
	departing_guest_party_id_by_table[table_id] = party_id
	next_guest_party_serial += 1

	party.begin_exit(guest_entrance.global_position)
	_refresh_table_status(table_id)
	return true


func _on_guest_party_departed(
	party_id: String,
	table_id: String
):
	_complete_guest_departure(party_id, table_id)


func _on_departing_guest_party_walk_failed(
	party_id: String,
	table_id: String,
	reason: String
):
	if not departing_guest_parties_by_id.has(party_id):
		return

	var record: Dictionary = departing_guest_parties_by_id[party_id]
	var party = record.get("party", null)
	var retry_count = int(record.get("retry_count", 0))
	if retry_count < 1 and is_instance_valid(party):
		record["retry_count"] = retry_count + 1
		departing_guest_parties_by_id[party_id] = record
		party.call_deferred(
			"begin_exit",
			guest_entrance.global_position
		)
		_set_prompt(
			"Guests are retrying their route from "
			+ table_id
			+ " to the entrance."
		)
		return

	push_warning(
		"GUEST DEPARTURE ROUTE FAILED: "
		+ table_id
		+ " | "
		+ reason
	)
	_complete_guest_departure(party_id, table_id)


func _complete_guest_departure(
	party_id: String,
	table_id: String
):
	if not departing_guest_parties_by_id.has(party_id):
		return

	var record: Dictionary = departing_guest_parties_by_id[party_id]
	var party = record.get("party", null)
	departing_guest_parties_by_id.erase(party_id)
	departing_guest_party_id_by_table.erase(table_id)
	if is_instance_valid(party):
		party.queue_free()

	_enable_table_reset(table_id)


func _maybe_finish_shift_after_departures():
	if not shift_is_active:
		return
	if completed_guest_services < target_guest_services:
		return
	if not departing_guest_parties_by_id.is_empty():
		return

	_finish_shift()


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
		var resolved_wine_coin_reward = wine_sale_coin_reward
		if str(session.get("v2_result_id", "")) != "":
			resolved_wine_coin_reward = int(
				session.get(
					"wine_coin_reward_pending",
					0
				)
			)
		coin_reward += resolved_wine_coin_reward

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

	if table.has_method("set_attention_required"):
		table.set_attention_required(true)

	# The next party may now appear, but the dirty table is not an eligible
	# destination. Resetting the table opens the player-controlled seating
	# opportunity for this waiting party.
	if next_guest_profile_index < target_guest_services:
		_spawn_next_guest_for_table(table)

	_set_prompt(
		table_id
		+ " is empty and now needs a Table Reset."
	)
	_maybe_finish_shift_after_departures()

	return true


# ===================================================================
# Guest patience
# ===================================================================

func _mark_table_progress(
	table_id: String
):
	if not table_sessions.has(table_id):
		return
	_sync_session_patience_mood(table_id)
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

		"guest_walking_to_table":
			message = "Guests arriving"

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
			if _table_has_outstanding_bar_work(table_id):
				message = "Eating — wait for drinks"
			else:
				message = "Eating"

		"drinking":
			if _table_has_outstanding_bar_work(table_id):
				message = "Eating — wait for drinks"
			else:
				message = "Drinking"

		"ready_to_clear":
			message = "Ready to clear"

		"plates_collected":
			message = "Plates → Scullery"

		"waiting_for_bill":
			message = "Bill → POS"

		"waiting_for_bill_close":
			message = "Payment → POS"

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


func _hide_station_mood(station_id: String) -> void:
	if not station_by_id.has(station_id):
		return

	var station = station_by_id[station_id]
	if station == null:
		return

	if station.has_method("set_attention_required") and bool(
		station.get("attention_required")
	):
		# Attention already suppresses mood.
		pass

	var mood_icon = station.get("mood_icon")
	if mood_icon != null and mood_icon is CanvasItem:
		mood_icon.visible = false


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
		var normalised_id = str(station_id)
		# POS uses attention marks for player actions, not the happy mood icon.
		if normalised_id == "pos":
			_hide_station_mood("pos")
			continue

		_set_station_mood(
			normalised_id,
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

func _apply_fixed_action(
	action_id: StringName,
	serviced_table_id: StringName = &""
) -> float:
	var seconds = shift_service_system.apply_fixed_action_time(
		action_id,
		serviced_table_id
	)
	if seconds > 0.0:
		_show_action_time_indicator(seconds)
	update_hud()
	return seconds


func _on_walk_away_selected(table_id: String) -> void:
	if bridge_controller != null and bridge_controller.has_method("emit_telemetry"):
		bridge_controller.emit_telemetry(
			"walk_away_selected",
			{"tableId": table_id}
		)


func _on_table_patience_breached(table_id: String) -> void:
	if not table_sessions.has(table_id):
		return

	var session: Dictionary = table_sessions[table_id]
	session["mood_state"] = "annoyed"
	session["annoyed"] = true
	session["had_guest_unhappy"] = true
	table_sessions[table_id] = session
	annoyed_guest_events += 1

	_add_level_ap(
		-guest_unhappy_ap_penalty,
		table_id + " breached patience"
	)
	_maybe_show_table_guest_dialogue(table_id, "negative", true)
	_set_prompt(table_id + " has run out of patience.")


func _refresh_service_patience_stage(
	table_id: String,
	recovery_id: StringName = &""
) -> void:
	if not table_sessions.has(table_id):
		return
	var session: Dictionary = table_sessions[table_id]
	var phase = str(session.get("phase", ""))
	var stage_id: StringName = &""

	match phase:
		"waiting_to_greet":
			stage_id = &"waiting_first_greeting"
		"order_pending_pos":
			stage_id = &"waiting_pos_order"
		"service_active":
			if (
				bool(session.get("aperitif_ordered", false))
				and not bool(session.get("aperitif_delivered", false))
			):
				stage_id = &"waiting_aperitif"
			elif (
				bool(session.get("wine_ordered", false))
				and not bool(session.get("wine_delivered", false))
			):
				stage_id = &"waiting_wine"
			elif (
				bool(session.get("mise_required", false))
				and not bool(session.get("mise_set", false))
			):
				stage_id = &"waiting_mise"
			elif (
				bool(session.get("food_ordered", false))
				and not bool(session.get("food_delivered", false))
			):
				stage_id = &"waiting_food"
		"ready_to_clear":
			stage_id = &"waiting_to_clear"
		"plates_collected", "waiting_for_bill":
			stage_id = &"waiting_for_bill_and_payment"
		"waiting_for_bill_close":
			stage_id = &"waiting_for_bill_close"

	if stage_id == &"":
		shift_service_system.stop_table_patience(StringName(table_id))
	else:
		var recovery = 0.0
		if recovery_id != &"":
			recovery = shift_service_system.get_recovery_value(recovery_id)
		shift_service_system.change_table_patience_stage(
			StringName(table_id),
			stage_id,
			recovery
		)
	_sync_session_patience_mood(table_id)


func _sync_session_patience_mood(table_id: String) -> void:
	if not table_sessions.has(table_id):
		return
	var session: Dictionary = table_sessions[table_id]
	var table = session.get("table", null)
	if not is_instance_valid(table):
		return
	var mood_band = str(table.patience_mood_band)
	session["mood_state"] = mood_band
	session["annoyed"] = mood_band == "annoyed"
	table_sessions[table_id] = session


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
			# Aperitif and wine are separate bar→table carry visuals.
			if str(carrying_drink_type) == "aperitif":
				waiter_node.set_carrying("aperitif")
			else:
				waiter_node.set_carrying("wine_bottle")
		CARRY_FOOD:
			waiter_node.set_carrying(
				"food_plate"
			)
		CARRY_DIRTY:
			waiter_node.set_carrying(
				"dirty_plates"
			)
		CARRY_RECEIPT, CARRY_PAYMENT:
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
		520,
		110
	)
	encounter_panel.size = Vector2(
		560,
		268
	)
	encounter_panel.clip_contents = true
	encounter_panel.visible = false
	hud_root.add_child(
		encounter_panel
	)

	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(
		0.02,
		0.10,
		0.06,
		0.96
	)
	panel_style.border_color = Color(
		0.95,
		0.62,
		0.18,
		1.0
	)
	panel_style.set_border_width_all(3)
	panel_style.set_corner_radius_all(12)
	panel_style.content_margin_left = 10
	panel_style.content_margin_right = 10
	panel_style.content_margin_top = 8
	panel_style.content_margin_bottom = 8
	encounter_panel.add_theme_stylebox_override(
		"panel",
		panel_style
	)

	encounter_title_label = Label.new()
	encounter_title_label.position = Vector2(
		10,
		8
	)
	encounter_title_label.size = Vector2(
		540,
		32
	)
	encounter_title_label.horizontal_alignment = \
		HORIZONTAL_ALIGNMENT_CENTER
	encounter_title_label.vertical_alignment = \
		VERTICAL_ALIGNMENT_CENTER
	encounter_title_label.clip_text = true
	encounter_title_label.add_theme_font_size_override(
		"font_size",
		32
	)
	encounter_panel.add_child(
		encounter_title_label
	)

	# Clip long tourist hints so they never bleed into the button row.
	var hint_host = Control.new()
	hint_host.name = "GuestHintHost"
	hint_host.position = Vector2(
		10,
		40
	)
	hint_host.size = Vector2(
		540,
		52
	)
	hint_host.clip_contents = true
	hint_host.mouse_filter = Control.MOUSE_FILTER_IGNORE
	encounter_panel.add_child(
		hint_host
	)

	encounter_hint_label = Label.new()
	encounter_hint_label.position = Vector2.ZERO
	encounter_hint_label.size = Vector2(
		540,
		52
	)
	encounter_hint_label.autowrap_mode = \
		TextServer.AUTOWRAP_WORD_SMART
	encounter_hint_label.horizontal_alignment = \
		HORIZONTAL_ALIGNMENT_CENTER
	encounter_hint_label.vertical_alignment = \
		VERTICAL_ALIGNMENT_CENTER
	encounter_hint_label.clip_text = true
	encounter_hint_label.mouse_filter = \
		Control.MOUSE_FILTER_IGNORE
	encounter_hint_label.add_theme_font_size_override(
		"font_size",
		22
	)
	hint_host.add_child(
		encounter_hint_label
	)

	# Tight horizontal packing: 10px side inset, 8px gaps between buttons.
	greet_wine_button = _make_encounter_button(
		"Greet Wine",
		Vector2(10, 100),
		func():
			_choose_greeting(
				"greet_wine"
			)
	)

	greet_aperitif_button = _make_encounter_button(
		"Greet Aperitif",
		Vector2(192, 100),
		func():
			_choose_greeting(
				"greet_aperitif"
			)
	)

	greet_food_button = _make_encounter_button(
		"Greet Food",
		Vector2(374, 100),
		func():
			_choose_greeting(
				"greet_food"
			)
	)

	walk_away_button = _make_encounter_button(
		"Walk Away",
		Vector2(10, 100),
		func():
			_choose_follow_up(
				"walk_away"
			)
	)

	offer_food_button = _make_encounter_button(
		"Offer Food",
		Vector2(192, 100),
		func():
			_choose_follow_up(
				"offer_food"
			)
	)

	offer_wine_button = _make_encounter_button(
		"Offer Wine",
		Vector2(374, 100),
		func():
			_choose_follow_up(
				"offer_wine"
			)
	)

	# Instruction sits under the option buttons with a small gap.
	encounter_response_label = Label.new()
	encounter_response_label.position = Vector2(
		10,
		164
	)
	encounter_response_label.size = Vector2(
		540,
		88
	)
	encounter_response_label.autowrap_mode = \
		TextServer.AUTOWRAP_WORD_SMART
	encounter_response_label.horizontal_alignment = \
		HORIZONTAL_ALIGNMENT_CENTER
	encounter_response_label.vertical_alignment = \
		VERTICAL_ALIGNMENT_CENTER
	encounter_response_label.clip_text = true
	encounter_response_label.add_theme_font_size_override(
		"font_size",
		22
	)
	encounter_panel.add_child(
		encounter_response_label
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
		174,
		52
	)
	button.z_index = 2
	button.add_theme_font_size_override(
		"font_size",
		20
	)
	button.pressed.connect(
		callback
	)
	encounter_panel.add_child(
		button
	)
	return button


func _position_encounter_panel_above_table(table) -> void:
	if encounter_panel == null or table == null:
		return

	var head_world = table.global_position
	if table.has_method("get_guest_head_anchor_global"):
		head_world = table.get_guest_head_anchor_global()

	var canvas_transform = \
		get_viewport().get_canvas_transform()
	var head_screen = canvas_transform * head_world

	# Convert viewport/screen coords into HUDRoot local space when the
	# CanvasLayer carries a non-identity transform.
	if hud_layer != null:
		var layer_xform: Transform2D = hud_layer.transform
		head_screen = layer_xform.affine_inverse() * head_screen

	var panel_size = encounter_panel.size
	# Sit the panel just above the guests — small overlap keeps it
	# visually anchored to the table instead of floating high.
	var desired = Vector2(
		head_screen.x - panel_size.x * 0.5,
		head_screen.y - panel_size.y + 36.0
	)

	var viewport_size = get_viewport().get_visible_rect().size
	if hud_layer != null:
		var layer_scale: Vector2 = hud_layer.scale
		if abs(layer_scale.x) > 0.001:
			viewport_size.x /= layer_scale.x
		if abs(layer_scale.y) > 0.001:
			viewport_size.y /= layer_scale.y

	desired.x = clampf(
		desired.x,
		12.0,
		max(12.0, viewport_size.x - panel_size.x - 12.0)
	)
	desired.y = clampf(
		desired.y,
		72.0,
		max(72.0, viewport_size.y - panel_size.y - 24.0)
	)

	encounter_panel.position = desired


func _create_result_panel():
	result_panel = Panel.new()
	result_panel.name = "ShiftResultPanel"
	result_panel.position = Vector2(
		440,
		135
	)
	result_panel.size = Vector2(
		720,
		560
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
		650,
		440
	)
	result_label.autowrap_mode = \
		TextServer.AUTOWRAP_WORD_SMART
	result_label.add_theme_font_size_override(
		"font_size",
		18
	)
	result_panel.add_child(
		result_label
	)

	result_continue_button = Button.new()
	result_continue_button.name = "ContinueButton"
	result_continue_button.text = "Continue"
	result_continue_button.position = Vector2(
		270,
		500
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

func _get_profile_authority_points() -> int:
	return max(
		0,
		profile_authority_points_at_shift_start
		+ shift_score
	)


func _get_next_profile_ap_threshold() -> int:
	match profile_tier:
		1:
			return 180
		2:
			return 500
		3:
			return 1100
		4:
			return 2000
	return 2000


func update_hud():
	var profile_authority_points = \
		_get_profile_authority_points()
	var next_profile_ap_threshold = \
		_get_next_profile_ap_threshold()
	var tier_progress = {
		"authority_mode": "profile",
		"ap": profile_authority_points,
		"ap_required": next_profile_ap_threshold,
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
		"tier_unlocked": _is_tier_2_unlocked(),
		"profile_tier": profile_tier,
		"ap_tier_unlocked": profile_ap_tier_unlocked,
		"rules_tier_to_serve": profile_rules_tier_to_serve,
		"unlocked_skill_count": unlocked_skill_ids.size(),
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
			profile_authority_points,
			next_profile_ap_threshold,
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
				str(profile_authority_points)
				+ " / "
				+ str(next_profile_ap_threshold)
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
				"PROFILE AP   "
				+ str(profile_authority_points)
				+ " / "
				+ str(next_profile_ap_threshold)
				+ "\nTier and skill-tree unlocks control interaction access."
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
			unlock_progress_label.text = (
				"PROFILE TIER   "
				+ str(profile_tier)
				+ "   |   SKILL UNLOCKS   "
				+ str(unlocked_skill_ids.size())
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

	_refresh_station_attention_alerts()


func _get_display_level() -> int:
	return max(1, profile_tier)


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


func _refresh_station_attention_alerts() -> void:
	# POS attention is needed for order entry, bill printing, or bill close.
	var pos_required = false

	for table_id in table_sessions.keys():
		var phase = str(
			table_sessions[table_id].get("phase", "")
		)
		if phase in [
			"order_pending_pos",
			"waiting_for_bill",
			"waiting_for_bill_close",
		]:
			pos_required = true
			break

	var mise_required = (
		_count_tables_needing_mise() > 0
		and not mise_inventory_filled
		and not mise_restock_in_progress
	)

	_set_station_attention_required("pos", pos_required)
	_set_station_attention_required(
		"mise_en_place",
		mise_required
	)

	_refresh_table_attention_alerts()


func _refresh_table_attention_alerts() -> void:
	for table_id in table_sessions.keys():
		var session = table_sessions[table_id]
		var table = session.get("table")
		if table == null:
			continue
		if not table.has_method("set_attention_required"):
			continue

		var needs_reset = (
			str(session.get("phase", "")) == "reset_required"
		)
		table.set_attention_required(needs_reset)


func _set_station_attention_required(
	station_id: String,
	required: bool
) -> void:
	if not station_by_id.has(station_id):
		return

	var station = station_by_id[station_id]
	if station != null and station.has_method("set_attention_required"):
		station.set_attention_required(required)


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
	return profile_tier >= 2


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

	if waiter_carrying == CARRY_PAYMENT:
		return "POS Station"

	if waiter_carrying == CARRY_DIRTY:
		return "Scullery Station"

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
			if (
				encounter_table_id != ""
				and table_sessions.has(encounter_table_id)
				and bool(
					table_sessions[encounter_table_id].get(
						"aperitif_opportunity_used",
						false
					)
				)
			):
				return "Choose Greet Wine or Greet Food."
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
		return "Take the dirty plates to Scullery. Equipped Mise does not block this task."

	if waiter_carrying == CARRY_RECEIPT:
		return (
			"Deliver the bill to "
			+ carrying_table_id
			+ " and take payment. Equipped Mise does not block this task."
		)

	if waiter_carrying == CARRY_PAYMENT:
		return (
			"Return the payment for "
			+ carrying_table_id
			+ " to POS and close the bill."
		)

	if mise_inventory_filled:
		return (
			"Continue any normal task, or click an active table needing Mise to assign it."
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

			"eating":
				if _table_has_outstanding_bar_work(focused_table_id):
					return (
						"Collect and deliver the remaining drink for "
						+ focused_table_id
						+ "."
					)
				return (
					"Wait while "
					+ focused_table_id
					+ " finishes eating."
				)

			"drinking":
				if _table_has_outstanding_bar_work(focused_table_id):
					return (
						"Collect and deliver the remaining drink for "
						+ focused_table_id
						+ " before it can clear."
					)
				return (
					"Wait while "
					+ focused_table_id
					+ " finishes drinking."
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

			"waiting_for_bill_close":
				return (
					"Return the payment for "
					+ focused_table_id
					+ " to POS and close the bill."
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

		if phase == "waiting_for_bill_close":
			return "Return the table payment to POS and close the bill."

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
	var projected_authority_points = \
		_get_profile_authority_points()
	var coin_delta = coins - coins_at_shift_start
	var operational_authority_delta = (
		shift_score - v2_authority_delta_total
	)

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
		+ "Profile AP: "
		+ str(projected_authority_points)
		+ "\n"
		+ "Shift authority delta: "
		+ str(shift_score)
		+ "\n"
		+ "Coins: "
		+ str(coins)
		+ " ("
		+ ("+" if coin_delta >= 0 else "")
		+ str(coin_delta)
		+ ")"
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
			"Profile Tier "
			+ str(profile_tier)
			+ " controls interaction access"
		)
		+ "\n"
		+ "Current title: "
		+ (
			equipped_title
			if equipped_title != ""
			else "None"
		)
	)

	result_panel.visible = true

	if _bridge_is_embedded() and bridge_controller.has_method("emit_shift_complete"):
		bridge_controller.emit_shift_complete({
			"shiftRunId": shift_run_id,
			"ap": ap,
			"shiftScore": shift_score,
			"authorityPointsAtStart": profile_authority_points_at_shift_start,
			"authorityPointsProjected": projected_authority_points,
			"authorityDeltaTotal": shift_score,
			"v2AuthorityDeltaTotal": v2_authority_delta_total,
			"operationalAuthorityDelta": operational_authority_delta,
			"coins": coins,
			"coinBalance": coins,
			"coinDelta": coin_delta,
			"bottleMeter": bottle_meter,
			"bottleMeterMax": bottle_meter_max,
			"guestServices": completed_guest_services,
			"targetGuestServices": target_guest_services,
			"wineOffers": wine_offers,
			"foodOffers": food_offers,
			"walkAways": walk_aways,
			"wineSales": wine_sales_count,
			"elapsedShiftTime": elapsed_shift_time,
			"tier2Unlocked": _is_tier_2_unlocked(),
			"profileTier": profile_tier,
			"apTierUnlocked": profile_ap_tier_unlocked,
			"rulesTierToServe": profile_rules_tier_to_serve,
			"unlockedSkillIds": unlocked_skill_ids.duplicate(),
			"skillMeasurements": profile_skill_measurements.duplicate(true),
			"interactionAuthorityEvents": interaction_authority_events.duplicate(true),
			"equippedTitle": equipped_title,
		})

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
