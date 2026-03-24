extends Node3D
# Main scene — menu → game creation → race management
# Ported from Ringstorm.jsx main useEffect

var player_plane: CharacterBody3D
var player2_plane: CharacterBody3D
var npc_planes: Array = []
var race_mgr: Node
var hud_node: CanvasLayer
var hud2_node: CanvasLayer
var course: Node3D
var menu: CanvasLayer
var weapon_sys: Node3D
var cube_sys: Node3D
var game_nodes: Array = []
var paused: bool = false
var current_course_idx: int = 0
var num_players: int = 1
var split_container: Control = null

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS  # Must process while paused to handle unpause
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

func _on_start_race(np: int, course_idx: int):
	num_players = np
	current_course_idx = course_idx
	menu.hide_menu()
	_create_game(np, course_idx, false)

func _on_start_battle(np: int):
	num_players = np
	menu.hide_menu()
	_create_game(np, 0, true)

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
	player2_plane = null
	race_mgr = null
	hud_node = null
	hud2_node = null
	course = null
	weapon_sys = null
	cube_sys = null
	if split_container and is_instance_valid(split_container):
		split_container.queue_free()
		split_container = null

func _create_game(np: int, course_idx: int, is_battle: bool):
	_create_environment(course_idx)
	_create_course(course_idx)
	_create_weapon_system()
	_create_cube_system(is_battle)
	_create_hud()
	if np == 2:
		_create_hud2()
		_create_split_screen()
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

func _create_hud2():
	hud2_node = CanvasLayer.new()
	hud2_node.name = "HUD2"
	hud2_node.set_script(load("res://scripts/hud.gd"))
	hud2_node.layer = 2
	add_child(hud2_node); game_nodes.append(hud2_node)

func _create_split_screen():
	# Create split screen with two SubViewportContainers
	split_container = Control.new()
	split_container.name = "SplitScreen"
	split_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	var vbox = VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 2)
	split_container.add_child(vbox)

	# Top half — P1
	var vc1 = SubViewportContainer.new()
	vc1.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vc1.stretch = true
	vbox.add_child(vc1)
	var vp1 = SubViewport.new()
	vp1.name = "VP1"
	vp1.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp1.handle_input_locally = false
	vc1.add_child(vp1)

	# Divider
	var div = ColorRect.new()
	div.custom_minimum_size = Vector2(0, 2)
	div.color = Color(0, 0, 0)
	vbox.add_child(div)

	# Bottom half — P2
	var vc2 = SubViewportContainer.new()
	vc2.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vc2.stretch = true
	vbox.add_child(vc2)
	var vp2 = SubViewport.new()
	vp2.name = "VP2"
	vp2.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp2.handle_input_locally = false
	vc2.add_child(vp2)

	add_child(split_container); game_nodes.append(split_container)

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
	# Player 1
	player_plane = _create_player_plane(Settings.racer_data[0])
	player_plane.player_id = 1
	add_child(player_plane); game_nodes.append(player_plane)
	all_racers.append(player_plane)
	race_mgr.register_racer(player_plane)
	# Player 2 (if 2P mode)
	if num_players == 2:
		player2_plane = _create_player_plane(Settings.racer_data[1])
		player2_plane.player_id = 2
		# Disable P2's camera in the main scene — it will be in the viewport
		var p2cam = player2_plane.get_node_or_null("Camera3D")
		if p2cam: p2cam.current = false
		add_child(player2_plane); game_nodes.append(player2_plane)
		all_racers.append(player2_plane)
		race_mgr.register_racer(player2_plane)
	# NPCs
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
	_build_biplane(plane, data["color"], data.get("wing", data["color"].lightened(0.3)))
	var cam = Camera3D.new(); cam.name = "Camera3D"; cam.current = true
	cam.fov = 75.0; cam.far = 2000.0; cam.position = Vector3(0, 3, 8)
	cam.rotation.x = deg_to_rad(-10); plane.add_child(cam)
	var col = CollisionShape3D.new(); var shape = BoxShape3D.new()
	shape.size = Vector3(2.0, 1.0, 3.5); col.shape = shape; plane.add_child(col)
	plane.set_script(load("res://scripts/player_plane.gd"))
	plane.racer_name = data["name"]
	return plane

func _create_npc(data: Dictionary) -> CharacterBody3D:
	var npc = CharacterBody3D.new()
	npc.name = data["name"]
	npc.set_script(load("res://scripts/npc_plane.gd"))
	npc.racer_color = data["color"]
	npc.wing_color = data.get("wing", data["color"].lightened(0.3))
	npc.racer_name = data["name"]
	npc.max_speed = Settings.npc_speed + randf() * 1.0
	# NPC _create_mesh is called in its _ready, so we override it
	return npc

