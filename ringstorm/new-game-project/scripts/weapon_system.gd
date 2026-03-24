extends Node3D
# Weapon system — manages all projectiles and hazards
# Ported from Ringstorm.jsx pj[], storms[] arrays and weapon firing code

var projectiles: Array = []  # {node, velocity, lifetime, owner, homing, target, type}
var storms: Array = []  # {node, timer, owner, type, hit_set}
var all_racers: Array = []

func _physics_process(delta):
	_update_projectiles(delta)
	_update_storms(delta)

# --- FIRING ---

func fire_gun(owner: Node):
	# Ported from lines 1063-1065: 2 bullets, left and right
	AudioManager.play("gun_fire")
	var forward = -owner.transform.basis.z
	var right = owner.transform.basis.x
	for side in [-1, 1]:
		var pos = owner.global_position + right * side * 1.0
		var vel = forward * 80.0
		_spawn_projectile(pos, vel, 1.0, owner, false, null, "bullet", Color(1, 0.85, 0.2), 0.3)

func fire_missile(owner: Node):
	# Ported from lines 1066-1070: homing missile targeting nearest racer
	AudioManager.play("missile_fire")
	var forward = -owner.transform.basis.z
	var pos = owner.global_position
	var target = _find_nearest_racer(owner)
	var vel = forward * 50.0
	_spawn_projectile(pos, vel, 3.0, owner, true, target, "missile", Color(0.94, 0.27, 0.27), 0.5)

func fire_flares(owner: Node):
	# Ported from lines 1073-1076: 6 decoy projectiles in random directions
	AudioManager.play("gun_fire", -5.0)
	for i in range(6):
		var vel = Vector3(
			(randf() - 0.5) * 12.0,
			-randf() * 5.0 - 2.0,
			(randf() - 0.5) * 12.0
		)
		_spawn_projectile(owner.global_position, vel, 0.8, owner, false, null, "flare", Color.WHITE, 0.4)
	owner.set("weapon", "")
	# TODO: redirect missiles targeting this racer toward flares

func drop_lightning(owner: Node):
	# Ported from lines 1077-1080: stationary lightning storm
	AudioManager.play("lightning_zap")
	var forward = -owner.transform.basis.z
	var pos = owner.global_position - forward * 8.0
	_spawn_storm(pos, 480, owner, "lightning")

func drop_tornado(owner: Node):
	# Ported from lines 1081-1084: stationary tornado
	AudioManager.play("tornado_whoosh")
	var forward = -owner.transform.basis.z
	var pos = owner.global_position - forward * 8.0
	_spawn_storm(pos, 480, owner, "tornado")

# --- PROJECTILES ---

func _spawn_projectile(pos: Vector3, vel: Vector3, lifetime: float, owner: Node, homing: bool, target: Node, type: String, color: Color, radius: float):
	var mesh = MeshInstance3D.new()
	var sphere = SphereMesh.new()
	sphere.radius = radius
	sphere.height = radius * 2
	mesh.mesh = sphere
	var mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 1.5
	mesh.material_override = mat
	mesh.global_position = pos
	add_child(mesh)
	projectiles.append({
		"node": mesh, "velocity": vel, "lifetime": lifetime,
		"owner": owner, "homing": homing, "target": target, "type": type
	})

func _update_projectiles(delta):
	var to_remove = []
	for i in range(projectiles.size()):
		var p = projectiles[i]
		p["lifetime"] -= delta
		if p["lifetime"] <= 0:
			to_remove.append(i)
			continue

		# Homing — ported from missile homing logic
		if p["homing"] and p["target"] and is_instance_valid(p["target"]):
			var dir = (p["target"].global_position - p["node"].global_position).normalized()
			p["velocity"] = p["velocity"].lerp(dir * p["velocity"].length(), delta * 3.0)

		p["node"].global_position += p["velocity"] * delta

		# Collision check against racers
		for racer in all_racers:
			if racer == p["owner"] or racer.is_crashed or racer.race_finished:
				continue
			var dist = p["node"].global_position.distance_to(racer.global_position)
			var hit_dist = 8.0 if p["type"] == "missile" else 5.0
			if dist < hit_dist:
				if p["type"] != "flare":
					racer.crash()
					AudioManager.play("explosion")
				to_remove.append(i)
				break

	# Remove expired/hit projectiles (reverse order)
	for i in range(to_remove.size() - 1, -1, -1):
		var idx = to_remove[i]
		if idx < projectiles.size():
			projectiles[idx]["node"].queue_free()
			projectiles.remove_at(idx)

# --- STORMS ---

func _spawn_storm(pos: Vector3, timer: int, owner: Node, type: String):
	var mesh = MeshInstance3D.new()
	var sphere = SphereMesh.new()
	sphere.radius = 3.0
	sphere.height = 6.0
	mesh.mesh = sphere
	var mat = StandardMaterial3D.new()
	if type == "lightning":
		mat.albedo_color = Color(0.66, 0.33, 0.97, 0.6)
		mat.emission = Color(0.66, 0.33, 0.97)
	else:
		mat.albedo_color = Color(0.02, 0.71, 0.83, 0.6)
		mat.emission = Color(0.02, 0.71, 0.83)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.emission_enabled = true
	mat.emission_energy_multiplier = 2.0
	mesh.material_override = mat
	mesh.global_position = pos
	add_child(mesh)
	storms.append({
		"node": mesh, "timer": timer, "owner": owner, "type": type,
		"hit_set": {}  # track which racers have been hit (lightning)
	})

func _update_storms(delta):
	var to_remove = []
	for i in range(storms.size()):
		var s = storms[i]
		s["timer"] -= 1
		if s["timer"] <= 0:
			to_remove.append(i)
			continue

		# Rotate visual
		s["node"].rotation.y += 0.05

		# Check racers
		for racer in all_racers:
			if racer == s["owner"] or racer.is_crashed or racer.race_finished:
				continue
			if racer.star_timer > 0:
				continue  # Star = immune
			var dist = racer.global_position.distance_to(s["node"].global_position)

			if s["type"] == "lightning":
				# Ported: zap once per racer — slowdown for 60 frames
				if dist < 20.0 and not s["hit_set"].has(racer):
					s["hit_set"][racer] = true
					racer.current_speed = 1.0
					racer.tumble_timer = 60
					AudioManager.play("lightning_zap")
			elif s["type"] == "tornado":
				# Ported: pull racers in, throw at close range
				if dist < 25.0:
					var pull_dir = (s["node"].global_position - racer.global_position).normalized()
					racer.global_position += pull_dir * 0.3
					if dist < 8.0:
						racer.yaw_angle += PI  # Flip direction
						racer.current_speed = 2.0
						AudioManager.play("tornado_whoosh", -5.0)

	for i in range(to_remove.size() - 1, -1, -1):
		var idx = to_remove[i]
		if idx < storms.size():
			storms[idx]["node"].queue_free()
			storms.remove_at(idx)

func _find_nearest_racer(exclude: Node) -> Node:
	var nearest = null
	var best_dist = 999999.0
	for r in all_racers:
		if r == exclude or r.is_crashed or r.race_finished:
			continue
		var d = r.global_position.distance_to(exclude.global_position)
		if d < best_dist:
			best_dist = d
			nearest = r
	return nearest
