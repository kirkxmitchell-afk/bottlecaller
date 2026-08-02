extends CharacterBody2D


signal carrying_visual_changed(previous_visual, new_visual)
signal facing_direction_changed(previous_direction, new_direction)
signal waiter_animation_changed(animation_name)


const CARRY_EMPTY = "empty"
const CARRY_APERITIF = "aperitif"
const CARRY_WINE_BOTTLE = "wine_bottle"
const CARRY_FOOD_PLATE = "food_plate"
const CARRY_DIRTY_PLATES = "dirty_plates"
const CARRY_RECEIPT = "receipt"


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


@export_category("Animation Visual Corrections")

## These values multiply the AnimatedSprite2D scale already set in the
## scene. A value below 1.0 makes that state smaller; above 1.0 makes
## it larger. They do not affect CharacterBody2D navigation or collision.
@export var apply_visual_corrections = true
@export var print_visual_correction_changes = false

@export_range(0.10, 3.00, 0.01)
var empty_scale_multiplier = 1.0
@export var empty_visual_offset = Vector2.ZERO

@export_range(0.10, 3.00, 0.01)
var aperitif_scale_multiplier = 1.0
@export var aperitif_visual_offset = Vector2.ZERO

@export_range(0.10, 3.00, 0.01)
var wine_bottle_scale_multiplier = 1.0
@export var wine_bottle_visual_offset = Vector2.ZERO

@export_range(0.10, 3.00, 0.01)
var food_plate_scale_multiplier = 1.0
@export var food_plate_visual_offset = Vector2.ZERO

@export_range(0.10, 3.00, 0.01)
var dirty_plates_scale_multiplier = 1.0
@export var dirty_plates_visual_offset = Vector2.ZERO

@export_range(0.10, 3.00, 0.01)
var receipt_scale_multiplier = 1.0
@export var receipt_visual_offset = Vector2.ZERO


@export_category("Exact Animation Visual Overrides")

## Optional exact-name corrections for an individual animation that still
## differs from the rest of its carrying state.
##
## Example scale entry:
## "walk_wine_bottle_down": 0.92
##
## Example offset entry:
## "walk_wine_bottle_down": Vector2(0, 35)
@export var animation_scale_overrides: Dictionary = {}
@export var animation_offset_overrides: Dictionary = {}


@onready var sprite: AnimatedSprite2D = \
	get_node_or_null("AnimatedSprite2D") as AnimatedSprite2D


var carrying_visual = CARRY_EMPTY
var last_direction = "down"
var current_walk_animation = ""
var is_walking = false

var _last_missing_animation_signature = ""
var _last_visual_correction_signature = ""

var _base_sprite_scale = Vector2.ONE
var _base_sprite_offset = Vector2.ZERO


func _ready():
	print("WAITER READY")

	z_index = 100
	last_direction = _normalise_direction(default_direction)

	if sprite == null:
		push_warning(
			"WAITER CONTROLLER COULD NOT FIND AnimatedSprite2D"
		)
		return

	sprite.visible = true
	sprite.z_index = 100
	sprite.speed_scale = animation_speed_scale

	# Keep the transform configured in the scene as the master baseline.
	# Every carrying-state correction is applied relative to this.
	_base_sprite_scale = sprite.scale
	_base_sprite_offset = sprite.offset

	play_idle(true)


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

	_apply_visual_correction(
		str(animation_name)
	)

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




# ===================================================================
# Current SpriteFrames coverage
#
# idle_empty:        all 8 directions
# walk_empty:        all 8 directions
# walk_aperitif:     all 8 directions
# walk_food_plate:   all 8 directions
# walk_receipt:      all 8 directions
# walk_wine_bottle:  all 8 directions
#
# Dirty-plates artwork currently has only the directions present in
# SpriteFrames. Missing directions preserve correct movement direction
# by falling back to the matching empty-handed animation.
#
# Carrying states have no dedicated idle animations. play_idle() pauses
# frame 0 of the matching carrying walk animation when one exists.
# ===================================================================
# Per-animation visual size and alignment correction
# ===================================================================

