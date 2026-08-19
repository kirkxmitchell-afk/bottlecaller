extends Area2D
class_name TableController

signal table_clicked(table_node, table_id, encounter_id)
signal table_state_changed(table_id, previous_state, new_state)
signal table_visual_changed(table_id, previous_visual, new_visual)
signal table_became_annoyed(table_id, reason)
signal guest_profile_changed(table_id, previous_guest_id, new_guest_id)

# Logical states.
const STATE_EMPTY = "empty"
const STATE_AVAILABLE = "available"
const STATE_WAITING_TO_GREET = "waiting_to_greet"
const STATE_IN_ENCOUNTER = "in_encounter"
const STATE_DECIDING = "deciding"
const STATE_ORDER_PENDING_POS = "order_pending_pos"
const STATE_WAITING_FOR_MISE = "waiting_for_mise"
const STATE_WAITING_FOR_BAR = "waiting_for_bar"
const STATE_WAITING_FOR_CHEF = "waiting_for_chef"
const STATE_SERVICE_IN_PROGRESS = "service_in_progress"
const STATE_APERITIF_SERVED = "aperitif_served"
const STATE_WINE_SERVED = "wine_served"
const STATE_EATING = "eating"
const STATE_READY_TO_CLEAR = "ready_to_clear"
const STATE_PLATES_COLLECTED = "plates_collected"
const STATE_WAITING_FOR_BILL = "waiting_for_bill"
const STATE_WAITING_FOR_BILL_CLOSE = "waiting_for_bill_close"
const STATE_COMPLETE = "complete"
const STATE_ANNOYED = "annoyed"

# Visual states supplied by the new table asset sets.
const VISUAL_ANNOYED = "annoyed"
const VISUAL_APERITIF = "aperitif"
const VISUAL_EATING = "eating"
const VISUAL_EMPTY = "empty"
const VISUAL_NEUTRAL = "neutral"
const VISUAL_READY_TO_CLEAR = "ready_to_clear"
const VISUAL_WINE = "wine"

# Hovering mood-alert states.
const MOOD_HIDDEN = "hidden"
const MOOD_HAPPY = "happy"
const MOOD_NEUTRAL = "neutral"
const MOOD_ANNOYED = "annoyed"

# Temporary result names used by the current Main.gd test panel.
const OUTCOME_SUCCESS = "success"
const OUTCOME_FAILURE = "failure"
const OUTCOME_NEUTRAL_EXIT = "neutral_exit"

@export_category("Table Identity")
@export var table_id = "table_01_tourists"
@export var encounter_id = "tourists"
@export var guest_display_name = "Guest"
@export_multiline var guest_hint = ""

@export_category("Guest Profile")
## Optional profile loaded when the scene starts.
## Later Main.gd will replace this profile at runtime.
@export var starting_guest_profile: GuestTableProfile

@export_range(0.1, 3.0, 0.05)
var guest_patience_multiplier: float = 1.0

@export_category("Starting State")
## Enable for tables that begin the current demo with guests seated.
## Disable for tables that should begin with the empty-table artwork.
@export var starts_with_guests = true

@export_category("Table State Textures")
@export var annoyed_texture: Texture2D
@export var aperitif_texture: Texture2D
@export var eating_texture: Texture2D
@export var empty_texture: Texture2D
@export var neutral_texture: Texture2D
@export var ready_to_clear_texture: Texture2D
@export var wine_texture: Texture2D

@export_category("Positioning")
@export var show_status_label = false
@export var status_offset = Vector2(-170, -125)
@export var status_label_size = Vector2(340, 82)

@export_range(12, 48, 1)
var status_font_size = 28

@export_range(0, 12, 1)
var status_outline_size = 6

@export_node_path("Marker2D") var interaction_point_path = ^"InteractionPoint"
@export var interaction_offset = Vector2(0, 105)

@export_category("Mood Alert Icons")

@export var mood_happy_texture: Texture2D
@export var mood_neutral_texture: Texture2D
@export var mood_annoyed_texture: Texture2D

@export_category("Guest Speech Bubble")

## Floor speech bubble art (hud_speech_bubble).
@export var speech_bubble_texture: Texture2D

## Larger than the old 0.55 so two-line guest lines fit inside the art.
@export var speech_bubble_scale = Vector2(0.78, 0.92)

## Extra lift above the guest head anchor.
@export_range(0.0, 160.0, 1.0)
var speech_bubble_vertical_lift = 28.0

@export_range(1.0, 12.0, 0.1)
var speech_bubble_duration = 5.5

