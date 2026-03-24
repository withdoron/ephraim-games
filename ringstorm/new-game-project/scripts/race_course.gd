extends Node3D

@export var num_gates: int = 7
@export var course_radius: float = 300.0
@export var gate_size: float = 15.0
@export var total_laps: int = 3

var gates: Array = []  # Array of Vector3 gate positions
var gate_meshes: Array = []  # Visual ring MeshInstance3D nodes

func _ready():
	generate_course()
	create_gate_visuals()
	create_path_ribbon()

func generate_course():
	# Port from browser: cos(a)*R + cos(a*2)*60, sin(a)*R + sin(a*3)*50
	# Browser uses R=1200, baseY=180, yVar=30 as defaults
	# We scale down: R=300 in Godot ≈ 1200 in browser (4x scale factor)
	# Variation scaled proportionally: 60/4=15, 50/4=12.5
	gates.clear()
	for i in range(num_gates):
		var a = float(i) / float(num_gates) * PI * 2.0
		var x = cos(a) * course_radius + cos(a * 2.0) * 15.0
		var y = 20.0 + sin(a * 2.0 + 1.0) * 8.0
		var z = sin(a) * course_radius + sin(a * 3.0) * 12.5
		gates.append(Vector3(x, y, z))

func create_gate_visuals():
	for i in range(gates.size()):
		var gate_pos = gates[i]
		var next_pos = gates[(i + 1) % gates.size()]

		# Create ring using TorusMesh
		var ring_node = MeshInstance3D.new()
		ring_node.name = "Gate_" + str(i)
		var torus = TorusMesh.new()
		torus.inner_radius = gate_size - 0.5
		torus.outer_radius = gate_size
		torus.rings = 24
		torus.ring_segments = 12
		ring_node.mesh = torus

		# Material — dim gold by default
		var mat = StandardMaterial3D.new()
		mat.albedo_color = Color(1.0, 0.8, 0.2, 0.15)
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.emission_enabled = true
		mat.emission = Color(1.0, 0.8, 0.2)
		mat.emission_energy_multiplier = 0.3
		mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		ring_node.material_override = mat

		# Position the ring
		ring_node.global_position = gate_pos

		# Orient the ring to face toward the next gate
		var dir = (next_pos - gate_pos).normalized()
		if dir.length() > 0.01:
			ring_node.look_at(gate_pos + dir, Vector3.UP)

		add_child(ring_node)
		gate_meshes.append(ring_node)

func create_path_ribbon():
	# Draw thin cylinders connecting gates to show the course path
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

			# Position at midpoint, orient along the segment
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
			# Next gate — bright green glow
			mat.albedo_color = Color(0.2, 1.0, 0.2, 0.6)
			mat.emission = Color(0.2, 1.0, 0.2)
			mat.emission_energy_multiplier = 2.0
		else:
			# Other gates — dim gold
			mat.albedo_color = Color(1.0, 0.8, 0.2, 0.15)
			mat.emission = Color(1.0, 0.8, 0.2)
			mat.emission_energy_multiplier = 0.3

func get_gate_position(index: int) -> Vector3:
	return gates[index % gates.size()]
