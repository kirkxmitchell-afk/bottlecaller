extends CanvasLayer

signal reward_claimed(reward_data: Dictionary)
signal modal_closed


enum UnlockState {
	HIDDEN,
	WAITING_TO_OPEN,
	OPENING,
	REWARD_REVEALED
}


@export_category("Reward Artwork")

## Assign bottle-unlock-closed.png.
@export var bottle_texture: Texture2D

## Assign bottle-unlock-cork.png.
@export var cork_texture: Texture2D


@export_category("Reward Text")

@export var default_bottle_name := "Starter Bottle"
@export var default_title_name := "Trainee Caller"


@export_category("Modal Layout")

@export var panel_size := Vector2(
	760.0,
	560.0
)

## Maximum displayed size of the bottle, regardless of source resolution.
@export var bottle_target_size := Vector2(
	175.0,
	280.0
)

## Maximum displayed size of the cork, regardless of source resolution.
@export var cork_target_size := Vector2(
	38.0,
	62.0
)

## Moves the complete bottle/cork arrangement inside the modal.
@export var bottle_visual_offset := Vector2(
	0.0,
	8.0
)

## Cork resting position relative to the bottle centre.
@export var cork_rest_offset := Vector2(
	0.0,
	-116.0
)

## Keep the cork concealed while the bottle is closed.
@export var hide_cork_until_open := true

## Where the cork travels when the bottle opens.
@export var cork_pop_offset := Vector2(
	72.0,
	-168.0
)


@export_category("Animation")

@export_range(0.0, 40.0, 1.0)
var idle_float_distance := 10.0

@export_range(0.2, 5.0, 0.1)
var idle_float_duration := 2.2

@export_range(0.1, 3.0, 0.05)
var shake_duration := 0.40

@export_range(0.1, 3.0, 0.05)
var cork_pop_duration := 0.55


var dark_overlay: ColorRect
var modal_panel: Panel
var heading_label: Label
var bottle_name_label: Label

var bottle_area: Control
var glow_panel: Panel
var bottle_visual_root: Node2D
var bottle_sprite: Sprite2D
var cork_sprite: Sprite2D
var particles_layer: Control

var reward_card: Panel
var reward_heading_label: Label
var reward_title_label: Label

var open_button: Button
var continue_button: Button

var current_state := UnlockState.HIDDEN
var current_reward: Dictionary = {}

var idle_tween: Tween

var bottle_root_rest_position := Vector2.ZERO
var cork_rest_position := Vector2.ZERO
var reward_card_final_position := Vector2.ZERO


func _ready() -> void:
	layer = 100
	process_mode = Node.PROCESS_MODE_ALWAYS

	_build_interface()
	_apply_reward_textures()
	_reset_animation_state()

	visible = false


func show_reward(
	reward_data: Dictionary
) -> void:
	current_reward = reward_data.duplicate(
		true
	)

	var bottle_name := str(
		current_reward.get(
			"bottle_name",
			default_bottle_name
		)
	)

	var title_name := str(
		current_reward.get(
			"title",
			default_title_name
		)
	)

	heading_label.text = "BOTTLE UNLOCKED"
	bottle_name_label.text = bottle_name
	reward_heading_label.text = "TITLE UNLOCKED"
	reward_title_label.text = title_name

	_apply_reward_textures()
	_reset_animation_state()

	current_state = UnlockState.WAITING_TO_OPEN
	visible = true

	open_button.visible = true
	open_button.disabled = false
	continue_button.visible = false
	reward_card.visible = false

	_start_idle_animation()


func hide_modal() -> void:
	_stop_idle_animation()

	visible = false
	current_state = UnlockState.HIDDEN

	modal_closed.emit()