@export_range(12, 36, 1)
var speech_bubble_font_size = 20

## Negative = tighter multi-line packing inside the bubble.
@export_range(-12, 12, 1)
var speech_bubble_line_spacing = -4

## Automatically anchor the alert just above the visible table artwork.
## This prevents table mood icons from drifting upward into the Bar area.
@export var auto_anchor_mood_to_sprite = true

## Extra distance above the top edge of the table artwork.
@export_range(0.0, 100.0, 1.0)
var mood_icon_gap = 18.0

## Small final adjustment after automatic anchoring.
@export var mood_icon_fine_offset = Vector2(0, 0)

## Used only when no valid table Sprite2D texture is available.
@export var mood_icon_fallback_offset = Vector2(0, -115)

## Adjust this to match the size of the imported mood artwork.
@export var mood_icon_scale = Vector2(0.22, 0.22)

## Absolute world Z. The waiter currently uses approximately Z = 200.
@export_range(201, 4000, 1)
var mood_icon_z_index = 3000

@export_category("Attention Alert")

## Shown when the table needs a player action (e.g. reset).
@export var attention_texture: Texture2D

@export var attention_icon_scale = Vector2(0.24, 0.24)

@export var attention_icon_offset = Vector2(0, -8)

@export_range(201, 4000, 1)
var attention_icon_z_index = 3100

@export_range(0.0, 20.0, 0.5)
var attention_hover_amplitude = 7.0

@export_range(0.1, 10.0, 0.1)
var attention_hover_speed = 3.2

@export_range(0.0, 20.0, 0.5)
var mood_hover_amplitude = 6.0

@export_range(0.1, 10.0, 0.1)
var mood_hover_speed = 2.4

## Happy remains visible while an active table is satisfied.
@export var show_happy_mood = true

## Zero keeps happy visible until the table mood/state changes.
@export_range(0.0, 10.0, 0.1)
var happy_icon_hold_seconds = 0.0

@export_range(0.0, 0.5, 0.01)
var neutral_pulse_strength = 0.10

@export_range(0.0, 0.8, 0.01)
var annoyed_pulse_strength = 0.20

@export_category("Drawing")
## Keep lower than the waiter's current Z index so the waiter stays visible.
@export var table_z_index = 100

@export_category("Debug")
@export var print_state_changes = true

@onready var sprite: Sprite2D = get_node_or_null("Sprite2D") as Sprite2D

var table_state = STATE_AVAILABLE
var table_visual_state = VISUAL_NEUTRAL
var last_outcome = ""
var status_label: Label

var state_before_annoyed = STATE_AVAILABLE
var visual_before_annoyed = VISUAL_NEUTRAL
var annoyed_reason = ""
var active_guest_profile: GuestTableProfile

var current_patience_stage: StringName = &""
var max_patience_seconds = 0.0
var remaining_patience_seconds = 0.0
var patience_active = false
var patience_paused = false
var patience_breached = false
var patience_breach_count = 0
var patience_mood_band: StringName = &"green"

var mood_icon: Sprite2D
var mood_transition_time = 0.0
var happy_icon_time_remaining = 0.0
var mood_state = MOOD_HIDDEN
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
	input_pickable = true
	z_as_relative = false
	z_index = table_z_index

	if sprite != null:
		sprite.z_as_relative = false
		sprite.z_index = table_z_index
		sprite.visible = true
	else:
		push_warning("NO SPRITE2D FOUND FOR TABLE: " + table_id)

	_create_or_find_status_label()
	_create_or_find_attention_icon()
	_create_or_find_speech_bubble()
	set_attention_required(false)

	if starting_guest_profile != null:
		apply_guest_profile(
			starting_guest_profile,
			false
		)
	elif not starts_with_guests:
		# A replaced script can leave the Sprite2D displaying an old
		# occupied-table texture while no profile/empty texture is loaded.
		# Hide that stale artwork until Main applies a real guest profile.
		if sprite != null:
			sprite.visible = false

	reset_table()
	print("TABLE READY: ", table_id, " | Guest: ", guest_display_name)


func _process(delta):
	if mood_icon != null:
		mood_icon.position = _get_mood_anchor_position()

		if mood_icon.visible and not attention_required:
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


func _get_mood_anchor_position() -> Vector2:
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


