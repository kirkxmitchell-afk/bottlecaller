extends CharacterBody2D


signal carrying_visual_changed(previous_visual, new_visual)
signal facing_direction_changed(previous_direction, new_direction)
signal waiter_animation_changed(animation_name)

signal navigation_started(requested_target, resolved_target)
signal navigation_arrived(requested_target, final_position)
signal navigation_failed(requested_target, reason)
signal navigation_cancelled


const CARRY_EMPTY = "empty"
const CARRY_WINE_BOTTLE = "wine_bottle"
const CARRY_FOOD_PLATE = "food_plate"
const CARRY_DIRTY_PLATES = "dirty_plates"
const CARRY_RECEIPT = "receipt"


@export_category("Drawing")

## Keep the waiter below table artwork.
@export var waiter_z_index = 100


@export_category("Navigation")

@export_range(20.0, 800.0, 5.0)
var navigation_speed = 280.0

@export_range(2.0, 100.0, 1.0)
var path_desired_distance = 5.0

@export_range(2.0, 100.0, 1.0)
var target_desired_distance = 10.0

@export_range(1, 180, 1)
var navigation_map_wait_frames = 120

@export var clamp_targets_to_navigation = true
@export var use_direct_fallback = false
@export var navigation_debug_enabled = false


@export_category("Animation")

@export_range(0.1, 4.0, 0.05)
var animation_speed_scale = 1.0

@export_enum(
	"down",
	"down_right",
	"right",
	"up_right",
	"up",
	"up_left",
	"left",
	"down_left"
)
var default_direction = "down"

@export var print_missing_animation_warnings = true

## Enable only if the animation names in SpriteFrames were assigned
## opposite to the actual artwork direction.
@export var swap_left_and_right_animation_names = false
@export var swap_up_and_down_animation_names = false


@onready var sprite: AnimatedSprite2D = \
	get_node_or_null("AnimatedSprite2D") as AnimatedSprite2D

@onready var navigation_agent: NavigationAgent2D = \
	get_node_or_null("NavigationAgent2D") as NavigationAgent2D


var carrying_visual = CARRY_EMPTY
var last_direction = "down"
var current_walk_animation = ""
var is_walking = false

var _last_missing_animation_signature = ""

var _navigation_active = false
var _navigation_mode = "none"
var _navigation_requested_target = Vector2.ZERO
var _navigation_resolved_target = Vector2.ZERO
var _navigation_map_wait_count = 0
var _agent_target_set_physics_frame = -1


func _ready():
	print("WAITER READY")

	z_as_relative = false
	z_index = waiter_z_index
	last_direction = _normalise_direction(default_direction)

	if sprite == null:
		push_warning(
			"WAITER CONTROLLER COULD NOT FIND AnimatedSprite2D"
		)
		return

	sprite.visible = true
	# Use an absolute sprite layer so parent ordering cannot place the
	# waiter above table artwork.
	sprite.z_as_relative = false
	sprite.z_index = waiter_z_index
	sprite.speed_scale = animation_speed_scale

	_configure_navigation_agent()
	play_idle(true)


func _physics_process(_delta):
	if not _navigation_active:
		velocity = Vector2.ZERO
		return

	if _navigation_mode == "waiting_for_map":
		_update_waiting_for_navigation_map()
		return

	if _navigation_mode == "agent":
		_update_agent_navigation()
		return

	if _navigation_mode == "direct":
		_update_direct_navigation()
		return

	_fail_navigation("Unknown navigation mode.")


## Starts a pathfinding request to a global position.
##
## Main.gd keeps ownership of the pending table/station interaction.
## This controller only moves the CharacterBody2D and emits arrival.
func navigate_to(target_position):
	var requested_target = Vector2(target_position)

	stop_navigation(false)

	_navigation_requested_target = requested_target
	_navigation_resolved_target = requested_target
	_navigation_map_wait_count = 0
	_navigation_active = true

	if navigation_agent != null:
		_navigation_mode = "waiting_for_map"
		_update_waiting_for_navigation_map()
		return true

	if use_direct_fallback:
		_begin_direct_navigation()
		return true

	_fail_navigation(
		"NavigationAgent2D is missing and direct fallback is disabled."
	)
	return false


func stop_navigation(emit_cancelled_signal = true):
	var was_active = _navigation_active

	_navigation_active = false
	_navigation_mode = "none"
	_navigation_map_wait_count = 0
	_agent_target_set_physics_frame = -1
	velocity = Vector2.ZERO

	if navigation_agent != null:
		navigation_agent.velocity = Vector2.ZERO

	play_idle()

	if was_active and emit_cancelled_signal:
		navigation_cancelled.emit()


