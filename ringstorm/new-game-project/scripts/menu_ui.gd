extends CanvasLayer
# Polished menu system — gradient backgrounds, styled buttons, consistent design
# Ported from Ringstorm.jsx menu screens

signal start_race(num_players: int, course_idx: int)
signal start_battle(num_players: int)
signal resume_game
signal restart_game
signal quit_to_menu

var current_screen: String = "main"
var selected_mode: String = ""
var selected_players: int = 1
var container: Control
var bg: Control  # Background (TextureRect or ColorRect)

const COURSES = [
	{ "name": "GRAND CANYON", "emoji": "🏜️", "desc": "Race through desert canyons", "color": Color(0.98, 0.45, 0.09) },
	{ "name": "ISLAND SKIES", "emoji": "🏝️", "desc": "Fly between floating islands", "color": Color(0.13, 0.77, 0.37) },
	{ "name": "MOUNTAIN PASS", "emoji": "🏔️", "desc": "Navigate narrow mountain valleys", "color": Color(0.23, 0.51, 0.96) },
	{ "name": "OCEAN RUN", "emoji": "🌊", "desc": "Skim the waves and dodge arches", "color": Color(0.02, 0.71, 0.83) },
	{ "name": "VOLCANO", "emoji": "🌋", "desc": "Race around an active volcano", "color": Color(0.86, 0.15, 0.15) },
	{ "name": "ICE CAVERN", "emoji": "❄️", "desc": "Fly through frozen valleys", "color": Color(0.4, 0.91, 0.98) },
	{ "name": "DEEP SPACE", "emoji": "🚀", "desc": "Dodge asteroids in zero gravity", "color": Color(0.55, 0.36, 0.96) },
]

func _ready():
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	# Gradient background
	bg = TextureRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	var gt = GradientTexture2D.new()
	var g = Gradient.new()
	g.set_color(0, Color(0.02, 0.04, 0.10))
	g.add_point(0.5, Color(0.04, 0.08, 0.18))
	g.set_color(1, Color(0.07, 0.12, 0.25))
	gt.gradient = g
	gt.fill_direction = GradientTexture2D.FILL_TOP_TO_BOTTOM
	bg.texture = gt
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	add_child(bg)
	container = Control.new()
	container.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(container)
	_show_main_menu()

func _clear():
	for child in container.get_children():
		child.queue_free()

# ==================== SCREENS ====================

func _show_main_menu():
	_clear()
	current_screen = "main"
	var vbox = _centered_vbox()
	_add_title(vbox, "✈️", 64, Color(1.0, 0.85, 0.4))
	_add_title(vbox, "RINGSTORM", 58, Color(1.0, 0.75, 0.15))
	_add_title(vbox, "R A C E R S", 20, Color(0.55, 0.6, 0.72))
	_add_title(vbox, "A flying racing game by Ephraim", 12, Color(0.3, 0.35, 0.42))
	_add_spacer(vbox, 35)
	_styled_btn(vbox, "RACE", Color(1.0, 0.75, 0.15), func(): _show_player_select("race"))
	_styled_btn(vbox, "BATTLE", Color(0.9, 0.25, 0.25), func(): _show_player_select("battle"))
	_add_spacer(vbox, 12)
	_styled_btn(vbox, "CONTROLS", Color(0.5, 0.55, 0.7), func(): _show_controls(), true)
	_styled_btn(vbox, "SETTINGS", Color(0.45, 0.5, 0.6), func(): _show_settings(), true)
	_add_spacer(vbox, 20)
	_add_title(vbox, "v0.1 — Godot Edition", 10, Color(0.22, 0.26, 0.32))

func _show_player_select(mode: String):
	_clear()
	selected_mode = mode
	current_screen = "players"
	var vbox = _centered_vbox()
	var accent = Color(1.0, 0.75, 0.15) if mode == "race" else Color(0.9, 0.25, 0.25)
	_add_title(vbox, mode.to_upper() + " MODE", 32, accent)
	_add_spacer(vbox, 25)
	_styled_btn(vbox, "1 PLAYER", Color(0.23, 0.51, 0.96), func(): _on_players_selected(1))
	_styled_btn(vbox, "2 PLAYERS", Color(0.94, 0.27, 0.27), func(): _on_players_selected(2))
	_add_spacer(vbox, 18)
	_styled_btn(vbox, "BACK", Color(0.45, 0.5, 0.6), func(): _show_main_menu(), true)

func _on_players_selected(n: int):
	selected_players = n
	if selected_mode == "race":
		_show_course_select()
	else:
		start_battle.emit(n)