func _create_or_find_status_label():
	status_label = get_node_or_null("StatusLabel") as Label

	if status_label == null:
		status_label = Label.new()
		status_label.name = "StatusLabel"
		add_child(status_label)

	status_label.position = status_offset
	status_label.size = status_label_size
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_font_size_override(
		"font_size",
		status_font_size
	)
	status_label.add_theme_color_override(
		"font_color",
		Color(1.0, 0.88, 0.58, 1.0)
	)
	status_label.add_theme_color_override(
		"font_outline_color",
		Color(0, 0, 0, 0.98)
	)
	status_label.add_theme_constant_override(
		"outline_size",
		status_outline_size
	)
	status_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_label.z_as_relative = false
	status_label.z_index = table_z_index + 10
	status_label.visible = false
	status_label.text = ""

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


func _create_or_find_speech_bubble() -> void:
	speech_bubble_root = get_node_or_null("GuestSpeechBubble") as Node2D
	if speech_bubble_root == null:
		speech_bubble_root = Node2D.new()
		speech_bubble_root.name = "GuestSpeechBubble"
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
	if bubble_texture == null:
		bubble_texture = load(
			"res://assets/hud/bottlecaller_hud_batch_01_named/hud_speech_bubble.png"
		) as Texture2D
	speech_bubble_texture = bubble_texture

	speech_bubble_sprite.texture = bubble_texture
	speech_bubble_sprite.visible = bubble_texture != null
	speech_bubble_sprite.centered = true
	speech_bubble_sprite.scale = speech_bubble_scale
	speech_bubble_sprite.z_as_relative = false
	# Above table art and mood icons so the cream bubble is actually visible.
	speech_bubble_sprite.z_index = maxi(mood_icon_z_index, attention_icon_z_index) + 20

	# Kill any theme/panel fill — Label can inherit an opaque StyleBox.
	speech_bubble_label.theme = Theme.new()
	var clear_panel = StyleBoxEmpty.new()
	speech_bubble_label.add_theme_stylebox_override("normal", clear_panel)
	speech_bubble_label.add_theme_stylebox_override("focus", clear_panel)
	speech_bubble_label.add_theme_stylebox_override("hover", clear_panel)
	speech_bubble_label.add_theme_stylebox_override("pressed", clear_panel)
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

	# LabelSettings bypasses theme font fills that can look like a dark plate.
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
	speech_bubble_label.z_index = speech_bubble_sprite.z_index + 1

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
	# Keep text inside the taupe fill; leave cream border + bottom tail clear.
	var inset_x = maxf(22.0, drawn.x * 0.08)
	var inset_top = maxf(14.0, drawn.y * 0.16)
	var inset_bottom = maxf(22.0, drawn.y * 0.28)
	var label_w = maxf(80.0, drawn.x - inset_x * 2.0)
	var label_h = maxf(28.0, drawn.y - inset_top - inset_bottom)

	speech_bubble_label.size = Vector2(label_w, label_h)
	speech_bubble_label.position = Vector2(
		-label_w * 0.5,
		-drawn.y * 0.5 + inset_top
	)


func show_guest_speech(
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
		+ Vector2(0, -speech_bubble_vertical_lift)
	)
	speech_bubble_root.visible = true
	speech_bubble_visible = true
	speech_bubble_time_left = (
		speech_bubble_duration
		if duration <= 0.0
		else duration
	)
	speech_bubble_root.modulate = Color(1, 1, 1, 1)


func hide_guest_speech() -> void:
	speech_bubble_time_left = 0.0
	speech_bubble_visible = false
	if speech_bubble_root != null:
		speech_bubble_root.visible = false


func _update_speech_bubble(delta: float) -> void:
	if not speech_bubble_visible or speech_bubble_root == null:
		return

	speech_bubble_root.position = (
		_get_mood_anchor_position()
		+ Vector2(0, -speech_bubble_vertical_lift)
	)
	speech_bubble_time_left -= delta

	if speech_bubble_time_left <= 0.0:
		hide_guest_speech()
		return

	if speech_bubble_time_left < 0.5:
		speech_bubble_root.modulate.a = clampf(
			speech_bubble_time_left / 0.5,
			0.0,
			1.0
		)


func _input_event(_viewport, event, _shape_idx):
	if not (event is InputEventMouseButton):
		return
	if not event.pressed:
		return
	if event.button_index != MOUSE_BUTTON_LEFT:
		return

	print(
		"CLICKED TABLE: ", table_id,
		" | State: ", table_state,
		" | Visual: ", table_visual_state
	)
	table_clicked.emit(self, table_id, encounter_id)


# -------------------------------------------------------------------
# Hovering mood alerts
# -------------------------------------------------------------------

