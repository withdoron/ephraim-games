extends Node3D
# Main scene — menu → game creation → race management
# Ported from Ringstorm.jsx main useEffect

var player_plane: CharacterBody3D
var npc_planes: Array = []
var race_mgr: Node
var hud_node: CanvasLayer
var course: Node3D
var menu: CanvasLayer
var weapon_sys: Node3D
var cube_sys: Node3D
var game_nodes: Array = []
var paused: bool = false
var current_course_idx: int = 0

func _ready():
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_MAXIMIZED)
	menu = CanvasLayer.new()
	menu.name = "Menu"
	menu.set_script(load("res://scripts/menu_ui.gd"))
	add_child(menu)
	menu.start_race.connect(_on_start_race)
	menu.start_battle.connect(_on_start_battle)
	menu.resume_game.connect(_on_resume)
	menu.restart_game.connect(_on_restart)
	menu.quit_to_menu.connect(_on_quit_to_menu)

func _on_start_race(num_players: int, course_idx: int):
	current_course_idx = course_idx
	menu.hide_menu()
	_create_game(num_players, course_idx, false)

func _on_start_battle(num_players: int):
	menu.hide_menu()
	_create_game(num_players, 0, true)

func _on_resume():
	paused = false
	get_tree().paused = false
	menu.hide_menu()

func _on_restart():
	_cleanup_game()
	paused = false
	get_tree().paused = false
	menu.hide_menu()
	_create_game(1, current_course_idx, false)

func _on_quit_to_menu():
	_cleanup_game()
	paused = false
	get_tree().paused = false
	menu.show_menu()

func _cleanup_game():
	for node in game_nodes:
		if is_instance_valid(node):
			node.queue_free()
	game_nodes.clear()
	npc_planes.clear()
	player_plane = null
	race_mgr = null
	hud_node = null
	course = null
	weapon_sys = null
	cube_sys = null

func _create_game(num_players: int, course_idx: int, is_battle: bool):
	_create_environment(course_idx)
	_create_course(course_idx)
	_create_weapon_system()
	_create_cube_system(is_battle)
	_create_hud()
	_create_race_manager(is_battle)
	_create_racers(is_battle)
	call_deferred("_setup_race", is_battle)
	AudioManager.start_engine()

func _create_environment(course_idx: int):
	var env = WorldEnvironment.new()
	env.name = "Env"
	var environment = Environment.new()
	environment.background_mode = Environment.BG_SKY
	var sky = Sky.new()
	var sky_mat = ProceduralSkyMaterial.new()

	# Course-specific sky — ported from Ringstorm.jsx sky gradient
	match course_idx:
		6:  # Deep Space
			sky_mat.sky_top_color = Color(0.0, 0.0, 0.02)
			sky_mat.sky_horizon_color = Color(0.04, 0.02, 0.08)
			sky_mat.ground_bottom_color = Color(0.0, 0.0, 0.02)
			sky_mat.ground_horizon_color = Color(0.04, 0.02, 0.08)
		4:  # Volcano
			sky_mat.sky_top_color = Color(0.08, 0.04, 0.02)
			sky_mat.sky_horizon_color = Color(0.3, 0.15, 0.05)
			sky_mat.ground_bottom_color = Color(0.1, 0.08, 0.05)
			sky_mat.ground_horizon_color = Color(0.25, 0.12, 0.05)
		3:  # Ocean
			sky_mat.sky_top_color = Color(0.05, 0.1, 0.25)
			sky_mat.sky_horizon_color = Color(0.2, 0.4, 0.65)
			sky_mat.ground_bottom_color = Color(0.05, 0.15, 0.3)
			sky_mat.ground_horizon_color = Color(0.15, 0.35, 0.55)
		_:
			sky_mat.sky_top_color = Color(0.05, 0.1, 0.2)
			sky_mat.sky_horizon_color = Color(0.3, 0.5, 0.7)
			sky_mat.ground_bottom_color = Color(0.1, 0.15, 0.1)
			sky_mat.ground_horizon_color = Color(0.3, 0.4, 0.3)

	sky.sky_material = sky_mat
	environment.sky = sky
	environment.ambient_light_color = Color(0.4, 0.45, 0.5)
	environment.ambient_light_energy = 0.5
	env.environment = environment
	add_child(env); game_nodes.append(env)

	var sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation = Vector3(deg_to_rad(-45), deg_to_rad(30), 0)
	sun.light_color = Color(1.0, 0.95, 0.85)
	sun.light_energy = 1.2
	sun.shadow_enabled = true
	add_child(sun); game_nodes.append(sun)

	# Ground — course-specific color, skip for Deep Space
	if course_idx != 6:
		var ground = MeshInstance3D.new()
		ground.name = "Ground"
		var gmesh = PlaneMesh.new()
		gmesh.size = Vector2(2000, 2000)
		ground.mesh = gmesh
		var gmat = StandardMaterial3D.new()
		match course_idx:
			0: gmat.albedo_color = Color(0.55, 0.35, 0.18)  # Canyon brown
			1: gmat.albedo_color = Color(0.2, 0.45, 0.15)   # Islands green
			2: gmat.albedo_color = Color(0.35, 0.38, 0.35)   # Mountain grey
			3: gmat.albedo_color = Color(0.05, 0.15, 0.3)    # Ocean dark blue
			4: gmat.albedo_color = Color(0.15, 0.12, 0.1)    # Volcano dark
			5: gmat.albedo_color = Color(0.7, 0.78, 0.85)    # Ice light blue
			_: gmat.albedo_color = Color(0.2, 0.4, 0.15)
		ground.material_override = gmat
		ground.position.y = -20
		add_child(ground); game_nodes.append(ground)

	# Course-specific terrain objects
	_add_course_terrain(course_idx)

