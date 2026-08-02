extends Area2D
class_name StationController


signal station_clicked(station_node, station_id)
signal station_state_changed(station_id, previous_state, new_state)


const STATE_IDLE = "idle"
const STATE_MIXING = "mixing"
const STATE_COOKING = "cooking"
const STATE_READY_COLLECTION = "ready_collection"
const STATE_GETTING_WINE = "getting_wine"
const STATE_WINE_READY = "wine_ready"
const STATE_ANNOYED = "annoyed"

const STATE_EMPTY = "empty"
const STATE_FULL = "full"
const STATE_ACTIVE = "active"

const STATE_STOCKED = "stocked"
const STATE_LOW = "low"

const MOOD_HAPPY = "happy"
const MOOD_NEUTRAL = "neutral"
const MOOD_ANNOYED = "annoyed"


@export_category("Station Identity")

@export var station_id = "bar"
@export var display_name = "Bar"


@export_category("Positioning")

@export var status_offset = Vector2(-90, -85)

## Preferred waiter destination marker.
## Add a Marker2D child named exactly "InteractionPoint".
@export_node_path("Marker2D")
var interaction_point_path = ^"InteractionPoint"

## Legacy fallback used only when no InteractionPoint marker is found.
@export var interaction_offset = Vector2(0, 95)

## Optional direct path to the station Sprite2D.
## Leave empty to keep using automatic recursive sprite discovery.
@export_node_path("Sprite2D")
var station_sprite_path = ^"Sprite2D"


@export_category("General Textures")

@export var idle_texture: Texture2D
@export var active_texture: Texture2D
@export var ready_texture: Texture2D
@export var annoyed_texture: Texture2D

@export_category("Bar Wine Textures")

## Shown while the bartender is retrieving a wine bottle order.
@export var getting_wine_texture: Texture2D

## Shown when the wine bottle is ready for the waiter to collect.
@export var wine_ready_texture: Texture2D


@export_category("Scullery Textures")

@export var empty_texture: Texture2D
@export var full_texture: Texture2D


@export_category("Mise en Place Textures")

@export var stocked_texture: Texture2D
@export var low_texture: Texture2D


@export_category("Mood Alert Icons")

@export var mood_happy_texture: Texture2D
@export var mood_neutral_texture: Texture2D
@export var mood_annoyed_texture: Texture2D

## Optional exact editor anchor.
## Add a Marker2D child named exactly "MoodAnchor" for manual placement.
@export_node_path("Marker2D")
var mood_anchor_path = ^"MoodAnchor"

## When no MoodAnchor exists, the controller can use InteractionPoint.
## This usually keeps Bar and Chef icons below the top HUD.
@export var prefer_interaction_point_for_mood = true
@export var mood_icon_interaction_offset = Vector2(0, -105)

## Final automatic fallback: top edge of the visible station artwork.
@export var auto_anchor_mood_to_sprite = true

## Extra distance above the station artwork when the sprite fallback is used.
@export_range(0.0, 100.0, 1.0)
var mood_icon_gap = 16.0

## Small final adjustment after automatic anchoring.
@export var mood_icon_fine_offset = Vector2(0, 0)

## Used only when no valid station Sprite2D texture is available.
@export var mood_icon_fallback_offset = Vector2(0, -90)

@export var mood_icon_scale = Vector2(0.20, 0.20)

## Absolute world Z. This keeps every station alert above the waiter.
@export_range(201, 4000, 1)
var mood_icon_z_index = 3000

@export_category("Attention Alert")

## Shown above POS / Mise when the player must visit that station.
@export var attention_texture: Texture2D

@export var attention_icon_scale = Vector2(0.22, 0.22)

@export var attention_icon_offset = Vector2(36, -28)

@export_range(201, 4000, 1)
var attention_icon_z_index = 3100

@export_range(0.0, 20.0, 0.5)
var attention_hover_amplitude = 7.0

@export_range(0.1, 10.0, 0.1)
var attention_hover_speed = 3.2


@export_category("Station Speech Bubble")

## Shared floor bubble art (same as guest tables).
@export var speech_bubble_texture: Texture2D

@export var speech_bubble_scale = Vector2(0.72, 0.86)

