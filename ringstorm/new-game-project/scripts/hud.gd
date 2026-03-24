extends CanvasLayer

var lap_label: Label
var gate_label: Label
var finish_label: Label

func _ready():
	# Lap counter — top right
	lap_label = Label.new()
	lap_label.text = "Lap 1/3"
	lap_label.add_theme_font_size_override("font_size", 28)
	lap_label.add_theme_color_override("font_color", Color(1.0, 0.8, 0.2))
	lap_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.5))
	lap_label.add_theme_constant_override("shadow_offset_x", 2)
	lap_label.add_theme_constant_override("shadow_offset_y", 2)
	lap_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	lap_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	lap_label.offset_left = -200
	lap_label.offset_top = 10
	lap_label.offset_right = -10
	add_child(lap_label)

	# Gate counter — below lap
	gate_label = Label.new()
	gate_label.text = "Gate 1/7"
	gate_label.add_theme_font_size_override("font_size", 18)
	gate_label.add_theme_color_override("font_color", Color(0.6, 0.65, 0.7))
	gate_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.4))
	gate_label.add_theme_constant_override("shadow_offset_x", 1)
	gate_label.add_theme_constant_override("shadow_offset_y", 1)
	gate_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	gate_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	gate_label.offset_left = -200
	gate_label.offset_top = 44
	gate_label.offset_right = -10
	add_child(gate_label)

	# Finish label — centered, hidden by default
	finish_label = Label.new()
	finish_label.text = "RACE FINISHED!"
	finish_label.add_theme_font_size_override("font_size", 48)
	finish_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
	finish_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	finish_label.add_theme_constant_override("shadow_offset_x", 3)
	finish_label.add_theme_constant_override("shadow_offset_y", 3)
	finish_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	finish_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	finish_label.set_anchors_preset(Control.PRESET_CENTER)
	finish_label.offset_left = -200
	finish_label.offset_right = 200
	finish_label.offset_top = -30
	finish_label.offset_bottom = 30
	finish_label.visible = false
	add_child(finish_label)

func update_hud(lap: int, total_laps: int, gate: int, total_gates: int, finished: bool = false):
	lap_label.text = "Lap " + str(min(lap + 1, total_laps)) + "/" + str(total_laps)
	gate_label.text = "Gate " + str(gate + 1) + "/" + str(total_gates)
	if finished:
		finish_label.visible = true
		lap_label.text = "FINISHED"
		gate_label.text = ""
