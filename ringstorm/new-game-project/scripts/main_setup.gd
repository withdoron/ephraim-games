extends Node3D
# Main scene builder — creates environment, course, racers, HUD, race manager
# Ported from Ringstorm.jsx main useEffect

var player_plane: CharacterBody3D
var npc_planes: Array = []
var race_mgr: Node
var hud_node: CanvasLayer
var course: Node3D

func _ready():
	_create_environment()
	_create_course()
	_create_hud()
	_create_race_manager()
	_create_racers()
	call_deferred("_setup_race")

func _create_environment():
	var env = WorldEnvironment.new()
	var environment = Environment.new()
	environment.background_mode = Environment.BG_SKY
	var sky = Sky.new()
	var sky_material = ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.05, 0.1, 0.2)
	sky_material.sky_horizon_color = Color(0.3, 0.5, 0.7)
	sky_material.ground_bottom_color = Color(0.1, 0.15, 0.1)
	sky_material.ground_horizon_color = Color(0.3, 0.4, 0.3)
	sky.sky_material = sky_material
	environment.sky = sky
	environment.ambient_light_color = Color(0.4, 0.45, 0.5)
	environment.ambient_light_energy = 0.5
	env.environment = environment
	add_child(env)

	var sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation = Vector3(deg_to_rad(-45), deg_to_rad(30), 0)
	sun.light_color = Color(1.0, 0.95, 0.85)
	sun.light_energy = 1.2
	sun.shadow_enabled = true
	add_child(sun)

	var ground = MeshInstance3D.new()
	ground.name = "Ground"
	var ground_mesh = PlaneMesh.new()
	ground_mesh.size = Vector2(2000, 2000)
	ground.mesh = ground_mesh
	var ground_mat = StandardMaterial3D.new()
	ground_mat.albedo_color = Color(0.2, 0.4, 0.15)
	ground.material_override = ground_mat
	ground.position.y = -20
	add_child(ground)

func _create_course():
	course = Node3D.new()
	course.name = "RaceCourse"
	course.set_script(load("res://scripts/race_course.gd"))
	course.course_index = 0  # TODO: course selection
	add_child(course)

func _create_hud():
	hud_node = CanvasLayer.new()
	hud_node.name = "HUD"
	hud_node.set_script(load("res://scripts/hud.gd"))
	add_child(hud_node)

func _create_race_manager():
	race_mgr = Node.new()
	race_mgr.name = "RaceManager"
	race_mgr.set_script(load("res://scripts/race_manager.gd"))
	add_child(race_mgr)
	race_mgr.course = course
	# Connect signals
	race_mgr.countdown_tick.connect(_on_countdown_tick)
	race_mgr.race_started.connect(_on_race_started)
	race_mgr.gate_passed.connect(_on_gate_passed)
	race_mgr.lap_completed.connect(_on_lap_completed)
	race_mgr.race_finished.connect(_on_race_finished)

func _create_racers():
	# Ported from Ringstorm.jsx lines 597-633: 5 racers
	var all_racers: Array = []

	# Player 1
	player_plane = _create_player_plane(Settings.racer_data[0])
	add_child(player_plane)
	all_racers.append(player_plane)
	race_mgr.register_racer(player_plane)

	# NPCs: VIPER, BLAZE, STORM
	for i in range(2, 5):  # indices 2, 3, 4 in racer_data
		var data = Settings.racer_data[i]
		var npc = _create_npc(data)
		add_child(npc)
		npc_planes.append(npc)
		all_racers.append(npc)
		race_mgr.register_racer(npc)

	# Give all racers access to each other
	for r in all_racers:
		r.all_racers = all_racers