## Offset from MoodAnchor — positive Y pulls the bubble down onto screen,
## toward / in front of the bartender or chef head.
@export var speech_bubble_head_offset = Vector2(28, 52)

@export_range(1.0, 12.0, 0.1)
var speech_bubble_duration = 3.8

@export_range(12, 36, 1)
var speech_bubble_font_size = 18

@export_range(-12, 12, 1)
var speech_bubble_line_spacing = -4

## Keep station bubbles above station art, mood icons, and the waiter.
@export_range(201, 5000, 1)
var speech_bubble_z_index = 3200


@export_range(0.0, 20.0, 0.5)
var mood_hover_amplitude = 6.0

@export_range(0.1, 10.0, 0.1)
var mood_hover_speed = 2.4

## Happy remains visible while the station is satisfied.
@export var show_happy_mood = true

## Zero keeps the happy icon visible until the station mood changes.
## Use a positive value only when a temporary happy confirmation is wanted.
@export_range(0.0, 10.0, 0.1)
var happy_icon_hold_seconds = 0.0

@export_range(0.0, 0.5, 0.01)
var neutral_pulse_strength = 0.10

@export_range(0.0, 0.8, 0.01)
var annoyed_pulse_strength = 0.20


@export_category("Debug")

@export var print_state_changes = true


var status_label: Label
var station_state = ""
var sprite: Sprite2D

var mood_icon: Sprite2D
var mood_transition_time = 0.0
var happy_icon_time_remaining = 0.0
var mood_state = MOOD_HAPPY
var mood_reason = ""
var mood_hover_time = 0.0

var attention_icon: Sprite2D
var attention_required = false
var attention_hover_time = 0.0

var speech_bubble_root: Node2D
var speech_bubble_sprite: Sprite2D
var speech_bubble_label: Label
var speech_bubble_time_left = 0.0
var speech_bubble_visible = false


func _ready():
	station_id = _normalise_station_id(station_id)
	input_pickable = true
	z_index = 5

	sprite = _resolve_station_sprite()

	if sprite != null:
		sprite.z_index = 5
	else:
		push_warning(
			"NO SPRITE FOUND FOR STATION: " + station_id
		)

	_create_or_find_status_label()
	clear_station_status()
	_validate_texture_assignments()
	set_station_state(_get_default_state(), true)
	set_mood_happy()
	_create_or_find_attention_icon()
	set_attention_required(false)
	_create_or_find_speech_bubble()

	print("STATION READY: ", station_id)


func _process(delta):
	if mood_icon != null:
		mood_icon.position = _get_mood_anchor_position()

		if mood_icon.visible:
			mood_hover_time += delta
			mood_transition_time += delta

			var speed_multiplier = 1.0
			var pulse_strength = 0.0

			match mood_state:
				MOOD_NEUTRAL:
					speed_multiplier = 1.35
					pulse_strength = neutral_pulse_strength

				MOOD_ANNOYED:
					speed_multiplier = 1.9
					pulse_strength = annoyed_pulse_strength

			var wave = sin(
				mood_hover_time
				* mood_hover_speed
				* speed_multiplier
			)

			var hover_y = (
				wave
				* mood_hover_amplitude
			)

			var pulse = (
				1.0
				+ (
					(wave + 1.0)
					* 0.5
					* pulse_strength
				)
			)

			# A short scale-pop makes every mood change immediately noticeable.
			var pop_scale = 1.0

			if mood_transition_time < 0.24:
				pop_scale = lerp(
					1.38,
					1.0,
					mood_transition_time / 0.24
				)

			mood_icon.position += Vector2(
				0,
				hover_y
			)
			mood_icon.scale = (
				mood_icon_scale
				* pulse
				* pop_scale
			)

			if mood_state == MOOD_NEUTRAL:
				mood_icon.modulate.a = lerp(
					0.72,
					1.0,
					(wave + 1.0) * 0.5
				)
			elif mood_state == MOOD_ANNOYED:
				mood_icon.modulate.a = lerp(
					0.62,
					1.0,
					(wave + 1.0) * 0.5
				)
			else:
				mood_icon.modulate.a = 1.0

			if (
				mood_state == MOOD_HAPPY
				and show_happy_mood
				and happy_icon_hold_seconds > 0.0
			):
				happy_icon_time_remaining -= delta

				if happy_icon_time_remaining <= 0.0:
					mood_icon.visible = false

	if attention_icon != null:
		attention_icon.position = (
			_get_mood_anchor_position()
			+ attention_icon_offset
		)
		if attention_icon.visible:
			attention_hover_time += delta
			var attention_wave = sin(
				attention_hover_time
				* attention_hover_speed
			)
			attention_icon.position += Vector2(
				0,
				attention_wave * attention_hover_amplitude
			)
			attention_icon.scale = (
				attention_icon_scale
				* (1.0 + (attention_wave + 1.0) * 0.08)
			)

	_update_speech_bubble(delta)