## SpriteFrames has no independent scale or offset property for each
## animation. This function applies the appropriate visual transform
## whenever _apply_animation() selects a new animation.
func _apply_visual_correction(animation_name):
	if sprite == null:
		return

	if not apply_visual_corrections:
		sprite.scale = _base_sprite_scale
		sprite.offset = _base_sprite_offset
		return

	var visual_profile = _get_animation_visual_profile(
		animation_name
	)

	var scale_multiplier = \
		_get_profile_scale_multiplier(
			visual_profile
		)

	var visual_offset = \
		_get_profile_visual_offset(
			visual_profile
		)

	# An exact animation-name override takes priority over the broader
	# carrying-state correction.
	if animation_scale_overrides.has(
		animation_name
	):
		var override_scale = animation_scale_overrides[
			animation_name
		]

		if (
			override_scale is float
			or override_scale is int
		):
			scale_multiplier = max(
				float(override_scale),
				0.05
			)
		else:
			push_warning(
				"Waiter animation scale override for "
				+ animation_name
				+ " must be a number."
			)

	if animation_offset_overrides.has(
		animation_name
	):
		var override_offset = animation_offset_overrides[
			animation_name
		]

		if override_offset is Vector2:
			visual_offset = override_offset
		else:
			push_warning(
				"Waiter animation offset override for "
				+ animation_name
				+ " must be a Vector2."
			)

	sprite.scale = (
		_base_sprite_scale
		* scale_multiplier
	)

	sprite.offset = (
		_base_sprite_offset
		+ visual_offset
	)

	if print_visual_correction_changes:
		var signature = (
			animation_name
			+ "|"
			+ visual_profile
			+ "|"
			+ str(scale_multiplier)
			+ "|"
			+ str(visual_offset)
		)

		if signature != _last_visual_correction_signature:
			_last_visual_correction_signature = signature

			print(
				"WAITER VISUAL CORRECTION: ",
				animation_name,
				" | Profile: ",
				visual_profile,
				" | Scale multiplier: ",
				scale_multiplier,
				" | Final scale: ",
				sprite.scale,
				" | Offset: ",
				sprite.offset
			)


## The selected animation name is used rather than carrying_visual.
## This is important because a missing carrying animation may fall back
## to an empty-handed animation, which should use the empty correction.
func _get_animation_visual_profile(animation_name):
	if animation_name.contains(
		CARRY_APERITIF
	):
		return CARRY_APERITIF

	if animation_name.contains(
		CARRY_WINE_BOTTLE
	):
		return CARRY_WINE_BOTTLE

	if animation_name.contains(
		CARRY_FOOD_PLATE
	):
		return CARRY_FOOD_PLATE

	if animation_name.contains(
		CARRY_DIRTY_PLATES
	):
		return CARRY_DIRTY_PLATES

	if animation_name.contains(
		CARRY_RECEIPT
	):
		return CARRY_RECEIPT

	return CARRY_EMPTY


func _get_profile_scale_multiplier(
	visual_profile
):
	match visual_profile:
		CARRY_APERITIF:
			return aperitif_scale_multiplier

		CARRY_WINE_BOTTLE:
			return wine_bottle_scale_multiplier

		CARRY_FOOD_PLATE:
			return food_plate_scale_multiplier

		CARRY_DIRTY_PLATES:
			return dirty_plates_scale_multiplier

		CARRY_RECEIPT:
			return receipt_scale_multiplier

		_:
			return empty_scale_multiplier


func _get_profile_visual_offset(
	visual_profile
):
	match visual_profile:
		CARRY_APERITIF:
			return aperitif_visual_offset

		CARRY_WINE_BOTTLE:
			return wine_bottle_visual_offset

		CARRY_FOOD_PLATE:
			return food_plate_visual_offset

		CARRY_DIRTY_PLATES:
			return dirty_plates_visual_offset

		CARRY_RECEIPT:
			return receipt_visual_offset

		_:
			return empty_visual_offset


## This can be called if the AnimatedSprite2D scale or offset is changed
## programmatically after _ready(). It makes the current transform the
## new baseline and reapplies the active animation correction.
func capture_current_sprite_transform_as_baseline():
	if sprite == null:
		return

	_base_sprite_scale = sprite.scale
	_base_sprite_offset = sprite.offset

	if current_walk_animation != "":
		_apply_visual_correction(
			current_walk_animation
		)


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

		var frame_count = \
			sprite.sprite_frames.get_frame_count(
				animation_name
			)

		if frame_count > 0:
			return animation_name

	return ""


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
		"aperitif", "aperitif_glass":
			return CARRY_APERITIF

		"wine_bottle", "wine":
			return CARRY_WINE_BOTTLE

		"food_plate", "food":
			return CARRY_FOOD_PLATE

		"dirty_plates", "plates":
			return CARRY_DIRTY_PLATES

		"receipt", "bill":
			return CARRY_RECEIPT

		# There is no dedicated Mise animation in the current
		# SpriteFrames library, so Mise remains empty-handed.
		"mise", "mise_en_place", "cutlery", "serviette":
			return CARRY_EMPTY

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
