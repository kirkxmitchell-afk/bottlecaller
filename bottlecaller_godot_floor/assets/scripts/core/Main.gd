extends Node2D

var ap = 0
var coins = 0
var bottle_meter = 0
var bottle_meter_max = 5

var total_tables = 0
var completed_tables = 0

var success_count = 0
var failure_count = 0
var neutral_exit_count = 0

var shift_time_remaining = 300.0
var shift_is_active = true
var shift_end_title = "SHIFT COMPLETE"

@onready var tables_container = $RestaurantFloor/Tables
@onready var stations_container = $RestaurantFloor/Stations
@onready var waiter_node = $Waiter

var waiter_speed = 280.0
var waiter_is_moving = false
var waiter_move_target = Vector2.ZERO
var waiter_arrival_distance = 14.0

var waiter_route_points = []
var waiter_route_index = 0

var pending_interaction_type = ""
var pending_table_node = null
var pending_table_id = ""
var pending_encounter_id = ""
var pending_station_id = ""
var pending_station_node = null

var hud_layer
var ap_label
var coin_label
var bottle_label
var timer_label
var prompt_label
var tables_label
var service_label
var carrying_label

var encounter_panel
var result_panel
var result_label

var active_table = null
var active_table_id = ""
var active_encounter_id = ""
var encounter_is_open = false

var service_table = null
var service_table_id = ""
var service_step = "none"
var waiter_carrying = "none"
var wine_required = false
var current_outcome = ""

var station_by_id = {}

var enjoy_timer

@export_category("Station Timing")
@export_range(0.1, 30.0, 0.1) var bar_ready_seconds = 3.0
@export_range(0.1, 30.0, 0.1) var bar_annoyed_seconds = 5.0
@export_range(0.1, 30.0, 0.1) var chef_ready_seconds = 4.0
@export_range(0.1, 30.0, 0.1) var chef_annoyed_seconds = 6.0
@export_range(0.1, 10.0, 0.1) var scullery_full_seconds = 0.75
@export_range(0.1, 30.0, 0.1) var scullery_clean_seconds = 4.0
@export_range(0.1, 30.0, 0.1) var pos_ready_seconds = 1.25

var bar_ready_timer
var bar_annoyed_timer
var chef_ready_timer
var chef_annoyed_timer
var scullery_clean_timer
var pos_ready_timer

var bar_order_active = false
var bar_wine_ready = false

var chef_order_active = false
var chef_food_ready = false

var scullery_phase = "idle"

var pos_request_active = false
var pos_receipt_ready = false


func _ready():
	print("MAIN READY")

	if waiter_node != null:
		waiter_node.z_index = 100

	_create_hud()
	_create_enjoy_timer()
	_create_station_timers()
	_connect_all_tables()
	_connect_all_stations()

	_reset_station_runtime_flags()
	_reset_all_station_states()
	_refresh_world_feedback()
	update_hud()


func _process(delta):
	if waiter_is_moving:
		_update_waiter_movement(delta)

	if not shift_is_active:
		return

	shift_time_remaining -= delta

	if shift_time_remaining <= 0:
		shift_time_remaining = 0
		shift_is_active = false
		shift_end_title = "SHIFT ENDED"

		if enjoy_timer != null:
			enjoy_timer.stop()

		_stop_station_timers()

		print("SHIFT TIMER ENDED")
		_show_shift_complete_panel()

	update_hud()


func _create_enjoy_timer():
	enjoy_timer = Timer.new()
	enjoy_timer.one_shot = true
	enjoy_timer.wait_time = 5.0
	enjoy_timer.timeout.connect(_on_enjoy_timer_timeout)
	add_child(enjoy_timer)


func _create_station_timers():
	bar_ready_timer = _create_one_shot_timer(
		"BarReadyTimer",
		_on_bar_ready_timer_timeout
	)

	bar_annoyed_timer = _create_one_shot_timer(
		"BarAnnoyedTimer",
		_on_bar_annoyed_timer_timeout
	)

	chef_ready_timer = _create_one_shot_timer(
		"ChefReadyTimer",
		_on_chef_ready_timer_timeout
	)

	chef_annoyed_timer = _create_one_shot_timer(
		"ChefAnnoyedTimer",
		_on_chef_annoyed_timer_timeout
	)

	scullery_clean_timer = _create_one_shot_timer(
		"SculleryCleanTimer",
		_on_scullery_clean_timer_timeout
	)

	pos_ready_timer = _create_one_shot_timer(
		"POSReadyTimer",
		_on_pos_ready_timer_timeout
	)


func _create_one_shot_timer(timer_name, timeout_callback):
	var timer = Timer.new()
	timer.name = timer_name
	timer.one_shot = true
	timer.autostart = false
	timer.timeout.connect(timeout_callback)
	add_child(timer)
	return timer


