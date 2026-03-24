extends Node
# Manages countdown, lap tracking, positions, and race end
# Ported from Ringstorm.jsx mainUpdate + checkGate

signal countdown_tick(seconds_left: int)
signal race_started
signal gate_passed(racer: Node, gate_idx: int, lap: int)
signal lap_completed(racer: Node, lap: int)
signal race_finished(racer: Node, position: int)
signal all_finished(finish_order: Array)

var countdown: int = 0
var started: bool = false
var race_time: int = 0  # frames since start
var frame_count: int = 0
var finish_order: Array = []
var is_battle: bool = false
var racers: Array = []  # All racer nodes
var course: Node = null  # RaceCourse node

func start_countdown():
	countdown = Settings.countdown_frames
	started = false
	race_time = 0
	frame_count = 0
	finish_order.clear()

func _physics_process(delta):
	if countdown > 0:
		var prev_sec = ceili(float(countdown) / 60.0)
		countdown -= 1
		var curr_sec = ceili(float(countdown) / 60.0)
		if curr_sec != prev_sec:
			countdown_tick.emit(curr_sec)
		if countdown <= 0:
			_start_race()
		frame_count += 1
		return

	if not started:
		return

	race_time += 1
	frame_count += 1

	# Check if all racers finished (race mode) or one survivor (battle mode)
	if not is_battle:
		if racers.size() > 0 and racers.all(func(r): return r.race_finished):
			all_finished.emit(finish_order)
			set_physics_process(false)

func _start_race():
	started = true
	race_started.emit()
	for r in racers:
		if r.has_method("on_race_start"):
			r.on_race_start()

func register_racer(racer: Node):
	racers.append(racer)

func on_racer_passed_gate(racer: Node):
	# Called by racer scripts when they pass through a gate
	if not course:
		return

	racer.current_gate += 1

	if not racer.get("is_npc"):
		gate_passed.emit(racer, racer.current_gate, racer.current_lap)

	if racer.current_gate >= Settings.num_gates:
		racer.current_gate = 0
		racer.current_lap += 1
		lap_completed.emit(racer, racer.current_lap)

		if racer.current_lap >= Settings.total_laps:
			racer.race_finished = true
			racer.finish_time = race_time
			finish_order.append(racer)
			racer.finish_position = finish_order.size()
			race_finished.emit(racer, racer.finish_position)

	# Update gate highlight
	if course.has_method("update_gate_colors"):
		# Use player's current gate for highlighting
		var player = racers[0] if racers.size() > 0 else null
		if player and not player.get("is_npc"):
			course.update_gate_colors(player.current_gate if not player.race_finished else -1)

# Ported from Ringstorm.jsx getRacePos() lines 773-785
func get_race_position(racer: Node) -> int:
	if is_battle:
		var alive = racers.filter(func(r): return not r.race_finished)
		alive.sort_custom(func(a, b): return a.lives > b.lives or (a.lives == b.lives and a.kills > b.kills))
		var idx = alive.find(racer)
		return idx + 1 if idx >= 0 else alive.size()
	else:
		# Finished racers are always ahead
		var ahead = finish_order.filter(func(r): return r != racer).size()
		if racer.race_finished:
			return racer.finish_position
		var active = racers.filter(func(r): return not r.race_finished)
		# Sort by progress (lap*gates + gate), use distance to next gate as tiebreaker
		active.sort_custom(func(a, b):
			var pa = a.current_lap * Settings.num_gates + a.current_gate
			var pb = b.current_lap * Settings.num_gates + b.current_gate
			if pa != pb: return pa > pb
			# Tiebreaker: closer to next gate = further ahead
			if course and course.gates.size() > 0:
				var ga = course.get_gate_position(a.current_gate)
				var gb = course.get_gate_position(b.current_gate)
				return a.global_position.distance_to(ga) < b.global_position.distance_to(gb)
			return false
		)
		var idx = active.find(racer)
		return (idx + 1 if idx >= 0 else active.size()) + ahead