func _show_course_select():
	_clear()
	current_screen = "course"
	var vbox = _centered_vbox()
	_add_title(vbox, "SELECT COURSE", 28, Color(1.0, 0.75, 0.15))
	_add_spacer(vbox, 12)
	for i in range(COURSES.size()):
		var c = COURSES[i]
		var idx = i
		_styled_btn(vbox, c["emoji"] + "  " + c["name"], c["color"],
			func(): start_race.emit(selected_players, idx), false, 15)
	_add_spacer(vbox, 12)
	_styled_btn(vbox, "BACK", Color(0.45, 0.5, 0.6), func(): _show_player_select(selected_mode), true)

func _show_controls():
	_clear()
	current_screen = "controls"
	var vbox = _centered_vbox()
	_add_title(vbox, "CONTROLS", 32, Color(0.55, 0.6, 0.72))
	_add_spacer(vbox, 18)
	_add_title(vbox, "— KEYBOARD —", 14, Color(0.23, 0.51, 0.96))
	for t in ["W/S — Rise / Dive", "A/D — Turn Left / Right", "Space — Fire Weapon", "Shift — Brake", "Double-tap A/D — Barrel Roll", "P — Pause"]:
		_add_title(vbox, t, 13, Color(0.55, 0.6, 0.68))
	_add_spacer(vbox, 12)
	_add_title(vbox, "— XBOX CONTROLLER —", 14, Color(0.13, 0.77, 0.37))
	for t in ["Left Stick — Fly", "A / RB — Fire Weapon", "B — Roll Right · X — Roll Left", "LT — Brake · Start — Pause"]:
		_add_title(vbox, t, 13, Color(0.55, 0.6, 0.68))
	_add_spacer(vbox, 18)
	_styled_btn(vbox, "BACK", Color(0.45, 0.5, 0.6), func(): _show_main_menu(), true)

func show_pause_menu():
	visible = true
	bg.modulate.a = 0.92
	_clear()
	current_screen = "pause"
	var vbox = _centered_vbox()
	_add_title(vbox, "⏸️", 48, Color(0.55, 0.6, 0.72))
	_add_title(vbox, "PAUSED", 36, Color(0.55, 0.6, 0.72))
	_add_spacer(vbox, 30)
	_styled_btn(vbox, "RESUME", Color(0.13, 0.77, 0.37), func(): resume_game.emit())
	_styled_btn(vbox, "RESTART", Color(1.0, 0.75, 0.15), func(): restart_game.emit())
	_styled_btn(vbox, "MAIN MENU", Color(0.9, 0.25, 0.25), func(): quit_to_menu.emit())

func show_results(finish_order: Array):
	visible = true
	bg.modulate.a = 0.95
	_clear()
	current_screen = "results"
	var vbox = _centered_vbox()
	_add_title(vbox, "🏁", 48, Color(1.0, 0.85, 0.2))
	_add_title(vbox, "RACE RESULTS", 32, Color(1.0, 0.75, 0.15))
	_add_spacer(vbox, 18)
	for i in range(finish_order.size()):
		var r = finish_order[i]
		var nm = r.racer_name if "racer_name" in r else r.name
		var suffix = ["st", "nd", "rd", "th", "th"][min(i, 4)]
		var time_text = "%.1fs" % (r.finish_time / 60.0)
		var color = Color(1.0, 0.85, 0.2) if i == 0 else Color(0.72, 0.72, 0.78) if i == 1 else Color(0.8, 0.55, 0.2) if i == 2 else Color(0.45, 0.5, 0.55)
		_add_title(vbox, str(i + 1) + suffix + "   " + nm + "   " + time_text, 20, color)
	_add_spacer(vbox, 25)
	_styled_btn(vbox, "MAIN MENU", Color(0.55, 0.6, 0.72), func(): quit_to_menu.emit())

func hide_menu():
	visible = false

func show_menu():
	visible = true
	bg.modulate.a = 1.0
	_show_main_menu()

# ==================== SETTINGS ====================