func _create_hud():
	var hud_scene = preload("res://assets/scene/hud/HUD.tscn")
	hud_layer = hud_scene.instantiate()
	hud_layer.name = "HUDLayer"
	add_child(hud_layer)

	var hud_root = hud_layer.get_node("HUDRoot")

	ap_label = hud_root.get_node("APLabel")
	coin_label = hud_root.get_node("CoinDisplay")
	bottle_label = hud_root.get_node("BottleMeter")
	timer_label = hud_root.get_node("ShiftTimer")

	prompt_label = Label.new()
	prompt_label.name = "ResultPrompt"
	prompt_label.text = ""
	prompt_label.position = Vector2(420, 120)
	prompt_label.size = Vector2(760, 55)
	prompt_label.add_theme_font_size_override("font_size", 22)
	prompt_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	prompt_label.visible = false
	hud_root.add_child(prompt_label)

	service_label = Label.new()
	service_label.name = "ServiceStepLabel"
	service_label.text = "Service: Choose a table"
	service_label.position = Vector2(420, 178)
	service_label.size = Vector2(760, 30)
	service_label.add_theme_font_size_override("font_size", 20)
	hud_root.add_child(service_label)

	carrying_label = Label.new()
	carrying_label.name = "CarryingLabel"
	carrying_label.text = "Carrying: Nothing"
	carrying_label.position = Vector2(420, 208)
	carrying_label.size = Vector2(760, 30)
	carrying_label.add_theme_font_size_override("font_size", 20)
	hud_root.add_child(carrying_label)

	tables_label = Label.new()
	tables_label.name = "TablesLabel"
	tables_label.text = "Tables complete: 0 / 0"
	tables_label.position = Vector2(520, 238)
	tables_label.add_theme_font_size_override("font_size", 22)
	hud_root.add_child(tables_label)

	_create_encounter_test_panel(hud_root)
	_create_shift_result_panel(hud_root)

	print("HUD CREATED AT RUNTIME")


func _create_encounter_test_panel(hud_root):
	encounter_panel = Panel.new()
	encounter_panel.name = "EncounterTestPanel"
	encounter_panel.position = Vector2(520, 285)
	encounter_panel.size = Vector2(560, 220)
	encounter_panel.visible = false
	hud_root.add_child(encounter_panel)

	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(0.02, 0.10, 0.06, 0.88)
	panel_style.border_color = Color(0.95, 0.62, 0.18, 1.0)
	panel_style.set_border_width_all(4)
	panel_style.set_corner_radius_all(18)
	panel_style.shadow_color = Color(0, 0, 0, 0.45)
	panel_style.shadow_size = 12
	panel_style.shadow_offset = Vector2(0, 6)
	encounter_panel.add_theme_stylebox_override("panel", panel_style)

	var title = Label.new()
	title.name = "EncounterTitle"
	title.text = "SIMULATED WINE ENCOUNTER"
	title.position = Vector2(35, 25)
	title.size = Vector2(500, 30)
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", Color(1.0, 0.88, 0.58, 1.0))
	encounter_panel.add_child(title)

	var success_button = Button.new()
	success_button.text = "Success"
	success_button.position = Vector2(35, 90)
	success_button.size = Vector2(150, 55)
	success_button.pressed.connect(func(): _test_result("success"))
	encounter_panel.add_child(success_button)

	var failure_button = Button.new()
	failure_button.text = "Failure"
	failure_button.position = Vector2(205, 90)
	failure_button.size = Vector2(150, 55)
	failure_button.pressed.connect(func(): _test_result("failure"))
	encounter_panel.add_child(failure_button)

	var neutral_button = Button.new()
	neutral_button.text = "Neutral Exit"
	neutral_button.position = Vector2(375, 90)
	neutral_button.size = Vector2(150, 55)
	neutral_button.pressed.connect(func(): _test_result("neutral_exit"))
	encounter_panel.add_child(neutral_button)


func _create_shift_result_panel(hud_root):
	result_panel = Panel.new()
	result_panel.name = "ShiftResultPanel"
	result_panel.position = Vector2(470, 205)
	result_panel.size = Vector2(660, 430)
	result_panel.visible = false
	hud_root.add_child(result_panel)

	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(0.02, 0.10, 0.06, 0.88)
	panel_style.border_color = Color(0.95, 0.62, 0.18, 1.0)
	panel_style.set_border_width_all(4)
	panel_style.set_corner_radius_all(18)
	panel_style.shadow_color = Color(0, 0, 0, 0.45)
	panel_style.shadow_size = 12
	panel_style.shadow_offset = Vector2(0, 6)
	result_panel.add_theme_stylebox_override("panel", panel_style)

	result_label = Label.new()
	result_label.name = "ShiftResultLabel"
	result_label.position = Vector2(35, 28)
	result_label.size = Vector2(590, 370)
	result_label.add_theme_font_size_override("font_size", 20)
	result_label.add_theme_color_override("font_color", Color(1.0, 0.88, 0.58, 1.0))
	result_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	result_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	result_label.text = ""
	result_panel.add_child(result_label)


func _connect_all_tables():
	total_tables = 0

	for table in tables_container.get_children():
		if table.has_signal("table_clicked"):
			table.table_clicked.connect(_on_table_clicked)
			total_tables += 1
			print("CONNECTED TO TABLE: ", table.name)
		else:
			print("NODE IS NOT A TABLE: ", table.name)

	print("TOTAL TABLES: ", total_tables)


func _connect_all_stations():
	station_by_id.clear()

	var station_nodes = []
	_collect_station_nodes(stations_container, station_nodes)

	for station in station_nodes:
		if not station.station_clicked.is_connected(_on_station_clicked):
			station.station_clicked.connect(_on_station_clicked)

		var resolved_id = _normalise_station_id(station.get_station_id())

		if resolved_id == "":
			push_warning("STATION HAS AN EMPTY OR UNKNOWN ID: " + str(station.name))
			continue

		if station_by_id.has(resolved_id):
			push_warning("DUPLICATE STATION ID: " + resolved_id)

		station_by_id[resolved_id] = station
		print("CONNECTED TO STATION: ", station.name, " | ID: ", resolved_id)

	print("REGISTERED STATIONS: ", station_by_id.keys())


func _collect_station_nodes(root_node, result):
	for child in root_node.get_children():
		if child.has_signal("station_clicked") and child.has_method("get_station_id"):
			result.append(child)

		_collect_station_nodes(child, result)


