extends CharacterBody3D
# NPC AI racer — ported from Ringstorm.jsx updateNPC() lines 917-998

@export var racer_color: Color = Color.GREEN
@export var racer_name: String = "NPC"

# Flight state — matches browser racer object (lines 623-633)
var max_speed: float = 5.5
var current_speed: float = 0.0
var pitch_angle: float = 0.0  # r.p
var yaw_angle: float = 0.0  # r.yw
var roll_value: float = 0.0  # r.rl
var target_pitch: float = 0.0  # r.tp
var target_roll: float = 0.0  # r.tr
var throttle: float = 0.0  # r.th

# NPC AI — ported from lines 632
var wander_phase: float = 0.0  # r.nw — makes steering imperfect
var skill_level: float = 0.85  # r.ns — 0.7 to 1.0

# Race state
var current_gate: int = 0
var current_lap: int = 0
var race_finished: bool = false
var finish_time: int = 0
var finish_position: int = 0
var is_npc: bool = true

# Status effects
var boost_timer: int = 0  # r.bt
var star_timer: int = 0  # r.st
var tumble_timer: int = 0
var slipstream_draft: int = 0
var slipstream_boost: int = 0

# Crash state
var is_crashed: bool = false
var crash_timer: int = 0

# Weapon
var weapon: String = ""  # Current weapon id
var weapon_ammo: int = 0

# Battle
var lives: int = 3
var kills: int = 0

# References
var race_course: Node = null
var race_manager: Node = null
var all_racers: Array = []

# Trail
var trail: Array = []

# Mesh reference
var body_mesh: MeshInstance3D

func _ready():
	wander_phase = randf() * 6.0
	skill_level = 0.7 + randf() * 0.3
	_create_mesh()

func _create_mesh():
	# Simple plane mesh (same as player but NPC color)
	body_mesh = MeshInstance3D.new()
	body_mesh.name = "Body"
	var box = BoxMesh.new()
	box.size = Vector3(1.2, 0.3, 2.5)
	body_mesh.mesh = box
	var mat = StandardMaterial3D.new()
	mat.albedo_color = racer_color
	mat.metallic = 0.3
	body_mesh.material_override = mat
	add_child(body_mesh)

	# Wings
	var wings = MeshInstance3D.new()
	var wmesh = BoxMesh.new()
	wmesh.size = Vector3(5.0, 0.08, 1.2)
	wings.mesh = wmesh
	var wmat = StandardMaterial3D.new()
	wmat.albedo_color = racer_color.lightened(0.3)
	wmat.metallic = 0.2
	wings.material_override = wmat
	wings.position = Vector3(0, 0, 0.2)
	add_child(wings)

	# Collision shape
	var col = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(1.2, 0.4, 2.5)
	col.shape = shape
	add_child(col)

func on_race_start():
	throttle = 1.0
	current_speed = Settings.start_speed