func set_mood_state(
	new_mood: String,
	reason: String = ""
) -> bool:
	var canonical_mood = new_mood.strip_edges().to_lower()

	if canonical_mood not in [
		MOOD_HIDDEN,
		MOOD_HAPPY,
		MOOD_NEUTRAL,
		MOOD_ANNOYED
	]:
		push_warning(
			"UNSUPPORTED TABLE MOOD: "
			+ table_id
			+ " -> "
			+ canonical_mood
		)
		return false

	var previous_mood = mood_state
	mood_state = canonical_mood
	mood_reason = reason

	if print_state_changes and previous_mood != mood_state:
		print(
			"TABLE MOOD: ",
			table_id,
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
		and mood_state != MOOD_HIDDEN
		and chosen_texture != null
		and (
			mood_state != MOOD_HAPPY
			or show_happy_mood
		)
	)

	return true


func set_mood_happy():
	mood_reason = ""

	if has_guests():
		return set_mood_state(MOOD_HAPPY)

	return set_mood_state(MOOD_HIDDEN)


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


func hide_mood_icon():
	return set_mood_state(MOOD_HIDDEN)


func get_mood_state():
	return mood_state


func get_mood_reason():
	return mood_reason


# -------------------------------------------------------------------
# Guest-profile loading
# -------------------------------------------------------------------

## Loads one complete guest/table asset set into this physical table slot.
##
## This changes the guest identity and all seven table textures, but does
## not move the Area2D, collision shape, or InteractionPoint.
##
## Set seat_immediately to true when guests should appear straight away.
func apply_guest_profile(
	profile: GuestTableProfile,
	seat_immediately: bool = false
) -> bool:
	if profile == null:
		push_warning(
			"NULL GUEST PROFILE GIVEN TO TABLE: "
			+ table_id
		)
		return false

	var previous_guest_id = encounter_id
	active_guest_profile = profile
	guest_patience_multiplier = profile.guest_patience_multiplier
	if guest_patience_multiplier <= 0.0:
		push_warning(
			"INVALID GUEST PATIENCE MULTIPLIER: "
			+ profile.guest_id
			+ "; using 1.0"
		)
		guest_patience_multiplier = 1.0

	encounter_id = profile.guest_id
	guest_display_name = profile.guest_display_name
	guest_hint = profile.guest_hint

	annoyed_texture = profile.annoyed_texture
	aperitif_texture = profile.aperitif_texture
	eating_texture = profile.eating_texture
	empty_texture = profile.empty_texture
	neutral_texture = profile.neutral_texture
	ready_to_clear_texture = profile.ready_to_clear_texture
	wine_texture = profile.wine_texture

	if sprite != null:
		sprite.visible = true

	var missing_textures = profile.get_missing_texture_names()
	if not missing_textures.is_empty():
		push_warning(
			"GUEST PROFILE HAS MISSING TEXTURES: "
			+ profile.guest_id
			+ " -> "
			+ str(missing_textures)
		)

	guest_profile_changed.emit(
		table_id,
		previous_guest_id,
		encounter_id
	)

	print(
		"TABLE PROFILE APPLIED: ",
		table_id,
		" | ",
		previous_guest_id,
		" -> ",
		encounter_id
	)

	if seat_immediately:
		return seat_guests()

	# Applying the next guest profile while the table is empty must not
	# make guests appear before Main.gd triggers the arrival.
	if table_state in [
		STATE_EMPTY,
		STATE_COMPLETE
	]:
		return set_table_visual(
			VISUAL_EMPTY,
			true
		)

	return refresh_table_visual()


func clear_guest_profile() -> void:
	active_guest_profile = null
	encounter_id = ""
	guest_display_name = ""
	guest_hint = ""


func get_active_guest_profile() -> GuestTableProfile:
	return active_guest_profile


func has_guest_profile() -> bool:
	return active_guest_profile != null


# -------------------------------------------------------------------
# Public information
# -------------------------------------------------------------------

func get_table_id():
	return table_id


func get_encounter_id():
	return encounter_id


func get_guest_display_name():
	return guest_display_name


func get_guest_hint():
	return guest_hint


func get_table_state():
	return table_state


func get_table_visual_state():
	return table_visual_state


func get_last_outcome():
	return last_outcome


func is_empty():
	return table_state == STATE_EMPTY


func has_guests():
	return table_state not in [STATE_EMPTY, STATE_COMPLETE]


func is_annoyed():
	return table_state == STATE_ANNOYED


func get_annoyed_reason():
	return annoyed_reason