func _on_table_clicked(table_node, table_id, encounter_id):
	if not shift_is_active:
		print("SHIFT IS NOT ACTIVE")
		return

	if waiter_is_moving:
		_set_prompt("Waiter is already moving.")
		return

	if encounter_is_open:
		print("AN ENCOUNTER IS ALREADY ACTIVE: ", active_table_id)
		return

	if service_step == "none":
		var table_state = ""

		if table_node.has_method("get_table_state"):
			table_state = table_node.get_table_state()

		if table_state != "available":
			_set_prompt("That table is not available.")
			print("TABLE NOT AVAILABLE: ", table_id, " | State: ", table_state)
			return

		_move_waiter_to_table(table_node, table_id, encounter_id)
		return

	if table_node != service_table:
		_set_prompt("Finish the current table first.")
		print("WRONG TABLE CLICKED DURING SERVICE: ", table_id)
		return

	if not _is_table_action_step():
		_set_prompt(_get_next_required_action_prompt())
		print("TABLE CLICK BLOCKED. CURRENT STEP NEEDS STATION: ", service_step)
		return

	_move_waiter_to_table(table_node, table_id, encounter_id)


func _on_station_clicked(station_node, station_id):
	if not shift_is_active:
		print("SHIFT IS NOT ACTIVE")
		return

	if waiter_is_moving:
		_set_prompt("Waiter is already moving.")
		return

	if encounter_is_open:
		_set_prompt("Finish the wine encounter first.")
		return

	if service_step == "none":
		_set_prompt("No active table service. Click a table first.")
		return

	var resolved_id = _normalise_station_id(station_id)

	if resolved_id == "":
		_set_prompt("This station has an invalid station ID.")
		push_warning("INVALID CLICKED STATION ID: " + str(station_id))
		return

	station_by_id[resolved_id] = station_node
	_move_waiter_to_station(station_node, resolved_id)


func _move_waiter_to_table(table_node, table_id, encounter_id):
	pending_interaction_type = "table"
	pending_table_node = table_node
	pending_table_id = table_id
	pending_encounter_id = encounter_id
	pending_station_id = ""
	pending_station_node = null

	var table_target = table_node.global_position

	if table_node.has_method("get_interaction_position"):
		table_target = table_node.get_interaction_position()

	var route_marker = _get_route_marker_for_table()

	_start_waiter_route_to_table(table_target, route_marker)

	_set_prompt("Waiter moving to table.")
	print("WAITER MOVING TO TABLE: ", table_id, " Target: ", table_target)


func _move_waiter_to_station(station_node, station_id):
	var resolved_id = _normalise_station_id(station_id)

	pending_interaction_type = "station"
	pending_table_node = null
	pending_table_id = ""
	pending_encounter_id = ""
	pending_station_id = resolved_id
	pending_station_node = station_node

	var station_target = station_node.global_position

	if station_node.has_method("get_interaction_position"):
		station_target = station_node.get_interaction_position()

	_start_waiter_route(station_target, resolved_id)

	_set_prompt("Waiter moving to " + _format_station_name(resolved_id) + ".")
	print("WAITER MOVING TO STATION: ", resolved_id, " Target: ", station_target)


func _start_waiter_route(final_target_position, station_id = ""):
	waiter_route_points.clear()
	waiter_route_index = 0

	var route_marker = _get_route_marker_for_station(station_id)

	if route_marker != null:
		waiter_route_points.append(route_marker.global_position)

	waiter_route_points.append(final_target_position)

	waiter_move_target = waiter_route_points[0]
	waiter_is_moving = true


func _start_waiter_route_to_table(final_target_position, route_marker):
	waiter_route_points.clear()
	waiter_route_index = 0

	if route_marker != null:
		waiter_route_points.append(route_marker.global_position)

	waiter_route_points.append(final_target_position)

	waiter_move_target = waiter_route_points[0]
	waiter_is_moving = true


func _get_route_marker_for_station(station_id):
	station_id = _normalise_station_id(station_id)
	var marker_name = ""

	if station_id == "bar":
		marker_name = "BarRoutePoint"
	elif station_id == "chef":
		marker_name = "ChefRoutePoint"
	elif station_id == "scullery":
		marker_name = "SculleryRoutePoint"
	elif station_id == "pos":
		marker_name = "POSRoutePoint"

	if marker_name == "":
		return null

	return get_node_or_null("RestaurantFloor/WorldIcons/" + marker_name)


func _get_route_marker_for_table():
	if service_step == "deliver_wine_to_table":
		return get_node_or_null("RestaurantFloor/WorldIcons/BarRoutePoint")

	if service_step == "deliver_food_to_table":
		return get_node_or_null("RestaurantFloor/WorldIcons/ChefRoutePoint")

	if service_step == "deliver_receipt_to_table":
		return get_node_or_null("RestaurantFloor/WorldIcons/POSRoutePoint")

	return null


func _update_waiter_movement(delta):
	if waiter_node == null:
		waiter_is_moving = false
		_execute_pending_interaction()
		return

	if waiter_node.has_method("set_carrying"):
		waiter_node.set_carrying(waiter_carrying)

	var current_position = waiter_node.global_position
	var move_vector = waiter_move_target - current_position
	var next_position = current_position.move_toward(waiter_move_target, waiter_speed * delta)

	waiter_node.global_position = next_position

	if waiter_node.has_method("update_walk_animation"):
		waiter_node.update_walk_animation(move_vector)

	if next_position.distance_to(waiter_move_target) <= waiter_arrival_distance:
		waiter_node.global_position = waiter_move_target

		waiter_route_index += 1

		if waiter_route_index < waiter_route_points.size():
			waiter_move_target = waiter_route_points[waiter_route_index]

			if waiter_node.has_method("update_walk_animation"):
				waiter_node.update_walk_animation(
					waiter_move_target - waiter_node.global_position
				)

			print("WAITER NEXT ROUTE POINT: ", waiter_move_target)
			return

		waiter_is_moving = false

		if waiter_node.has_method("play_idle"):
			waiter_node.play_idle()

		_execute_pending_interaction()


