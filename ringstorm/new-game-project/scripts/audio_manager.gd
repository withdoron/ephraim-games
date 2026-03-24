extends Node
# Procedural audio — generates all game sounds from sine waves and noise
# Registered as autoload: AudioManager

const SAMPLE_RATE = 22050
const MIX_RATE = 22050

var sounds: Dictionary = {}
var engine_player: AudioStreamPlayer

func _ready():
	# Pre-generate all sounds
	sounds["boost"] = _make_sweep(200, 800, 0.4, 0.6)
	sounds["missile_fire"] = _make_sweep(600, 200, 0.3, 0.5)
	sounds["gun_fire"] = _make_tone(900, 0.08, 0.4)
	sounds["explosion"] = _make_noise(0.5, 0.7)
	sounds["star_power"] = _make_arpeggio([523, 659, 784, 1047], 0.6, 0.4)
	sounds["cube_pickup"] = _make_sweep(400, 1200, 0.15, 0.4)
	sounds["gate_pass"] = _make_tone(880, 0.2, 0.3)
	sounds["countdown_beep"] = _make_tone(440, 0.15, 0.4)
	sounds["countdown_go"] = _make_tone(880, 0.3, 0.5)
	sounds["lightning_zap"] = _make_noise(0.3, 0.5)
	sounds["tornado_whoosh"] = _make_sweep(150, 600, 0.5, 0.4)
	sounds["trick_whoosh"] = _make_sweep(300, 600, 0.25, 0.3)
	sounds["victory"] = _make_arpeggio([523, 659, 784, 988, 1047], 1.0, 0.4)
	sounds["lap_complete"] = _make_arpeggio([660, 880], 0.3, 0.35)

	# Engine hum — looping
	engine_player = AudioStreamPlayer.new()
	engine_player.name = "Engine"
	engine_player.stream = _make_tone(80, 2.0, 0.15)
	engine_player.bus = "Master"
	add_child(engine_player)

func play(sound_name: String, volume_db: float = 0.0):
	if not sounds.has(sound_name):
		return
	var player = AudioStreamPlayer.new()
	player.stream = sounds[sound_name]
	player.volume_db = volume_db
	player.bus = "Master"
	add_child(player)
	player.play()
	player.finished.connect(func(): player.queue_free())

func start_engine():
	if not engine_player.playing:
		engine_player.play()

func stop_engine():
	engine_player.stop()

func set_engine_pitch(pitch_scale: float):
	engine_player.pitch_scale = clamp(pitch_scale, 0.5, 2.0)

# --- Sound generation helpers ---

func _make_tone(freq: float, duration: float, volume: float = 0.5) -> AudioStreamWAV:
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples)
	for i in range(samples):
		var t = float(i) / SAMPLE_RATE
		var env = 1.0 - (t / duration)  # Linear fade
		var val = sin(t * freq * TAU) * volume * env
		data[i] = int(clamp(val * 127.0 + 128.0, 0, 255))
	return _pack_wav(data)

func _make_sweep(freq_start: float, freq_end: float, duration: float, volume: float = 0.5) -> AudioStreamWAV:
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples)
	for i in range(samples):
		var t = float(i) / SAMPLE_RATE
		var frac = t / duration
		var freq = freq_start + (freq_end - freq_start) * frac
		var env = 1.0 - frac
		var val = sin(t * freq * TAU) * volume * env
		data[i] = int(clamp(val * 127.0 + 128.0, 0, 255))
	return _pack_wav(data)

func _make_noise(duration: float, volume: float = 0.5) -> AudioStreamWAV:
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples)
	for i in range(samples):
		var t = float(i) / SAMPLE_RATE
		var env = 1.0 - (t / duration)
		var val = (randf() * 2.0 - 1.0) * volume * env
		data[i] = int(clamp(val * 127.0 + 128.0, 0, 255))
	return _pack_wav(data)

func _make_arpeggio(freqs: Array, duration: float, volume: float = 0.4) -> AudioStreamWAV:
	var samples = int(SAMPLE_RATE * duration)
	var data = PackedByteArray()
	data.resize(samples)
	var note_dur = duration / freqs.size()
	for i in range(samples):
		var t = float(i) / SAMPLE_RATE
		var note_idx = min(int(t / note_dur), freqs.size() - 1)
		var freq = freqs[note_idx]
		var note_t = fmod(t, note_dur)
		var env = (1.0 - note_t / note_dur) * (1.0 - t / duration)
		var val = sin(t * freq * TAU) * volume * env
		data[i] = int(clamp(val * 127.0 + 128.0, 0, 255))
	return _pack_wav(data)

func _pack_wav(data: PackedByteArray) -> AudioStreamWAV:
	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_8_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = data
	return stream