func get_interaction_position():
	var interaction_point = get_node_or_null(interaction_point_path) as Marker2D
	if interaction_point != null:
		return interaction_point.global_position

	var collision_shape = get_node_or_null("CollisionShape2D") as CollisionShape2D
	if collision_shape != null:
		return collision_shape.global_position + interaction_offset

	return global_position + interaction_offset


## World point just above the seated guests — used to float the encounter UI.
func get_guest_head_anchor_global() -> Vector2:
	return to_global(_get_mood_anchor_position())


func get_table_snapshot():
	return {
		"table_id": table_id,
		"encounter_id": encounter_id,
		"guest_display_name": guest_display_name,
		"guest_hint": guest_hint,
		"table_state": table_state,
		"visual_state": table_visual_state,
		"last_outcome": last_outcome,
		"annoyed_reason": annoyed_reason,
		"has_guest_profile": active_guest_profile != null,
		"patience_stage": str(current_patience_stage),
		"patience_percent": get_patience_percent(),
		"patience_active": patience_active,
		"patience_paused": patience_paused,
		"patience_breached": patience_breached,
		"patience_breach_count": patience_breach_count,
		"patience_mood_band": str(patience_mood_band)
	}


# -------------------------------------------------------------------
# Service patience state
# -------------------------------------------------------------------

func configure_patience_stage(
	stage_id: StringName,
	duration_seconds: float,
	patience_percent: float
) -> void:
	current_patience_stage = stage_id
	max_patience_seconds = maxf(duration_seconds, 0.0)
	remaining_patience_seconds = (
		max_patience_seconds
		* clampf(patience_percent, 0.0, 100.0)
		/ 100.0
	)
	patience_active = max_patience_seconds > 0.0
	patience_paused = false


func consume_patience(seconds: float) -> bool:
	if not patience_active or patience_paused or seconds <= 0.0:
		return false
	if table_state in [STATE_EMPTY, STATE_COMPLETE]:
		return false

	var previous_remaining = remaining_patience_seconds
	remaining_patience_seconds = maxf(
		remaining_patience_seconds - seconds,
		0.0
	)
	if previous_remaining > 0.0 and remaining_patience_seconds <= 0.0:
		patience_breached = true
		patience_breach_count += 1
		return true
	return false


func restore_patience_percent(amount: float) -> void:
	if not patience_active or max_patience_seconds <= 0.0:
		return
	set_patience_from_percent(get_patience_percent() + amount)


func get_patience_percent() -> float:
	if max_patience_seconds <= 0.0:
		return 100.0
	return clampf(
		remaining_patience_seconds / max_patience_seconds * 100.0,
		0.0,
		100.0
	)


func set_patience_from_percent(percent: float) -> void:
	if max_patience_seconds <= 0.0:
		remaining_patience_seconds = 0.0
		return
	remaining_patience_seconds = (
		max_patience_seconds
		* clampf(percent, 0.0, 100.0)
		/ 100.0
	)


func set_patience_paused(paused: bool) -> void:
	patience_paused = paused and patience_active


func stop_patience() -> void:
	patience_active = false
	patience_paused = false
	current_patience_stage = &""


func reset_patience_tracking() -> void:
	current_patience_stage = &""
	max_patience_seconds = 0.0
	remaining_patience_seconds = 0.0
	patience_active = false
	patience_paused = false
	patience_breached = false
	patience_breach_count = 0
	patience_mood_band = &"green"


func set_patience_mood_band(
	new_band: StringName,
	reason: String = ""
) -> void:
	if new_band == patience_mood_band:
		return
	patience_mood_band = new_band

	if table_state == STATE_ANNOYED and new_band != &"annoyed":
		clear_annoyed()

	match new_band:
		&"green":
			set_mood_happy()
		&"yellow", &"orange":
			set_mood_warning(reason)
		&"red":
			set_mood_unhappy(reason)
		&"annoyed":
			# Ready-to-clear must keep dirty-plate table art. Only the floating
			# mood icon shows unhappiness until plates are collected.
			if (
				table_state == STATE_READY_TO_CLEAR
				or table_visual_state == VISUAL_READY_TO_CLEAR
			):
				annoyed_reason = str(reason)
				set_mood_unhappy(annoyed_reason)
			else:
				set_annoyed(reason)
		_:
			push_warning(
				"UNSUPPORTED PATIENCE MOOD BAND: "
				+ table_id
				+ " -> "
				+ str(new_band)
			)


func replay_patience_mood_feedback(reason: String = "") -> void:
	match patience_mood_band:
		&"green":
			set_mood_happy()
		&"yellow", &"orange":
			set_mood_warning(reason)
		&"red", &"annoyed":
			set_mood_unhappy(reason)