func _execute_pending_interaction():
	if pending_interaction_type == "table":
		_execute_table_interaction(pending_table_node, pending_table_id, pending_encounter_id)

	elif pending_interaction_type == "station":
		_execute_station_interaction(
			pending_station_node,
			pending_station_id
		)

	pending_interaction_type = ""
	pending_table_node = null
	pending_table_id = ""
	pending_encounter_id = ""
	pending_station_id = ""
	pending_station_node = null


func _execute_table_interaction(table_node, table_id, encounter_id):
	if table_node == null:
		_set_prompt("Table interaction failed.")
		return

	if service_step == "none":
		_open_encounter_for_table(table_node, table_id, encounter_id)
		return

	_handle_service_table_click()


func _execute_station_interaction(station_node, station_id):
	var resolved_id = _normalise_station_id(station_id)

	if station_node != null and resolved_id != "":
		station_by_id[resolved_id] = station_node

	if resolved_id == "bar":
		_handle_bar_click()
	elif resolved_id == "chef":
		_handle_chef_click()
	elif resolved_id == "scullery":
		_handle_scullery_click()
	elif resolved_id == "pos":
		_handle_pos_click()
	elif resolved_id == "mise_en_place":
		_set_prompt("Mise en place is not required in this service loop yet.")
	else:
		_set_prompt("Unknown station: " + str(station_id))

	_refresh_world_feedback()
	update_hud()


func _open_encounter_for_table(table_node, table_id, encounter_id):
	print("TABLE SELECTED: ", table_id, " | Encounter: ", encounter_id)

	active_table = table_node
	active_table_id = table_id
	active_encounter_id = encounter_id
	encounter_is_open = true

	if active_table.has_method("mark_in_encounter"):
		active_table.mark_in_encounter()

	print("SIMULATED ENCOUNTER OPENED")
	print("Choose Success / Failure / Neutral Exit")

	_show_encounter_panel()
	_refresh_world_feedback()


func _handle_bar_click():
	if service_step == "take_wine_order_to_bar":
		waiter_carrying = "food_order"
		service_step = "take_food_order_to_chef"

		bar_order_active = true
		bar_wine_ready = false

		bar_ready_timer.stop()
		bar_annoyed_timer.stop()

		_set_station_state("bar", "mixing", true)
		bar_ready_timer.start(bar_ready_seconds)

		_set_prompt(
			"Wine order placed at Bar. The bartender is mixing. "
			+ "Now take the food order to Chef."
		)
		print("WINE ORDER PLACED AT BAR")
		return

	if service_step == "collect_wine_from_bar":
		if not bar_order_active:
			_set_prompt("There is no active wine order at the Bar.")
			return

		if not bar_wine_ready:
			_set_prompt("The wine is still being prepared.")
			return

		bar_ready_timer.stop()
		bar_annoyed_timer.stop()

		bar_order_active = false
		bar_wine_ready = false

		waiter_carrying = "wine_bottle"
		service_step = "deliver_wine_to_table"

		_set_station_state("bar", "idle", true)

		_set_prompt("Wine collected from Bar. Deliver it to the table.")
		print("WINE COLLECTED FROM BAR")
		return

	_set_prompt("Bar is not needed yet.")


func _handle_chef_click():
	if service_step == "take_food_order_to_chef":
		waiter_carrying = "none"

		chef_order_active = true
		chef_food_ready = false

		chef_ready_timer.stop()
		chef_annoyed_timer.stop()

		_set_station_state("chef", "cooking", true)
		chef_ready_timer.start(chef_ready_seconds)

		if wine_required:
			service_step = "collect_wine_from_bar"

			if bar_wine_ready:
				_set_prompt(
					"Food order placed. Chef is cooking and the wine is ready at Bar."
				)
			else:
				_set_prompt(
					"Food order placed. Chef is cooking. The Bar is still preparing the wine."
				)
		else:
			service_step = "collect_food_from_chef"
			_set_prompt(
				"Food order placed. Chef is cooking. Wait until the food is ready."
			)

		print("FOOD ORDER PLACED AT CHEF")
		return

	if service_step == "collect_food_from_chef":
		if not chef_order_active:
			_set_prompt("There is no active food order at Chef.")
			return

		if not chef_food_ready:
			_set_prompt("The food is still cooking.")
			return

		chef_ready_timer.stop()
		chef_annoyed_timer.stop()

		chef_order_active = false
		chef_food_ready = false

		waiter_carrying = "food_plate"
		service_step = "deliver_food_to_table"

		_set_station_state("chef", "idle", true)

		_set_prompt("Food collected from Chef. Deliver it to the table.")
		print("FOOD COLLECTED FROM CHEF")
		return

	_set_prompt("Chef is not needed yet.")


func _handle_scullery_click():
	if service_step == "drop_plates_at_scullery":
		if waiter_carrying != "dirty_plates":
			_set_prompt("You need dirty plates before using Scullery.")
			return

		waiter_carrying = "none"
		service_step = "request_receipt_at_pos"

		scullery_clean_timer.stop()
		scullery_phase = "full"

		_set_station_state("scullery", "full", true)
		scullery_clean_timer.start(scullery_full_seconds)

		_set_prompt(
			"Dirty plates dropped at Scullery. Go to POS to request the receipt."
		)
		print("DIRTY PLATES DROPPED AT SCULLERY")
		return

	_set_prompt("Scullery is not needed yet.")


