extends Node3D
# Mystery cube system — spawns golden cubes between gates, handles collection and rubber banding
# Ported from Ringstorm.jsx cube generation (lines 530-570) and getCubes()

var cubes: Array = []  # {node, active, respawn_timer, gives, no_respawn}
var all_racers: Array = []
var race_manager: Node = null
var weapon_system: Node = null
var is_battle: bool = false

# Ported from Ringstorm.jsx weight tables
const W_FIRST = [["gun", 40], ["boost", 40], ["missile", 15], ["star", 3], ["flares", 2]]
const W_MID = [["gun", 20], ["boost", 25], ["missile", 30], ["star", 10], ["flares", 15]]
const W_LAST = [["gun", 5], ["boost", 15], ["missile", 30], ["star", 35], ["flares", 15]]

func generate_cubes(course: Node):
	# Ported from lines 530-570: 4 cubes per gate pair, plus special cubes
	var gates = course.gates
	var num_gates = gates.size()

	for gi in range(num_gates):
		var g1 = gates[gi]
		var g2 = gates[(gi + 1) % num_gates]
		var mx = (g1.x + g2.x) / 2.0
		var my = (g1.y + g2.y) / 2.0
		var mz = (g1.z + g2.z) / 2.0
		var dx = g2.x - g1.x
		var dz = g2.z - g1.z
		var dlen = sqrt(dx * dx + dz * dz)
		if dlen < 0.01:
			continue
		var px = -dz / dlen
		var pz = dx / dlen

		# 4 cubes per station at offsets -4.5, -1.5, 1.5, 4.5
		for off in [-4.5, -1.5, 1.5, 4.5]:
			var cx = mx + px * off
			var cz = mz + pz * off
			_spawn_cube(Vector3(cx, my, cz), "", false)

	# Special cubes — ported from lines 550-565
	# Lightning at station 2 (no respawn, disguised)
	if cubes.size() > 8:
		cubes[8]["gives"] = "lightning"
		cubes[8]["no_respawn"] = true
	# Tornado at station 4 (no respawn, race only)
	if not is_battle and cubes.size() > 16:
		cubes[16]["gives"] = "tornado"
		cubes[16]["no_respawn"] = true

func _spawn_cube(pos: Vector3, gives: String, no_respawn: bool):
	var mesh = MeshInstance3D.new()
	var box = BoxMesh.new()
	box.size = Vector3(2.5, 2.5, 2.5)
	mesh.mesh = box
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.85, 0.2, 0.9)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.8, 0.15)
	mat.emission_energy_multiplier = 1.5
	mesh.material_override = mat
	mesh.global_position = pos
	# "?" label — always faces camera
	var label = Label3D.new()
	label.text = "?"
	label.font_size = 72
	label.modulate = Color(1.0, 1.0, 1.0)
	label.outline_modulate = Color(0.3, 0.2, 0.0)
	label.outline_size = 8
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	mesh.add_child(label)
	add_child(mesh)
	cubes.append({
		"node": mesh, "active": true, "respawn_timer": 0,
		"gives": gives, "no_respawn": no_respawn
	})

func _physics_process(delta):
	# Rotate cubes and check respawn
	for c in cubes:
		if c["active"]:
			c["node"].rotation.y += 0.02
		else:
			c["respawn_timer"] -= 1
			if c["respawn_timer"] <= 0 and not c["no_respawn"]:
				c["active"] = true
				c["node"].visible = true

	# Check collection
	for racer in all_racers:
		if racer.is_crashed or racer.race_finished:
			continue
		for c in cubes:
			if not c["active"]:
				continue
			var dist = racer.global_position.distance_to(c["node"].global_position)
			if dist < 8.0:
				_collect_cube(racer, c)

func _collect_cube(racer: Node, cube: Dictionary):
	cube["active"] = false
	cube["node"].visible = false
	cube["respawn_timer"] = int(Settings.cube_respawn_battle if is_battle else Settings.cube_respawn_race)
	AudioManager.play("cube_pickup")

	# Only give weapon if racer has none
	if racer.weapon != "":
		return

	# Special cubes give specific weapons
	if cube["gives"] != "":
		racer.weapon = cube["gives"]
		racer.weapon_ammo = 1 if cube["gives"] != "gun" else 8
		return

	# Rubber banding — ported from Ringstorm.jsx weight tables
	var pos = 3  # Default middle
	if race_manager:
		pos = race_manager.get_race_position(racer)
	var total_racers = all_racers.size()
	var weights: Array
	if pos <= 1:
		weights = W_FIRST
	elif pos >= total_racers:
		weights = W_LAST
	else:
		weights = W_MID

	# Weighted random pick
	var total_weight = 0
	for w in weights:
		total_weight += w[1]
	var roll = randi() % total_weight
	var cumulative = 0
	for w in weights:
		cumulative += w[1]
		if roll < cumulative:
			racer.weapon = w[0]
			racer.weapon_ammo = 8 if w[0] == "gun" else 1
			return