# -------------------------------------------------------------------
# Label, logical state, and visual state
# -------------------------------------------------------------------

func set_status_text(message):
	if status_label == null:
		return
	# Guest table phase copy stays off the floor; HUD/prompts carry guidance.
	status_label.text = str(message) if show_status_label else ""
	status_label.visible = show_status_label and str(message) != ""


func clear_status_text():
	set_status_text("")


func set_table_state(new_state, status_message = ""):
	var normalised_state = str(new_state)
	if not _is_supported_logical_state(normalised_state):
		push_warning("UNSUPPORTED TABLE STATE: " + table_id + " -> " + normalised_state)
		return false

	var previous_state = table_state
	if previous_state != normalised_state:
		table_state = normalised_state
		if print_state_changes:
			print("TABLE STATE: ", table_id, " | ", previous_state, " -> ", table_state)
		table_state_changed.emit(table_id, previous_state, table_state)

		# A gameplay action may move the table directly out of the
		# annoyed state before Main calls clear_annoyed(). Recover the
		# mood and the pre-annoyed visual immediately so the annoyed icon
		# and artwork cannot remain stuck.
		if (
			previous_state == STATE_ANNOYED
			and normalised_state != STATE_ANNOYED
		):
			annoyed_reason = ""

			if table_visual_state == VISUAL_ANNOYED:
				set_table_visual(
					visual_before_annoyed,
					true
				)

			set_mood_happy()

	if status_message != "":
		set_status_text(status_message)
	return true


func set_table_visual(new_visual, force_refresh = false):
	var normalised_visual = str(new_visual)
	if not _is_supported_visual_state(normalised_visual):
		push_warning("UNSUPPORTED TABLE VISUAL: " + table_id + " -> " + normalised_visual)
		return false

	if table_visual_state == normalised_visual and not force_refresh:
		return true

	var chosen_texture = _get_texture_for_visual(normalised_visual)
	if chosen_texture == null:
		push_warning("MISSING TABLE TEXTURE: " + table_id + " -> " + normalised_visual)
		return false

	var previous_visual = table_visual_state
	table_visual_state = normalised_visual

	if sprite != null:
		sprite.texture = chosen_texture
		sprite.visible = true
		sprite.modulate = Color(1, 1, 1, 1)

	if print_state_changes:
		print("TABLE VISUAL: ", table_id, " | ", previous_visual, " -> ", table_visual_state)

	table_visual_changed.emit(table_id, previous_visual, table_visual_state)
	return true


func refresh_table_visual():
	return set_table_visual(table_visual_state, true)


# -------------------------------------------------------------------
# Empty, reset, and guest-arrival lifecycle
# -------------------------------------------------------------------

## Guests have left. The empty asset is displayed until the table is reset
## and another guest profile is seated by Main.gd.
func set_empty():
	stop_patience()
	last_outcome = ""
	annoyed_reason = ""
	set_table_state(STATE_EMPTY, "Empty — reset required")
	set_table_visual(VISUAL_EMPTY)
	hide_mood_icon()
	return true


## The empty table has been reset with serviette, knife, and fork.
## It remains visually empty until guests arrive.
func set_ready_for_guests():
	reset_patience_tracking()
	last_outcome = ""
	annoyed_reason = ""
	set_table_state(STATE_EMPTY, "Ready for guests")
	set_table_visual(VISUAL_EMPTY)
	hide_mood_icon()
	set_attention_required(false)
	return true


## Assigns a guest profile to this physical table and displays neutral.
func seat_guests(new_encounter_id = "", new_guest_display_name = "", new_guest_hint = ""):
	if new_encounter_id != "":
		encounter_id = str(new_encounter_id)
	if new_guest_display_name != "":
		guest_display_name = str(new_guest_display_name)
	if new_guest_hint != "":
		guest_hint = str(new_guest_hint)

	last_outcome = ""
	annoyed_reason = ""
	set_table_state(STATE_WAITING_TO_GREET, "Waiting to greet")
	set_table_visual(VISUAL_NEUTRAL)
	set_mood_happy()
	return true


func resume_waiting_to_greet(status_message: String = "Waiting to greet"):
	set_table_state(STATE_WAITING_TO_GREET, status_message)
	set_table_visual(VISUAL_NEUTRAL)
	return true


## Compatibility state used by the current Main.gd.
func set_available():
	last_outcome = ""
	annoyed_reason = ""
	set_table_state(STATE_AVAILABLE, "Wine opportunity")
	set_table_visual(VISUAL_NEUTRAL)
	set_mood_happy()
	return true