func _handle_pos_click():
	if service_step == "request_receipt_at_pos":
		pos_ready_timer.stop()

		pos_request_active = true
		pos_receipt_ready = false
		service_step = "collect_receipt_from_pos"

		_set_station_state("pos", "active", true)
		pos_ready_timer.start(pos_ready_seconds)

		_set_prompt("POS is printing the receipt. Wait until it is ready.")
		print("RECEIPT REQUESTED AT POS")
		return

	if service_step == "collect_receipt_from_pos":
		if not pos_request_active:
			_set_prompt("Request the receipt at POS first.")
			return

		if not pos_receipt_ready:
			_set_prompt("The receipt is still printing.")
			return

		pos_ready_timer.stop()

		pos_request_active = false
		pos_receipt_ready = false

		waiter_carrying = "receipt"
		service_step = "deliver_receipt_to_table"

		_set_station_state("pos", "idle", true)

		_set_prompt("Receipt collected from POS. Return it to the table.")
		print("RECEIPT COLLECTED FROM POS")
		return

	_set_prompt("POS is not needed yet.")


func _on_bar_ready_timer_timeout():
	if not bar_order_active:
		return

	bar_wine_ready = true
	_set_station_state("bar", "ready_collection", true)
	bar_annoyed_timer.start(bar_annoyed_seconds)

	print("BAR WINE READY")

	if service_step == "collect_wine_from_bar":
		_set_prompt("The wine is ready at Bar. Collect it before the bartender becomes annoyed.")

	_refresh_world_feedback()
	update_hud()


func _on_bar_annoyed_timer_timeout():
	if not bar_order_active or not bar_wine_ready:
		return

	_set_station_state("bar", "annoyed", true)
	print("BARTENDER ANNOYED: WINE WAITING TOO LONG")

	if service_step == "collect_wine_from_bar":
		_set_prompt("The bartender is annoyed. Collect the waiting wine.")

	_refresh_world_feedback()
	update_hud()


func _on_chef_ready_timer_timeout():
	if not chef_order_active:
		return

	chef_food_ready = true

	# Food has finished cooking. Change to the Chef ready texture now,
	# then start the separate late-collection timer.
	_set_station_state("chef", "ready_collection", true)
	chef_annoyed_timer.stop()
	chef_annoyed_timer.start(chef_annoyed_seconds)

	print("CHEF FOOD READY")

	if service_step == "collect_food_from_chef":
		_set_prompt("The food is ready at Chef. Collect it before the Chef becomes annoyed.")

	_refresh_world_feedback()
	update_hud()


func _on_chef_annoyed_timer_timeout():
	if not chef_order_active or not chef_food_ready:
		return

	_set_station_state("chef", "annoyed", true)
	print("CHEF ANNOYED: FOOD WAITING TOO LONG")

	if service_step == "collect_food_from_chef":
		_set_prompt("The Chef is annoyed. Collect the waiting food.")

	_refresh_world_feedback()
	update_hud()


func _on_scullery_clean_timer_timeout():
	if scullery_phase == "full":
		scullery_phase = "washing"
		_set_station_state("scullery", "active", true)
		scullery_clean_timer.start(scullery_clean_seconds)
		print("SCULLERY STARTED WASHING")

	elif scullery_phase == "washing":
		scullery_phase = "idle"
		_set_station_state("scullery", "empty", true)
		print("SCULLERY CLEANING COMPLETE")

	_refresh_world_feedback()
	update_hud()


func _on_pos_ready_timer_timeout():
	if not pos_request_active:
		return

	pos_receipt_ready = true
	_set_station_state("pos", "ready_collection", true)
	print("POS RECEIPT READY")

	if service_step == "collect_receipt_from_pos":
		_set_prompt("The receipt is ready at POS. Collect it.")

	_refresh_world_feedback()
	update_hud()


func _handle_service_table_click():
	if service_step == "deliver_wine_to_table":
		if waiter_carrying != "wine_bottle":
			_set_prompt("Collect the wine from the Bar first.")
			return

		waiter_carrying = "none"
		service_step = "collect_food_from_chef"

		if chef_food_ready:
			_set_prompt("Wine delivered. The food is ready at Chef.")
		else:
			_set_prompt("Wine delivered. Chef is still cooking the food.")

		print("WINE DELIVERED TO TABLE")
		_refresh_world_feedback()
		update_hud()
		return

	if service_step == "deliver_food_to_table":
		if waiter_carrying != "food_plate":
			_set_prompt("Collect the food from Chef first.")
			return

		waiter_carrying = "none"
		service_step = "enjoying"

		if service_table != null and service_table.has_method("set_enjoying"):
			service_table.set_enjoying()

		_set_prompt("Food delivered. Table is enjoying for 5 seconds.")
		print("FOOD DELIVERED TO TABLE")
		enjoy_timer.start()
		_refresh_world_feedback()
		update_hud()
		return

	if service_step == "collect_dirty_plates":
		waiter_carrying = "dirty_plates"
		service_step = "drop_plates_at_scullery"

		if service_table != null and service_table.has_method("set_plates_collected"):
			service_table.set_plates_collected()

		_set_prompt("Dirty plates collected. Take them to Scullery.")
		print("DIRTY PLATES COLLECTED FROM TABLE")
		_refresh_world_feedback()
		update_hud()
		return

	if service_step == "deliver_receipt_to_table":
		if waiter_carrying != "receipt":
			_set_prompt("Collect the receipt from POS first.")
			return

		waiter_carrying = "none"
		_complete_service_table()
		return

	if service_step == "enjoying":
		_set_prompt("The table is still enjoying. Wait a moment.")
		return

	_set_prompt("This table is waiting for another action.")