func _create_or_find_speech_bubble() -> void:
	speech_bubble_root = get_node_or_null("StationSpeechBubble") as Node2D
	if speech_bubble_root == null:
		speech_bubble_root = Node2D.new()
		speech_bubble_root.name = "StationSpeechBubble"
		add_child(speech_bubble_root)

	speech_bubble_sprite = speech_bubble_root.get_node_or_null("Bubble") as Sprite2D
	if speech_bubble_sprite == null:
		speech_bubble_sprite = Sprite2D.new()
		speech_bubble_sprite.name = "Bubble"
		speech_bubble_root.add_child(speech_bubble_sprite)

	speech_bubble_label = speech_bubble_root.get_node_or_null("SpeechLabel") as Label
	if speech_bubble_label == null:
		speech_bubble_label = Label.new()
		speech_bubble_label.name = "SpeechLabel"
		speech_bubble_root.add_child(speech_bubble_label)

	var bubble_texture = speech_bubble_texture
	if bubble_texture == null:
		bubble_texture = load(
			"res://assets/icons/bottlecaller_icons_04/hud_speech_bubble.png"
		) as Texture2D
		speech_bubble_texture = bubble_texture

	speech_bubble_sprite.texture = bubble_texture
	speech_bubble_sprite.centered = true
	speech_bubble_sprite.scale = speech_bubble_scale
	speech_bubble_sprite.z_as_relative = false
	speech_bubble_sprite.z_index = speech_bubble_z_index

	speech_bubble_label.theme = Theme.new()
	var clear_panel = StyleBoxEmpty.new()
	speech_bubble_label.add_theme_stylebox_override("normal", clear_panel)
	speech_bubble_label.add_theme_stylebox_override("focus", clear_panel)
	speech_bubble_label.add_theme_constant_override("outline_size", 0)
	speech_bubble_label.add_theme_constant_override("shadow_outline_size", 0)
	speech_bubble_label.add_theme_constant_override(
		"line_spacing",
		speech_bubble_line_spacing
	)
	speech_bubble_label.add_theme_color_override(
		"font_shadow_color",
		Color(0, 0, 0, 0)
	)
	speech_bubble_label.add_theme_color_override(
		"font_outline_color",
		Color(0, 0, 0, 0)
	)

	var label_settings = LabelSettings.new()
	label_settings.font_size = speech_bubble_font_size
	label_settings.font_color = Color(0.08, 0.07, 0.06, 1.0)
	label_settings.outline_size = 0
	label_settings.shadow_size = 0
	label_settings.line_spacing = float(speech_bubble_line_spacing)
	speech_bubble_label.label_settings = label_settings

	_layout_speech_bubble_label()

	speech_bubble_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	speech_bubble_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	speech_bubble_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	speech_bubble_label.clip_text = false
	speech_bubble_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	speech_bubble_label.z_as_relative = false
	speech_bubble_label.z_index = speech_bubble_z_index + 1

	speech_bubble_root.visible = false
	speech_bubble_visible = false
	speech_bubble_time_left = 0.0