func _build_interface() -> void:
	dark_overlay = ColorRect.new()
	dark_overlay.name = "DarkOverlay"
	dark_overlay.set_anchors_preset(
		Control.PRESET_FULL_RECT
	)
	dark_overlay.color = Color(
		0.0,
		0.0,
		0.0,
		0.80
	)
	add_child(
		dark_overlay
	)

	modal_panel = Panel.new()
	modal_panel.name = "ModalPanel"
	modal_panel.size = panel_size

	var viewport_size := (
		get_viewport()
		.get_visible_rect()
		.size
	)

	modal_panel.position = (
		viewport_size * 0.5
		- panel_size * 0.5
	)

	add_child(
		modal_panel
	)

	var modal_style := StyleBoxFlat.new()
	modal_style.bg_color = Color(
		0.045,
		0.035,
		0.025,
		0.98
	)
	modal_style.border_color = Color(
		0.95,
		0.70,
		0.22,
		1.0
	)
	modal_style.set_border_width_all(
		4
	)
	modal_style.set_corner_radius_all(
		24
	)

	modal_panel.add_theme_stylebox_override(
		"panel",
		modal_style
	)

	heading_label = Label.new()
	heading_label.name = "HeadingLabel"
	heading_label.position = Vector2(
		40.0,
		24.0
	)
	heading_label.size = Vector2(
		panel_size.x - 80.0,
		44.0
	)
	heading_label.horizontal_alignment = (
		HORIZONTAL_ALIGNMENT_CENTER
	)
	heading_label.add_theme_font_size_override(
		"font_size",
		34
	)
	heading_label.add_theme_color_override(
		"font_color",
		Color(
			1.0,
			0.88,
			0.56,
			1.0
		)
	)
	modal_panel.add_child(
		heading_label
	)

	bottle_name_label = Label.new()
	bottle_name_label.name = "BottleNameLabel"
	bottle_name_label.position = Vector2(
		40.0,
		70.0
	)
	bottle_name_label.size = Vector2(
		panel_size.x - 80.0,
		30.0
	)
	bottle_name_label.horizontal_alignment = (
		HORIZONTAL_ALIGNMENT_CENTER
	)
	bottle_name_label.add_theme_font_size_override(
		"font_size",
		20
	)
	bottle_name_label.add_theme_color_override(
		"font_color",
		Color(
			1.0,
			0.93,
			0.76,
			1.0
		)
	)
	modal_panel.add_child(
		bottle_name_label
	)

	bottle_area = Control.new()
	bottle_area.name = "BottleArea"
	bottle_area.position = Vector2(
		160.0,
		102.0
	)
	bottle_area.size = Vector2(
		440.0,
		278.0
	)
	bottle_area.clip_contents = false
	bottle_area.mouse_filter = (
		Control.MOUSE_FILTER_IGNORE
	)
	modal_panel.add_child(
		bottle_area
	)

	glow_panel = Panel.new()
	glow_panel.name = "GlowPanel"
	glow_panel.position = Vector2(
		130.0,
		62.0
	)
	glow_panel.size = Vector2(
		180.0,
		180.0
	)
	glow_panel.pivot_offset = (
		glow_panel.size * 0.5
	)

	var glow_style := StyleBoxFlat.new()
	glow_style.bg_color = Color(
		1.0,
		0.78,
		0.16,
		0.24
	)
	glow_style.set_corner_radius_all(
		90
	)

	glow_panel.add_theme_stylebox_override(
		"panel",
		glow_style
	)
	bottle_area.add_child(
		glow_panel
	)

	particles_layer = Control.new()
	particles_layer.name = "ParticlesLayer"
	particles_layer.set_anchors_preset(
		Control.PRESET_FULL_RECT
	)
	particles_layer.mouse_filter = (
		Control.MOUSE_FILTER_IGNORE
	)
	particles_layer.z_index = 4
	bottle_area.add_child(
		particles_layer
	)

	bottle_visual_root = Node2D.new()
	bottle_visual_root.name = "BottleVisualRoot"
	bottle_visual_root.position = (
		bottle_area.size * 0.5
		+ bottle_visual_offset
	)
	bottle_visual_root.z_index = 3
	bottle_area.add_child(
		bottle_visual_root
	)

	bottle_root_rest_position = (
		bottle_visual_root.position
	)

	cork_sprite = Sprite2D.new()
	cork_sprite.name = "Cork"
	cork_sprite.centered = true
	cork_sprite.position = (
		cork_rest_offset
	)
	cork_sprite.z_index = 2
	bottle_visual_root.add_child(
		cork_sprite
	)

	cork_rest_position = (
		cork_sprite.position
	)

	bottle_sprite = Sprite2D.new()
	bottle_sprite.name = "Bottle"
	bottle_sprite.centered = true
	bottle_sprite.position = Vector2(
		0.0,
		12.0
	)
	bottle_sprite.z_index = 3
	bottle_visual_root.add_child(
		bottle_sprite
	)

	reward_card = Panel.new()
	reward_card.name = "RewardCard"
	reward_card.size = Vector2(
		430.0,
		96.0
	)

	reward_card_final_position = Vector2(
		165.0,
		382.0
	)

	reward_card.position = (
		reward_card_final_position
		+ Vector2(
			0.0,
			20.0
		)
	)
	reward_card.visible = false

	var reward_style := StyleBoxFlat.new()
	reward_style.bg_color = Color(
		0.12,
		0.09,
		0.06,
		0.98
	)
	reward_style.border_color = Color(
		0.95,
		0.72,
		0.26,
		1.0
	)
	reward_style.set_border_width_all(
		3
	)
	reward_style.set_corner_radius_all(
		18
	)

	reward_card.add_theme_stylebox_override(
		"panel",
		reward_style
	)
	modal_panel.add_child(
		reward_card
	)

	reward_heading_label = Label.new()
	reward_heading_label.name = (
		"RewardHeadingLabel"
	)
	reward_heading_label.position = Vector2(
		20.0,
		10.0
	)
	reward_heading_label.size = Vector2(
		390.0,
		28.0
	)
	reward_heading_label.horizontal_alignment = (
		HORIZONTAL_ALIGNMENT_CENTER
	)
	reward_heading_label.add_theme_font_size_override(
		"font_size",
		18
	)
	reward_heading_label.add_theme_color_override(
		"font_color",
		Color(
			1.0,
			0.86,
			0.52,
			1.0
		)
	)
	reward_card.add_child(
		reward_heading_label
	)

	reward_title_label = Label.new()
	reward_title_label.name = (
		"RewardTitleLabel"
	)
	reward_title_label.position = Vector2(
		20.0,
		40.0
	)
	reward_title_label.size = Vector2(
		390.0,
		36.0
	)
	reward_title_label.horizontal_alignment = (
		HORIZONTAL_ALIGNMENT_CENTER
	)
	reward_title_label.add_theme_font_size_override(
		"font_size",
		26
	)
	reward_title_label.add_theme_color_override(
		"font_color",
		Color.WHITE
	)
	reward_card.add_child(
		reward_title_label
	)

	open_button = Button.new()
	open_button.name = "OpenButton"
	open_button.text = "Open"
	open_button.position = Vector2(
		290.0,
		492.0
	)
	open_button.size = Vector2(
		180.0,
		44.0
	)
	open_button.pressed.connect(
		_on_open_pressed
	)
	modal_panel.add_child(
		open_button
	)

	continue_button = Button.new()
	continue_button.name = "ContinueButton"
	continue_button.text = "Continue"
	continue_button.position = Vector2(
		290.0,
		492.0
	)
	continue_button.size = Vector2(
		180.0,
		44.0
	)
	continue_button.visible = false
	continue_button.pressed.connect(
		_on_continue_pressed
	)
	modal_panel.add_child(
		continue_button
	)