func _on_enjoy_timer_timeout():
	if service_table == null:
		return

	service_step = "collect_dirty_plates"

	if service_table.has_method("set_ready_to_clear"):
		service_table.set_ready_to_clear()

	_set_prompt("Table is ready to clear. Click the table to collect dirty plates.")
	print("TABLE ENJOY TIMER COMPLETE")
	_refresh_world_feedback()
	update_hud()


func _test_result(outcome):
	if active_table == null:
		print("NO ACTIVE TABLE SELECTED")
		return

	print("TEST RESULT RECEIVED: ", outcome)

	var result = {
		"tableId": active_table_id,
		"encounterId": active_encounter_id,
		"outcome": outcome,
		"apDelta": 0,
		"coinsDelta": 0,
		"bottleProgressDelta": 0
	}

	if outcome == "success":
		result["apDelta"] = 30
		result["coinsDelta"] = 15
		result["bottleProgressDelta"] = 1

	elif outcome == "failure":
		result["apDelta"] = -15
		result["coinsDelta"] = 0
		result["bottleProgressDelta"] = 0

	elif outcome == "neutral_exit":
		result["apDelta"] = 5
		result["coinsDelta"] = 0
		result["bottleProgressDelta"] = 0

	apply_encounter_result(result)


func apply_encounter_result(result):
	print("APPLYING ENCOUNTER RESULT: ", result["outcome"])

	ap += result["apDelta"]
	coins += result["coinsDelta"]
	bottle_meter += result["bottleProgressDelta"]

	if bottle_meter > bottle_meter_max:
		bottle_meter = bottle_meter_max

	if bottle_meter < 0:
		bottle_meter = 0

	if result["outcome"] == "success":
		success_count += 1
	elif result["outcome"] == "failure":
		failure_count += 1
	elif result["outcome"] == "neutral_exit":
		neutral_exit_count += 1

	current_outcome = result["outcome"]

	service_table = active_table
	service_table_id = active_table_id

	if service_table != null and service_table.has_method("set_result_state"):
		service_table.set_result_state(result["outcome"])

	active_table = null
	active_table_id = ""
	active_encounter_id = ""
	encounter_is_open = false

	_hide_encounter_panel()

	if current_outcome == "success":
		wine_required = true
		waiter_carrying = "wine_order"
		service_step = "take_wine_order_to_bar"
		_set_prompt("Wine sale made. Take the wine order to Bar.")
	else:
		wine_required = false
		waiter_carrying = "food_order"
		service_step = "take_food_order_to_chef"
		_set_prompt("No wine sale. Continue service: take the food order to Chef.")

	_refresh_world_feedback()
	update_hud()


func _complete_service_table():
	print("SERVICE TABLE COMPLETE: ", service_table_id)

	if service_table != null and service_table.has_method("set_complete"):
		service_table.set_complete()

	completed_tables += 1

	service_table = null
	service_table_id = ""
	service_step = "none"
	waiter_carrying = "none"
	wine_required = false
	current_outcome = ""

	# Do not reset station visuals here.
	# Bar, Chef, and POS already return to idle when their item is collected.
	# Scullery remains active until its own cleaning timer finishes.
	_refresh_world_feedback()
	update_hud()

	if completed_tables >= total_tables:
		shift_is_active = false
		shift_end_title = "SHIFT COMPLETE"
		print("SHIFT COMPLETE")
		_show_shift_complete_panel()
	else:
		_set_prompt("Table complete. Choose the next table.")


func _refresh_world_feedback():
	# This function updates labels and status prompts only.
	# It must never call _set_station_state().
	_clear_all_station_statuses()

	for table in tables_container.get_children():
		if not table.has_method("get_table_state"):
			continue

		var state = table.get_table_state()

		if table == service_table:
			table.set_status_text(_get_service_table_status())
		elif state == "available":
			table.set_status_text("Wine opportunity")
		elif state == "complete":
			table.set_status_text("Complete")
		elif state == "in_encounter":
			table.set_status_text("Wine encounter")
		else:
			table.set_status_text("Busy")

	if service_step == "take_wine_order_to_bar":
		_set_station_status("bar", "Place wine order")

	elif service_step == "take_food_order_to_chef":
		_set_station_status("chef", "Place food order")

		if wine_required:
			if bar_wine_ready:
				_set_station_status("bar", "Wine ready")
			else:
				_set_station_status("bar", "Mixing wine")

	elif service_step == "collect_wine_from_bar":
		if bar_wine_ready:
			_set_station_status("bar", "Wine ready")
		else:
			_set_station_status("bar", "Mixing wine")

		if chef_order_active:
			if chef_food_ready:
				_set_station_status("chef", "Food ready")
			else:
				_set_station_status("chef", "Cooking")

	elif service_step == "deliver_wine_to_table":
		if chef_food_ready:
			_set_station_status("chef", "Food ready")
		else:
			_set_station_status("chef", "Cooking")

	elif service_step == "collect_food_from_chef":
		if chef_food_ready:
			_set_station_status("chef", "Food ready")
		else:
			_set_station_status("chef", "Cooking")

	elif service_step == "drop_plates_at_scullery":
		_set_station_status("scullery", "Drop plates")

	elif service_step == "request_receipt_at_pos":
		if scullery_phase == "full":
			_set_station_status("scullery", "Dirty plates received")
		elif scullery_phase == "washing":
			_set_station_status("scullery", "Washing")

		_set_station_status("pos", "Request receipt")

	elif service_step == "collect_receipt_from_pos":
		if scullery_phase == "full":
			_set_station_status("scullery", "Dirty plates received")
		elif scullery_phase == "washing":
			_set_station_status("scullery", "Washing")

		if pos_receipt_ready:
			_set_station_status("pos", "Receipt ready")
		else:
			_set_station_status("pos", "Printing receipt")

	elif service_step == "deliver_receipt_to_table":
		if scullery_phase == "full":
			_set_station_status("scullery", "Dirty plates received")
		elif scullery_phase == "washing":
			_set_station_status("scullery", "Washing")