func _layout_speech_bubble_label() -> void:
	if speech_bubble_label == null:
		return

	var tex_size = Vector2(430, 120)
	if speech_bubble_texture != null:
		tex_size = speech_bubble_texture.get_size()

	var drawn = Vector2(
		tex_size.x * speech_bubble_scale.x,
		tex_size.y * speech_bubble_scale.y
	)
	var inset_x = maxf(20.0, drawn.x * 0.08)
	var inset_top = maxf(12.0, drawn.y * 0.16)
	var inset_bottom = maxf(20.0, drawn.y * 0.28)
	var label_w = maxf(80.0, drawn.x - inset_x * 2.0)
	var label_h = maxf(28.0, drawn.y - inset_top - inset_bottom)

	speech_bubble_label.size = Vector2(label_w, label_h)
	speech_bubble_label.position = Vector2(
		-label_w * 0.5,
		-drawn.y * 0.5 + inset_top
	)


func show_station_speech(
	message: String,
	duration: float = -1.0
) -> void:
	_create_or_find_speech_bubble()
	var line = str(message).strip_edges()
	if line == "" or speech_bubble_root == null:
		return

	_layout_speech_bubble_label()
	speech_bubble_label.text = line
	speech_bubble_root.position = (
		_get_mood_anchor_position()
		+ speech_bubble_head_offset
	)
	speech_bubble_root.visible = true
	speech_bubble_visible = true
	speech_bubble_time_left = (
		speech_bubble_duration
		if duration <= 0.0
		else duration
	)
	speech_bubble_root.modulate = Color(1, 1, 1, 1)


func hide_station_speech() -> void:
	speech_bubble_time_left = 0.0
	speech_bubble_visible = false
	if speech_bubble_root != null:
		speech_bubble_root.visible = false


func _update_speech_bubble(delta: float) -> void:
	if not speech_bubble_visible or speech_bubble_root == null:
		return

	speech_bubble_root.position = (
		_get_mood_anchor_position()
		+ speech_bubble_head_offset
	)
	speech_bubble_time_left -= delta

	if speech_bubble_time_left <= 0.0:
		hide_station_speech()
		return

	if speech_bubble_time_left < 0.45:
		speech_bubble_root.modulate.a = clampf(
			speech_bubble_time_left / 0.45,
			0.0,
			1.0
		)


func _get_mood_anchor_position() -> Vector2:
	var explicit_anchor = get_node_or_null(
		mood_anchor_path
	) as Marker2D

	if explicit_anchor != null:
		return (
			to_local(
				explicit_anchor.global_position
			)
			+ mood_icon_fine_offset
		)

	if prefer_interaction_point_for_mood:
		var interaction_point = get_node_or_null(
			interaction_point_path
		) as Marker2D

		if interaction_point != null:
			return (
				to_local(
					interaction_point.global_position
				)
				+ mood_icon_interaction_offset
				+ mood_icon_fine_offset
			)

	if (
		auto_anchor_mood_to_sprite
		and sprite != null
		and sprite.texture != null
	):
		var sprite_rect = sprite.get_rect()
		var sprite_top_center = Vector2(
			sprite_rect.position.x
			+ sprite_rect.size.x * 0.5,
			sprite_rect.position.y
		)

		var top_global = sprite.to_global(
			sprite_top_center
		)

		return (
			to_local(top_global)
			+ Vector2(
				0,
				-mood_icon_gap
			)
			+ mood_icon_fine_offset
		)

	return (
		mood_icon_fallback_offset
		+ mood_icon_fine_offset
	)


func _resolve_station_sprite():
	if not station_sprite_path.is_empty():
		var selected_sprite = get_node_or_null(
			station_sprite_path
		) as Sprite2D

		if selected_sprite != null:
			return selected_sprite

		push_warning(
			"Station sprite path is assigned but no Sprite2D was found: "
			+ str(station_sprite_path)
			+ " | Station: "
			+ station_id
		)

	var direct_sprite = get_node_or_null("Sprite2D") as Sprite2D

	if direct_sprite != null:
		return direct_sprite

	return _find_sprite_recursive(self)


func _find_sprite_recursive(node):
	for child in node.get_children():
		if child is Sprite2D:
			return child

		var found_sprite = _find_sprite_recursive(child)

		if found_sprite != null:
			return found_sprite

	return null


func _get_default_state():
	if station_id == "scullery":
		return STATE_EMPTY

	if station_id == "mise_en_place":
		return STATE_STOCKED

	return STATE_IDLE