func _apply_reward_textures() -> void:
	if bottle_sprite != null:
		bottle_sprite.texture = bottle_texture
		bottle_sprite.scale = _fit_texture_scale(
			bottle_texture,
			bottle_target_size
		)

	if cork_sprite != null:
		cork_sprite.texture = cork_texture
		cork_sprite.scale = _fit_texture_scale(
			cork_texture,
			cork_target_size
		)

	if bottle_texture == null:
		push_warning(
			"BottleUnlockModal: Bottle Texture is not assigned."
		)

	if cork_texture == null:
		push_warning(
			"BottleUnlockModal: Cork Texture is not assigned."
		)


func _fit_texture_scale(
	texture_value: Texture2D,
	target_size: Vector2
) -> Vector2:
	if texture_value == null:
		return Vector2.ONE

	var source_size := texture_value.get_size()

	if (
		source_size.x <= 0.0
		or source_size.y <= 0.0
	):
		return Vector2.ONE

	var scale_factor := minf(
		target_size.x / source_size.x,
		target_size.y / source_size.y
	)

	return Vector2(
		scale_factor,
		scale_factor
	)


func _reset_animation_state() -> void:
	_stop_idle_animation()
	_clear_particles()

	if bottle_visual_root != null:
		bottle_visual_root.position = (
			bottle_root_rest_position
		)
		bottle_visual_root.rotation = 0.0

	if cork_sprite != null:
		cork_sprite.position = (
			cork_rest_position
		)
		cork_sprite.rotation = 0.0
		cork_sprite.visible = true

		if hide_cork_until_open:
			cork_sprite.modulate = Color(
				1.0,
				1.0,
				1.0,
				0.0
			)
		else:
			cork_sprite.modulate = Color.WHITE

	if bottle_sprite != null:
		bottle_sprite.rotation = 0.0
		bottle_sprite.modulate = Color.WHITE

	if glow_panel != null:
		glow_panel.scale = Vector2.ONE
		glow_panel.modulate = Color(
			1.0,
			1.0,
			1.0,
			0.45
		)

	if reward_card != null:
		reward_card.visible = false
		reward_card.position = (
			reward_card_final_position
			+ Vector2(
				0.0,
				20.0
			)
		)
		reward_card.modulate = Color(
			1.0,
			1.0,
			1.0,
			0.0
		)