func is_navigating():
	return _navigation_active


func get_navigation_target():
	return _navigation_requested_target


func _configure_navigation_agent():
	if navigation_agent == null:
		push_warning(
			"Waiter has no NavigationAgent2D."
		)
		return

	# Explicitly bind the agent to the same World2D navigation map used
	# by NavigationRegion2D. This avoids the agent remaining attached
	# to an invalid or unsynchronised map RID.
	var world_navigation_map = get_world_2d().navigation_map

	if world_navigation_map.is_valid():
		navigation_agent.set_navigation_map(
			world_navigation_map
		)

	navigation_agent.set_navigation_layer_value(
		1,
		true
	)
	navigation_agent.path_desired_distance = \
		path_desired_distance
	navigation_agent.target_desired_distance = \
		target_desired_distance
	navigation_agent.path_max_distance = 20.0
	navigation_agent.path_postprocessing = \
		NavigationPathQueryParameters2D.PATH_POSTPROCESSING_EDGECENTERED
	navigation_agent.simplify_path = false
	navigation_agent.simplify_epsilon = 0.0
	navigation_agent.max_speed = navigation_speed
	navigation_agent.avoidance_enabled = false
	navigation_agent.debug_enabled = navigation_debug_enabled

	_print_navigation_map_status(
		"WAITER NAVIGATION CONFIGURED"
	)


func _update_waiting_for_navigation_map():
	if navigation_agent == null:
		if use_direct_fallback:
			_begin_direct_navigation()
		else:
			_fail_navigation(
				"NavigationAgent2D disappeared."
			)
		return

	var navigation_map = navigation_agent.get_navigation_map()

	# Rebind to the current World2D map if the node still has an
	# invalid map RID.
	if not navigation_map.is_valid():
		var world_navigation_map = \
			get_world_2d().navigation_map

		if world_navigation_map.is_valid():
			navigation_agent.set_navigation_map(
				world_navigation_map
			)
			navigation_map = world_navigation_map

	var map_is_ready = false
	var region_count = 0
	var iteration_id = 0

	if navigation_map.is_valid():
		iteration_id = \
			NavigationServer2D.map_get_iteration_id(
				navigation_map
			)
		region_count = \
			NavigationServer2D.map_get_regions(
				navigation_map
			).size()
		map_is_ready = (
			iteration_id > 0
			and region_count > 0
		)

	if map_is_ready:
		_begin_agent_navigation(navigation_map)
		return

	_navigation_map_wait_count += 1
	velocity = Vector2.ZERO
	play_idle()

	if _navigation_map_wait_count < \
	navigation_map_wait_frames:
		return

	_print_navigation_map_status(
		"WAITER NAVIGATION MAP TIMEOUT"
	)

	if use_direct_fallback:
		push_warning(
			"Navigation map did not synchronize in time. "
			+ "Using direct fallback movement."
		)
		_begin_direct_navigation()
	else:
		_fail_navigation(
			"Navigation map has no synchronized "
			+ "NavigationRegion2D. Check that the polygon "
			+ "is baked, saved, enabled, and on navigation "
			+ "layer 1."
		)


func _print_navigation_map_status(prefix):
	if navigation_agent == null:
		print(
			prefix,
			" | Agent: missing"
		)
		return

	var navigation_map = \
		navigation_agent.get_navigation_map()

	if not navigation_map.is_valid():
		print(
			prefix,
			" | Map valid: false"
		)
		return

	var iteration_id = \
		NavigationServer2D.map_get_iteration_id(
			navigation_map
		)
	var region_count = \
		NavigationServer2D.map_get_regions(
			navigation_map
		).size()
	var map_active = \
		NavigationServer2D.map_is_active(
			navigation_map
		)

	print(
		prefix,
		" | Map valid: true",
		" | Active: ",
		map_active,
		" | Iteration: ",
		iteration_id,
		" | Regions: ",
		region_count,
		" | Layer 1: ",
		navigation_agent.get_navigation_layer_value(1)
	)


func _begin_agent_navigation(navigation_map):
	_navigation_resolved_target = \
		_navigation_requested_target

	if clamp_targets_to_navigation:
		_navigation_resolved_target = \
			NavigationServer2D.map_get_closest_point(
				navigation_map,
				_navigation_requested_target
			)

	navigation_agent.path_desired_distance = \
		path_desired_distance
	navigation_agent.target_desired_distance = \
		target_desired_distance
	navigation_agent.path_max_distance = 20.0
	navigation_agent.path_postprocessing = \
		NavigationPathQueryParameters2D.PATH_POSTPROCESSING_EDGECENTERED
	navigation_agent.simplify_path = false
	navigation_agent.simplify_epsilon = 0.0
	navigation_agent.max_speed = navigation_speed
	navigation_agent.target_position = \
		_navigation_resolved_target

	_navigation_mode = "agent"
	_agent_target_set_physics_frame = \
		Engine.get_physics_frames()

	navigation_started.emit(
		_navigation_requested_target,
		_navigation_resolved_target
	)

	print(
		"WAITER NAVIGATION STARTED: ",
		_navigation_requested_target,
		" | Resolved: ",
		_navigation_resolved_target
	)


