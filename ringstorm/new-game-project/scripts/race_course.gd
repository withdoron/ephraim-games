extends Node3D
# Course generation — ported from Ringstorm.jsx lines 124-131
# Gate positions, path ribbon, per-course height overrides

@export var course_index: int = 0  # 0=Canyon, 1=Islands, 2=Mountain, 3=Ocean, 4=Volcano, 5=Ice, 6=Space
@export var gate_size: float = 15.0

var gates: Array = []  # Array of Vector3 gate positions
var gate_meshes: Array = []
var num_gates: int = 7

func _ready():
	num_gates = Settings.num_gates
	generate_course()
	create_gate_visuals()
	create_path_ribbon()

func generate_course():
	# Ported from Ringstorm.jsx lines 124-131
	var course_r = Settings.get_course_radius(course_index)
	var base_y = Settings.get_base_y(course_index)
	var y_var = Settings.get_y_var(course_index)

	gates.clear()
	for i in range(num_gates):
		var a = float(i) / float(num_gates) * PI * 2.0
		# Ported: cos(a)*R + cos(a*2)*60 → scaled by /4 for Godot
		var x = cos(a) * course_r + cos(a * 2.0) * 15.0
		var y = base_y + sin(a * 2.0 + 1.0) * y_var
		var z = sin(a) * course_r + sin(a * 3.0) * 12.5
		gates.append(Vector3(x, y, z))

	# Per-course gate height overrides — ported from lines 134-154
	_apply_height_overrides()

func _apply_height_overrides():
	# Ported from Ringstorm.jsx, scaled /4 for Godot units
	match course_index:
		2:  # Mountain Pass — roller coaster profile
			if gates.size() >= 7:
				gates[0].y = 45.0; gates[1].y = 45.0
				gates[2].y = 25.0; gates[3].y = 27.5
				gates[4].y = 75.0; gates[5].y = 45.0
		3:  # Ocean Run — low gates through arches
			if gates.size() >= 7:
				gates[0].y = 20.0
				gates[1].y = 7.5   # through arch — low
				gates[2].y = 10.0
				gates[3].y = 8.75  # through arch — low
				gates[4].y = 20.0
				gates[5].y = 7.5   # through arch — low
		6:  # Deep Space — dramatic elevation changes
			if gates.size() >= 7:
				gates[0].y = 50.0; gates[1].y = 87.5
				gates[2].y = 37.5; gates[3].y = 75.0
				gates[4].y = 25.0; gates[5].y = 70.0
				gates[6].y = 45.0

func create_gate_visuals():
	for i in range(gates.size()):
		var gate_pos = gates[i]
		var next_pos = gates[(i + 1) % gates.size()]

		var ring_node = MeshInstance3D.new()
		ring_node.name = "Gate_" + str(i)
		var torus = TorusMesh.new()
		torus.inner_radius = gate_size - 0.5
		torus.outer_radius = gate_size
		torus.rings = 24
		torus.ring_segments = 12
		ring_node.mesh = torus

		var mat = StandardMaterial3D.new()
		mat.albedo_color = Color(1.0, 0.8, 0.2, 0.15)
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.emission_enabled = true
		mat.emission = Color(1.0, 0.8, 0.2)
		mat.emission_energy_multiplier = 0.3
		mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		ring_node.material_override = mat

		ring_node.global_position = gate_pos
		# Face toward next gate, then stand the torus upright
		var dir = (next_pos - gate_pos).normalized()
		if dir.length() > 0.01:
			ring_node.look_at(gate_pos + dir, Vector3.UP)
		# TorusMesh lies flat in XZ by default — rotate 90° on local X to stand vertical
		ring_node.rotate_object_local(Vector3.RIGHT, PI / 2.0)

		add_child(ring_node)
		gate_meshes.append(ring_node)

func create_path_ribbon():
	for i in range(gates.size()):
		var from_pos = gates[i]
		var to_pos = gates[(i + 1) % gates.size()]
		var segments = 10
		for s in range(segments):
			var t0 = float(s) / float(segments)
			var t1 = float(s + 1) / float(segments)
			var pos = from_pos.lerp(to_pos, t0)
			var next_pos = from_pos.lerp(to_pos, t1)

			var seg = MeshInstance3D.new()
			var cyl = CylinderMesh.new()
			cyl.top_radius = 0.3
			cyl.bottom_radius = 0.3
			cyl.height = pos.distance_to(next_pos)
			seg.mesh = cyl

			var mat = StandardMaterial3D.new()
			mat.albedo_color = Color(1.0, 0.8, 0.2, 0.12)
			mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			mat.emission_enabled = true
			mat.emission = Color(1.0, 0.7, 0.1)
			mat.emission_energy_multiplier = 0.2
			seg.material_override = mat

			var mid = (pos + next_pos) / 2.0
			seg.global_position = mid
			seg.look_at(next_pos, Vector3.UP)
			seg.rotate_object_local(Vector3.RIGHT, PI / 2.0)
			add_child(seg)

func update_gate_colors(current_gate: int):
	for i in range(gate_meshes.size()):
		var mat = gate_meshes[i].material_override as StandardMaterial3D
		if not mat:
			continue
		if i == current_gate:
			mat.albedo_color = Color(0.2, 1.0, 0.2, 0.6)
			mat.emission = Color(0.2, 1.0, 0.2)
			mat.emission_energy_multiplier = 2.0
		else:
			mat.albedo_color = Color(1.0, 0.8, 0.2, 0.15)
			mat.emission = Color(1.0, 0.8, 0.2)
			mat.emission_energy_multiplier = 0.3

func get_gate_position(index: int) -> Vector3:
	return gates[index % gates.size()]