func _on_open_pressed() -> void:
	if current_state != UnlockState.WAITING_TO_OPEN:
		return

	current_state = UnlockState.OPENING
	open_button.disabled = true

	_stop_idle_animation()
	_play_open_sequence()


func _on_continue_pressed() -> void:
	if current_state != UnlockState.REWARD_REVEALED:
		return

	var claimed_reward := (
		current_reward.duplicate(
			true
		)
	)

	hide_modal()

	reward_claimed.emit(
		claimed_reward
	)


func _play_open_sequence() -> void:
	await _play_shake_animation()

	_play_glow_animation()
	_play_cork_animation()
	_spawn_particle_burst()

	await get_tree().create_timer(
		0.28
	).timeout

	_reveal_reward_card()


func _play_shake_animation() -> void:
	var tween := create_tween()
	var start_position := (
		bottle_root_rest_position
	)
	var unit := shake_duration / 5.0

	tween.tween_property(
		bottle_visual_root,
		"position",
		start_position
		+ Vector2(
			-10.0,
			0.0
		),
		unit
	)
	tween.parallel().tween_property(
		bottle_visual_root,
		"rotation",
		deg_to_rad(
			-5.0
		),
		unit
	)

	tween.tween_property(
		bottle_visual_root,
		"position",
		start_position
		+ Vector2(
			12.0,
			-2.0
		),
		unit
	)
	tween.parallel().tween_property(
		bottle_visual_root,
		"rotation",
		deg_to_rad(
			5.5
		),
		unit
	)

	tween.tween_property(
		bottle_visual_root,
		"position",
		start_position
		+ Vector2(
			-9.0,
			0.0
		),
		unit
	)
	tween.parallel().tween_property(
		bottle_visual_root,
		"rotation",
		deg_to_rad(
			-4.5
		),
		unit
	)

	tween.tween_property(
		bottle_visual_root,
		"position",
		start_position
		+ Vector2(
			8.0,
			1.0
		),
		unit
	)
	tween.parallel().tween_property(
		bottle_visual_root,
		"rotation",
		deg_to_rad(
			4.0
		),
		unit
	)

	tween.tween_property(
		bottle_visual_root,
		"position",
		start_position,
		unit
	)
	tween.parallel().tween_property(
		bottle_visual_root,
		"rotation",
		0.0,
		unit
	)

	await tween.finished


func _play_glow_animation() -> void:
	glow_panel.scale = Vector2.ONE

	var tween := create_tween()

	tween.tween_property(
		glow_panel,
		"scale",
		Vector2(
			1.35,
			1.35
		),
		0.20
	).set_trans(
		Tween.TRANS_QUAD
	).set_ease(
		Tween.EASE_OUT
	)

	tween.parallel().tween_property(
		glow_panel,
		"modulate",
		Color(
			1.0,
			0.90,
			0.36,
			0.90
		),
		0.20
	)

	tween.tween_property(
		glow_panel,
		"scale",
		Vector2.ONE,
		0.26
	).set_trans(
		Tween.TRANS_QUAD
	).set_ease(
		Tween.EASE_OUT
	)


