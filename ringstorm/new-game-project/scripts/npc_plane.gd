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
	# Staggerwing biplane — same design as player, NPC colors
	var accent = racer_color
	var wing_col = racer_color.lightened(0.3)
	var accent_dark = accent.darkened(0.3)
	var bmat = StandardMaterial3D.new(); bmat.albedo_color = accent; bmat.metallic = 0.3; bmat.roughness = 0.6
	var dmat = StandardMaterial3D.new(); dmat.albedo_color = accent_dark; dmat.metallic = 0.3
	var wmat = StandardMaterial3D.new(); wmat.albedo_color = wing_col; wmat.metallic = 0.1; wmat.roughness = 0.8
	var smat = StandardMaterial3D.new(); smat.albedo_color = Color(0.25, 0.25, 0.25)
	var pmat = StandardMaterial3D.new(); pmat.albedo_color = Color(0.3, 0.2, 0.1)

	# Fuselage
	body_mesh = MeshInstance3D.new(); body_mesh.name = "Body"
	var fcyl = CylinderMesh.new(); fcyl.top_radius = 0.35; fcyl.bottom_radius = 0.35; fcyl.height = 3.5
	body_mesh.mesh = fcyl; body_mesh.material_override = bmat
	body_mesh.rotation.x = deg_to_rad(90)
	add_child(body_mesh)

	# Tail taper
	var tt = MeshInstance3D.new(); var ttc = CylinderMesh.new()
	ttc.top_radius = 0.35; ttc.bottom_radius = 0.18; ttc.height = 1.0
	tt.mesh = ttc; tt.material_override = bmat; tt.rotation.x = deg_to_rad(90); tt.position = Vector3(0, 0, 1.2)
	add_child(tt)

	# Cowl
	var cowl = MeshInstance3D.new(); var ccyl = CylinderMesh.new()
	ccyl.top_radius = 0.45; ccyl.bottom_radius = 0.45; ccyl.height = 0.6
	cowl.mesh = ccyl; cowl.material_override = dmat; cowl.rotation.x = deg_to_rad(90); cowl.position = Vector3(0, 0, -1.5)
	add_child(cowl)

	# Spinner
	var spin = MeshInstance3D.new(); var ssph = SphereMesh.new(); ssph.radius = 0.15; ssph.height = 0.3
	spin.mesh = ssph; var sm = StandardMaterial3D.new(); sm.albedo_color = Color(0.7, 0.7, 0.75); sm.metallic = 0.6
	spin.material_override = sm; spin.position = Vector3(0, 0, -1.85); add_child(spin)

	# Propeller
	var prop = MeshInstance3D.new(); prop.name = "Propeller"
	var pb = BoxMesh.new(); pb.size = Vector3(2.0, 0.08, 0.15)
	prop.mesh = pb; prop.material_override = pmat; prop.position = Vector3(0, 0, -1.9); add_child(prop)

	# Lower wing
	var lw = MeshInstance3D.new(); var lwb = BoxMesh.new(); lwb.size = Vector3(7.0, 0.08, 1.2)
	lw.mesh = lwb; lw.material_override = wmat; lw.position = Vector3(0, -0.2, 0.3); add_child(lw)

	# Upper wing
	var uw = MeshInstance3D.new(); var uwb = BoxMesh.new(); uwb.size = Vector3(6.5, 0.08, 1.1)
	uw.mesh = uwb; uw.material_override = wmat; uw.position = Vector3(0, 0.8, -0.2); add_child(uw)

	# Struts
	for sx in [-1.2, -2.8, 1.2, 2.8]:
		var st = MeshInstance3D.new(); var sc = CylinderMesh.new()
		sc.top_radius = 0.04; sc.bottom_radius = 0.04; sc.height = 1.1
		st.mesh = sc; st.material_override = smat; st.position = Vector3(sx, 0.3, 0.05); add_child(st)

	# H-stab + V-stab
	var hs = MeshInstance3D.new(); var hb = BoxMesh.new(); hb.size = Vector3(2.5, 0.06, 0.7)
	hs.mesh = hb; hs.material_override = wmat; hs.position = Vector3(0, 0.1, 1.6); add_child(hs)
	var vs = MeshInstance3D.new(); var vb = BoxMesh.new(); vb.size = Vector3(0.06, 0.8, 0.6)
	vs.mesh = vb; vs.material_override = bmat; vs.position = Vector3(0, 0.5, 1.6); add_child(vs)

	# Landing gear + wheels
	for side in [-1, 1]:
		var g = MeshInstance3D.new(); var gc = CylinderMesh.new()
		gc.top_radius = 0.04; gc.bottom_radius = 0.04; gc.height = 0.6
		g.mesh = gc; g.material_override = smat
		g.position = Vector3(side * 0.8, -0.5, -0.3); g.rotation.x = deg_to_rad(15); add_child(g)
		var w = MeshInstance3D.new(); var ws = SphereMesh.new(); ws.radius = 0.12; ws.height = 0.24
		w.mesh = ws; w.material_override = smat; w.position = Vector3(side * 0.8, -0.8, -0.25); add_child(w)

	# Cockpit
	var cp = MeshInstance3D.new(); var cb = BoxMesh.new(); cb.size = Vector3(0.5, 0.3, 0.6)
	cp.mesh = cb; var cm = StandardMaterial3D.new()
	cm.albedo_color = Color(0.5, 0.7, 1.0, 0.4); cm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cm.metallic = 0.5; cm.roughness = 0.3; cp.material_override = cm; cp.position = Vector3(0, 0.35, -0.3)
	add_child(cp)

	# Collision shape
	var col = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(2.0, 1.0, 3.5)
	col.shape = shape
	add_child(col)