func _create_player_plane(data: Dictionary) -> CharacterBody3D:
	var plane = CharacterBody3D.new()
	plane.name = data["name"]

	# Fuselage
	var body = MeshInstance3D.new()
	body.name = "MeshInstance3D"
	var box = BoxMesh.new()
	box.size = Vector3(1.5, 0.4, 3.0)
	body.mesh = box
	var body_mat = StandardMaterial3D.new()
	body_mat.albedo_color = data["color"]
	body_mat.metallic = 0.3
	body.material_override = body_mat
	plane.add_child(body)

	var wings = MeshInstance3D.new()
	wings.name = "Wings"
	var wmesh = BoxMesh.new()
	wmesh.size = Vector3(6.0, 0.1, 1.5)
	wings.mesh = wmesh
	var wmat = StandardMaterial3D.new()
	wmat.albedo_color = data["color"].lightened(0.3)
	wmat.metallic = 0.2
	wings.material_override = wmat
	wings.position = Vector3(0, 0, 0.3)
	plane.add_child(wings)

	var tail = MeshInstance3D.new()
	tail.name = "Tail"
	var tmesh = BoxMesh.new()
	tmesh.size = Vector3(2.0, 0.08, 0.8)
	tail.mesh = tmesh
	tail.material_override = wmat
	tail.position = Vector3(0, 0.3, 1.3)
	plane.add_child(tail)

	var vstab = MeshInstance3D.new()
	vstab.name = "VStab"
	var vmesh = BoxMesh.new()
	vmesh.size = Vector3(0.08, 0.8, 0.6)
	vstab.mesh = vmesh
	vstab.material_override = body_mat
	vstab.position = Vector3(0, 0.5, 1.2)
	plane.add_child(vstab)

	var cam = Camera3D.new()
	cam.name = "Camera3D"
	cam.current = true
	cam.fov = 75.0
	cam.far = 2000.0
	cam.position = Vector3(0, 3, 8)
	cam.rotation.x = deg_to_rad(-10)
	plane.add_child(cam)

	var col = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(1.5, 0.5, 3.0)
	col.shape = shape
	plane.add_child(col)

	plane.set_script(load("res://scripts/player_plane.gd"))
	return plane

func _create_npc(data: Dictionary) -> CharacterBody3D:
	var npc = CharacterBody3D.new()
	npc.name = data["name"]
	npc.set_script(load("res://scripts/npc_plane.gd"))
	npc.racer_color = data["color"]
	npc.racer_name = data["name"]
	npc.max_speed = Settings.npc_speed + randf() * 1.0
	return npc

func _setup_race():
	if not course or course.gates.size() < 2:
		return

	var all_racers: Array = [player_plane] + npc_planes

	# Position racers in a grid behind gate 0 — ported from lines 608-621
	var start = course.gates[0]
	var next_gate = course.gates[1]
	var dir = (next_gate - start).normalized()
	var perp = dir.cross(Vector3.UP).normalized()

	for i in range(all_racers.size()):
		var r = all_racers[i]
		var row = int(i / 2)
		var col = i % 2
		var ox = -5.0 if col == 0 else 5.0
		var oz = -row * 12.0 - 20.0
		var pos = start + perp * ox + dir * oz + Vector3.UP * 3.0
		r.global_position = pos
		# Face toward first gate
		var face_yaw = atan2(dir.x, dir.z)
		if r is CharacterBody3D:
			if r.has_method("on_race_start"):
				r.yaw_angle = face_yaw
			r.rotation.y = face_yaw

	# Wire references
	player_plane.race_course = course
	player_plane.race_manager = race_mgr
	player_plane.hud = hud_node
	for npc in npc_planes:
		npc.race_course = course
		npc.race_manager = race_mgr

	# Highlight first gate
	course.update_gate_colors(0)
	hud_node.update_hud(0, Settings.total_laps, 0, Settings.num_gates)
	hud_node.update_position(all_racers.size())

	# Start countdown
	race_mgr.start_countdown()

# Signal handlers
func _on_countdown_tick(seconds: int):
	hud_node.show_countdown(seconds)

func _on_race_started():
	hud_node.show_countdown(0)  # Shows "GO!"
	hud_node.show_announcement("GO GO GO!", Color(0.13, 0.77, 0.37))

func _on_gate_passed(racer: Node, gate_idx: int, lap: int):
	hud_node.show_announcement("GATE " + str(gate_idx) + "!", Color(0.98, 0.75, 0.14))
	hud_node.update_hud(racer.current_lap, Settings.total_laps, racer.current_gate, Settings.num_gates)
	# Update position
	var pos = race_mgr.get_race_position(racer)
	hud_node.update_position(pos)

func _on_lap_completed(racer: Node, lap: int):
	if not racer.is_npc:
		if lap == 1:
			hud_node.show_announcement("LAP 2!", Color(0.92, 0.7, 0.1))
		elif lap == Settings.total_laps - 1:
			hud_node.show_announcement("FINAL LAP!", Color(0.94, 0.27, 0.27))

func _on_race_finished(racer: Node, position: int):
	if not racer.is_npc and position == 1:
		hud_node.show_announcement("1ST PLACE!", Color(0.98, 0.75, 0.14))
	hud_node.update_hud(racer.current_lap, Settings.total_laps, racer.current_gate, Settings.num_gates, racer.race_finished)