func _add_course_terrain(_course_idx: int):
	# Terrain simplified to just colored ground for now
	# TODO: add course-specific obstacles (canyon walls, islands, etc.) once core racing is solid
	pass

func _create_course(course_idx: int):
	course = Node3D.new()
	course.name = "RaceCourse"
	course.set_script(load("res://scripts/race_course.gd"))
	course.course_index = course_idx
	add_child(course); game_nodes.append(course)

func _create_weapon_system():
	weapon_sys = Node3D.new()
	weapon_sys.name = "WeaponSystem"
	weapon_sys.set_script(load("res://scripts/weapon_system.gd"))
	add_child(weapon_sys); game_nodes.append(weapon_sys)

func _create_cube_system(is_battle: bool):
	cube_sys = Node3D.new()
	cube_sys.name = "MysteryChubes"
	cube_sys.set_script(load("res://scripts/mystery_cube.gd"))
	cube_sys.is_battle = is_battle
	add_child(cube_sys); game_nodes.append(cube_sys)

func _create_hud():
	hud_node = CanvasLayer.new()
	hud_node.name = "HUD"
	hud_node.set_script(load("res://scripts/hud.gd"))
	add_child(hud_node); game_nodes.append(hud_node)

func _create_race_manager(is_battle: bool):
	race_mgr = Node.new()
	race_mgr.name = "RaceManager"
	race_mgr.set_script(load("res://scripts/race_manager.gd"))
	race_mgr.is_battle = is_battle
	race_mgr.course = course
	add_child(race_mgr); game_nodes.append(race_mgr)
	race_mgr.countdown_tick.connect(_on_countdown_tick)
	race_mgr.race_started.connect(_on_race_started)
	race_mgr.gate_passed.connect(_on_gate_passed)
	race_mgr.lap_completed.connect(_on_lap_completed)
	race_mgr.race_finished.connect(_on_race_finished)
	race_mgr.all_finished.connect(_on_all_finished)

func _create_racers(is_battle: bool):
	var all_racers: Array = []
	player_plane = _create_player_plane(Settings.racer_data[0])
	add_child(player_plane); game_nodes.append(player_plane)
	all_racers.append(player_plane)
	race_mgr.register_racer(player_plane)
	for i in range(2, 5):
		var data = Settings.racer_data[i]
		var npc = _create_npc(data)
		add_child(npc); game_nodes.append(npc)
		npc_planes.append(npc)
		all_racers.append(npc)
		race_mgr.register_racer(npc)
	for r in all_racers:
		r.all_racers = all_racers
	weapon_sys.all_racers = all_racers
	cube_sys.all_racers = all_racers
	cube_sys.race_manager = race_mgr
	cube_sys.weapon_system = weapon_sys