# --- Staggerwing biplane builder ---
func _build_biplane(parent: Node3D, accent: Color, wing_color: Color):
	var accent_dark = accent.darkened(0.3)
	# Materials
	var body_mat = StandardMaterial3D.new()
	body_mat.albedo_color = accent; body_mat.metallic = 0.3; body_mat.roughness = 0.6
	var dark_mat = StandardMaterial3D.new()
	dark_mat.albedo_color = accent_dark; dark_mat.metallic = 0.3; dark_mat.roughness = 0.6
	var wing_mat = StandardMaterial3D.new()
	wing_mat.albedo_color = wing_color; wing_mat.metallic = 0.1; wing_mat.roughness = 0.8
	var strut_mat = StandardMaterial3D.new()
	strut_mat.albedo_color = Color(0.25, 0.25, 0.25); strut_mat.metallic = 0.2
	var prop_mat = StandardMaterial3D.new()
	prop_mat.albedo_color = Color(0.3, 0.2, 0.1); prop_mat.roughness = 1.0

	# a. Fuselage — cylinder along Z axis
	var fuse = MeshInstance3D.new(); fuse.name = "Fuselage"
	var fcyl = CylinderMesh.new(); fcyl.top_radius = 0.35; fcyl.bottom_radius = 0.35; fcyl.height = 3.5
	fuse.mesh = fcyl; fuse.material_override = body_mat
	fuse.rotation.x = deg_to_rad(90)  # Lay along Z
	parent.add_child(fuse)

	# Tail taper
	var ttaper = MeshInstance3D.new(); ttaper.name = "TailTaper"
	var tcyl = CylinderMesh.new(); tcyl.top_radius = 0.35; tcyl.bottom_radius = 0.18; tcyl.height = 1.0
	ttaper.mesh = tcyl; ttaper.material_override = body_mat
	ttaper.rotation.x = deg_to_rad(90); ttaper.position = Vector3(0, 0, 1.2)
	parent.add_child(ttaper)

	# b. Engine cowl
	var cowl = MeshInstance3D.new(); cowl.name = "Cowl"
	var ccyl = CylinderMesh.new(); ccyl.top_radius = 0.45; ccyl.bottom_radius = 0.45; ccyl.height = 0.6
	cowl.mesh = ccyl; cowl.material_override = dark_mat
	cowl.rotation.x = deg_to_rad(90); cowl.position = Vector3(0, 0, -1.5)
	parent.add_child(cowl)

	# Spinner
	var spin = MeshInstance3D.new(); spin.name = "Spinner"
	var ssph = SphereMesh.new(); ssph.radius = 0.15; ssph.height = 0.3
	spin.mesh = ssph
	var spin_mat = StandardMaterial3D.new()
	spin_mat.albedo_color = Color(0.7, 0.7, 0.75); spin_mat.metallic = 0.6
	spin.material_override = spin_mat; spin.position = Vector3(0, 0, -1.85)
	parent.add_child(spin)

	# c. Propeller
	var prop = MeshInstance3D.new(); prop.name = "Propeller"
	var pbox = BoxMesh.new(); pbox.size = Vector3(2.0, 0.08, 0.15)
	prop.mesh = pbox; prop.material_override = prop_mat
	prop.position = Vector3(0, 0, -1.9)
	parent.add_child(prop)

	# d. Lower wing (slightly behind center — staggerwing)
	var lwing = MeshInstance3D.new(); lwing.name = "LowerWing"
	var lwbox = BoxMesh.new(); lwbox.size = Vector3(7.0, 0.08, 1.2)
	lwing.mesh = lwbox; lwing.material_override = wing_mat
	lwing.position = Vector3(0, -0.2, 0.3)
	parent.add_child(lwing)

	# e. Upper wing (slightly forward — the stagger)
	var uwing = MeshInstance3D.new(); uwing.name = "UpperWing"
	var uwbox = BoxMesh.new(); uwbox.size = Vector3(6.5, 0.08, 1.1)
	uwing.mesh = uwbox; uwing.material_override = wing_mat
	uwing.position = Vector3(0, 0.8, -0.2)
	parent.add_child(uwing)

	# f. Wing struts — 4 thin cylinders
	for sx in [-1.2, -2.8, 1.2, 2.8]:
		var strut = MeshInstance3D.new(); strut.name = "Strut"
		var scyl = CylinderMesh.new(); scyl.top_radius = 0.04; scyl.bottom_radius = 0.04; scyl.height = 1.1
		strut.mesh = scyl; strut.material_override = strut_mat
		strut.position = Vector3(sx, 0.3, 0.05)
		parent.add_child(strut)

	# g. Horizontal stabilizer
	var hstab = MeshInstance3D.new(); hstab.name = "HStab"
	var hbox = BoxMesh.new(); hbox.size = Vector3(2.5, 0.06, 0.7)
	hstab.mesh = hbox; hstab.material_override = wing_mat
	hstab.position = Vector3(0, 0.1, 1.6)
	parent.add_child(hstab)

	# Vertical stabilizer (rudder)
	var vstab = MeshInstance3D.new(); vstab.name = "VStab"
	var vbox = BoxMesh.new(); vbox.size = Vector3(0.06, 0.8, 0.6)
	vstab.mesh = vbox; vstab.material_override = body_mat
	vstab.position = Vector3(0, 0.5, 1.6)
	parent.add_child(vstab)

	# h. Landing gear
	for side in [-1, 1]:
		var gear = MeshInstance3D.new(); gear.name = "Gear"
		var gcyl = CylinderMesh.new(); gcyl.top_radius = 0.04; gcyl.bottom_radius = 0.04; gcyl.height = 0.6
		gear.mesh = gcyl; gear.material_override = strut_mat
		gear.position = Vector3(side * 0.8, -0.5, -0.3)
		gear.rotation.x = deg_to_rad(15)
		parent.add_child(gear)
		var wheel = MeshInstance3D.new(); wheel.name = "Wheel"
		var wsph = SphereMesh.new(); wsph.radius = 0.12; wsph.height = 0.24
		wheel.mesh = wsph; wheel.material_override = strut_mat
		wheel.position = Vector3(side * 0.8, -0.8, -0.25)
		parent.add_child(wheel)

	# i. Cockpit canopy
	var canopy = MeshInstance3D.new(); canopy.name = "Cockpit"
	var cbox = BoxMesh.new(); cbox.size = Vector3(0.5, 0.3, 0.6)
	canopy.mesh = cbox
	var canopy_mat = StandardMaterial3D.new()
	canopy_mat.albedo_color = Color(0.5, 0.7, 1.0, 0.4)
	canopy_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	canopy_mat.metallic = 0.5; canopy_mat.roughness = 0.3
	canopy.material_override = canopy_mat
	canopy.position = Vector3(0, 0.35, -0.3)
	parent.add_child(canopy)

	# j. Boost fire — hidden cone behind fuselage, shown during boost
	var fire = MeshInstance3D.new(); fire.name = "BoostFire"
	var fcone = CylinderMesh.new(); fcone.top_radius = 0.0; fcone.bottom_radius = 0.5; fcone.height = 3.0
	fire.mesh = fcone
	var fmat = StandardMaterial3D.new()
	fmat.albedo_color = Color(1.0, 0.5, 0.0, 0.8)
	fmat.emission_enabled = true; fmat.emission = Color(1.0, 0.3, 0.0)
	fmat.emission_energy_multiplier = 3.0
	fmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	fire.material_override = fmat
	fire.rotation.x = deg_to_rad(90); fire.position = Vector3(0, 0, 2.5)
	fire.visible = false
	parent.add_child(fire)

