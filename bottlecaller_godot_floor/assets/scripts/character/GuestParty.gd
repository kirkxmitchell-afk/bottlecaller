extends Area2D
class_name GuestParty


signal party_selected(party_id, table_id)
signal party_arrived(party_id, table_id)
signal party_departed(party_id, table_id)
signal party_walk_failed(party_id, table_id, reason)


const GUEST_WALKER_SCENE = preload(
	"res://assets/scene/characters/GuestWalker.tscn"
)


@export_range(0.0, 1.0, 0.01)
var couple_follow_delay = 0.20


@onready var selection_shape: CollisionShape2D = $SelectionShape
@onready var selection_icon: Sprite2D = $SelectionIcon


var party_id = ""
var assigned_table_id = ""
var guest_profile: Resource = null
var guest_index = -1
var walkers: Array = []
var arrived_member_count = 0
var party_state = "waiting"
var journey_kind = "seating"
var selectable = false
var pulse_time = 0.0
var member_entrance_offsets: Array[Vector2] = []


func _ready():
	input_pickable = true
	z_as_relative = false
	z_index = 180
	selection_icon.visible = false


func configure(
	new_party_id: String,
	new_table_id: String,
	profile: Resource,
	profile_index: int,
	character_asset_key: String,
	entrance_position: Vector2
) -> bool:
	party_id = new_party_id
	assigned_table_id = new_table_id
	guest_profile = profile
	guest_index = profile_index
	global_position = entrance_position
	party_state = "waiting"

	var member_count = 1
	if str(profile.get("party_shape")) == "couple":
		member_count = 2

	var member_spacing = 58.0
	for member_index in range(member_count):
		var walker = GUEST_WALKER_SCENE.instantiate()
		add_child(walker)

		var offset_index = (
			float(member_index)
			- (float(member_count - 1) * 0.5)
		)
		walker.position = Vector2(
			offset_index * member_spacing,
			absf(offset_index) * 8.0
		)
		member_entrance_offsets.append(walker.position)
		walker.navigation_arrived.connect(
			_on_member_arrived.bind(walker)
		)
		walker.navigation_failed.connect(
			_on_member_failed.bind(walker)
		)

		var asset_root = (
			"res://assets/characters/guests/"
			+ character_asset_key
			+ "/guest_"
			+ str(member_index + 1)
		)
		# The delayed start supplies the couple's gait phase difference.
		var phase_frame = 0
		if not walker.configure(asset_root, phase_frame):
			return false

		walkers.append(walker)

	var selection_rectangle = \
		selection_shape.shape as RectangleShape2D
	if selection_rectangle != null:
		selection_rectangle.size = Vector2(
			145.0 + ((member_count - 1) * member_spacing),
			205.0
		)

	return true


func set_selectable(value: bool):
	selectable = value and party_state == "waiting"
	selection_icon.visible = selectable
	input_pickable = selectable
	selection_shape.disabled = not selectable


func begin_walk(target_position: Vector2):
	_begin_journey(target_position, "seating")


func begin_exit(target_position: Vector2):
	_begin_journey(target_position, "exit")


func _begin_journey(
	target_position: Vector2,
	new_journey_kind: String
):
	if party_state != "waiting":
		return

	journey_kind = new_journey_kind
	party_state = "walking"
	set_selectable(false)
	arrived_member_count = 0

	for member_index in range(walkers.size()):
		var destination_offset = Vector2(
			(float(member_index) - float(walkers.size() - 1) * 0.5)
			* 32.0,
			0.0
		)
		_start_member_after_delay(
			walkers[member_index],
			target_position + destination_offset,
			float(member_index) * couple_follow_delay
		)


func _start_member_after_delay(
	walker,
	target_position: Vector2,
	delay_seconds: float
):
	if delay_seconds > 0.0:
		await get_tree().create_timer(delay_seconds).timeout

	if (
		party_state == "walking"
		and is_instance_valid(walker)
	):
		walker.navigate_to(target_position)


func _process(delta):
	if not selectable:
		return

	pulse_time += delta
	var pulse = 1.0 + sin(pulse_time * 4.0) * 0.08
	selection_icon.scale = Vector2.ONE * 0.16 * pulse


func _input_event(
	_viewport,
	event,
	_shape_index
):
	if not selectable:
		return

	var selected = false
	if event is InputEventMouseButton:
		selected = event.button_index == MOUSE_BUTTON_LEFT and event.pressed
	elif event is InputEventScreenTouch:
		selected = event.pressed

	if selected:
		get_viewport().set_input_as_handled()
		party_selected.emit(party_id, assigned_table_id)


func _on_member_arrived(walker):
	if party_state != "walking":
		return

	if is_instance_valid(walker):
		walker.visible = false

	arrived_member_count += 1
	if arrived_member_count >= walkers.size():
		if journey_kind == "exit":
			party_state = "departed"
			party_departed.emit(party_id, assigned_table_id)
		else:
			party_state = "arrived"
			party_arrived.emit(party_id, assigned_table_id)


func _on_member_failed(reason, _walker):
	if party_state != "walking":
		return

	party_state = "waiting"
	for member_index in range(walkers.size()):
		var walker = walkers[member_index]
		if is_instance_valid(walker):
			walker.cancel_navigation()
			walker.position = member_entrance_offsets[member_index]
			walker.visible = true

	party_walk_failed.emit(
		party_id,
		assigned_table_id,
		str(reason)
	)
