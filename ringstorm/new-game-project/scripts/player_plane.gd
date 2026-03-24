extends CharacterBody3D
# Player flight controller — ported from Ringstorm.jsx updatePlayer() lines 1003-1100

# Flight state — matches browser racer properties (lines 623-633)
var max_speed: float = 6.0
var current_speed: float = 0.0
var pitch_angle: float = 0.0   # r.p
var yaw_angle: float = 0.0    # r.yw
var roll_value: float = 0.0   # r.rl
var target_pitch: float = 0.0 # r.tp
var target_roll: float = 0.0  # r.tr
var throttle: float = 0.0     # r.th

# Race state
var current_gate: int = 0
var current_lap: int = 0
var race_finished: bool = false
var finish_time: int = 0
var finish_position: int = 0
var is_npc: bool = false

# Status effects
var boost_timer: int = 0
var star_timer: int = 0
var tumble_timer: int = 0
var slipstream_draft: int = 0
var slipstream_boost: int = 0

# Crash state — ported from boom()/resp() lines 672-706
var is_crashed: bool = false
var crash_timer: int = 0

# Weapon
var weapon: String = ""
var weapon_ammo: int = 0
var fire_cooldown: int = 0

# Barrel roll trick — ported from lines 1040-1052
var trick_roll: float = 0.0
var trick_dir: int = 0
var trick_timer: int = 0
var trick_frame: int = 0
var last_left_frame: int = 0
var last_right_frame: int = 0

# Battle
var lives: int = 3
var kills: int = 0

# Weapon system reference
var weapon_system: Node3D = null

# Trail
var trail: Array = []

# References
var race_course: Node = null
var race_manager: Node = null
var hud: Node = null
var all_racers: Array = []

# Nodes
@onready var camera: Camera3D = $Camera3D

func _ready():
	max_speed = Settings.player_speed

func on_race_start():
	throttle = 1.0
	current_speed = Settings.start_speed