# -------------------------------------------------------------------
# Guest-interaction and pending-service lifecycle
# -------------------------------------------------------------------

func mark_in_encounter():
	set_table_state(STATE_IN_ENCOUNTER, "Guest interaction")
	set_table_visual(VISUAL_NEUTRAL)
	print("TABLE MARKED IN ENCOUNTER: ", table_id)


func set_deciding():
	return set_table_state(STATE_DECIDING, "Awaiting response")


func set_order_pending_pos():
	return set_table_state(STATE_ORDER_PENDING_POS, "Enter order at POS")


func set_waiting_for_mise():
	return set_table_state(STATE_WAITING_FOR_MISE, "Mise en place required")


func set_waiting_for_bar():
	return set_table_state(STATE_WAITING_FOR_BAR, "Waiting for Bar")


func set_waiting_for_chef():
	return set_table_state(STATE_WAITING_FOR_CHEF, "Waiting for food")


## Preserved so the current Success / Failure / Neutral Exit test panel
## continues working until the greeting/offer system replaces it.
func set_result_state(outcome):
	var normalised_outcome = str(outcome)
	if normalised_outcome not in [OUTCOME_SUCCESS, OUTCOME_FAILURE, OUTCOME_NEUTRAL_EXIT]:
		push_warning("UNKNOWN TABLE OUTCOME: " + table_id + " -> " + normalised_outcome)
		return false

	last_outcome = normalised_outcome
	set_table_state(STATE_SERVICE_IN_PROGRESS, "Service in progress")
	set_table_visual(VISUAL_NEUTRAL)
	return true


# -------------------------------------------------------------------
# Served-item and meal lifecycle
# -------------------------------------------------------------------

func set_aperitif_served():
	set_table_state(STATE_APERITIF_SERVED, "Aperitif served")
	set_table_visual(VISUAL_APERITIF)
	return true


func set_wine_served():
	set_table_state(STATE_WINE_SERVED, "Wine served")
	set_table_visual(VISUAL_WINE)
	return true


## Current Main.gd calls set_enjoying() after delivering food.
func set_enjoying():
	return set_eating()


func set_eating():
	set_table_state(STATE_EATING, "Eating")
	set_table_visual(VISUAL_EATING)
	print("TABLE EATING: ", table_id)
	return true


func set_ready_to_clear():
	set_table_state(STATE_READY_TO_CLEAR, "Ready to clear")
	set_table_visual(VISUAL_READY_TO_CLEAR)
	print("TABLE READY TO CLEAR: ", table_id)
	return true


func set_plates_collected():
	set_table_state(STATE_PLATES_COLLECTED, "Plates collected")
	# Plates leave with the waiter — show seated guests without dirty dishes.
	# (Previously only dimmed the ready-to-clear art, so plates stayed on the table.)
	set_table_visual(VISUAL_NEUTRAL, true)
	visual_before_annoyed = VISUAL_NEUTRAL
	print("PLATES COLLECTED FROM TABLE: ", table_id)
	return true


func set_waiting_for_bill():
	set_table_state(STATE_WAITING_FOR_BILL, "Waiting for bill")
	# Guarantee neutral after scullery drop even if collect skipped a visual swap.
	set_table_visual(VISUAL_NEUTRAL, true)
	visual_before_annoyed = VISUAL_NEUTRAL
	return true


func set_waiting_for_bill_close():
	set_table_state(STATE_WAITING_FOR_BILL_CLOSE, "Waiting for bill close")
	set_table_visual(VISUAL_NEUTRAL, true)
	visual_before_annoyed = VISUAL_NEUTRAL
	return true


## Current Main.gd calls this after the receipt is delivered. Keep the
## logical complete state for backward compatibility, but show the empty
## table artwork immediately. The future multi-table Main.gd can call
## set_empty() after its guest-leave delay.
func set_complete():
	stop_patience()
	set_table_state(STATE_COMPLETE, "Service complete")
	set_table_visual(VISUAL_EMPTY)
	hide_mood_icon()
	print("TABLE COMPLETE: ", table_id)
	return true


# -------------------------------------------------------------------
# Annoyed visual and recovery
# -------------------------------------------------------------------

func set_annoyed(reason = ""):
	if table_state != STATE_ANNOYED:
		state_before_annoyed = table_state
		visual_before_annoyed = table_visual_state

	annoyed_reason = str(reason)
	set_table_state(STATE_ANNOYED, _get_annoyed_status_text())
	set_table_visual(VISUAL_ANNOYED)
	set_mood_unhappy(annoyed_reason)
	table_became_annoyed.emit(table_id, annoyed_reason)
	return true