func _create_or_find_status_label():
	status_label = get_node_or_null("StatusLabel") as Label

	if status_label == null:
		status_label = Label.new()
		status_label.name = "StatusLabel"
		add_child(status_label)

	status_label.position = status_offset
	status_label.size = Vector2(180, 55)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_font_size_override("font_size", 18)
	status_label.add_theme_color_override(
		"font_color",
		Color(1.0, 0.88, 0.58, 1.0)
	)
	status_label.add_theme_color_override(
		"font_outline_color",
		Color(0, 0, 0, 0.95)
	)
	status_label.add_theme_constant_override("outline_size", 4)
	status_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_label.z_index = 50

	_create_or_find_mood_icon()


func _create_or_find_mood_icon():
	mood_icon = get_node_or_null("MoodIcon") as Sprite2D

	if mood_icon == null:
		mood_icon = Sprite2D.new()
		mood_icon.name = "MoodIcon"
		add_child(mood_icon)

	mood_icon.position = _get_mood_anchor_position()
	mood_icon.scale = mood_icon_scale
	mood_icon.centered = true
	mood_icon.z_as_relative = false
	mood_icon.z_index = mood_icon_z_index
	mood_icon.show_behind_parent = false
	mood_icon.visible = false


func _create_or_find_attention_icon():
	attention_icon = get_node_or_null("AttentionIcon") as Sprite2D

	if attention_icon == null:
		attention_icon = Sprite2D.new()
		attention_icon.name = "AttentionIcon"
		add_child(attention_icon)

	attention_icon.position = (
		_get_mood_anchor_position()
		+ attention_icon_offset
	)
	attention_icon.scale = attention_icon_scale
	attention_icon.centered = true
	attention_icon.z_as_relative = false
	attention_icon.z_index = attention_icon_z_index
	attention_icon.show_behind_parent = false
	attention_icon.visible = false

	if attention_texture != null:
		attention_icon.texture = attention_texture


func set_attention_texture(texture: Texture2D) -> void:
	attention_texture = texture
	_create_or_find_attention_icon()
	if attention_icon != null:
		attention_icon.texture = texture


func set_attention_required(required: bool) -> void:
	attention_required = required
	_create_or_find_attention_icon()

	if attention_icon == null:
		return

	if required and attention_texture != null:
		attention_icon.texture = attention_texture
		attention_icon.visible = true
		attention_hover_time = 0.0
		if mood_icon != null:
			mood_icon.visible = false
	else:
		attention_icon.visible = false


func set_mood_state(
	new_mood: String,
	reason: String = ""
) -> bool:
	var canonical_mood = new_mood.strip_edges().to_lower()

	if canonical_mood not in [
		MOOD_HAPPY,
		MOOD_NEUTRAL,
		MOOD_ANNOYED
	]:
		push_warning(
			"UNSUPPORTED STATION MOOD: "
			+ station_id
			+ " -> "
			+ canonical_mood
		)
		return false

	var previous_mood = mood_state
	mood_state = canonical_mood
	mood_reason = reason

	if print_state_changes and previous_mood != mood_state:
		print(
			"STATION MOOD: ",
			station_id,
			" | ",
			previous_mood,
			" -> ",
			mood_state,
			(" | " + mood_reason if mood_reason != "" else "")
		)

	if mood_icon == null:
		return true

	var chosen_texture: Texture2D = null

	match mood_state:
		MOOD_HAPPY:
			chosen_texture = mood_happy_texture
		MOOD_NEUTRAL:
			chosen_texture = mood_neutral_texture
		MOOD_ANNOYED:
			chosen_texture = mood_annoyed_texture

	if chosen_texture == null:
		push_warning(
			"MISSING STATION MOOD TEXTURE: "
			+ station_id
			+ " | "
			+ mood_state
		)

	mood_icon.texture = chosen_texture
	mood_icon.position = _get_mood_anchor_position()
	mood_icon.scale = mood_icon_scale
	mood_icon.modulate = Color(1, 1, 1, 1)
	mood_icon.z_as_relative = false
	mood_icon.z_index = mood_icon_z_index
	mood_icon.show_behind_parent = false
	mood_transition_time = 0.0

	if canonical_mood == MOOD_HAPPY:
		happy_icon_time_remaining = happy_icon_hold_seconds
	else:
		happy_icon_time_remaining = 0.0

	mood_icon.visible = (
		not attention_required
		and chosen_texture != null
		and (
			mood_state != MOOD_HAPPY
			or show_happy_mood
		)
	)

	return true