func _play_cork_animation() -> void:
	cork_sprite.visible = true
	cork_sprite.position = cork_rest_position
	cork_sprite.rotation = 0.0
	cork_sprite.modulate = Color.WHITE

	var tween := create_tween()

	tween.tween_property(
		cork_sprite,
		"position",
		cork_rest_position
		+ cork_pop_offset,
		cork_pop_duration
	).set_trans(
		Tween.TRANS_BACK
	).set_ease(
		Tween.EASE_OUT
	)

	tween.parallel().tween_property(
		cork_sprite,
		"rotation",
		deg_to_rad(
			42.0
		),
		cork_pop_duration
	)

	tween.parallel().tween_property(
		cork_sprite,
		"modulate",
		Color(
			1.0,
			1.0,
			1.0,
			0.12
		),
		cork_pop_duration
	)


func _spawn_particle_burst() -> void:
	_clear_particles()

	var particle_count := 16
	var origin := (
		bottle_root_rest_position
		+ cork_rest_offset
		+ Vector2(
			0.0,
			14.0
		)
	)

	for index in range(
		particle_count
	):
		var particle := Panel.new()
		particle.size = Vector2(
			8.0,
			8.0
		)
		particle.position = origin
		particle.modulate = Color(
			1.0,
			randf_range(
				0.74,
				0.94
			),
			randf_range(
				0.14,
				0.34
			),
			1.0
		)

		var particle_style := StyleBoxFlat.new()
		particle_style.bg_color = Color.WHITE
		particle_style.set_corner_radius_all(
			4
		)

		particle.add_theme_stylebox_override(
			"panel",
			particle_style
		)

		particles_layer.add_child(
			particle
		)

		var angle := (
			float(index)
			* TAU
			/ float(particle_count)
		)

		var direction := Vector2(
			cos(angle),
			sin(angle)
		)

		var target_position := (
			origin
			+ direction
			* randf_range(
				48.0,
				100.0
			)
		)

		var tween := create_tween()

		tween.tween_property(
			particle,
			"position",
			target_position,
			0.44
		).set_trans(
			Tween.TRANS_QUAD
		).set_ease(
			Tween.EASE_OUT
		)

		tween.parallel().tween_property(
			particle,
			"modulate",
			Color(
				particle.modulate.r,
				particle.modulate.g,
				particle.modulate.b,
				0.0
			),
			0.44
		)

		tween.finished.connect(
			particle.queue_free
		)


func _reveal_reward_card() -> void:
	reward_card.visible = true
	open_button.visible = false
	continue_button.visible = true

	var tween := create_tween()

	tween.tween_property(
		reward_card,
		"position",
		reward_card_final_position,
		0.26
	).set_trans(
		Tween.TRANS_BACK
	).set_ease(
		Tween.EASE_OUT
	)

	tween.parallel().tween_property(
		reward_card,
		"modulate",
		Color.WHITE,
		0.26
	)

	current_state = UnlockState.REWARD_REVEALED


func _start_idle_animation() -> void:
	_stop_idle_animation()

	bottle_visual_root.position = (
		bottle_root_rest_position
	)

	idle_tween = create_tween()
	idle_tween.set_loops()

	idle_tween.tween_property(
		bottle_visual_root,
		"position",
		bottle_root_rest_position
		+ Vector2(
			0.0,
			-idle_float_distance
		),
		idle_float_duration * 0.5
	).set_trans(
		Tween.TRANS_SINE
	).set_ease(
		Tween.EASE_IN_OUT
	)

	idle_tween.tween_property(
		bottle_visual_root,
		"position",
		bottle_root_rest_position,
		idle_float_duration * 0.5
	).set_trans(
		Tween.TRANS_SINE
	).set_ease(
		Tween.EASE_IN_OUT
	)


func _stop_idle_animation() -> void:
	if (
		idle_tween != null
		and idle_tween.is_valid()
	):
		idle_tween.kill()

	idle_tween = null


func _clear_particles() -> void:
	if particles_layer == null:
		return

	for child in particles_layer.get_children():
		child.queue_free()