func _reset_all_station_states():
	_set_station_state("bar", "idle", true)
	_set_station_state("chef", "idle", true)
	_set_station_state("scullery", "empty", true)
	_set_station_state("pos", "idle", true)
	_set_station_state("mise_en_place", "stocked", true)


func _get_service_table_status():
	if service_step == "take_wine_order_to_bar":
		return "Order taken"

	if service_step == "take_food_order_to_chef":
		return "Order taken"

	if service_step == "collect_wine_from_bar":
		if bar_wine_ready:
			return "Wine ready"
		return "Waiting for wine"

	if service_step == "deliver_wine_to_table":
		return "Deliver wine"

	if service_step == "collect_food_from_chef":
		if chef_food_ready:
			return "Food ready"

		if wine_required:
			return "Wine served"

		return "Waiting for food"

	if service_step == "deliver_food_to_table":
		return "Deliver food"

	if service_step == "enjoying":
		return "Enjoying..."

	if service_step == "collect_dirty_plates":
		return "Ready to clear"

	if service_step == "drop_plates_at_scullery":
		return "Plates collected"

	if service_step == "request_receipt_at_pos":
		return "Request bill"

	if service_step == "collect_receipt_from_pos":
		if pos_receipt_ready:
			return "Bill ready"
		return "Waiting for bill"

	if service_step == "deliver_receipt_to_table":
		return "Deliver receipt"

	return "In service"


func _is_table_action_step():
	if service_step == "deliver_wine_to_table":
		return true

	if service_step == "deliver_food_to_table":
		return true

	if service_step == "collect_dirty_plates":
		return true

	if service_step == "deliver_receipt_to_table":
		return true

	return false


func _get_next_required_action_prompt():
	if service_step == "take_wine_order_to_bar":
		return "Take the wine order to Bar first."

	if service_step == "take_food_order_to_chef":
		return "Take the food order to Chef first."

	if service_step == "collect_wine_from_bar":
		if bar_wine_ready:
			return "Collect the wine from Bar first."
		return "The wine is still being prepared at Bar."

	if service_step == "collect_food_from_chef":
		if chef_food_ready:
			return "Collect the food from Chef first."
		return "The food is still cooking."

	if service_step == "drop_plates_at_scullery":
		return "Drop the dirty plates at Scullery first."

	if service_step == "request_receipt_at_pos":
		return "Go to POS and request the receipt first."

	if service_step == "collect_receipt_from_pos":
		if pos_receipt_ready:
			return "Collect the receipt from POS first."
		return "The receipt is still printing."

	if service_step == "enjoying":
		return "The table is still enjoying. Wait a moment."

	return "Follow the current service step."


func _set_station_status(station_id, message):
	var resolved_id = _normalise_station_id(station_id)
	var station = _get_registered_station(resolved_id)

	if station == null:
		print("STATION ID NOT FOUND: ", resolved_id)
		return

	if station.has_method("set_station_status"):
		station.set_station_status(message)


func _set_station_state(station_id, state, force_refresh = false):
	var resolved_id = _normalise_station_id(station_id)
	var station = _get_registered_station(resolved_id)

	if station == null:
		push_warning(
			"STATION STATE FAILED. STATION ID NOT FOUND: "
			+ resolved_id
		)
		return false

	if not station.has_method("set_station_state"):
		push_warning(
			"STATION HAS NO set_station_state METHOD: "
			+ resolved_id
		)
		return false

	var changed = station.set_station_state(
		state,
		force_refresh
	)

	if not changed:
		push_warning(
			"STATION VISUAL CHANGE FAILED: "
			+ resolved_id
			+ " -> "
			+ str(state)
		)

	return changed


func _get_registered_station(station_id):
	if station_by_id.has(station_id):
		return station_by_id[station_id]

	var found_station = _find_station_by_id(
		stations_container,
		station_id
	)

	if found_station != null:
		station_by_id[station_id] = found_station

	return found_station


func _find_station_by_id(root_node, station_id):
	for child in root_node.get_children():
		if child.has_method("get_station_id"):
			var child_id = _normalise_station_id(
				child.get_station_id()
			)

			if child_id == station_id:
				return child

		var nested_station = _find_station_by_id(
			child,
			station_id
		)

		if nested_station != null:
			return nested_station

	return null


func _normalise_station_id(value):
	var normalised = str(value).strip_edges().to_lower()
	normalised = normalised.replace("-", "_")
	normalised = normalised.replace(" ", "_")

	match normalised:
		"bar", "bar_station", "barstation":
			return "bar"

		"chef", "kitchen", "chef_station", "kitchen_station", "chefstation", "kitchenstation":
			return "chef"

		"scullery", "scullery_station", "scullerystation":
			return "scullery"

		"pos", "pos_station", "posstation":
			return "pos"

		"mise_en_place", "mise", "mise_en_place_station", "miseenplace", "miseenplacestation":
			return "mise_en_place"

	return normalised


func _clear_all_station_statuses():
	for station in stations_container.get_children():
		if station.has_method("clear_station_status"):
			station.clear_station_status()


func update_hud():
	ap_label.text = "AP: " + str(ap)
	coin_label.text = "Coins: " + str(coins)
	bottle_label.text = "Bottles: " + str(bottle_meter) + " / " + str(bottle_meter_max)

	var total_seconds = int(shift_time_remaining)
	var minutes = int(float(total_seconds) / 60.0)
	var seconds = total_seconds % 60

	timer_label.text = "Time: " + str(minutes).pad_zeros(2) + ":" + str(seconds).pad_zeros(2)
	tables_label.text = "Tables complete: " + str(completed_tables) + " / " + str(total_tables)
	service_label.text = "Service: " + _format_service_step(service_step)
	carrying_label.text = "Carrying: " + _format_carrying(waiter_carrying)