func set_mood_happy():
	mood_reason = ""
	return set_mood_state(MOOD_HAPPY)


func set_mood_warning(reason: String = ""):
	return set_mood_state(
		MOOD_NEUTRAL,
		reason
	)


func set_mood_unhappy(reason: String = ""):
	return set_mood_state(
		MOOD_ANNOYED,
		reason
	)


func get_mood_state():
	return mood_state


func get_mood_reason():
	return mood_reason


func _input_event(_viewport, event, _shape_idx):
	if not (event is InputEventMouseButton):
		return

	if not event.pressed:
		return

	if event.button_index != MOUSE_BUTTON_LEFT:
		return

	print("CLICKED STATION: ", station_id)
	station_clicked.emit(self, station_id)


func get_station_id():
	return station_id


func get_station_state():
	return station_state


func get_interaction_position():
	var interaction_point = get_node_or_null(
		interaction_point_path
	) as Marker2D

	if interaction_point != null:
		return interaction_point.global_position

	var collision_shape = get_node_or_null(
		"CollisionShape2D"
	) as CollisionShape2D

	if collision_shape != null:
		return (
			collision_shape.global_position
			+ interaction_offset
		)

	return global_position + interaction_offset


## Visual-only station state change.
##
## Main.gd owns all service logic and timers. This function only:
## 1. normalises the requested state,
## 2. selects the correct texture,
## 3. applies the visual,
## 4. remembers the state until the next real state change.
func set_station_state(new_state, force_refresh = false):
	var canonical_state = _normalise_state(str(new_state))

	if canonical_state == "":
		push_warning(
			"UNSUPPORTED STATION STATE: "
			+ station_id
			+ " -> "
			+ str(new_state)
		)
		return false

	if station_state == canonical_state and not force_refresh:
		return true

	var chosen_texture = _get_texture_for_state(canonical_state)

	if chosen_texture == null and sprite == null:
		push_warning(
			"STATION HAS NO SPRITE OR TEXTURE: "
			+ station_id
			+ " -> "
			+ canonical_state
		)
		return false

	var previous_state = station_state
	station_state = canonical_state

	if print_state_changes:
		var texture_path = "fallback tint"

		if chosen_texture != null:
			texture_path = chosen_texture.resource_path

		print(
			"STATION STATE: ",
			station_id,
			" | ",
			previous_state,
			" -> ",
			station_state,
			" | Texture: ",
			texture_path
		)

	if sprite != null:
		if chosen_texture != null:
			sprite.texture = chosen_texture
			sprite.modulate = Color(1, 1, 1, 1)
		else:
			# Keep the current texture visible and tint it as a fallback.
			# This prevents a missing optional texture from blanking the station.
			sprite.modulate = _get_fallback_modulate(canonical_state)

		sprite.visible = true

	station_state_changed.emit(
		station_id,
		previous_state,
		station_state
	)

	# Ready-to-collect remains happy until Main's warning timer fires.
	if canonical_state == STATE_ANNOYED:
		set_mood_unhappy("Waiting too long")
	elif canonical_state in [
		STATE_IDLE,
		STATE_MIXING,
		STATE_GETTING_WINE,
		STATE_COOKING,
		STATE_READY_COLLECTION,
		STATE_WINE_READY,
		STATE_EMPTY,
		STATE_ACTIVE,
		STATE_STOCKED
	]:
		set_mood_happy()

	return true


func refresh_station_visual():
	if station_state == "":
		return set_station_state(_get_default_state(), true)

	return set_station_state(station_state, true)


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


