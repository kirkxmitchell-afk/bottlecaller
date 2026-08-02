extends CharacterBody2D
class_name GuestWalker


signal navigation_arrived
signal navigation_failed(reason)


const SOURCE_WIDTH = 1920.0
const SOURCE_HEIGHT = 1080.0
const WAITER_IMPORT_WIDTH = 512.0
const WAITER_REFERENCE_SILHOUETTE_HEIGHT = 860.0
const REFERENCE_FEET_BOTTOM = 961.0
const WAITER_SPRITE_SCALE = 3.75 * 0.21
const WAITER_BASE_OFFSET_Y = -114.667
const GUEST_TO_WAITER_HEIGHT_RATIO = 0.95
const WALK_ANIMATION_FPS = 30.0
const WALK_DIRECTIONS = ["down", "left", "right", "up"]
const FRAME_COUNT = 26


@export_range(40.0, 500.0, 5.0)
var navigation_speed = 210.0

@export_range(0.1, 3.0, 0.05)
var animation_speed_scale = 1.0

@export_range(1, 240, 1)
var navigation_map_wait_frames = 120


@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var navigation_agent: NavigationAgent2D = $NavigationAgent2D


var character_asset_root = ""
var animation_phase_frame = 0
var current_direction = "down"
var visual_metrics: Dictionary = {}

var navigation_active = false
var navigation_pending = false
var navigation_wait_count = 0
var requested_target = Vector2.ZERO


func _ready():
	z_as_relative = false
	z_index = 180
	# Guests follow navigation but never physically obstruct the waiter.
	collision_layer = 0
	collision_mask = 0

	sprite.z_as_relative = false
	sprite.z_index = 180
	sprite.speed_scale = animation_speed_scale

	navigation_agent.path_desired_distance = 8.0
	navigation_agent.target_desired_distance = 12.0
	navigation_agent.radius = 14.0
	navigation_agent.avoidance_enabled = false


func configure(
	asset_root: String,
	phase_frame: int = 0
) -> bool:
	character_asset_root = asset_root.trim_suffix("/")
	animation_phase_frame = maxi(phase_frame, 0)

	var frames = _build_sprite_frames()
	if frames == null:
		navigation_failed.emit(
			"Guest walk frames could not be loaded from "
			+ character_asset_root
		)
		return false

	sprite.sprite_frames = frames
	_play_idle("up")
	return true


func navigate_to(target_position: Vector2):
	requested_target = target_position
	navigation_pending = true
	navigation_active = false
	navigation_wait_count = 0


func cancel_navigation():
	navigation_pending = false
	navigation_active = false
	velocity = Vector2.ZERO
	navigation_agent.target_position = global_position
	_play_idle("up")


func _physics_process(_delta):
	if navigation_pending:
		_try_begin_navigation()
		return

	if not navigation_active:
		velocity = Vector2.ZERO
		return

	if navigation_agent.is_navigation_finished():
		_finish_navigation()
		return

	var next_path_position = \
		navigation_agent.get_next_path_position()
	var walk_vector = next_path_position - global_position

	if walk_vector.length() <= 1.0:
		velocity = Vector2.ZERO
		return

	velocity = walk_vector.normalized() * navigation_speed
	_play_direction(_direction_from_vector(velocity))
	move_and_slide()

	if global_position.distance_to(requested_target) <= 14.0:
		_finish_navigation()


func _try_begin_navigation():
	var navigation_map = navigation_agent.get_navigation_map()

	if (
		navigation_map.is_valid()
		and NavigationServer2D.map_get_iteration_id(
			navigation_map
		) > 0
	):
		requested_target = NavigationServer2D.map_get_closest_point(
			navigation_map,
			requested_target
		)
		navigation_agent.target_position = requested_target
		navigation_pending = false
		navigation_active = true
		return

	navigation_wait_count += 1
	if navigation_wait_count >= navigation_map_wait_frames:
		navigation_pending = false
		navigation_failed.emit(
			"Guest navigation map did not become ready."
		)


func _finish_navigation():
	navigation_active = false
	navigation_pending = false
	velocity = Vector2.ZERO
	_play_idle(current_direction)
	navigation_arrived.emit()