func _physics_process(delta):
	if race_finished:
		if camera:
			_update_camera(delta)
		return
	if is_crashed:
		crash_timer -= 1
		if crash_timer <= 0:
			_respawn()
		if camera:
			_update_camera(delta)
		return

	var S = Settings
	max_speed = S.player_speed  # Live update from settings

	# --- INPUT --- ported from updatePlayer lines 1014-1035
	var turn_input = 0.0
	var pitch_input = 0.0
	var want_fire = false
	var brake = false

	# Keyboard — A=left (positive rotate_y), D=right (negative rotate_y)
	if Input.is_key_pressed(KEY_A):
		turn_input -= 1.0  # Left = negative (will become positive rotate_y)
	if Input.is_key_pressed(KEY_D):
		turn_input += 1.0  # Right = positive (will become negative rotate_y)
	if Input.is_key_pressed(KEY_W):
		pitch_input += 1.0  # Up
	if Input.is_key_pressed(KEY_S):
		pitch_input -= 0.8  # Down
	if Input.is_key_pressed(KEY_SPACE):
		want_fire = true
	if Input.is_key_pressed(KEY_SHIFT):
		brake = true

	# Gamepad — separate from keyboard (no injection)
	var gp_x = Input.get_joy_axis(0, JOY_AXIS_LEFT_X)
	var gp_y = Input.get_joy_axis(0, JOY_AXIS_LEFT_Y)
	if abs(gp_x) > S.deadzone_x:
		turn_input = gp_x * S.stick_sensitivity  # Positive X = right = positive turn_input
	if abs(gp_y) > S.deadzone_y:
		pitch_input = -gp_y * S.pitch_sensitivity
		if S.invert_y_p1:
			pitch_input = -pitch_input
	if Input.is_joy_button_pressed(0, JOY_BUTTON_A):
		want_fire = true
	var gp_lt = Input.get_joy_axis(0, JOY_AXIS_TRIGGER_LEFT)
	if gp_lt > 0.3 or Input.is_joy_button_pressed(0, JOY_BUTTON_LEFT_SHOULDER):
		brake = true

	# --- SPEED --- ported from lines 1014-1019
	throttle = 1.0
	var ts = 1.0 + throttle * (max_speed - 1.0)
	if boost_timer > 0:
		ts = max_speed * S.boost_multiplier
		boost_timer -= 1
	if star_timer > 0:
		ts = max(ts, max_speed * S.star_multiplier)
		star_timer -= 1
	if slipstream_boost > 0:
		ts = max(ts, max_speed * S.star_multiplier)
		slipstream_boost -= 1
	current_speed += (ts - current_speed) * delta * 2.0

	# Brake — ported from browser brake system
	if brake:
		current_speed = lerp(current_speed, S.min_brake_speed, S.brake_strength * delta * 4.0)
		if current_speed < S.min_brake_speed:
			current_speed = S.min_brake_speed

	# --- TURN & PITCH --- simplified for Godot native transforms
	var tumble_mul = 0.2 if tumble_timer > 0 else 1.0
	# Yaw: turn based on input
	var yaw_rate = turn_input * S.turn_rate * tumble_mul * delta
	rotate_y(-yaw_rate * 0.04)  # Scale for feel
	# Pitch: directly set target and smoothly interpolate
	var pitch_target = pitch_input * deg_to_rad(S.pitch_rate) * tumble_mul
	if pitch_input == 0:
		pitch_target = 0.0  # Level out when no input
	pitch_angle = lerp(pitch_angle, pitch_target, delta * 5.0)
	pitch_angle = clamp(pitch_angle, deg_to_rad(-50), deg_to_rad(50))
	# Roll: bank into turns — turn right (positive) = roll right (negative rotation.z)
	var roll_target = turn_input * deg_to_rad(35) * tumble_mul
	roll_value = lerp(roll_value, roll_target, delta * 4.0)
	if tumble_timer > 0:
		tumble_timer -= 1

	# --- BARREL ROLL --- ported from lines 1040-1052
	if trick_timer > 0:
		trick_timer -= 1
	# Keyboard double-tap
	var frame = Engine.get_physics_frames()
	if Input.is_action_just_pressed("ui_left") or (Input.is_key_pressed(KEY_A) and not _prev_left):
		if frame - last_left_frame < 18 and trick_timer <= 0 and trick_frame <= 0:
			trick_frame = 30; trick_dir = 1; trick_roll = 0.0
		last_left_frame = frame
	if Input.is_action_just_pressed("ui_right") or (Input.is_key_pressed(KEY_D) and not _prev_right):
		if frame - last_right_frame < 18 and trick_timer <= 0 and trick_frame <= 0:
			trick_frame = 30; trick_dir = -1; trick_roll = 0.0
		last_right_frame = frame
	_prev_left = Input.is_key_pressed(KEY_A)
	_prev_right = Input.is_key_pressed(KEY_D)
	# Gamepad barrel roll (B = right, X = left)
	if Input.is_joy_button_pressed(0, JOY_BUTTON_B) and not _prev_gp_roll_r and trick_timer <= 0 and trick_frame <= 0:
		trick_frame = 30; trick_dir = -1; trick_roll = 0.0
	if Input.is_joy_button_pressed(0, JOY_BUTTON_X) and not _prev_gp_roll_l and trick_timer <= 0 and trick_frame <= 0:
		trick_frame = 30; trick_dir = 1; trick_roll = 0.0
	_prev_gp_roll_r = Input.is_joy_button_pressed(0, JOY_BUTTON_B)
	_prev_gp_roll_l = Input.is_joy_button_pressed(0, JOY_BUTTON_X)
	if trick_frame > 0:
		trick_roll += (PI * 2.0 / 30.0) * trick_dir
		trick_frame -= 1
		if trick_frame <= 0:
			trick_roll = 0.0
			trick_timer = 60

	# --- MOVE --- using Godot's native transform
	# Forward is -Z in local space; pitch adds vertical component
	var forward = -transform.basis.z
	# Add pitch effect: rotate forward vector up/down based on pitch_angle
	var pitched_forward = Vector3(forward.x, sin(pitch_angle), forward.z).normalized()
	velocity = pitched_forward * current_speed
	move_and_slide()

	# Apply visual pitch and roll (yaw is handled by rotate_y above)
	rotation.x = -pitch_angle  # Positive pitch_angle = nose UP = negative rotation.x in Godot
	rotation.z = -(roll_value + trick_roll)  # Turning right (+roll_value) = tilt right wing down (-rotation.z)

	# --- FIRE WEAPON --- ported from lines 1057-1086
	if fire_cooldown > 0:
		fire_cooldown -= 1
	if want_fire and fire_cooldown <= 0 and weapon != "":
		fire_cooldown = int(S.fire_cooldown)
		match weapon:
			"gun":
				if weapon_system: weapon_system.fire_gun(self)
				weapon_ammo -= 1
				if weapon_ammo <= 0: weapon = ""
			"missile":
				if weapon_system: weapon_system.fire_missile(self)
				weapon = ""
			"boost":
				boost_timer = 120; weapon = ""
				AudioManager.play("boost")
			"star":
				star_timer = 180; weapon = ""
				AudioManager.play("star_power")
			"flares":
				if weapon_system: weapon_system.fire_flares(self)
				weapon = ""
			"lightning":
				if weapon_system: weapon_system.drop_lightning(self)
				weapon = ""
			"tornado":
				if weapon_system: weapon_system.drop_tornado(self)
				weapon = ""

	# Gate check
	_check_gate()

	# Trail
	if Engine.get_physics_frames() % 3 == 0:
		trail.append(global_position)
		if trail.size() > 30:
			trail.pop_front()

	# Camera
	_update_camera(delta)

	# Engine pitch based on speed
	AudioManager.set_engine_pitch(0.8 + current_speed / max_speed * 0.6)

	# Update HUD
	if hud and race_manager:
		var pos = race_manager.get_race_position(self)
		hud.update_hud(current_lap, Settings.total_laps, current_gate, Settings.num_gates, race_finished)
		hud.update_position(pos)
		hud.update_weapon(weapon)