func _validate_texture_assignments():
	if sprite == null:
		return

	if station_id == "bar":
		_warn_missing_texture("idle_texture", idle_texture)
		_warn_missing_texture("active_texture (mixing)", active_texture)
		_warn_missing_texture("ready_texture", ready_texture)
		_warn_missing_texture("getting_wine_texture", getting_wine_texture)
		_warn_missing_texture("wine_ready_texture", wine_ready_texture)
		_warn_missing_texture("annoyed_texture", annoyed_texture)

	elif station_id == "chef":
		_warn_missing_texture("idle_texture", idle_texture)
		_warn_missing_texture("active_texture (cooking)", active_texture)
		_warn_missing_texture("annoyed_texture", annoyed_texture)

	elif station_id == "scullery":
		_warn_missing_texture("empty_texture", empty_texture)
		_warn_missing_texture("full_texture", full_texture)
		_warn_missing_texture("active_texture", active_texture)

	elif station_id == "pos":
		_warn_missing_texture("idle_texture", idle_texture)
		_warn_missing_texture("active_texture", active_texture)

	elif station_id == "mise_en_place":
		_warn_missing_texture("stocked_texture", stocked_texture)
		_warn_missing_texture("low_texture", low_texture)


func _warn_missing_texture(field_name, texture):
	if texture != null:
		return

	push_warning(
		"MISSING STATION TEXTURE: "
		+ station_id
		+ " | "
		+ field_name
	)


func _normalise_state(state):
	if station_id == "bar":
		if state in ["idle", "order_received", "collected", "complete"]:
			return STATE_IDLE

		if state in [
			"getting_wine",
			"preparing_wine"
		]:
			return STATE_GETTING_WINE

		if state in [
			"active",
			"mixing",
			"preparing"
		]:
			return STATE_MIXING

		if state in [
			"wine_ready"
		]:
			return STATE_WINE_READY

		if state in [
			"ready",
			"ready_collection"
		]:
			return STATE_READY_COLLECTION

		if state == "annoyed":
			return STATE_ANNOYED

		return ""

	if station_id == "chef":
		if state in ["idle", "collected", "complete"]:
			return STATE_IDLE

		if state in [
			"active",
			"cooking",
			"preparing",
			"preparing_food"
		]:
			return STATE_COOKING

		if state in [
			"ready",
			"food_ready",
			"ready_collection"
		]:
			return STATE_READY_COLLECTION

		if state == "annoyed":
			return STATE_ANNOYED

		return ""

	if station_id == "scullery":
		if state in ["idle", "empty", "complete"]:
			return STATE_EMPTY

		if state in [
			"full",
			"dirty_received",
			"drop_plates"
		]:
			return STATE_FULL

		if state in [
			"active",
			"washing",
			"cleaning"
		]:
			return STATE_ACTIVE

		if state == "annoyed":
			return STATE_ANNOYED

		return ""

	if station_id == "pos":
		if state in [
			"idle",
			"receipt_collected",
			"complete"
		]:
			return STATE_IDLE

		if state in [
			"active",
			"receipt_ready",
			"ready",
			"printing",
			"ready_collection"
		]:
			return STATE_ACTIVE

		return ""

	if station_id == "mise_en_place":
		if state in ["idle", "stocked", "complete"]:
			return STATE_STOCKED

		if state in ["active", "low"]:
			return STATE_LOW

		return ""

	# Generic fallback for any later station type.
	if state in [
		STATE_IDLE,
		STATE_MIXING,
		STATE_GETTING_WINE,
		STATE_COOKING,
		STATE_READY_COLLECTION,
		STATE_WINE_READY,
		STATE_ANNOYED,
		STATE_EMPTY,
		STATE_FULL,
		STATE_ACTIVE,
		STATE_STOCKED,
		STATE_LOW
	]:
		return state

	return ""


func _get_texture_for_state(state):
	if station_id == "bar":
		return _get_bar_texture(state)

	if station_id == "chef":
		return _get_chef_texture(state)

	if station_id == "scullery":
		return _get_scullery_texture(state)

	if station_id == "pos":
		return _get_pos_texture(state)

	if station_id == "mise_en_place":
		return _get_mise_texture(state)

	return _get_generic_texture(state)