func _setup_race(is_battle: bool):
	if not course or course.gates.size() < 2:
		return
	var all: Array = [player_plane]
	if player2_plane:
		all.append(player2_plane)
	all.append_array(npc_planes)
	var gate0 = course.gates[0]
	var last_gate = course.gates[course.gates.size() - 1]
	var race_dir = (gate0 - last_gate).normalized()
	var lateral = race_dir.cross(Vector3.UP).normalized()
	# Staggered grid: racers start behind gate 0 facing toward it
	for i in range(all.size()):
		var r = all[i]
		var row_i = int(i / 2)
		var col_off = ((i % 2) - 0.5) * 10.0  # -5 or +5
		var back_off = 40.0 + row_i * 12.0
		r.global_position = gate0 - race_dir * back_off + lateral * col_off + Vector3.UP * 2.0
		var look_tgt = gate0 + Vector3.UP * 2.0
		if r.global_position.distance_to(look_tgt) > 1.0:
			r.look_at(look_tgt, Vector3.UP)
	player_plane.race_course = course
	player_plane.race_manager = race_mgr
	player_plane.hud = hud_node
	player_plane.weapon_system = weapon_sys
	if player2_plane:
		player2_plane.race_course = course
		player2_plane.race_manager = race_mgr
		player2_plane.hud = hud2_node
		player2_plane.weapon_system = weapon_sys
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
	if not racer.is_npc:
		# Determine which player's HUD to update
		var hud_target = hud_node
		if racer == player2_plane and hud2_node:
			hud_target = hud2_node
		hud_target.show_player_finished(position)
		var pos_names = ["", "1ST PLACE!", "2ND PLACE!", "3RD PLACE!", "4TH PLACE!", "5TH PLACE!"]
		var pos_text = pos_names[position] if position < pos_names.size() else str(position) + "TH PLACE!"
		hud_target.show_announcement(pos_text, Color(0.98, 0.75, 0.14) if position == 1 else Color(0.75, 0.75, 0.8))
		if position == 1:
			AudioManager.play("victory")
		else:
			AudioManager.play("lap_complete")

func _on_all_finished(finish_order: Array):
	AudioManager.stop_engine()
	await get_tree().create_timer(2.0).timeout
	menu.show_results(finish_order)
