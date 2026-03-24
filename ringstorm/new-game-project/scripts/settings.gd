extends Node
# Autoload singleton — all tunable game parameters
# Ported from Ringstorm.jsx settings panel

const SAVE_PATH = "user://settings.cfg"

func _ready():
	load_settings()

# Speed — tuned for Godot 3D (browser speed was ~6 but different unit scale)
var player_speed: float = 30.0
var npc_speed: float = 25.0
var boost_multiplier: float = 1.5
var star_multiplier: float = 1.4
var start_speed: float = 5.0
var brake_strength: float = 0.5
var min_brake_speed: float = 5.0

# Controller
var deadzone_x: float = 0.3
var deadzone_y: float = 0.4
var stick_sensitivity: float = 1.0
var pitch_sensitivity: float = 1.0
var invert_y_p1: bool = false
var invert_y_p2: bool = false

# Gameplay
var turn_rate: float = 50.0  # degrees
var pitch_rate: float = 25.0
var fire_cooldown: float = 15.0  # frames (at 60fps)
var cube_respawn_race: float = 300.0
var cube_respawn_battle: float = 180.0
var crash_respawn_time: float = 80.0
var gate_size: float = 15.0

# Audio
var master_volume: float = 1.0

# Race
var num_gates: int = 7
var total_laps: int = 3
var countdown_frames: int = 240  # 4 seconds

# Racer data — ported from Ringstorm.jsx lines 597-601
var racer_data: Array = [
	{ "id": "p1", "name": "BLUE", "color": Color(0.2, 0.5, 1.0), "wing": Color(0.85, 0.85, 0.9), "npc": false },
	{ "id": "p2", "name": "RED", "color": Color(0.94, 0.27, 0.27), "wing": Color(0.85, 0.85, 0.9), "npc": false },
	{ "id": "n1", "name": "VIPER", "color": Color(0.1, 0.7, 0.2), "wing": Color(0.1, 0.1, 0.1), "npc": true },
	{ "id": "n2", "name": "BLAZE", "color": Color(0.9, 0.6, 0.1), "wing": Color(0.1, 0.1, 0.1), "npc": true },
	{ "id": "n3", "name": "STORM", "color": Color(0.6, 0.2, 0.8), "wing": Color(0.1, 0.1, 0.1), "npc": true },
]

# Course params — ported from Ringstorm.jsx lines 124-126
# Browser units are ~4x Godot units, so we scale down
func get_course_radius(course_idx: int) -> float:
	match course_idx:
		4: return 375.0  # Volcano (1500/4)
		6: return 275.0  # Deep Space (1100/4)
		_: return 300.0  # Default (1200/4)

func get_base_y(course_idx: int) -> float:
	match course_idx:
		3: return 20.0   # Ocean (80/4)
		1: return 55.0   # Islands (220/4)
		5: return 40.0   # Ice (160/4)
		6: return 56.0   # Space (225/4)
		_: return 45.0   # Default (180/4)

func get_y_var(course_idx: int) -> float:
	match course_idx:
		3: return 4.0    # Ocean (15/4)
		6: return 20.0   # Space (80/4)
		_: return 7.5    # Default (30/4)

func save_settings():
	var c = ConfigFile.new()
	c.set_value("speed", "player_speed", player_speed)
	c.set_value("speed", "npc_speed", npc_speed)
	c.set_value("speed", "boost_multiplier", boost_multiplier)
	c.set_value("speed", "star_multiplier", star_multiplier)
	c.set_value("speed", "start_speed", start_speed)
	c.set_value("speed", "brake_strength", brake_strength)
	c.set_value("speed", "min_brake_speed", min_brake_speed)
	c.set_value("controller", "deadzone_x", deadzone_x)
	c.set_value("controller", "deadzone_y", deadzone_y)
	c.set_value("controller", "stick_sensitivity", stick_sensitivity)
	c.set_value("controller", "pitch_sensitivity", pitch_sensitivity)
	c.set_value("controller", "invert_y_p1", invert_y_p1)
	c.set_value("controller", "invert_y_p2", invert_y_p2)
	c.set_value("gameplay", "turn_rate", turn_rate)
	c.set_value("gameplay", "pitch_rate", pitch_rate)
	c.set_value("gameplay", "fire_cooldown", fire_cooldown)
	c.set_value("gameplay", "gate_size", gate_size)
	c.set_value("audio", "master_volume", master_volume)
	c.save(SAVE_PATH)

func load_settings():
	var c = ConfigFile.new()
	if c.load(SAVE_PATH) != OK:
		return  # No save file yet, use defaults
	player_speed = c.get_value("speed", "player_speed", player_speed)
	npc_speed = c.get_value("speed", "npc_speed", npc_speed)
	boost_multiplier = c.get_value("speed", "boost_multiplier", boost_multiplier)
	star_multiplier = c.get_value("speed", "star_multiplier", star_multiplier)
	start_speed = c.get_value("speed", "start_speed", start_speed)
	brake_strength = c.get_value("speed", "brake_strength", brake_strength)
	min_brake_speed = c.get_value("speed", "min_brake_speed", min_brake_speed)
	deadzone_x = c.get_value("controller", "deadzone_x", deadzone_x)
	deadzone_y = c.get_value("controller", "deadzone_y", deadzone_y)
	stick_sensitivity = c.get_value("controller", "stick_sensitivity", stick_sensitivity)
	pitch_sensitivity = c.get_value("controller", "pitch_sensitivity", pitch_sensitivity)
	invert_y_p1 = c.get_value("controller", "invert_y_p1", invert_y_p1)
	invert_y_p2 = c.get_value("controller", "invert_y_p2", invert_y_p2)
	turn_rate = c.get_value("gameplay", "turn_rate", turn_rate)
	pitch_rate = c.get_value("gameplay", "pitch_rate", pitch_rate)
	fire_cooldown = c.get_value("gameplay", "fire_cooldown", fire_cooldown)
	gate_size = c.get_value("gameplay", "gate_size", gate_size)
	master_volume = c.get_value("audio", "master_volume", master_volume)
	AudioServer.set_bus_volume_db(0, linear_to_db(master_volume))