func _build_sprite_frames() -> SpriteFrames:
	var frames = SpriteFrames.new()
	frames.remove_animation("default")
	visual_metrics.clear()

	for direction in WALK_DIRECTIONS:
		var animation_name = "walk_" + direction
		var idle_animation_name = "idle_" + direction
		frames.add_animation(animation_name)
		frames.add_animation(idle_animation_name)
		frames.set_animation_loop(animation_name, true)
		frames.set_animation_loop(idle_animation_name, false)
		frames.set_animation_speed(
			animation_name,
			WALK_ANIMATION_FPS
		)
		frames.set_animation_speed(idle_animation_name, 1.0)

		for frame_index in range(1, FRAME_COUNT + 1):
			var texture_path = (
				character_asset_root
				+ "/walk/"
				+ direction
				+ "/frame_%04d.png" % frame_index
			)

			if not ResourceLoader.exists(texture_path):
				push_warning(
					"Missing guest walk frame: "
					+ texture_path
				)
				return null

			var texture = load(texture_path) as Texture2D
			if texture == null:
				return null

			frames.add_frame(animation_name, texture)

			if frame_index == 1:
				var metrics = _measure_texture(texture)
				visual_metrics[animation_name] = metrics
				visual_metrics[idle_animation_name] = metrics
				frames.add_frame(idle_animation_name, texture)

	return frames


func _measure_texture(texture: Texture2D) -> Dictionary:
	var texture_size = texture.get_size()
	var used_rect = Rect2i(
		0,
		0,
		int(texture_size.x),
		int(texture_size.y)
	)
	var image = texture.get_image()

	if image != null and not image.is_empty():
		if image.is_compressed():
			image.decompress()
		var measured_rect = image.get_used_rect()
		if measured_rect.size.y > 0:
			used_rect = measured_rect

	return {
		"texture_width": maxf(texture_size.x, 1.0),
		"texture_height": maxf(texture_size.y, 1.0),
		"silhouette_height": maxf(float(used_rect.size.y), 1.0),
		"silhouette_bottom": float(used_rect.end.y)
	}


func _play_direction(
	direction: String,
	force_restart = false
):
	var animation_name = "walk_" + direction
	if not sprite.sprite_frames.has_animation(animation_name):
		return

	var changed = current_direction != direction
	var animation_changed = sprite.animation != animation_name
	var previous_frame = sprite.frame
	var was_walking = (
		str(sprite.animation).begins_with("walk_")
		and sprite.is_playing()
	)
	current_direction = direction

	if (
		changed
		or animation_changed
		or force_restart
		or not sprite.is_playing()
	):
		sprite.play(animation_name)
		var count = sprite.sprite_frames.get_frame_count(
			animation_name
		)
		if count > 0:
			if force_restart or not was_walking:
				sprite.frame = animation_phase_frame % count
			else:
				sprite.frame = previous_frame % count

	_apply_visual_normalization(animation_name)


func _play_idle(direction: String):
	var animation_name = "idle_" + direction
	if not sprite.sprite_frames.has_animation(animation_name):
		return

	current_direction = direction
	sprite.animation = animation_name
	sprite.frame = 0
	sprite.stop()
	_apply_visual_normalization(animation_name)


func _apply_visual_normalization(animation_name: String):
	if not visual_metrics.has(animation_name):
		return

	var metrics: Dictionary = visual_metrics[animation_name]
	var texture_width = float(metrics["texture_width"])
	var texture_height = float(metrics["texture_height"])
	var import_scale = texture_width / SOURCE_WIDTH
	var source_height = float(metrics["silhouette_height"])
	var source_bottom = float(metrics["silhouette_bottom"])

	if import_scale <= 0.0 or source_height <= 0.0:
		return

	var base_scale = (
		WAITER_SPRITE_SCALE
		* (WAITER_IMPORT_WIDTH / texture_width)
	)
	var base_offset_y = (
		WAITER_BASE_OFFSET_Y
		* (texture_width / WAITER_IMPORT_WIDTH)
	)
	var reference_height = \
		(
			WAITER_REFERENCE_SILHOUETTE_HEIGHT
			* GUEST_TO_WAITER_HEIGHT_RATIO
			* import_scale
		)
	var scale_multiplier = reference_height / source_height
	var source_bottom_from_center = (
		source_bottom - (texture_height * 0.5)
	)
	var reference_foot_position = (
		(
			REFERENCE_FEET_BOTTOM
			- (SOURCE_HEIGHT * 0.5)
		)
		* import_scale
		+ base_offset_y
	)

	sprite.scale = Vector2.ONE * base_scale * scale_multiplier
	sprite.offset = Vector2(
		0.0,
		(
			reference_foot_position
			/ scale_multiplier
		)
		- source_bottom_from_center
	)


func _direction_from_vector(direction: Vector2) -> String:
	if absf(direction.x) > absf(direction.y):
		return "right" if direction.x >= 0.0 else "left"

	return "down" if direction.y >= 0.0 else "up"
