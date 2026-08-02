extends Resource
class_name GuestTableProfile


@export_category("Guest Identity")

@export var guest_id: String = ""
@export var guest_display_name: String = "Guest"

## Canonical guest type from Vite guestProfiles SOT:
## tourist | regular | skeptic — drives response control alignment with V2.
@export var guest_type: String = ""

## Update v2.1 — explicit party shape: single | couple.
## Art/hint copy may also imply the same value.
@export var party_shape: String = "single"

## Folder under assets/characters/guests containing guest_1 and,
## for couples, guest_2 directional walk frames.
@export var floor_character_key: String = ""

## Explicit patience balance. Use 0.8 for impatient, 1.0 for standard,
## or 1.2 for relaxed guests. This is never inferred from artwork names.
@export_range(0.1, 3.0, 0.05)
var guest_patience_multiplier: float = 1.0

## Short characterization hint shown before:
## Greet Wine / Greet Aperitif / Greet Food.
@export_multiline var guest_hint: String = ""


@export_category("Greeting Responses")

@export_multiline var greet_wine_response: String = ""
@export_multiline var greet_aperitif_response: String = ""
@export_multiline var greet_food_response: String = ""


@export_category("Follow-up Responses")

@export_multiline var walk_away_response: String = ""
@export_multiline var offer_food_response: String = ""
@export_multiline var offer_wine_response: String = ""


@export_category("Table State Textures")

@export var annoyed_texture: Texture2D
@export var aperitif_texture: Texture2D
@export var eating_texture: Texture2D
@export var empty_texture: Texture2D
@export var neutral_texture: Texture2D
@export var ready_to_clear_texture: Texture2D
@export var wine_texture: Texture2D


func is_valid_profile() -> bool:
	return (
		guest_id.strip_edges() != ""
		and neutral_texture != null
		and empty_texture != null
	)


func get_greeting_response(choice: String) -> String:
	match choice:
		"greet_wine":
			if greet_wine_response.strip_edges() != "":
				return greet_wine_response

		"greet_aperitif":
			if greet_aperitif_response.strip_edges() != "":
				return greet_aperitif_response

		"greet_food":
			if greet_food_response.strip_edges() != "":
				return greet_food_response

	return _default_greeting_response(choice)


func get_follow_up_response(choice: String) -> String:
	match choice:
		"walk_away":
			if walk_away_response.strip_edges() != "":
				return walk_away_response

		"offer_food":
			if offer_food_response.strip_edges() != "":
				return offer_food_response

		"offer_wine":
			if offer_wine_response.strip_edges() != "":
				return offer_wine_response

	return _default_follow_up_response(choice)


func get_missing_texture_names() -> Array[String]:
	var missing: Array[String] = []

	if annoyed_texture == null:
		missing.append("annoyed")
	if aperitif_texture == null:
		missing.append("aperitif")
	if eating_texture == null:
		missing.append("eating")
	if empty_texture == null:
		missing.append("empty")
	if neutral_texture == null:
		missing.append("neutral")
	if ready_to_clear_texture == null:
		missing.append("ready_to_clear")
	if wine_texture == null:
		missing.append("wine")

	return missing


func _default_greeting_response(choice: String) -> String:
	match choice:
		"greet_wine":
			return "We are still deciding. What would you suggest?"

		"greet_aperitif":
			return "An aperitif could be interesting. What do you have?"

		"greet_food":
			return "We are ready to hear about the food."

	return "The guest waits for your next suggestion."


func _default_follow_up_response(choice: String) -> String:
	match choice:
		"walk_away":
			return "Thank you. We will call you when we are ready."

		"offer_food":
			return "Yes, let us begin with the food."

		"offer_wine":
			return "All right, bring us a suitable wine with the meal."

	return "The guest considers the suggestion."
