extends Node3D

func _ready():
	# Create the environment
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

	# Directional light (sun)
	var sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation = Vector3(deg_to_rad(-45), deg_to_rad(30), 0)
	sun.light_color = Color(1.0, 0.95, 0.85)
	sun.light_energy = 1.2
	sun.shadow_enabled = true
	add_child(sun)

	# Ground plane — flat green terrain
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

	# Player plane
	var plane = _create_player_plane()
	plane.position = Vector3(0, 20, 0)
	add_child(plane)

func _create_player_plane() -> CharacterBody3D:
	var plane = CharacterBody3D.new()
	plane.name = "PlayerPlane"

	# Fuselage
	var body = MeshInstance3D.new()
	body.name = "MeshInstance3D"
	var box = BoxMesh.new()
	box.size = Vector3(1.5, 0.4, 3.0)
	body.mesh = box
	var body_mat = StandardMaterial3D.new()
	body_mat.albedo_color = Color(0.2, 0.5, 1.0)  # Blue like P1
	body_mat.metallic = 0.3
	body.material_override = body_mat
	plane.add_child(body)

	# Main wings
	var wings = MeshInstance3D.new()
	wings.name = "Wings"
	var wing_mesh = BoxMesh.new()
	wing_mesh.size = Vector3(6.0, 0.1, 1.5)
	wings.mesh = wing_mesh
	var wing_mat = StandardMaterial3D.new()
	wing_mat.albedo_color = Color(0.9, 0.9, 0.95)
	wing_mat.metallic = 0.2
	wings.material_override = wing_mat
	wings.position = Vector3(0, 0, 0.3)
	plane.add_child(wings)

	# Tail wing
	var tail = MeshInstance3D.new()
	tail.name = "Tail"
	var tail_mesh = BoxMesh.new()
	tail_mesh.size = Vector3(2.0, 0.08, 0.8)
	tail.mesh = tail_mesh
	tail.material_override = wing_mat
	tail.position = Vector3(0, 0.3, 1.3)
	plane.add_child(tail)

	# Vertical stabilizer
	var vstab = MeshInstance3D.new()
	vstab.name = "VStab"
	var vstab_mesh = BoxMesh.new()
	vstab_mesh.size = Vector3(0.08, 0.8, 0.6)
	vstab.mesh = vstab_mesh
	vstab.material_override = body_mat
	vstab.position = Vector3(0, 0.5, 1.2)
	plane.add_child(vstab)

	# Chase camera
	var cam = Camera3D.new()
	cam.name = "Camera3D"
	cam.current = true
	cam.position = Vector3(0, 3, 8)
	cam.rotation.x = deg_to_rad(-10)
	plane.add_child(cam)

	# Collision shape
	var col = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(1.5, 0.5, 3.0)
	col.shape = shape
	plane.add_child(col)

	# Attach the player flight script
	var script = load("res://scripts/player_plane.gd")
	plane.set_script(script)

	return plane