func clear_annoyed():
	if table_state != STATE_ANNOYED:
		return false

	var restore_state = state_before_annoyed
	var restore_visual = visual_before_annoyed
	annoyed_reason = ""
	set_table_state(restore_state, _get_default_status_for_state(restore_state))
	set_table_visual(restore_visual)
	set_mood_happy()
	return true


func _get_annoyed_status_text():
	if annoyed_reason == "":
		return "Annoyed"
	return "Annoyed: " + annoyed_reason


# -------------------------------------------------------------------
# Shift reset
# -------------------------------------------------------------------

func reset_table():
	print("RESETTING TABLE: ", table_id)
	last_outcome = ""
	annoyed_reason = ""
	state_before_annoyed = STATE_AVAILABLE
	visual_before_annoyed = VISUAL_NEUTRAL
	reset_patience_tracking()

	if starts_with_guests:
		set_available()
	else:
		set_empty()


# -------------------------------------------------------------------
# Texture mapping and validation
# -------------------------------------------------------------------

func _get_texture_for_visual(visual_state):
	match visual_state:
		VISUAL_ANNOYED:
			return _first_texture([annoyed_texture, neutral_texture])
		VISUAL_APERITIF:
			return _first_texture([aperitif_texture, neutral_texture])
		VISUAL_EATING:
			return _first_texture([eating_texture, neutral_texture])
		VISUAL_EMPTY:
			return _first_texture([empty_texture, neutral_texture])
		VISUAL_NEUTRAL:
			return _first_texture([neutral_texture, empty_texture])
		VISUAL_READY_TO_CLEAR:
			return _first_texture([ready_to_clear_texture, eating_texture, neutral_texture])
		VISUAL_WINE:
			return _first_texture([wine_texture, neutral_texture])
	return null


func _first_texture(texture_list):
	for texture in texture_list:
		if texture != null:
			return texture
	return null


func _is_supported_visual_state(state):
	return state in [
		VISUAL_ANNOYED,
		VISUAL_APERITIF,
		VISUAL_EATING,
		VISUAL_EMPTY,
		VISUAL_NEUTRAL,
		VISUAL_READY_TO_CLEAR,
		VISUAL_WINE
	]


func _is_supported_logical_state(state):
	return state in [
		STATE_EMPTY,
		STATE_AVAILABLE,
		STATE_WAITING_TO_GREET,
		STATE_IN_ENCOUNTER,
		STATE_DECIDING,
		STATE_ORDER_PENDING_POS,
		STATE_WAITING_FOR_MISE,
		STATE_WAITING_FOR_BAR,
		STATE_WAITING_FOR_CHEF,
		STATE_SERVICE_IN_PROGRESS,
		STATE_APERITIF_SERVED,
		STATE_WINE_SERVED,
		STATE_EATING,
		STATE_READY_TO_CLEAR,
		STATE_PLATES_COLLECTED,
		STATE_WAITING_FOR_BILL,
		STATE_WAITING_FOR_BILL_CLOSE,
		STATE_COMPLETE,
		STATE_ANNOYED
	]


func _get_default_status_for_state(state):
	match state:
		STATE_EMPTY:
			return "Empty — reset required"
		STATE_AVAILABLE:
			return "Wine opportunity"
		STATE_WAITING_TO_GREET:
			return "Waiting to greet"
		STATE_IN_ENCOUNTER:
			return "Guest interaction"
		STATE_DECIDING:
			return "Awaiting response"
		STATE_ORDER_PENDING_POS:
			return "Enter order at POS"
		STATE_WAITING_FOR_MISE:
			return "Mise en place required"
		STATE_WAITING_FOR_BAR:
			return "Waiting for Bar"
		STATE_WAITING_FOR_CHEF:
			return "Waiting for food"
		STATE_SERVICE_IN_PROGRESS:
			return "Service in progress"
		STATE_APERITIF_SERVED:
			return "Aperitif served"
		STATE_WINE_SERVED:
			return "Wine served"
		STATE_EATING:
			return "Eating"
		STATE_READY_TO_CLEAR:
			return "Ready to clear"
		STATE_PLATES_COLLECTED:
			return "Plates collected"
		STATE_WAITING_FOR_BILL:
			return "Waiting for bill"
		STATE_WAITING_FOR_BILL_CLOSE:
			return "Waiting for bill close"
		STATE_COMPLETE:
			return "Service complete"
		STATE_ANNOYED:
			return _get_annoyed_status_text()
	return ""