func _show_settings():
	_clear()
	current_screen = "settings"
	var scroll = ScrollContainer.new()
	scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	scroll.offset_left = 40; scroll.offset_right = -40
	scroll.offset_top = 20; scroll.offset_bottom = -20
	container.add_child(scroll)
	var vbox = VBoxContainer.new()
	vbox.custom_minimum_size = Vector2(400, 0)
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 4)
	scroll.add_child(vbox)

	_add_title(vbox, "⚙️ SETTINGS", 28, Color(0.55, 0.6, 0.72))
	_add_title(vbox, "Changes apply instantly", 11, Color(0.35, 0.4, 0.48))
	_add_spacer(vbox, 8)

	_add_section_header(vbox, "SPEED")
	_add_slider(vbox, "Player Speed", Settings.player_speed, 10.0, 60.0, 1.0, func(v): Settings.player_speed = v)
	_add_slider(vbox, "NPC Speed", Settings.npc_speed, 10.0, 60.0, 1.0, func(v): Settings.npc_speed = v)
	_add_slider(vbox, "Boost Power", Settings.boost_multiplier, 1.1, 2.5, 0.1, func(v): Settings.boost_multiplier = v)
	_add_slider(vbox, "Star Power", Settings.star_multiplier, 1.1, 2.5, 0.1, func(v): Settings.star_multiplier = v)
	_add_slider(vbox, "Start Speed", Settings.start_speed, 0.0, 15.0, 1.0, func(v): Settings.start_speed = v)
	_add_slider(vbox, "Brake Strength", Settings.brake_strength, 0.1, 0.9, 0.05, func(v): Settings.brake_strength = v)

	_add_section_header(vbox, "CONTROLLER")
	_add_slider(vbox, "Deadzone X", Settings.deadzone_x, 0.05, 0.6, 0.05, func(v): Settings.deadzone_x = v)
	_add_slider(vbox, "Deadzone Y", Settings.deadzone_y, 0.05, 0.6, 0.05, func(v): Settings.deadzone_y = v)
	_add_slider(vbox, "Turn Sensitivity", Settings.stick_sensitivity, 0.3, 2.0, 0.1, func(v): Settings.stick_sensitivity = v)
	_add_slider(vbox, "Pitch Sensitivity", Settings.pitch_sensitivity, 0.3, 2.0, 0.1, func(v): Settings.pitch_sensitivity = v)
	_add_toggle(vbox, "Invert Y (P1)", Settings.invert_y_p1, func(v): Settings.invert_y_p1 = v)
	_add_toggle(vbox, "Invert Y (P2)", Settings.invert_y_p2, func(v): Settings.invert_y_p2 = v)

	_add_section_header(vbox, "GAMEPLAY")
	_add_slider(vbox, "Turn Rate", Settings.turn_rate, 20.0, 80.0, 5.0, func(v): Settings.turn_rate = v)
	_add_slider(vbox, "Pitch Rate", Settings.pitch_rate, 10.0, 40.0, 5.0, func(v): Settings.pitch_rate = v)
	_add_slider(vbox, "Fire Cooldown", Settings.fire_cooldown, 5.0, 30.0, 1.0, func(v): Settings.fire_cooldown = v)
	_add_slider(vbox, "Gate Size", Settings.gate_size, 8.0, 30.0, 1.0, func(v): Settings.gate_size = v)
	_add_slider(vbox, "Crash Respawn", Settings.crash_respawn_time, 30.0, 150.0, 10.0, func(v): Settings.crash_respawn_time = v)

	_add_section_header(vbox, "AUDIO")
	_add_slider(vbox, "Volume", Settings.master_volume, 0.0, 1.0, 0.05, func(v):
		Settings.master_volume = v
		AudioServer.set_bus_volume_db(0, linear_to_db(max(v, 0.001)))
	)

	_add_spacer(vbox, 12)
	_styled_btn(vbox, "RESET TO DEFAULT", Color(0.55, 0.55, 0.55), func(): _reset_settings(), true)
	_styled_btn(vbox, "BACK", Color(0.45, 0.5, 0.6), func(): _show_main_menu(), true)

func _add_section_header(parent: Control, text: String):
	var label = Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 14)
	label.add_theme_color_override("font_color", Color(0.45, 0.55, 0.75))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	parent.add_child(label)

func _add_slider(parent: Control, label_text: String, current_value: float, min_val: float, max_val: float, step_val: float, on_change: Callable):
	var row = HBoxContainer.new()
	row.custom_minimum_size = Vector2(0, 28)
	var label = Label.new()
	label.text = label_text
	label.custom_minimum_size = Vector2(140, 0)
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color(0.6, 0.65, 0.72))
	row.add_child(label)
	var slider = HSlider.new()
	slider.min_value = min_val; slider.max_value = max_val; slider.step = step_val
	slider.value = current_value
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.custom_minimum_size = Vector2(140, 0)
	row.add_child(slider)
	var val_label = Label.new()
	val_label.text = str(snapped(current_value, step_val))
	val_label.custom_minimum_size = Vector2(45, 0)
	val_label.add_theme_font_size_override("font_size", 12)
	val_label.add_theme_color_override("font_color", Color(1.0, 0.75, 0.15))
	row.add_child(val_label)
	slider.value_changed.connect(func(v):
		on_change.call(v)
		val_label.text = str(snapped(v, step_val))
		Settings.save_settings()
	)
	parent.add_child(row)