func _begin_direct_navigation():
	_navigation_mode = "direct"
	_navigation_resolved_target = \
		_navigation_requested_target

	navigation_started.emit(
		_navigation_requested_target,
		_navigation_resolved_target
	)

	print(
		"WAITER DIRECT FALLBACK STARTED: ",
		_navigation_requested_target
	)


func _update_agent_navigation():
	if navigation_agent == null:
		if use_direct_fallback:
			_begin_direct_navigation()
		else:
			_fail_navigation("NavigationAgent2D disappeared.")
		return

	# Allow one physics frame for the new path query to settle.
	if Engine.get_physics_frames() <= \
		_agent_target_set_physics_frame:
		velocity = Vector2.ZERO
		return

	if global_position.distance_to(
		_navigation_resolved_target
	) <= target_desired_distance:
		_finish_navigation()
		return

	if navigation_agent.is_navigation_finished():
		_finish_navigation()
		return

	# Godot requires this call once per physics frame while following
	# a path. It also advances the agent's internal path index.
	var next_path_position = \
		navigation_agent.get_next_path_position()

	var move_vector = \
		next_path_position - global_position

	if move_vector.length_squared() <= 0.01:
		velocity = Vector2.ZERO
		return

	velocity = move_vector.normalized() * navigation_speed

	# Keep each movement frame on the navigation surface. This is a
	# final guard against tight-corner waypoint skipping.
	var navigation_map = navigation_agent.get_navigation_map()
	var physics_delta = get_physics_process_delta_time()
	var proposed_position = (
		global_position
		+ velocity * physics_delta
	)

	if navigation_map.is_valid():
		var safe_position = \
			NavigationServer2D.map_get_closest_point(
				navigation_map,
				proposed_position
			)

		if proposed_position.distance_to(
			safe_position
		) > 0.5:
			velocity = (
				safe_position
				- global_position
			) / maxf(physics_delta, 0.0001)

	update_walk_animation(velocity)
	move_and_slide()

	if global_position.distance_to(
		_navigation_resolved_target
	) <= target_desired_distance:
		_finish_navigation()


func _update_direct_navigation():
	var move_vector = \
		_navigation_resolved_target - global_position

	if move_vector.length() <= target_desired_distance:
		_finish_navigation()
		return

	velocity = move_vector.normalized() * navigation_speed
	update_walk_animation(velocity)
	move_and_slide()


func _finish_navigation():
	var requested_target = \
		_navigation_requested_target

	_navigation_active = false
	_navigation_mode = "none"
	velocity = Vector2.ZERO

	if navigation_agent != null:
		navigation_agent.velocity = Vector2.ZERO

	play_idle()

	navigation_arrived.emit(
		requested_target,
		global_position
	)

	print(
		"WAITER NAVIGATION ARRIVED: ",
		requested_target,
		" | Final: ",
		global_position
	)


func _fail_navigation(reason):
	var requested_target = \
		_navigation_requested_target

	_navigation_active = false
	_navigation_mode = "none"
	velocity = Vector2.ZERO
	play_idle()

	push_warning(
		"WAITER NAVIGATION FAILED: "
		+ str(reason)
	)

	navigation_failed.emit(
		requested_target,
		str(reason)
	)


## Main.gd calls this whenever the logical carrying state changes.
##
## Orders are intentionally displayed as empty-handed until dedicated
## order-carrying artwork is added.
func set_carrying(carrying_item):
	var next_visual = _normalise_carrying_visual(
		str(carrying_item)
	)

	if carrying_visual == next_visual:
		return

	var previous_visual = carrying_visual
	carrying_visual = next_visual

	carrying_visual_changed.emit(
		previous_visual,
		carrying_visual
	)

	if sprite == null:
		return

	# Refresh immediately so a waiter who changes items while standing
	# does not retain the previous carrying pose.
	if is_walking:
		_play_walk_animation(last_direction, true)
	else:
		play_idle(true)


func get_carrying_visual():
	return carrying_visual


func get_last_direction():
	return last_direction


