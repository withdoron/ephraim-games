extends CanvasLayer
# HUD — ported from Ringstorm.jsx renderView HUD section

var lap_label: Label
var gate_label: Label
var position_label: Label
var countdown_label: Label
var weapon_label: Label
var finish_label: Label
var announcement_label: Label

var announcement_timer: float = 0.0

func _ready():
	# Lap counter — top right
	lap_label = _make_label("Lap 1/3", 28, Color(1.0, 0.8, 0.2))
	lap_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	lap_label.offset_left = -220; lap_label.offset_top = 10; lap_label.offset_right = -10
	lap_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(lap_label)

	# Gate counter
	gate_label = _make_label("Gate 1/7", 16, Color(0.6, 0.65, 0.7))
	gate_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	gate_label.offset_left = -220; gate_label.offset_top = 44; gate_label.offset_right = -10
	gate_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(gate_label)

	# Race position — top left
	position_label = _make_label("1st", 36, Color(1.0, 1.0, 1.0))
	position_label.set_anchors_preset(Control.PRESET_TOP_LEFT)
	position_label.offset_left = 10; position_label.offset_top = 10; position_label.offset_right = 120
	add_child(position_label)

	# Weapon — bottom center
	weapon_label = _make_label("", 20, Color(1.0, 0.8, 0.2))
	weapon_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	weapon_label.offset_top = -40; weapon_label.offset_bottom = -10
	weapon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(weapon_label)

	# Countdown — center screen
	countdown_label = _make_label("", 64, Color(1.0, 0.8, 0.2))
	countdown_label.set_anchors_preset(Control.PRESET_CENTER)
	countdown_label.offset_left = -100; countdown_label.offset_right = 100
	countdown_label.offset_top = -40; countdown_label.offset_bottom = 40
	countdown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	countdown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	countdown_label.visible = false
	add_child(countdown_label)

	# Finish label — centered
	finish_label = _make_label("RACE FINISHED!", 48, Color(1.0, 0.85, 0.2))
	finish_label.set_anchors_preset(Control.PRESET_CENTER)
	finish_label.offset_left = -200; finish_label.offset_right = 200
	finish_label.offset_top = -30; finish_label.offset_bottom = 30
	finish_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	finish_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	finish_label.visible = false
	add_child(finish_label)

	# Announcement — center-ish, floats up
	announcement_label = _make_label("", 28, Color(1.0, 0.8, 0.2))
	announcement_label.set_anchors_preset(Control.PRESET_CENTER)
	announcement_label.offset_left = -200; announcement_label.offset_right = 200
	announcement_label.offset_top = -80; announcement_label.offset_bottom = -50
	announcement_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	announcement_label.visible = false
	add_child(announcement_label)

func _make_label(text: String, size: int, color: Color) -> Label:
	var l = Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.5))
	l.add_theme_constant_override("shadow_offset_x", 2)
	l.add_theme_constant_override("shadow_offset_y", 2)
	return l

func _process(delta):
	# Fade announcement
	if announcement_timer > 0:
		announcement_timer -= delta
		if announcement_timer <= 0:
			announcement_label.visible = false
		else:
			announcement_label.modulate.a = min(1.0, announcement_timer / 0.5)
			announcement_label.offset_top -= delta * 20  # drift upward

func update_hud(lap: int, total_laps: int, gate: int, total_gates: int, finished: bool = false):
	lap_label.text = "Lap " + str(min(lap + 1, total_laps)) + "/" + str(total_laps)
	gate_label.text = "Gate " + str(gate + 1) + "/" + str(total_gates)

func show_player_finished(position: int):
	# Only called when the PLAYER finishes, not NPCs
	var pos_text = str(position)
	var suffix = "TH"
	if position == 1: suffix = "ST"
	elif position == 2: suffix = "ND"
	elif position == 3: suffix = "RD"
	finish_label.text = pos_text + suffix + " PLACE!"
	finish_label.add_theme_color_override("font_color",
		Color(0.98, 0.75, 0.14) if position == 1 else
		Color(0.75, 0.75, 0.8) if position == 2 else
		Color(0.8, 0.5, 0.2) if position == 3 else
		Color(0.6, 0.6, 0.65))
	finish_label.visible = true
	lap_label.text = "FINISHED"
	gate_label.text = ""

func update_position(pos: int):
	var suffix = "th"
	if pos == 1: suffix = "st"
	elif pos == 2: suffix = "nd"
	elif pos == 3: suffix = "rd"
	position_label.text = str(pos) + suffix
	match pos:
		1: position_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
		2: position_label.add_theme_color_override("font_color", Color(0.75, 0.75, 0.8))
		3: position_label.add_theme_color_override("font_color", Color(0.8, 0.5, 0.2))
		_: position_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.65))

func update_weapon(weapon_name: String):
	weapon_label.text = weapon_name.to_upper() if weapon_name != "" else ""

func show_countdown(seconds: int):
	if seconds <= 3 and seconds > 0:
		countdown_label.text = str(seconds)
		countdown_label.visible = true
		countdown_label.add_theme_color_override("font_color",
			Color(0.97, 0.58, 0.09) if seconds == 1 else Color(0.98, 0.75, 0.14))
	elif seconds <= 0:
		countdown_label.text = "GO!"
		countdown_label.add_theme_color_override("font_color", Color(0.13, 0.77, 0.37))
		countdown_label.visible = true
		# Hide after 0.6 seconds
		get_tree().create_timer(0.6).timeout.connect(func(): countdown_label.visible = false)

func show_announcement(text: String, color: Color = Color(1.0, 0.8, 0.2)):
	announcement_label.text = text
	announcement_label.add_theme_color_override("font_color", color)
	announcement_label.visible = true
	announcement_label.modulate.a = 1.0
	announcement_label.offset_top = -80
	announcement_timer = 1.5