func _add_toggle(parent: Control, label_text: String, current_value: bool, on_change: Callable):
	var row = HBoxContainer.new()
	row.custom_minimum_size = Vector2(0, 28)
	var label = Label.new()
	label.text = label_text
	label.custom_minimum_size = Vector2(140, 0)
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color(0.6, 0.65, 0.72))
	row.add_child(label)
	var toggle = CheckButton.new()
	toggle.button_pressed = current_value
	toggle.toggled.connect(func(v): on_change.call(v); Settings.save_settings())
	row.add_child(toggle)
	parent.add_child(row)

func _reset_settings():
	Settings.player_speed = 30.0; Settings.npc_speed = 25.0
	Settings.boost_multiplier = 1.5; Settings.star_multiplier = 1.4
	Settings.start_speed = 5.0; Settings.brake_strength = 0.5
	Settings.deadzone_x = 0.3; Settings.deadzone_y = 0.4
	Settings.stick_sensitivity = 1.0; Settings.pitch_sensitivity = 1.0
	Settings.invert_y_p1 = false; Settings.invert_y_p2 = false
	Settings.turn_rate = 50.0; Settings.pitch_rate = 25.0
	Settings.fire_cooldown = 15.0; Settings.gate_size = 15.0
	Settings.crash_respawn_time = 80.0; Settings.master_volume = 1.0
	AudioServer.set_bus_volume_db(0, 0.0)
	Settings.save_settings()
	_show_settings()

# ==================== UI HELPERS ====================

func _centered_vbox() -> VBoxContainer:
	var vbox = VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	vbox.grow_horizontal = Control.GROW_DIRECTION_BOTH
	vbox.grow_vertical = Control.GROW_DIRECTION_BOTH
	vbox.offset_left = -200; vbox.offset_right = 200
	vbox.offset_top = -300; vbox.offset_bottom = 300
	vbox.add_theme_constant_override("separation", 6)
	container.add_child(vbox)
	return vbox

func _add_title(parent: Control, text: String, size: int, color: Color):
	var l = Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	parent.add_child(l)

func _add_spacer(parent: Control, height: float):
	var s = Control.new()
	s.custom_minimum_size = Vector2(0, height)
	parent.add_child(s)

func _styled_btn(parent: Control, text: String, color: Color, callback: Callable, small: bool = false, font_size: int = 0):
	var btn = Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(360, 38 if small else 52)
	btn.add_theme_font_size_override("font_size", font_size if font_size > 0 else (14 if small else 20))
	btn.add_theme_color_override("font_color", color)
	btn.add_theme_color_override("font_hover_color", color.lightened(0.25))
	btn.add_theme_color_override("font_pressed_color", Color.WHITE)
	# Normal
	var sn = StyleBoxFlat.new()
	sn.bg_color = Color(color.r, color.g, color.b, 0.10)
	sn.border_color = Color(color.r, color.g, color.b, 0.4)
	sn.set_border_width_all(2)
	sn.set_corner_radius_all(12)
	sn.set_content_margin_all(10)
	btn.add_theme_stylebox_override("normal", sn)
	# Hover
	var sh = StyleBoxFlat.new()
	sh.bg_color = Color(color.r, color.g, color.b, 0.22)
	sh.border_color = Color(color.r, color.g, color.b, 0.7)
	sh.set_border_width_all(2)
	sh.set_corner_radius_all(12)
	sh.set_content_margin_all(10)
	btn.add_theme_stylebox_override("hover", sh)
	# Pressed
	var sp = StyleBoxFlat.new()
	sp.bg_color = Color(color.r, color.g, color.b, 0.35)
	sp.border_color = color
	sp.set_border_width_all(3)
	sp.set_corner_radius_all(12)
	sp.set_content_margin_all(10)
	btn.add_theme_stylebox_override("pressed", sp)
	btn.pressed.connect(callback)
	parent.add_child(btn)

# Handle P key or Start button for pause
func _unhandled_input(event):
	if current_screen == "pause":
		if event is InputEventKey and event.keycode == KEY_P and event.pressed:
			resume_game.emit()
		elif event is InputEventJoypadButton and event.button_index == JOY_BUTTON_START and event.pressed:
			resume_game.emit()