func _create_player_plane(data: Dictionary) -> CharacterBody3D:
	var plane = CharacterBody3D.new()
	plane.name = data["name"]
	var body = MeshInstance3D.new(); body.name = "MeshInstance3D"
	var box = BoxMesh.new(); box.size = Vector3(1.5, 0.4, 3.0); body.mesh = box
	var bmat = StandardMaterial3D.new(); bmat.albedo_color = data["color"]; bmat.metallic = 0.3
	body.material_override = bmat; plane.add_child(body)
	var wings = MeshInstance3D.new(); wings.name = "Wings"
	var wmesh = BoxMesh.new(); wmesh.size = Vector3(6.0, 0.1, 1.5); wings.mesh = wmesh
	var wmat = StandardMaterial3D.new(); wmat.albedo_color = data["color"].lightened(0.3); wmat.metallic = 0.2
	wings.material_override = wmat; wings.position = Vector3(0, 0, 0.3); plane.add_child(wings)
	var tail = MeshInstance3D.new(); tail.name = "Tail"
	var tmesh = BoxMesh.new(); tmesh.size = Vector3(2.0, 0.08, 0.8); tail.mesh = tmesh
	tail.material_override = wmat; tail.position = Vector3(0, 0.3, 1.3); plane.add_child(tail)
	var vstab = MeshInstance3D.new(); vstab.name = "VStab"
	var vmesh = BoxMesh.new(); vmesh.size = Vector3(0.08, 0.8, 0.6); vstab.mesh = vmesh
	vstab.material_override = bmat; vstab.position = Vector3(0, 0.5, 1.2); plane.add_child(vstab)
	var cam = Camera3D.new(); cam.name = "Camera3D"; cam.current = true
	cam.fov = 75.0; cam.far = 2000.0; cam.position = Vector3(0, 3, 8)
	cam.rotation.x = deg_to_rad(-10); plane.add_child(cam)
	var col = CollisionShape3D.new(); var shape = BoxShape3D.new()
	shape.size = Vector3(1.5, 0.5, 3.0); col.shape = shape; plane.add_child(col)
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

func _setup_race(is_battle: bool):
	if not course or course.gates.size() < 2:
		return
	var all = [player_plane] + npc_planes
	var start = course.gates[0]
	var next_gate = course.gates[1]
	var dir = (next_gate - start).normalized()
	var perp = dir.cross(Vector3.UP).normalized()
	for i in range(all.size()):
		var r = all[i]
		var row_i = int(i / 2); var col = i % 2
		var ox = -5.0 if col == 0 else 5.0
		var oz = -row_i * 12.0 - 20.0
		r.global_position = start + perp * ox + dir * oz + Vector3.UP * 3.0
		# Face toward first gate using look_at
		var look_target = start + Vector3.UP * 3.0
		if r.global_position.distance_to(look_target) > 1.0:
			r.look_at(look_target, Vector3.UP)
	player_plane.race_course = course
	player_plane.race_manager = race_mgr
	player_plane.hud = hud_node
	player_plane.weapon_system = weapon_sys
	for npc in npc_planes:
		npc.race_course = course
		npc.race_manager = race_mgr
	course.update_gate_colors(0)
	hud_node.update_hud(0, Settings.total_laps, 0, Settings.num_gates)
	hud_node.update_position(all.size())
	# Generate cubes after course is ready
	cube_sys.generate_cubes(course)
	race_mgr.start_countdown()

# --- Pause ---
func _unhandled_input(event):
	if not race_mgr or not race_mgr.started:
		return
	var is_pause = false
	if event is InputEventKey and event.keycode == KEY_P and event.pressed:
		is_pause = true
	elif event is InputEventJoypadButton and event.button_index == JOY_BUTTON_START and event.pressed:
		is_pause = true
	if is_pause:
		paused = not paused
		get_tree().paused = paused
		if paused:
			menu.show_pause_menu()
		else:
			menu.hide_menu()

# --- Signal handlers ---
func _on_countdown_tick(seconds: int):
	hud_node.show_countdown(seconds)
	AudioManager.play("countdown_beep")

func _on_race_started():
	hud_node.show_countdown(0)
	hud_node.show_announcement("GO GO GO!", Color(0.13, 0.77, 0.37))
	AudioManager.play("countdown_go")

func _on_gate_passed(racer: Node, gate_idx: int, lap: int):
	hud_node.show_announcement("GATE " + str(gate_idx) + "!", Color(0.98, 0.75, 0.14))
	hud_node.update_hud(racer.current_lap, Settings.total_laps, racer.current_gate, Settings.num_gates)
	hud_node.update_position(race_mgr.get_race_position(racer))
	AudioManager.play("gate_pass")

func _on_lap_completed(racer: Node, lap: int):
	if not racer.is_npc:
		if lap == 1:
			hud_node.show_announcement("LAP 2!", Color(0.92, 0.7, 0.1))
		elif lap == Settings.total_laps - 1:
			hud_node.show_announcement("FINAL LAP!", Color(0.94, 0.27, 0.27))
		AudioManager.play("lap_complete")

func _on_race_finished(racer: Node, position: int):
	if not racer.is_npc and position == 1:
		hud_node.show_announcement("1ST PLACE!", Color(0.98, 0.75, 0.14))
		AudioManager.play("victory")
	hud_node.update_hud(racer.current_lap, Settings.total_laps, racer.current_gate, Settings.num_gates, racer.race_finished)

func _on_all_finished(finish_order: Array):
	AudioManager.stop_engine()
	await get_tree().create_timer(2.0).timeout
	menu.show_results(finish_order)