# Edge detection state
var _prev_left: bool = false
var _prev_right: bool = false
var _prev_gp_roll_r: bool = false
var _prev_gp_roll_l: bool = false

func _check_gate():
	if not race_course or race_finished:
		return
	var gate_pos = race_course.get_gate_position(current_gate)
	var dist = global_position.distance_to(gate_pos)
	# Ported from checkGate: dist < sz + 18 → scaled to Godot
	if dist < race_course.gate_size + 5.0:
		# Trick boost — ported from line 862
		if trick_roll != 0.0:
			boost_timer = 60
		if race_manager:
			race_manager.on_racer_passed_gate(self)

func crash():
	# Ported from boom() lines 672-680
	if star_timer > 0:
		return
	is_crashed = true
	crash_timer = int(Settings.crash_respawn_time)
	visible = false

func _respawn():
	# Ported from resp() lines 684-706
	is_crashed = false
	visible = true
	if race_course and race_course.gates.size() > 1:
		var g = race_course.get_gate_position(current_gate)
		var prev_idx = (current_gate - 1 + Settings.num_gates) % Settings.num_gates
		var v = race_course.get_gate_position(prev_idx)
		global_position = (g + v) / 2.0 + Vector3.UP * 8.0
		look_at(g, Vector3.UP)
	pitch_angle = 0.0
	roll_value = 0.0
	current_speed = max_speed * 0.6
	weapon = ""
	boost_timer = 0
	star_timer = 0
	slipstream_draft = 0
	slipstream_boost = 0
	trail.clear()
	trick_roll = 0.0
	trick_frame = 0
	trick_timer = 0

func _update_camera(delta):
	if not camera:
		return
	var cam_offset = transform.basis.z * 8.0 + Vector3.UP * 3.0
	var target_pos = global_position + cam_offset
	camera.global_position = camera.global_position.lerp(target_pos, delta * 5.0)
	camera.look_at(global_position + -transform.basis.z * 10.0)