func update_walk_animation(move_vector):
	if sprite == null:
		return

	sprite.visible = true
	sprite.speed_scale = animation_speed_scale

	if move_vector.length_squared() < 1.0:
		play_idle()
		return

	var direction = _get_direction_name(move_vector)

	if direction != last_direction:
		var previous_direction = last_direction
		last_direction = direction

		facing_direction_changed.emit(
			previous_direction,
			last_direction
		)

	is_walking = true
	_play_walk_animation(last_direction, false)


## Main.gd calls this after the waiter reaches the final destination.
##
## If a dedicated idle animation exists, it plays normally.
## Otherwise the first frame of the best walk animation is used as
## a stable idle pose.
func play_idle(force_refresh = false):
	if sprite == null:
		return

	sprite.visible = true
	sprite.speed_scale = animation_speed_scale
	is_walking = false

	var animation_options = _build_idle_animation_options(
		last_direction
	)

	var selected_animation = _find_best_animation(
		animation_options
	)

	if selected_animation == "":
		_warn_missing_animation_once(
			"idle",
			animation_options
		)
		return

	_clear_missing_animation_warning()

	var has_dedicated_idle = \
		selected_animation.begins_with("idle_")

	_apply_animation(
		selected_animation,
		has_dedicated_idle,
		force_refresh
	)

	if not has_dedicated_idle:
		sprite.pause()
		sprite.frame = 0


func _play_walk_animation(
	direction,
	force_restart = false
):
	if sprite == null:
		return

	var animation_options = _build_walk_animation_options(
		direction
	)

	var selected_animation = _find_best_animation(
		animation_options
	)

	if selected_animation == "":
		_warn_missing_animation_once(
			"walk",
			animation_options
		)
		return

	_clear_missing_animation_warning()

	_apply_animation(
		selected_animation,
		true,
		force_restart
	)


func _apply_animation(
	animation_name,
	should_play,
	force_restart
):
	if sprite == null:
		return

	if sprite.sprite_frames == null:
		return

	# Never allow a carrying-state switch to leave the waiter hidden.
	sprite.visible = true

	var animation_changed = \
		sprite.animation != animation_name

	if animation_changed:
		sprite.animation = animation_name
		sprite.frame = 0

	elif force_restart:
		sprite.frame = 0

	if should_play:
		if animation_changed \
		or force_restart \
		or not sprite.is_playing():
			sprite.play()
	else:
		sprite.pause()

	current_walk_animation = animation_name

	if animation_changed:
		waiter_animation_changed.emit(animation_name)


func _find_best_animation(animation_options):
	if sprite == null:
		return ""

	if sprite.sprite_frames == null:
		return ""

	for animation_name in animation_options:
		if not sprite.sprite_frames.has_animation(
			animation_name
		):
			continue

		if _animation_has_complete_visible_frames(
			animation_name
		):
			return animation_name

	return ""


## A SpriteFrames animation may still report a positive frame count
## when its external PNG references are missing. Selecting such an
## animation makes the waiter appear invisible. Reject it so the
## direction-correct empty-handed animation can be used as fallback.
func _animation_has_complete_visible_frames(
	animation_name: String
) -> bool:
	if sprite == null:
		return false

	if sprite.sprite_frames == null:
		return false

	var frame_count = \
		sprite.sprite_frames.get_frame_count(
			animation_name
		)

	if frame_count <= 0:
		return false

	for frame_index in range(frame_count):
		var frame_texture = \
			sprite.sprite_frames.get_frame_texture(
				animation_name,
				frame_index
			)

		if frame_texture == null:
			return false

	return true


func _build_walk_animation_options(direction):
	var options = []
	var direction_options = _get_direction_fallbacks(direction)
	var exact_direction = direction_options[0]

	# Direction accuracy comes first. Using a down-facing carrying
	# animation while moving upward is what made the waiter appear to
	# walk backward when a carrying-direction animation was missing.
	_append_unique(
		options,
		"walk_"
		+ carrying_visual
		+ "_"
		+ exact_direction
	)
	_append_unique(
		options,
		"walk_empty_"
		+ exact_direction
	)
	_append_unique(
		options,
		"walk_"
		+ exact_direction
	)

	# Only after exact-direction animations fail do we try nearby
	# cardinal fallbacks.
	for index in range(1, direction_options.size()):
		var direction_name = direction_options[index]

		_append_unique(
			options,
			"walk_"
			+ carrying_visual
			+ "_"
			+ direction_name
		)
		_append_unique(
			options,
			"walk_empty_"
			+ direction_name
		)
		_append_unique(
			options,
			"walk_"
			+ direction_name
		)

	_append_unique(options, "walk_empty_down")
	_append_unique(options, "walk_down")

	return options