func _format_service_step(step):
	if step == "none":
		return "Choose a table"
	if step == "take_wine_order_to_bar":
		return "Take wine order to Bar"
	if step == "take_food_order_to_chef":
		return "Take food order to Chef"
	if step == "collect_wine_from_bar":
		if bar_wine_ready:
			return "Collect wine from Bar"
		return "Wait for wine at Bar"
	if step == "deliver_wine_to_table":
		return "Deliver wine to table"
	if step == "collect_food_from_chef":
		if chef_food_ready:
			return "Collect food from Chef"
		return "Wait for food at Chef"
	if step == "deliver_food_to_table":
		return "Deliver food to table"
	if step == "enjoying":
		return "Table enjoying"
	if step == "collect_dirty_plates":
		return "Collect dirty plates"
	if step == "drop_plates_at_scullery":
		return "Drop plates at Scullery"
	if step == "request_receipt_at_pos":
		return "Request receipt at POS"
	if step == "collect_receipt_from_pos":
		if pos_receipt_ready:
			return "Collect receipt from POS"
		return "Wait for receipt at POS"
	if step == "deliver_receipt_to_table":
		return "Deliver receipt to table"

	return step


func _format_carrying(item):
	if item == "none":
		return "Nothing"
	if item == "wine_order":
		return "Wine order"
	if item == "food_order":
		return "Food order"
	if item == "wine_bottle":
		return "Wine bottle"
	if item == "food_plate":
		return "Food plate"
	if item == "dirty_plates":
		return "Dirty plates"
	if item == "receipt":
		return "Receipt"

	return item


func _format_station_name(station_id):
	if station_id == "bar":
		return "Bar"
	if station_id == "chef":
		return "Chef"
	if station_id == "scullery":
		return "Scullery"
	if station_id == "pos":
		return "POS"
	if station_id == "mise_en_place":
		return "Mise en Place"

	return station_id


func _show_encounter_panel():
	_set_prompt("Encounter open: choose an outcome")
	encounter_panel.visible = true


func _hide_encounter_panel():
	encounter_panel.visible = false


func _set_prompt(message):
	prompt_label.text = message
	prompt_label.visible = true
	print("PROMPT: ", message)


func _show_shift_complete_panel():
	_hide_encounter_panel()

	result_label.text = (
		shift_end_title + "\n\n"
		+ "AP earned: " + str(ap) + "\n"
		+ "Coins earned: " + str(coins) + "\n"
		+ "Bottles sold: " + str(bottle_meter) + " / " + str(bottle_meter_max) + "\n"
		+ "Tables complete: " + str(completed_tables) + " / " + str(total_tables) + "\n\n"
		+ "Successes: " + str(success_count) + "\n"
		+ "Failures: " + str(failure_count) + "\n"
		+ "Neutral exits: " + str(neutral_exit_count) + "\n\n"
		+ "Press R to reset shift"
	)

	result_panel.visible = true


func _stop_station_timers():
	var station_timers = [
		bar_ready_timer,
		bar_annoyed_timer,
		chef_ready_timer,
		chef_annoyed_timer,
		scullery_clean_timer,
		pos_ready_timer
	]

	for timer in station_timers:
		if timer != null:
			timer.stop()


func _reset_station_runtime_flags():
	bar_order_active = false
	bar_wine_ready = false

	chef_order_active = false
	chef_food_ready = false

	scullery_phase = "idle"

	pos_request_active = false
	pos_receipt_ready = false


func reset_shift():
	print("RESETTING SHIFT")

	if enjoy_timer != null:
		enjoy_timer.stop()

	_stop_station_timers()
	_reset_station_runtime_flags()

	ap = 0
	coins = 0
	bottle_meter = 0

	completed_tables = 0
	success_count = 0
	failure_count = 0
	neutral_exit_count = 0

	shift_time_remaining = 300.0
	shift_is_active = true
	shift_end_title = "SHIFT COMPLETE"

	active_table = null
	active_table_id = ""
	active_encounter_id = ""
	encounter_is_open = false

	service_table = null
	service_table_id = ""
	service_step = "none"
	waiter_carrying = "none"
	wine_required = false
	current_outcome = ""

	waiter_is_moving = false
	waiter_route_points.clear()
	waiter_route_index = 0

	pending_interaction_type = ""
	pending_table_node = null
	pending_table_id = ""
	pending_encounter_id = ""
	pending_station_id = ""
	pending_station_node = null

	for table in tables_container.get_children():
		if table.has_method("reset_table"):
			table.reset_table()

	_reset_all_station_states()

	if waiter_node != null and waiter_node.has_method("set_carrying"):
		waiter_node.set_carrying("none")

	if waiter_node != null and waiter_node.has_method("play_idle"):
		waiter_node.play_idle()

	result_panel.visible = false
	_hide_encounter_panel()
	prompt_label.visible = false

	_refresh_world_feedback()
	update_hud()


func _unhandled_input(event):
	if event is InputEventKey and event.pressed and not event.echo:
		if encounter_is_open:
			if event.keycode == KEY_1:
				_test_result("success")
				get_viewport().set_input_as_handled()

			elif event.keycode == KEY_2:
				_test_result("failure")
				get_viewport().set_input_as_handled()

			elif event.keycode == KEY_3:
				_test_result("neutral_exit")
				get_viewport().set_input_as_handled()

		else:
			if event.keycode == KEY_R:
				reset_shift()
				get_viewport().set_input_as_handled()
