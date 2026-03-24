extends CanvasLayer
# Main menu — ported from Ringstorm.jsx menu screens

signal start_race(num_players: int)
signal start_battle(num_players: int)

var container: VBoxContainer

func _ready():
	# Dark background
	var bg = ColorRect.new()
	bg.color = Color(0.04, 0.06, 0.1, 1.0)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# Center container
	container = VBoxContainer.new()
	container.set_anchors_preset(Control.PRESET_CENTER)
	container.offset_left = -160
	container.offset_right = 160
	container.offset_top = -220
	container.offset_bottom = 220
	container.add_theme_constant_override("separation", 12)
	add_child(container)

	# Title
	var title = Label.new()
	title.text = "RINGSTORM"
	title.add_theme_font_size_override("font_size", 42)
	title.add_theme_color_override("font_color", Color(1.0, 0.75, 0.15))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(title)

	# Subtitle
	var sub = Label.new()
	sub.text = "RACERS"
	sub.add_theme_font_size_override("font_size", 18)
	sub.add_theme_color_override("font_color", Color(0.58, 0.64, 0.72))
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(sub)

	# Credit
	var credit = Label.new()
	credit.text = "A flying racing game by Ephraim"
	credit.add_theme_font_size_override("font_size", 11)
	credit.add_theme_color_override("font_color", Color(0.3, 0.35, 0.42))
	credit.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	container.add_child(credit)

	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 25)
	container.add_child(spacer)

	# Buttons
	_add_button("RACE — 1 PLAYER", Color(1.0, 0.75, 0.15), func(): start_race.emit(1))
	_add_button("RACE — 2 PLAYER", Color(1.0, 0.75, 0.15), func(): _coming_soon())
	_add_button("BATTLE — 1 PLAYER", Color(0.94, 0.27, 0.27), func(): _coming_soon())
	_add_button("BATTLE — 2 PLAYER", Color(0.94, 0.27, 0.27), func(): _coming_soon())

func _add_button(text: String, color: Color, callback: Callable):
	var btn = Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(320, 48)
	btn.add_theme_font_size_override("font_size", 17)
	btn.add_theme_color_override("font_color", color)
	# Style the button background
	var style = StyleBoxFlat.new()
	style.bg_color = Color(color.r, color.g, color.b, 0.08)
	style.border_color = Color(color.r, color.g, color.b, 0.3)
	style.set_border_width_all(2)
	style.set_corner_radius_all(10)
	btn.add_theme_stylebox_override("normal", style)
	var hover = style.duplicate()
	hover.bg_color = Color(color.r, color.g, color.b, 0.15)
	hover.border_color = Color(color.r, color.g, color.b, 0.6)
	btn.add_theme_stylebox_override("hover", hover)
	var pressed = style.duplicate()
	pressed.bg_color = Color(color.r, color.g, color.b, 0.25)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.pressed.connect(callback)
	container.add_child(btn)

func _coming_soon():
	# TODO: implement 2P and battle modes
	print("Coming soon!")

func hide_menu():
	visible = false

func show_menu():
	visible = true