func on_race_start():
	throttle = 1.0
	current_speed = Settings.start_speed

# Ported from Ringstorm.jsx updateNPC() lines 917-998
func _physics_process(delta):
	max_speed = Settings.npc_speed + (skill_level - 0.7) * 3.0  # Live update from settings
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

	# --- STEERING --- using Godot's native transform basis
	var target_pos = Vector3(tx, ty, tz)
	var to_target = target_pos - global_position
	var flat_dir = Vector3(to_target.x, 0, to_target.z)
	var dH = flat_dir.length()

	# Get current forward and calculate angular error using cross/dot products
	# This avoids atan2 ambiguity entirely
	var cur_forward = -global_transform.basis.z
	var cur_flat = Vector3(cur_forward.x, 0, cur_forward.z).normalized()
	var tgt_flat = flat_dir.normalized() if dH > 1.0 else cur_flat

	# Cross product Y gives signed turn error: positive = target is to our RIGHT
	var cross_y = cur_flat.x * tgt_flat.z - cur_flat.z * tgt_flat.x
	# Dot product gives how aligned we are (1 = facing target, -1 = facing away)
	var dot_fwd = cur_flat.dot(tgt_flat)

	wander_phase += delta * 1.2
	var wobble = sin(wander_phase) * (1.0 - skill_level) * 0.15

	var tumble_mul = 0.2 if tumble_timer > 0 else 1.0

	# Turn toward target — proportional, delta-based
	# cross_y > 0 means target is right → need negative rotate_y (Godot: positive = left)
	var turn_str = clamp(cross_y * 3.0 + wobble, -1.0, 1.0) * tumble_mul
	var turn_rate = Settings.turn_rate * 0.06  # Scale to feel right for NPCs
	rotate_y(-turn_str * turn_rate * delta)

	# Visual roll — bank into turns
	var roll_target = turn_str * deg_to_rad(25)
	roll_value = lerp(roll_value, roll_target, delta * 4.0)

	# Pitch toward target altitude
	var alt_diff = to_target.y
	var pitch_target = clamp(alt_diff / max(20.0, dH) * 1.5, -0.6, 0.6) * tumble_mul
	pitch_angle = lerp(pitch_angle, pitch_target, delta * 3.0)
	if tumble_timer > 0:
		tumble_timer -= 1

	# Speed — delta-based interpolation
	var ts = max_speed * (0.8 + skill_level * 0.2)
	if boost_timer > 0:
		ts = max_speed * Settings.boost_multiplier; boost_timer -= 1
	if star_timer > 0:
		ts = max(ts, max_speed * Settings.star_multiplier); star_timer -= 1
	if slipstream_boost > 0:
		ts = max(ts, max_speed * Settings.star_multiplier); slipstream_boost -= 1
	current_speed = lerp(current_speed, ts, delta * 2.0)

	# Move forward along facing direction with pitch
	var forward = -transform.basis.z
	var pitched_forward = Vector3(forward.x, sin(pitch_angle), forward.z).normalized()
	velocity = pitched_forward * current_speed
	move_and_slide()

	# Visual pitch and roll
	rotation.x = -pitch_angle
	rotation.z = -roll_value

	# Spin propeller
	var prop = get_node_or_null("Propeller")
	if prop:
		prop.rotation.z += 25.0 * delta

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
	if dist < race_course.gate_size + 8.0:  # Slightly larger tolerance for NPCs
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
		look_at(g, Vector3.UP)
	pitch_angle = 0.0
	roll_value = 0.0
	current_speed = max_speed * 0.6
	weapon = ""
	star_timer = 0
	boost_timer = 0
	slipstream_draft = 0
	slipstream_boost = 0
	trail.clear()