# Ported from Ringstorm.jsx updateNPC() lines 917-998
func _physics_process(delta):
	if race_finished:
		return
	if is_crashed:
		crash_timer -= 1
		if crash_timer <= 0:
			_respawn()
		return

	# Determine target — ported from lines 921-926
	var tx: float = 0.0
	var ty: float = 0.0
	var tz: float = 0.0

	if race_course and race_course.gates.size() > 0:
		var gate_pos = race_course.get_gate_position(current_gate)
		tx = gate_pos.x
		ty = gate_pos.y
		tz = gate_pos.z

	# Ported from lines 928-937: NPC draft-seeking
	if slipstream_boost <= 0:
		for other in all_racers:
			if other == self or other.is_crashed or other.race_finished:
				continue
			var dd = global_position.distance_to(other.global_position)
			if dd < 25.0 and dd > 5.0:
				var o_progress = other.current_lap * Settings.num_gates + other.current_gate
				var my_progress = current_lap * Settings.num_gates + current_gate
				if o_progress >= my_progress:
					var beh = other.global_position - other.transform.basis.z * 10.0
					tx = tx * 0.7 + beh.x * 0.3
					tz = tz * 0.7 + beh.z * 0.3
					break

	# Ported from lines 939-952: steering toward target
	var dx = tx - global_position.x
	var dy = ty - global_position.y
	var dz = tz - global_position.z
	var dH = sqrt(dx * dx + dz * dz)
	var target_yaw = atan2(dx, dz)

	wander_phase += 0.02
	var yaw_diff = target_yaw + sin(wander_phase) * (1.0 - skill_level) * 5.0 * deg_to_rad(1.0) - yaw_angle
	# Normalize angle — ported from lines 946-947
	while yaw_diff > PI:
		yaw_diff -= PI * 2.0
	while yaw_diff < -PI:
		yaw_diff += PI * 2.0

	var tumble_mul = 0.2 if tumble_timer > 0 else 1.0
	# Ported from lines 950-952
	target_roll = -clamp(yaw_diff * 2.5, -deg_to_rad(50), deg_to_rad(50)) * tumble_mul
	roll_value += (target_roll - roll_value) / 18.0
	yaw_angle += (-roll_value * 2.2 * (current_speed / max_speed)) / 60.0

	# Pitch toward target — ported from lines 960-962
	target_pitch = clamp((dy / max(12.5, dH)) * deg_to_rad(40), -deg_to_rad(15), deg_to_rad(15)) * tumble_mul
	pitch_angle += (target_pitch - pitch_angle) / 24.0
	if tumble_timer > 0:
		tumble_timer -= 1

	# Speed — ported from lines 980-984
	var ts = max_speed * (0.8 + skill_level * 0.2)
	if boost_timer > 0:
		ts = max_speed * Settings.boost_multiplier
		boost_timer -= 1
	if star_timer > 0:
		ts = max(ts, max_speed * Settings.star_multiplier)
		star_timer -= 1
	if slipstream_boost > 0:
		ts = max(ts, max_speed * Settings.star_multiplier)
		slipstream_boost -= 1
	current_speed += (ts - current_speed) / 40.0

	# Move — ported from moveRacer() lines 911-915
	# Negate Z for Godot's -Z forward convention
	var cp = cos(pitch_angle)
	var sp2 = sin(pitch_angle)
	var cy = cos(yaw_angle)
	var sy = sin(yaw_angle)
	velocity = Vector3(sy * cp, sp2, -cy * cp) * current_speed
	move_and_slide()

	# Apply visual rotation — negate for Godot convention
	rotation = Vector3(-pitch_angle, -yaw_angle, -roll_value)

	# NPC weapon use — ported from lines 995-997
	if weapon != "" and randf() < 0.01:
		if weapon == "boost":
			boost_timer = 120
			weapon = ""
		elif weapon == "star":
			star_timer = 180
			weapon = ""
		else:
			weapon = ""  # TODO: implement other weapon firing

	# Gate check
	_check_gate()

	# Trail
	if Engine.get_physics_frames() % 3 == 0 and not is_crashed:
		trail.append(global_position)
		if trail.size() > 30:
			trail.pop_front()

func _check_gate():
	if not race_course or race_finished:
		return
	var gate_pos = race_course.get_gate_position(current_gate)
	var dist = global_position.distance_to(gate_pos)
	if dist < race_course.gate_size + 5.0:
		if race_manager:
			race_manager.on_racer_passed_gate(self)

func crash():
	# Ported from boom() lines 672-680
	if star_timer > 0:
		return
	is_crashed = true
	crash_timer = int(Settings.crash_respawn_time)
	visible = false
	if body_mesh:
		body_mesh.visible = false

func _respawn():
	# Ported from resp() lines 684-706
	is_crashed = false
	visible = true
	if body_mesh:
		body_mesh.visible = true

	if race_course and race_course.gates.size() > 1:
		var g = race_course.get_gate_position(current_gate)
		var prev_idx = (current_gate - 1 + Settings.num_gates) % Settings.num_gates
		var v = race_course.get_gate_position(prev_idx)
		global_position = (g + v) / 2.0 + Vector3.UP * 8.0
		yaw_angle = atan2(g.x - global_position.x, g.z - global_position.z)
	pitch_angle = 0.0
	roll_value = 0.0
	current_speed = max_speed * 0.6
	weapon = ""
	star_timer = 0
	boost_timer = 0
	slipstream_draft = 0
	slipstream_boost = 0
	trail.clear()
