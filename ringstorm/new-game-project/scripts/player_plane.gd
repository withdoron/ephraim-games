extends CharacterBody3D

# Settings (match browser version defaults)
@export var max_speed: float = 30.0
@export var turn_speed: float = 2.5
@export var pitch_speed: float = 1.5
@export var roll_visual_speed: float = 3.0
@export var brake_strength: float = 0.5
@export var min_brake_speed: float = 5.0
@export var deadzone: float = 0.3

# State
var current_speed: float = 0.0
var target_roll: float = 0.0
var current_roll: float = 0.0
var current_pitch: float = 0.0

# Nodes
@onready var mesh: MeshInstance3D = $MeshInstance3D
@onready var camera: Camera3D = $Camera3D

func _ready():
	current_speed = max_speed

func _physics_process(delta):
	# Get input (keyboard + gamepad)
	var turn_input = 0.0
	var pitch_input = 0.0
	var fire = false
	var brake = false

	# Keyboard
	if Input.is_key_pressed(KEY_A):
		turn_input += 1.0
	if Input.is_key_pressed(KEY_D):
		turn_input -= 1.0
	if Input.is_key_pressed(KEY_W):
		pitch_input += 1.0
	if Input.is_key_pressed(KEY_S):
		pitch_input -= 1.0
	if Input.is_key_pressed(KEY_SPACE):
		fire = true
	if Input.is_key_pressed(KEY_SHIFT):
		brake = true

	# Gamepad (player 1 = device 0)
	var gp_x = Input.get_joy_axis(0, JOY_AXIS_LEFT_X)
	var gp_y = Input.get_joy_axis(0, JOY_AXIS_LEFT_Y)

	# Apply deadzone — gamepad overrides keyboard when active
	if abs(gp_x) > deadzone:
		turn_input = -gp_x
	if abs(gp_y) > deadzone:
		pitch_input = -gp_y

	# Gamepad buttons
	if Input.is_joy_button_pressed(0, JOY_BUTTON_A):
		fire = true
	if Input.is_joy_button_pressed(0, JOY_BUTTON_LEFT_SHOULDER):
		brake = true
	var gp_lt = Input.get_joy_axis(0, JOY_AXIS_TRIGGER_LEFT)
	if gp_lt > 0.3:
		brake = true

	# Apply turn (yaw)
	rotation.y += turn_input * turn_speed * delta

	# Apply pitch
	current_pitch = lerp(current_pitch, pitch_input * pitch_speed, delta * 3.0)
	rotation.x = clamp(rotation.x + current_pitch * delta, deg_to_rad(-45), deg_to_rad(45))

	# Visual roll (banking into turns)
	target_roll = turn_input * deg_to_rad(35)
	current_roll = lerp(current_roll, target_roll, delta * roll_visual_speed)
	rotation.z = current_roll

	# Speed
	if brake:
		current_speed = lerp(current_speed, min_brake_speed, brake_strength * delta * 4.0)
	else:
		current_speed = lerp(current_speed, max_speed, delta * 2.0)

	# Move forward along the plane's facing direction
	var forward = -transform.basis.z
	velocity = forward * current_speed
	move_and_slide()

	# Update chase camera
	_update_camera(delta)

func _update_camera(delta):
	if not camera:
		return
	# Camera follows behind and slightly above the plane
	var cam_offset = transform.basis.z * 8.0 + Vector3.UP * 3.0
	var target_pos = global_position + cam_offset
	camera.global_position = camera.global_position.lerp(target_pos, delta * 5.0)
	camera.look_at(global_position + -transform.basis.z * 10.0)