func _build_idle_animation_options(direction):
	var options = []
	var direction_options = \
		_get_direction_fallbacks(direction)

	# Prefer a carrying-specific idle.
	for direction_name in direction_options:
		_append_unique(
			options,
			"idle_"
			+ carrying_visual
			+ "_"
			+ direction_name
		)

	# If no idle exists, a carrying-specific walk frame is a better
	# fallback than losing the visible item.
	for direction_name in direction_options:
		_append_unique(
			options,
			"walk_"
			+ carrying_visual
			+ "_"
			+ direction_name
		)

	for direction_name in direction_options:
		_append_unique(
			options,
			"idle_empty_"
			+ direction_name
		)

	for direction_name in direction_options:
		_append_unique(
			options,
			"walk_empty_"
			+ direction_name
		)

	for direction_name in direction_options:
		_append_unique(
			options,
			"idle_"
			+ direction_name
		)

	for direction_name in direction_options:
		_append_unique(
			options,
			"walk_"
			+ direction_name
		)

	_append_unique(
		options,
		"idle_"
		+ carrying_visual
		+ "_down"
	)
	_append_unique(
		options,
		"walk_"
		+ carrying_visual
		+ "_down"
	)
	_append_unique(options, "idle_empty_down")
	_append_unique(options, "walk_empty_down")
	_append_unique(options, "idle_down")
	_append_unique(options, "walk_down")

	return options


func _get_direction_fallbacks(direction):
	match direction:
		"down_right":
			return [
				"down_right",
				"down",
				"right"
			]

		"down_left":
			return [
				"down_left",
				"down",
				"left"
			]

		"up_right":
			return [
				"up_right",
				"up",
				"right"
			]

		"up_left":
			return [
				"up_left",
				"up",
				"left"
			]

		"down":
			return ["down"]

		"up":
			return ["up"]

		"right":
			return ["right"]

		"left":
			return ["left"]

		_:
			return ["down"]


func _get_direction_name(move_vector):
	var direction = move_vector.normalized()
	var angle = rad_to_deg(
		atan2(direction.y, direction.x)
	)
	var direction_name = "down"

	if angle >= -22.5 and angle < 22.5:
		direction_name = "right"
	elif angle >= 22.5 and angle < 67.5:
		direction_name = "down_right"
	elif angle >= 67.5 and angle < 112.5:
		direction_name = "down"
	elif angle >= 112.5 and angle < 157.5:
		direction_name = "down_left"
	elif angle >= 157.5 or angle < -157.5:
		direction_name = "left"
	elif angle >= -157.5 and angle < -112.5:
		direction_name = "up_left"
	elif angle >= -112.5 and angle < -67.5:
		direction_name = "up"
	else:
		direction_name = "up_right"

	return _remap_animation_direction(direction_name)


func _remap_animation_direction(direction_name):
	var vertical = direction_name

	if swap_up_and_down_animation_names:
		vertical = vertical.replace("up", "TEMP_UP")
		vertical = vertical.replace("down", "up")
		vertical = vertical.replace("TEMP_UP", "down")

	if swap_left_and_right_animation_names:
		vertical = vertical.replace("left", "TEMP_LEFT")
		vertical = vertical.replace("right", "left")
		vertical = vertical.replace("TEMP_LEFT", "right")

	return vertical


func _normalise_carrying_visual(carrying_item):
	match carrying_item:
		"wine_bottle", "wine":
			return CARRY_WINE_BOTTLE

		"food_plate", "food":
			return CARRY_FOOD_PLATE

		"dirty_plates", "plates":
			return CARRY_DIRTY_PLATES

		"receipt", "bill":
			return CARRY_RECEIPT

		# Orders currently have no dedicated visible carrying assets.
		"wine_order", "food_order", "none", "empty", "":
			return CARRY_EMPTY

		_:
			return CARRY_EMPTY


func _normalise_direction(direction):
	if direction in [
		"down",
		"down_right",
		"right",
		"up_right",
		"up",
		"up_left",
		"left",
		"down_left"
	]:
		return direction

	return "down"


func _append_unique(array, value):
	if value not in array:
		array.append(value)


func _warn_missing_animation_once(
	context,
	animation_options
):
	if not print_missing_animation_warnings:
		return

	var signature = \
		context \
		+ "|" \
		+ ",".join(animation_options)

	if signature == _last_missing_animation_signature:
		return

	_last_missing_animation_signature = signature

	push_warning(
		"No usable waiter "
		+ context
		+ " animation found. Tried: "
		+ str(animation_options)
	)


func _clear_missing_animation_warning():
	_last_missing_animation_signature = ""