func _get_bar_texture(state):
	if state == STATE_IDLE:
		return _first_texture([
			idle_texture
		])

	if state == STATE_GETTING_WINE:
		return _first_texture([
			getting_wine_texture,
			active_texture,
			idle_texture
		])

	if state == STATE_MIXING:
		return _first_texture([
			active_texture,
			idle_texture
		])

	if state == STATE_WINE_READY:
		return _first_texture([
			wine_ready_texture,
			ready_texture,
			active_texture,
			idle_texture
		])

	if state == STATE_READY_COLLECTION:
		return _first_texture([
			ready_texture,
			active_texture,
			idle_texture
		])

	if state == STATE_ANNOYED:
		return _first_texture([
			annoyed_texture,
			wine_ready_texture,
			ready_texture,
			active_texture,
			idle_texture
		])

	return null


func _get_chef_texture(state):
	if state == STATE_IDLE:
		return _first_texture([
			idle_texture
		])

	if state == STATE_COOKING:
		return _first_texture([
			active_texture,
			idle_texture
		])

	if state == STATE_READY_COLLECTION:
		return _first_texture([
			ready_texture,
			active_texture,
			idle_texture
		])

	if state == STATE_ANNOYED:
		return _first_texture([
			annoyed_texture,
			ready_texture,
			active_texture,
			idle_texture
		])

	return null


func _get_scullery_texture(state):
	if state == STATE_EMPTY:
		return _first_texture([
			empty_texture,
			idle_texture
		])

	if state == STATE_FULL:
		return _first_texture([
			full_texture,
			active_texture,
			empty_texture,
			idle_texture
		])

	if state == STATE_ACTIVE:
		return _first_texture([
			active_texture,
			full_texture,
			empty_texture,
			idle_texture
		])

	if state == STATE_ANNOYED:
		return _first_texture([
			annoyed_texture,
			full_texture,
			active_texture,
			empty_texture,
			idle_texture
		])

	return null


func _get_pos_texture(state):
	if state == STATE_IDLE:
		return _first_texture([
			idle_texture
		])

	if state == STATE_ACTIVE:
		return _first_texture([
			active_texture,
			ready_texture,
			idle_texture
		])

	return null


func _get_mise_texture(state):
	if state == STATE_STOCKED:
		return _first_texture([
			stocked_texture,
			idle_texture
		])

	if state == STATE_LOW:
		return _first_texture([
			low_texture,
			active_texture,
			stocked_texture,
			idle_texture
		])

	return null


func _get_generic_texture(state):
	if state == STATE_IDLE:
		return _first_texture([
			idle_texture
		])

	if state in [STATE_MIXING, STATE_COOKING, STATE_ACTIVE]:
		return _first_texture([
			active_texture,
			idle_texture
		])

	if state == STATE_READY_COLLECTION:
		return _first_texture([
			ready_texture,
			active_texture,
			idle_texture
		])

	if state == STATE_ANNOYED:
		return _first_texture([
			annoyed_texture,
			idle_texture
		])

	if state == STATE_EMPTY:
		return _first_texture([
			empty_texture,
			idle_texture
		])

	if state == STATE_FULL:
		return _first_texture([
			full_texture,
			active_texture,
			idle_texture
		])

	if state == STATE_STOCKED:
		return _first_texture([
			stocked_texture,
			idle_texture
		])

	if state == STATE_LOW:
		return _first_texture([
			low_texture,
			active_texture,
			stocked_texture,
			idle_texture
		])

	return null


func _first_texture(texture_list):
	for texture in texture_list:
		if texture != null:
			return texture

	return null


func _get_fallback_modulate(state):
	if state in [
		STATE_ACTIVE,
		STATE_MIXING,
		STATE_COOKING
	]:
		return Color(1.0, 0.90, 0.55, 1.0)

	if state == STATE_READY_COLLECTION:
		return Color(0.70, 1.0, 0.70, 1.0)

	if state in [STATE_ANNOYED, STATE_FULL]:
		return Color(1.0, 0.55, 0.45, 1.0)

	if state == STATE_LOW:
		return Color(1.0, 0.70, 0.35, 1.0)

	return Color(1, 1, 1, 1)


func set_station_status(message):
	if status_label == null:
		return

	status_label.text = str(message)
	status_label.visible = str(message) != ""


func clear_station_status():
	set_station_status("")
