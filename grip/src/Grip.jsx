
import { useState, useEffect, useCallback, useRef } from "react";

const HOLD_TYPES = {
  jug: { name: "Jug", color: "#22c55e", staminaDrain: 0.3, restRate: 2, slipTime: null, emoji: "🟢", shape: "10px" },
  crimp: { name: "Crimp", color: "#f59e0b", staminaDrain: 1.5, restRate: 0, slipTime: 4000, emoji: "🟡", shape: "4px" },
  sloper: { name: "Sloper", color: "#ef4444", staminaDrain: 2, restRate: 0, slipTime: 2500, emoji: "🔴", shape: "50%" },
  pinch: { name: "Pinch", color: "#a855f7", staminaDrain: 1, restRate: 0.5, slipTime: 5000, emoji: "🟣", shape: "8px 20px" },
  start: { name: "Start", color: "#06b6d4", staminaDrain: 0, restRate: 3, slipTime: null, emoji: "⬆️", shape: "10px" },
  finish: { name: "Finish", color: "#fbbf24", staminaDrain: 0, restRate: 0, slipTime: null, emoji: "⭐", shape: "10px" },
  checkpoint: { name: "Checkpoint", color: "#38bdf8", staminaDrain: 0, restRate: 5, slipTime: null, emoji: "🔷", shape: "10px" },
};

const DINO_TYPES = {
  trex: { name: "T-Rex", emoji: "🦖", barSpeed: 1.8, greenSize: 0.25, yellowSize: 0.2, staminaReward: 20 },
  raptor: { name: "Raptor", emoji: "🦎", barSpeed: 2.4, greenSize: 0.2, yellowSize: 0.18, staminaReward: 30 },
};

const CHARACTERS = {
  pixel: { name: "Pixel", emoji: "👾", color: "#22c55e", desc: "Classic arcade alien. Old school cool." },
  dragon: { name: "Dragon", emoji: "🐉", color: "#ef4444", desc: "Ancient fire breather. Climbs with fury." },
  phantom: { name: "Phantom", emoji: "👻", color: "#a78bfa", desc: "Ghost climber. Light as air." },
};

const DIFFICULTY = {
  1: { wallHeight: 22, holdCount: 18, checkpoints: 1, dinoBase: 2, outliers: 3, label: "V0", desc: "Short wall. Learn the mechanics.", color: "#22c55e" },
  2: { wallHeight: 35, holdCount: 28, checkpoints: 2, dinoBase: 3, outliers: 5, label: "V3", desc: "Taller wall. Dinos guard shortcuts.", color: "#f59e0b" },
  3: { wallHeight: 50, holdCount: 42, checkpoints: 3, dinoBase: 5, outliers: 7, label: "V6", desc: "Marathon climb. Dinos everywhere.", color: "#ef4444" },
  4: { wallHeight: 65, holdCount: 56, checkpoints: 3, dinoBase: 7, outliers: 10, label: "V9", desc: "The beast. Only legends summit.", color: "#a855f7" },
};

const WALL_W = 8, CELL = 50, VIEW_ROWS = 10;
const EDITOR_CELL = 40;

const WALL_SIZES = [
  { rows: 15, label: "Short", desc: "Quick route", color: "#22c55e" },
  { rows: 25, label: "Medium", desc: "Standard wall", color: "#f59e0b" },
  { rows: 35, label: "Tall", desc: "Long climb", color: "#ef4444" },
  { rows: 45, label: "Beast", desc: "Massive wall", color: "#a855f7" },
];

const EDITOR_TOOLS = [
  { id: "jug", label: "Jug", emoji: "🟢", color: "#22c55e" },
  { id: "crimp", label: "Crimp", emoji: "🟡", color: "#f59e0b" },
  { id: "sloper", label: "Sloper", emoji: "🔴", color: "#ef4444" },
  { id: "pinch", label: "Pinch", emoji: "🟣", color: "#a855f7" },
  { id: "checkpoint", label: "Check", emoji: "🔷", color: "#38bdf8" },
  { id: "trex", label: "T-Rex", emoji: "🦖", color: "#fbbf24" },
  { id: "raptor", label: "Raptor", emoji: "🦎", color: "#fbbf24" },
  { id: "eraser", label: "Erase", emoji: "✕", color: "#ef4444" },
];

const ROUTE_TAGS = [
  { id: "technical", label: "Technical", emoji: "🧠", color: "#f59e0b" },
  { id: "dino_heavy", label: "Dino Heavy", emoji: "🦖", color: "#ef4444" },
  { id: "speed_run", label: "Speed Run", emoji: "⚡", color: "#22c55e" },
  { id: "endurance", label: "Endurance", emoji: "🏔️", color: "#a855f7" },
  { id: "chill", label: "Chill", emoji: "😎", color: "#38bdf8" },
  { id: "tricky", label: "Tricky", emoji: "🌀", color: "#f97316" },
];

function generateRoute(difficulty = 1) {
  const cfg = DIFFICULTY[difficulty];
  const holds = [];
  const wallHeight = cfg.wallHeight;
  holds.push({ x: 4, y: 0, type: "start", id: 0, dino: null });
  const weights = { 1: { jug: 0.5, crimp: 0.2, sloper: 0.1, pinch: 0.2 }, 2: { jug: 0.3, crimp: 0.3, sloper: 0.2, pinch: 0.2 }, 3: { jug: 0.15, crimp: 0.35, sloper: 0.3, pinch: 0.2 }, 4: { jug: 0.1, crimp: 0.3, sloper: 0.35, pinch: 0.25 } }[Math.min(difficulty, 4)];
  const plannedDinos = new Set();
  while (plannedDinos.size < cfg.dinoBase) plannedDinos.add(3 + Math.floor(Math.random() * (cfg.holdCount - 4)));
  const checkInterval = Math.floor(cfg.holdCount / (cfg.checkpoints + 1));
  let lastX = 4, lastY = 0, idx = 0;
  const main = [];
  const rowBudget = wallHeight - 3;
  const avgStep = rowBudget / cfg.holdCount;
  for (let i = 1; i <= cfg.holdCount; i++) {
    const shift = Math.floor(Math.random() * 3) - 1;
    let x = Math.max(0, Math.min(WALL_W - 1, lastX + shift));
    const y = Math.max(lastY + 1, Math.min(wallHeight - 3, Math.round(i * avgStep)));
    let overlap = holds.some(h => h.x === x && h.y === y) || main.some(h => h.x === x && h.y === y);
    if (overlap) {
      x = Math.max(0, Math.min(WALL_W - 1, lastX + (shift === 0 ? 1 : -shift)));
      overlap = holds.some(h => h.x === x && h.y === y) || main.some(h => h.x === x && h.y === y);
      if (overlap) continue;
    }
    idx++;
    const isCp = (i % checkInterval === 0) && i < cfg.holdCount - 2;
    let type;
    if (isCp) type = "checkpoint";
    else { const r = Math.random(); let c = 0; type = "jug"; for (const [t, w] of Object.entries(weights)) { c += w; if (r <= c) { type = t; break; } } }
    let dino = null;
    if (!isCp && plannedDinos.has(i)) dino = Math.random() > 0.5 ? "trex" : "raptor";
    main.push({ x, y, type, id: idx, dino });
    lastX = x; lastY = y;
  }
  for (let i = 0; i < cfg.outliers; i++) {
    const si = 1 + Math.floor(Math.random() * (main.length - 2));
    const s = main[si]; if (!s) continue;
    const dir = Math.random() > 0.5 ? 1 : -1;
    const ox = Math.max(0, Math.min(WALL_W - 1, s.x + dir * 2));
    const oy = Math.min(wallHeight - 3, s.y + Math.floor(Math.random() * 2));
    if (holds.some(h => h.x === ox && h.y === oy) || main.some(h => h.x === ox && h.y === oy) || ox === s.x) continue;
    idx++;
    const r = Math.random(); let c = 0; let type = "jug";
    for (const [t, w] of Object.entries({ jug: 0.6, crimp: 0.1, sloper: 0.1, pinch: 0.2 })) { c += w; if (r <= c) { type = t; break; } }
    main.push({ x: ox, y: oy, type, id: idx, dino: Math.random() > 0.5 ? "trex" : "raptor" });
  }
  holds.push(...main);
  const bY = wallHeight - 2, bX = Math.max(0, Math.min(WALL_W - 1, lastX + Math.floor(Math.random() * 3) - 1));
  if (!holds.some(h => h.x === bX && h.y === bY) && lastY < bY) { idx++; holds.push({ x: bX, y: bY, type: "jug", id: idx, dino: null }); }
  const fX = Math.max(0, Math.min(WALL_W - 1, bX + Math.floor(Math.random() * 3) - 1));
  holds.push({ x: fX, y: wallHeight - 1, type: "finish", id: idx + 1, dino: null });
  return holds;
}

function findReachable(holds, cur) {
  if (!cur) return holds.filter(h => h.type === "start");
  return holds.filter(h => { if (h.id === cur.id) return false; const dx = Math.abs(h.x - cur.x), dy = h.y - cur.y; return dx <= 2 && dy >= 0 && dy <= 2 && dx + dy <= 3; });
}

function TimingBar({ dino, stamina, onResult }) {
  const [pos, setPos] = useState(0);
  const [result, setResult] = useState(null);
  const animRef = useRef(null), posRef = useRef(0), dirRef = useRef(1);
  const dt = DINO_TYPES[dino];
  const sf = Math.max(0.5, stamina / 100), gs = dt.greenSize * sf, ys = dt.yellowSize;
  const g0 = 0.5 - gs / 2, g1 = 0.5 + gs / 2, y0 = g0 - ys, y1 = g1 + ys;

  useEffect(() => {
    if (result) return;
    const tick = () => { posRef.current += dirRef.current * dt.barSpeed * 0.012; if (posRef.current >= 1) { posRef.current = 1; dirRef.current = -1; } if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; } setPos(posRef.current); animRef.current = requestAnimationFrame(tick); };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [result, dt.barSpeed]);

  const click = () => {
    if (result) return; cancelAnimationFrame(animRef.current);
    const p = posRef.current; let z; if (p >= g0 && p <= g1) z = "green"; else if (p >= y0 && p <= y1) z = "yellow"; else z = "red";
    if (z === "yellow") z = Math.random() < 0.5 ? "green" : "red";
    setResult(z); setTimeout(() => onResult(z), 800);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100, fontFamily: "'Georgia', serif" }}>
      <div style={{ fontSize: "64px", marginBottom: "8px" }}>{dt.emoji}</div>
      <div style={{ fontSize: "28px", fontWeight: 900, color: "#fbbf24", marginBottom: "4px" }}>{dt.name.toUpperCase()} ATTACK!</div>
      <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px" }}>{stamina < 50 ? "Low stamina — smaller green!" : "Time your jump!"}</div>
      <div style={{ width: "280px", height: "48px", borderRadius: "8px", overflow: "hidden", position: "relative", border: "2px solid rgba(255,255,255,0.2)", marginBottom: "20px", background: "#1e1e2e" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: `${y0 * 100}%`, height: "100%", background: "linear-gradient(90deg, #dc2626, #ef4444)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: `${(1 - y1) * 100}%`, height: "100%", background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
        <div style={{ position: "absolute", top: 0, left: `${y0 * 100}%`, width: `${ys * 100}%`, height: "100%", background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />
        <div style={{ position: "absolute", top: 0, left: `${g1 * 100}%`, width: `${ys * 100}%`, height: "100%", background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }} />
        <div style={{ position: "absolute", top: 0, left: `${g0 * 100}%`, width: `${gs * 100}%`, height: "100%", background: "linear-gradient(90deg, #22c55e, #4ade80)" }} />
        <div style={{ position: "absolute", top: "-4px", left: `${pos * 100}%`, width: "4px", height: "56px", background: "#fff", borderRadius: "2px", transform: "translateX(-50%)", boxShadow: "0 0 12px rgba(255,255,255,0.8)" }} />
      </div>
      {result ? (
        <div style={{ fontSize: "28px", fontWeight: 900, color: result === "green" ? "#22c55e" : "#ef4444", animation: "resultPop 0.3s ease-out" }}>
          {result === "green" ? `CLEARED! +${dt.staminaReward} Stamina!` : "CAUGHT! You fell!"}
        </div>
      ) : (
        <button onClick={click} style={{ padding: "16px 48px", background: "linear-gradient(135deg, #f59e0b, #ef4444)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "22px", fontWeight: 900, cursor: "pointer", letterSpacing: "2px", textTransform: "uppercase", boxShadow: "0 4px 20px rgba(245,158,11,0.4)" }}>JUMP!</button>
      )}
      <style>{`@keyframes resultPop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

function RouteTypesScreen({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "40px 20px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 900, marginBottom: "8px" }}>Route Types</h1>
      <p style={{ color: "#64748b", marginBottom: "32px" }}>Learn the holds and obstacles</p>
      <div style={{ width: "min(360px, 90vw)", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>Hold Types</div>
        {Object.entries(HOLD_TYPES).filter(([k]) => !["start", "finish", "checkpoint"].includes(k)).map(([key, h]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ width: "28px", height: "28px", borderRadius: h.shape, background: h.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{h.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, color: h.color }}>{h.name}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {key === "jug" && "Big hold. Rest here. Stamina recovers."}
                {key === "crimp" && "Small edge. Drains stamina. 4s slip timer."}
                {key === "sloper" && "Round hold. Drains fast. 2.5s slip timer."}
                {key === "pinch" && "Squeeze grip. Slow drain. 5s slip timer."}
              </div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: "14px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "2px", marginTop: "16px", marginBottom: "4px" }}>Special Holds</div>
        {[
          { emoji: "⬆️", name: "Start", color: "#06b6d4", desc: "Starting hold. Grab this to begin." },
          { emoji: "⭐", name: "Finish", color: "#fbbf24", desc: "The top! Reach this to send the route." },
          { emoji: "🔷", name: "Checkpoint", color: "#38bdf8", desc: "Safe zone. Full stamina restore." },
        ].map(h => (
          <div key={h.name} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: "22px", width: "28px", textAlign: "center", flexShrink: 0 }}>{h.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, color: h.color }}>{h.name}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{h.desc}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: "14px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "2px", marginTop: "16px", marginBottom: "4px" }}>Obstacles</div>
        {Object.entries(DINO_TYPES).map(([key, d]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: "22px", width: "28px", textAlign: "center", flexShrink: 0 }}>{d.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#fbbf24" }}>{d.name}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {key === "trex" && `Slow timing bar. Big red zone. Beat it for +${d.staminaReward} stamina.`}
                {key === "raptor" && `Fast timing bar. Small green zone. Beat it for +${d.staminaReward} stamina.`}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onBack} style={{ padding: "12px 32px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Back to Menu</button>
    </div>
  );
}

function CharacterSelect({ selected, onSelect, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "20px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 900, marginBottom: "8px" }}>Choose Your Monster</h1>
      <p style={{ color: "#64748b", marginBottom: "32px" }}>Who climbs the wall?</p>
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", marginBottom: "40px" }}>
        {Object.entries(CHARACTERS).map(([key, c]) => {
          const sel = selected === key;
          return (
            <button key={key} onClick={() => onSelect(key)} style={{
              width: "140px", padding: "20px 12px", background: sel ? `${c.color}22` : "rgba(255,255,255,0.03)",
              border: sel ? `2px solid ${c.color}` : "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px", cursor: "pointer", textAlign: "center",
              transition: "all 0.2s", transform: sel ? "scale(1.08)" : "scale(1)",
              boxShadow: sel ? `0 0 30px ${c.color}33` : "none",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "8px", filter: sel ? "none" : "grayscale(0.5)" }}>{c.emoji}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: sel ? c.color : "#94a3b8" }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", lineHeight: "1.3" }}>{c.desc}</div>
            </button>
          );
        })}
      </div>
      <button onClick={onBack} style={{ padding: "12px 32px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Back to Menu</button>
    </div>
  );
}

// ============ ROUTE CREATOR ============
function RouteCreatorScreen({ onBack, onTestRoute, onPlaySaved, character, editorState, setEditorState, savedRoutes, onSaveRoute, onDeleteRoute }) {
  const [selectedTool, setSelectedTool] = useState("jug");
  const [scrollY, setScrollY] = useState(0);
  const [naming, setNaming] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const scrollRef = useRef(null);
  const ch = CHARACTERS[character];
  const visibleRows = 12;
  const gridW = WALL_W * EDITOR_CELL;
  const gridH = visibleRows * EDITOR_CELL;

  const { wallRows, holds: editorHolds } = editorState || {};

  const initEditor = (rows) => {
    setEditorState({
      wallRows: rows,
      holds: [
        { x: 4, y: 0, type: "start", dino: null },
        { x: 4, y: rows - 1, type: "finish", dino: null },
      ],
    });
    setScrollY(0);
  };

  const setEditorHolds = (updater) => {
    setEditorState(prev => ({
      ...prev,
      holds: typeof updater === "function" ? updater(prev.holds) : updater,
    }));
  };

  const getHoldAt = (x, y) => editorHolds?.find(h => h.x === x && h.y === y);

  const handleCellClick = (x, y) => {
    const existing = getHoldAt(x, y);
    if (selectedTool === "eraser") {
      if (existing && existing.type !== "start" && existing.type !== "finish") {
        setEditorHolds(prev => prev.filter(h => !(h.x === x && h.y === y)));
      } else if (existing && (existing.type === "start" || existing.type === "finish") && existing.dino) {
        setEditorHolds(prev => prev.map(h => h.x === x && h.y === y ? { ...h, dino: null } : h));
      }
      return;
    }
    if (selectedTool === "trex" || selectedTool === "raptor") {
      if (existing && existing.type !== "start" && existing.type !== "finish" && existing.type !== "checkpoint") {
        setEditorHolds(prev => prev.map(h => h.x === x && h.y === y ? { ...h, dino: selectedTool } : h));
      }
      return;
    }
    if (existing) {
      if (existing.type === "start" || existing.type === "finish") return;
      setEditorHolds(prev => prev.map(h => h.x === x && h.y === y ? { ...h, type: selectedTool, dino: selectedTool === "checkpoint" ? null : h.dino } : h));
    } else {
      setEditorHolds(prev => [...prev, { x, y, type: selectedTool, dino: null }]);
    }
  };

  const holdCount = editorHolds ? editorHolds.filter(h => h.type !== "start" && h.type !== "finish").length : 0;
  const dinoCount = editorHolds ? editorHolds.filter(h => h.dino).length : 0;
  const checkCount = editorHolds ? editorHolds.filter(h => h.type === "checkpoint").length : 0;
  const buildRoute = () => editorHolds.map((h, i) => ({ ...h, id: i }));
  const canTest = editorHolds && editorHolds.length >= 4;

  const handleSave = () => {
    if (!routeName.trim()) return;
    onSaveRoute({
      name: routeName.trim(),
      wallRows,
      holds: editorHolds.map(h => ({ ...h })),
      holdCount,
      dinoCount,
      checkCount,
      id: Date.now(),
    });
    setRouteName("");
    setNaming(false);
  };

  // ---- PICK SIZE (no editor state yet) ----
  if (!editorState) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "20px" }}>
        <div style={{ fontSize: "64px", marginBottom: "8px" }}>🔨</div>
        <h1 style={{ fontSize: "32px", fontWeight: 900, marginBottom: "8px" }}>Route Creator</h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>Pick your wall size</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "min(320px, 90vw)", marginBottom: "24px" }}>
          {WALL_SIZES.map(ws => (
            <button key={ws.rows} onClick={() => initEditor(ws.rows)} style={{
              padding: "16px 20px", background: "rgba(255,255,255,0.03)",
              border: `1px solid ${ws.color}33`, borderRadius: "12px",
              color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${ws.color}15`; e.currentTarget.style.borderColor = ws.color; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = `${ws.color}33`; }}>
              <div>
                <div style={{ color: ws.color, fontSize: "20px", fontWeight: 900 }}>{ws.label}</div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 400, marginTop: "2px" }}>{ws.desc}</div>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{ws.rows} rows</div>
            </button>
          ))}
        </div>

        {/* Saved Routes */}
        {savedRoutes.length > 0 && (
          <>
            <div style={{ fontSize: "14px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px", marginTop: "8px" }}>My Routes ({savedRoutes.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "min(320px, 90vw)", marginBottom: "24px" }}>
              {savedRoutes.map(sr => (
                <div key={sr.id} style={{
                  padding: "12px 16px", background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#fbbf24" }}>{sr.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{sr.wallRows} rows · {sr.holdCount} holds · 🦖{sr.dinoCount} · 🔷{sr.checkCount}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => onPlaySaved(sr)} style={{ padding: "6px 12px", background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Play</button>
                    <button onClick={() => onDeleteRoute(sr.id)} style={{ padding: "6px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={onBack} style={{ padding: "12px 32px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Back to Menu</button>
      </div>
    );
  }

  // ---- EDITOR ----
  const maxScroll = Math.max(0, wallRows - visibleRows);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "8px" }}>
      <div style={{ width: `${gridW + 20}px`, maxWidth: "95vw", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <button onClick={() => setEditorState(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#94a3b8", padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}>Back</button>
        <div style={{ fontSize: "14px", fontWeight: 900, color: "#fbbf24" }}>Route Creator</div>
        <div style={{ fontSize: "11px", color: "#64748b" }}>{wallRows} rows</div>
      </div>
      <div style={{ width: `${gridW + 20}px`, maxWidth: "95vw", display: "flex", justifyContent: "center", gap: "12px", marginBottom: "6px", fontSize: "11px", color: "#64748b" }}>
        <span>Holds: {holdCount}</span>
        <span>🦖 Dinos: {dinoCount}</span>
        <span>🔷 Checks: {checkCount}</span>
      </div>
      <div style={{ width: `${gridW + 20}px`, maxWidth: "95vw", display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center", marginBottom: "8px" }}>
        {EDITOR_TOOLS.map(tool => {
          const sel = selectedTool === tool.id;
          return (
            <button key={tool.id} onClick={() => setSelectedTool(tool.id)} style={{
              padding: "6px 8px", background: sel ? `${tool.color}25` : "rgba(255,255,255,0.03)",
              border: sel ? `2px solid ${tool.color}` : "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
              minWidth: "38px", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: "16px" }}>{tool.emoji}</span>
              <span style={{ fontSize: "9px", color: sel ? tool.color : "#64748b", fontWeight: sel ? 700 : 400 }}>{tool.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
        <button onClick={() => setScrollY(s => Math.min(maxScroll, s + 3))} style={{ padding: "4px 16px", background: scrollY < maxScroll ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: scrollY < maxScroll ? "#e2e8f0" : "#333", fontSize: "14px", cursor: "pointer" }}>▲ Up</button>
        <button onClick={() => setScrollY(s => Math.max(0, s - 3))} style={{ padding: "4px 16px", background: scrollY > 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: scrollY > 0 ? "#e2e8f0" : "#333", fontSize: "14px", cursor: "pointer" }}>▼ Down</button>
        <span style={{ fontSize: "10px", color: "#64748b", alignSelf: "center" }}>Row {scrollY}-{Math.min(scrollY + visibleRows - 1, wallRows - 1)}</span>
      </div>
      <div ref={scrollRef} style={{
        width: `${gridW}px`, height: `${gridH}px`, position: "relative",
        borderRadius: "10px", border: "2px solid rgba(255,255,255,0.1)",
        background: "linear-gradient(180deg, rgba(30,30,50,0.9), rgba(20,20,40,0.95))",
        overflow: "hidden", maxWidth: "95vw",
      }}>
        <div style={{
          position: "absolute", width: "100%", height: "100%",
          background: `repeating-linear-gradient(0deg, transparent, transparent ${EDITOR_CELL - 1}px, rgba(255,255,255,0.04) ${EDITOR_CELL - 1}px, rgba(255,255,255,0.04) ${EDITOR_CELL}px), repeating-linear-gradient(90deg, transparent, transparent ${EDITOR_CELL - 1}px, rgba(255,255,255,0.04) ${EDITOR_CELL - 1}px, rgba(255,255,255,0.04) ${EDITOR_CELL}px)`,
        }} />
        {Array.from({ length: visibleRows }, (_, vi) => {
          const row = (wallRows - 1) - (scrollY + vi);
          if (row < 0 || row >= wallRows) return null;
          return (
            <div key={`rn-${vi}`} style={{
              position: "absolute", left: "2px", top: `${vi * EDITOR_CELL + 2}px`,
              fontSize: "8px", color: "rgba(255,255,255,0.15)", pointerEvents: "none",
            }}>{row}</div>
          );
        })}
        {Array.from({ length: visibleRows }, (_, vi) => {
          const row = (wallRows - 1) - (scrollY + vi);
          if (row < 0 || row >= wallRows) return null;
          return Array.from({ length: WALL_W }, (_, col) => {
            const hold = getHoldAt(col, row);
            const ht = hold ? HOLD_TYPES[hold.type] : null;
            return (
              <div key={`${col}-${row}`} onClick={() => handleCellClick(col, row)}
                style={{
                  position: "absolute", left: `${col * EDITOR_CELL}px`, top: `${vi * EDITOR_CELL}px`,
                  width: `${EDITOR_CELL}px`, height: `${EDITOR_CELL}px`, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {hold && (
                  <div style={{
                    width: hold.type === "start" || hold.type === "finish" ? "30px" : "24px",
                    height: hold.type === "start" || hold.type === "finish" ? "30px" : "24px",
                    borderRadius: ht.shape, background: `radial-gradient(circle, ${ht.color}, ${ht.color}88)`,
                    border: `2px solid ${ht.color}`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: hold.type === "start" || hold.type === "finish" ? "16px" : "12px",
                    position: "relative", boxShadow: `0 0 8px ${ht.color}44`,
                  }}>
                    {hold.type === "finish" ? "⭐" : hold.type === "start" ? "⬆️" : hold.type === "checkpoint" ? "🔷" : ""}
                    {hold.dino && (
                      <div style={{
                        position: "absolute", top: "-10px", right: "-8px",
                        fontSize: "14px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
                      }}>{DINO_TYPES[hold.dino].emoji}</div>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })}
      </div>
      <div style={{ width: `${gridW}px`, maxWidth: "95vw", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", marginTop: "4px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: `${(scrollY / Math.max(1, wallRows - visibleRows)) * 100}%`,
          width: `${(visibleRows / wallRows) * 100}%`, height: "100%",
          background: "#fbbf24", borderRadius: "4px", transition: "left 0.15s",
        }} />
      </div>

      {/* Naming overlay */}
      {naming && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50, fontFamily: "'Georgia', serif" }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "32px", width: "min(320px, 85vw)", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>💾</div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#fbbf24", marginBottom: "16px" }}>Name Your Route</div>
            <input
              type="text"
              value={routeName}
              onChange={e => setRouteName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              placeholder="Route name..."
              autoFocus
              maxLength={30}
              style={{
                width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px",
                color: "#e2e8f0", fontSize: "16px", fontFamily: "'Georgia', serif",
                outline: "none", marginBottom: "16px", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button onClick={handleSave} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => { setNaming(false); setRouteName(""); }} style={{ padding: "10px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {canTest && (
          <button onClick={() => onTestRoute(buildRoute(), wallRows, "My Route")} style={{
            padding: "12px 24px", background: "linear-gradient(135deg, #22c55e, #16a34a)",
            border: "none", borderRadius: "10px", color: "#fff", fontSize: "16px", fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
          }}>
            {ch.emoji} Test Route
          </button>
        )}
        {canTest && (
          <button onClick={() => setNaming(true)} style={{
            padding: "12px 24px", background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))",
            border: "1px solid rgba(245,158,11,0.4)", borderRadius: "10px", color: "#fbbf24", fontSize: "14px", fontWeight: 700, cursor: "pointer",
          }}>
            💾 Save Route
          </button>
        )}
        <button onClick={() => { setEditorState({ wallRows, holds: [{ x: 4, y: 0, type: "start", dino: null }, { x: 4, y: wallRows - 1, type: "finish", dino: null }] }); }} style={{
          padding: "12px 24px", background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#ef4444", fontSize: "14px", fontWeight: 700, cursor: "pointer",
        }}>Clear All</button>
      </div>
      <div style={{ marginTop: "10px", fontSize: "11px", color: "#64748b", textAlign: "center", maxWidth: "320px" }}>
        Tap cells to place holds. Select 🦖/🦎 then tap a hold to add a dino. ⬆️ Start and ⭐ Finish are auto-placed. Save to keep your route!
      </div>
    </div>
  );
}

// ============ VICTORY SCREEN ============
function VictoryScreen({ ch, isCustom, customRouteName, customWallHeight, difficulty, moveCount, falls, elapsed, dinosBeaten, checkpointsHit, score, canRate, customRouteId, onClimbAgain, onGoHarder, onBack, onRate }) {
  const [starRating, setStarRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tagId) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : prev.length < 2 ? [...prev, tagId] : prev);
  };

  const handleSubmit = () => {
    if (starRating > 0) {
      onRate(starRating, selectedTags);
      setSubmitted(true);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "80px", marginBottom: "8px" }}>{ch.emoji}</div>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>⭐</div>
      <h1 style={{ fontSize: "44px", fontWeight: 900, margin: "0 0 4px 0", color: "#fbbf24" }}>SENT IT!</h1>
      <p style={{ fontSize: "16px", color: ch.color, margin: "0 0 24px 0" }}>
        {isCustom ? `${ch.name} topped "${customRouteName}" — ${customWallHeight} rows` : `${ch.name} topped ${DIFFICULTY[difficulty].label} — ${DIFFICULTY[difficulty].wallHeight} rows`}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", width: "min(360px, 90vw)", marginBottom: "24px" }}>
        {[{ l: "Moves", v: moveCount }, { l: "Falls", v: falls }, { l: "Time", v: elapsed + "s" }, { l: "Dinos", v: "🦖 " + dinosBeaten }, { l: "Checks", v: "🔷 " + checkpointsHit }, { l: "Score", v: score }].map(({ l, v }) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>{l}</div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#f59e0b", marginTop: "2px" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Rating section — only for saved community routes */}
      {canRate && !submitted && (
        <div style={{ width: "min(360px, 90vw)", padding: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Rate This Route</div>
          {/* Stars */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setStarRating(s)} style={{
                fontSize: "32px", background: "none", border: "none", cursor: "pointer",
                color: s <= starRating ? "#fbbf24" : "#333",
                transform: s <= starRating ? "scale(1.2)" : "scale(1)",
                transition: "all 0.15s",
                filter: s <= starRating ? "drop-shadow(0 0 6px rgba(251,191,36,0.5))" : "none",
              }}>★</button>
            ))}
          </div>
          {/* Tags */}
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>Tag it (pick up to 2)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginBottom: "16px" }}>
            {ROUTE_TAGS.map(tag => {
              const sel = selectedTags.includes(tag.id);
              return (
                <button key={tag.id} onClick={() => toggleTag(tag.id)} style={{
                  padding: "6px 12px", background: sel ? `${tag.color}20` : "rgba(255,255,255,0.03)",
                  border: sel ? `2px solid ${tag.color}` : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px", cursor: "pointer", fontSize: "12px",
                  color: sel ? tag.color : "#64748b", fontWeight: sel ? 700 : 400,
                  transition: "all 0.15s",
                }}>{tag.emoji} {tag.label}</button>
              );
            })}
          </div>
          <button onClick={handleSubmit} disabled={starRating === 0} style={{
            padding: "10px 24px",
            background: starRating > 0 ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "rgba(255,255,255,0.05)",
            border: "none", borderRadius: "10px",
            color: starRating > 0 ? "#0a0a0a" : "#333",
            fontSize: "14px", fontWeight: 700, cursor: starRating > 0 ? "pointer" : "default",
          }}>Submit Rating</button>
        </div>
      )}

      {canRate && submitted && (
        <div style={{ padding: "12px 24px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", color: "#22c55e", fontSize: "14px", fontWeight: 700, marginBottom: "20px" }}>
          Rated! {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= starRating ? "#fbbf24" : "#333" }}>★</span>)}
          {selectedTags.length > 0 && ` + ${selectedTags.map(t => ROUTE_TAGS.find(rt => rt.id === t)?.emoji).join(" ")}`}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onClimbAgain} style={{ padding: "12px 24px", background: ch.color, border: "none", borderRadius: "10px", color: "#0a0a0a", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Climb Again</button>
        {onGoHarder && <button onClick={onGoHarder} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #ef4444, #a855f7)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Go Harder</button>}
        <button onClick={onBack} style={{ padding: "12px 24px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
          {isCustom ? "Back to Editor" : "Menu"}
        </button>
      </div>
    </div>
  );
}

function CommunityRoutesScreen({ onBack, savedRoutes, onPlay }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "40px 20px" }}>
      <div style={{ fontSize: "64px", marginBottom: "8px" }}>🌍</div>
      <h1 style={{ fontSize: "32px", fontWeight: 900, marginBottom: "8px" }}>Community Routes</h1>
      <p style={{ color: "#94a3b8", marginBottom: "32px" }}>Climb walls built by the community</p>

      {savedRoutes.length === 0 ? (
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px", opacity: 0.5 }}>🔨</div>
          <p style={{ color: "#64748b", maxWidth: "280px", lineHeight: "1.5" }}>No routes yet! Head to the Route Creator to build and save your first route. It will show up here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "min(360px, 90vw)", marginBottom: "32px" }}>
          {savedRoutes.map(sr => {
            const diffColor = sr.wallRows <= 15 ? "#22c55e" : sr.wallRows <= 25 ? "#f59e0b" : sr.wallRows <= 35 ? "#ef4444" : "#a855f7";
            const avgRating = sr.ratings && sr.ratings.length > 0 ? (sr.ratings.reduce((a, b) => a + b, 0) / sr.ratings.length) : 0;
            const tagCounts = {};
            if (sr.tags) sr.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
            const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
            return (
              <div key={sr.id} style={{
                padding: "16px", background: "rgba(255,255,255,0.03)",
                border: `1px solid ${diffColor}33`, borderRadius: "12px",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = `${diffColor}10`; e.currentTarget.style.borderColor = `${diffColor}66`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = `${diffColor}33`; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "17px", fontWeight: 900, color: diffColor }}>{sr.name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <span>{sr.wallRows} rows</span>
                      <span>{sr.holdCount} holds</span>
                      {sr.dinoCount > 0 && <span>🦖 {sr.dinoCount}</span>}
                      {sr.checkCount > 0 && <span>🔷 {sr.checkCount}</span>}
                    </div>
                    {/* Star rating */}
                    <div style={{ marginTop: "6px", fontSize: "14px" }}>
                      {avgRating > 0 ? (
                        <span>{[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= Math.round(avgRating) ? "#fbbf24" : "#333" }}>★</span>)} <span style={{ fontSize: "11px", color: "#64748b" }}>({sr.ratings.length})</span></span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#4a4a5a" }}>Unrated</span>
                      )}
                    </div>
                    {/* Tags */}
                    {topTags.length > 0 && (
                      <div style={{ marginTop: "6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {topTags.map(tagId => {
                          const tag = ROUTE_TAGS.find(t => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span key={tagId} style={{
                              padding: "2px 8px", background: `${tag.color}15`, border: `1px solid ${tag.color}33`,
                              borderRadius: "6px", fontSize: "10px", color: tag.color, fontWeight: 700,
                            }}>{tag.emoji} {tag.label}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={() => onPlay(sr)} style={{
                    padding: "10px 20px", background: `linear-gradient(135deg, ${diffColor}, ${diffColor}cc)`,
                    border: "none", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                    boxShadow: `0 4px 12px ${diffColor}33`, flexShrink: 0, marginLeft: "12px", alignSelf: "center",
                  }}>Climb</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onBack} style={{ padding: "12px 32px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Back to Menu</button>
    </div>
  );
}

export default function Grip() {
  const [screen, setScreen] = useState("menu");
  const [character, setCharacter] = useState("pixel");
  const [difficulty, setDifficulty] = useState(1);
  const [holds, setHolds] = useState([]);
  const [currentHold, setCurrentHold] = useState(null);
  const [lastCheckpoint, setLastCheckpoint] = useState(null);
  const [stamina, setStamina] = useState(100);
  const [slipTimeLeft, setSlipTimeLeft] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [message, setMessage] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [falls, setFalls] = useState(0);
  const [dinosBeaten, setDinosBeaten] = useState(0);
  const [checkpointsHit, setCheckpointsHit] = useState(0);
  const [activeDino, setActiveDino] = useState(null);
  const [pendingHold, setPendingHold] = useState(null);
  const [cameraY, setCameraY] = useState(0);
  const [customRoute, setCustomRoute] = useState(null);
  const [customWallHeight, setCustomWallHeight] = useState(null);
  const [customRouteName, setCustomRouteName] = useState("");
  const [customRouteId, setCustomRouteId] = useState(null);
  // Editor state lifted up so it persists across screen changes
  const [editorState, setEditorState] = useState(null);
  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState([]);
  const tickRef = useRef(null), slipRef = useRef(null);
  const wallHeight = customWallHeight || (DIFFICULTY[difficulty]?.wallHeight || 22);
  const ch = CHARACTERS[character];

  const startGame = useCallback((diff) => {
    setCustomRoute(null); setCustomWallHeight(null); setCustomRouteName(""); setCustomRouteId(null);
    setHolds(generateRoute(diff)); setCurrentHold(null); setLastCheckpoint(null); setStamina(100);
    setSlipTimeLeft(0); setMoveCount(0); setMessage(`${ch.emoji} Grab the START hold!`);
    setStartTime(null); setEndTime(null); setFalls(0); setDinosBeaten(0); setCheckpointsHit(0);
    setActiveDino(null); setPendingHold(null); setCameraY(0); setDifficulty(diff); setScreen("game");
  }, [ch]);

  const startCustomGame = useCallback((route, wh, name, routeId) => {
    setCustomRoute(route); setCustomWallHeight(wh); setCustomRouteName(name); setCustomRouteId(routeId || null);
    setHolds(route); setCurrentHold(null); setLastCheckpoint(null); setStamina(100);
    setSlipTimeLeft(0); setMoveCount(0); setMessage(`${ch.emoji} Grab the START hold!`);
    setStartTime(null); setEndTime(null); setFalls(0); setDinosBeaten(0); setCheckpointsHit(0);
    setActiveDino(null); setPendingHold(null); setCameraY(0); setDifficulty(1); setScreen("game");
  }, [ch]);

  const respawn = useCallback(() => {
    clearInterval(tickRef.current); clearInterval(slipRef.current);
    const rh = lastCheckpoint || holds.find(h => h.type === "start");
    setCurrentHold(rh); setStamina(100); setSlipTimeLeft(0); setActiveDino(null); setPendingHold(null);
    if (rh) setCameraY(Math.max(0, rh.y - Math.floor(VIEW_ROWS / 2)));
    setMessage(lastCheckpoint ? `${ch.emoji} Respawned at checkpoint!` : `${ch.emoji} Back to start!`);
  }, [holds, lastCheckpoint, ch]);

  useEffect(() => { if (currentHold) { const t = Math.max(0, currentHold.y - Math.floor(VIEW_ROWS / 3)); setCameraY(p => { const d = t - p; return Math.abs(d) < 0.5 ? t : p + d * 0.3; }); } }, [currentHold]);

  useEffect(() => {
    if (screen !== "game" || !currentHold || activeDino) return;
    const ht = HOLD_TYPES[currentHold.type];
    tickRef.current = setInterval(() => {
      setStamina(p => {
        let n = ht.restRate > 0 ? Math.min(100, p + ht.restRate * 0.5) : p - ht.staminaDrain * 0.5;
        if (n <= 0) { setMessage("Stamina empty!"); setFalls(f => f + 1); setCurrentHold(null); clearInterval(tickRef.current); clearInterval(slipRef.current); setTimeout(respawn, 1500); return 0; }
        return n;
      });
    }, 100);
    if (ht.slipTime) {
      setSlipTimeLeft(ht.slipTime);
      slipRef.current = setInterval(() => { setSlipTimeLeft(p => { if (p <= 100) { setMessage("Slipped!"); setFalls(f => f + 1); setCurrentHold(null); clearInterval(tickRef.current); clearInterval(slipRef.current); setTimeout(respawn, 1500); return 0; } return p - 100; }); }, 100);
    }
    return () => { clearInterval(tickRef.current); clearInterval(slipRef.current); };
  }, [currentHold, screen, activeDino, respawn]);

  const handleDinoResult = useCallback((zone) => {
    if (zone === "green") {
      const dt = DINO_TYPES[activeDino]; setDinosBeaten(d => d + 1); setActiveDino(null);
      const hold = pendingHold; clearInterval(tickRef.current); clearInterval(slipRef.current);
      setStamina(p => Math.max(0, Math.min(100, p - (3 + difficulty * 2) + dt.staminaReward)));
      setCurrentHold(hold); setMoveCount(m => m + 1); setPendingHold(null);
      if (hold.type === "finish") { setEndTime(Date.now()); setMessage(`${ch.emoji} SENT IT!`); setScreen("victory"); return; }
      if (hold.type === "checkpoint") { setLastCheckpoint(hold); setCheckpointsHit(c => c + 1); setStamina(100); setMessage(`Checkpoint + ${dt.emoji} defeated!`); return; }
      setMessage(`${dt.emoji} defeated! +${dt.staminaReward} stamina!`);
    } else { setMessage(DINO_TYPES[activeDino].name + " got you!"); setFalls(f => f + 1); setActiveDino(null); setPendingHold(null); setTimeout(respawn, 1200); }
  }, [activeDino, pendingHold, difficulty, respawn, ch]);

  const grabHold = useCallback((hold) => {
    if (screen !== "game" || activeDino) return;
    if (!currentHold) { if (hold.type === "start") { setCurrentHold(hold); setStartTime(Date.now()); setMessage(`${ch.emoji} Climbing!`); return; } setMessage("Grab START first!"); return; }
    const reach = findReachable(holds, currentHold);
    if (!reach.find(h => h.id === hold.id)) { setMessage("Too far!"); return; }
    if (hold.dino) { setActiveDino(hold.dino); setPendingHold(hold); clearInterval(tickRef.current); clearInterval(slipRef.current); return; }
    clearInterval(tickRef.current); clearInterval(slipRef.current);
    setStamina(p => Math.max(0, p - (3 + difficulty * 2))); setCurrentHold(hold); setMoveCount(m => m + 1);
    if (hold.type === "finish") { setEndTime(Date.now()); setMessage(`${ch.emoji} SENT IT!`); clearInterval(tickRef.current); clearInterval(slipRef.current); setScreen("victory"); return; }
    if (hold.type === "checkpoint") { setLastCheckpoint(hold); setCheckpointsHit(c => c + 1); setStamina(100); setMessage("Checkpoint! Stamina restored!"); return; }
    const ht = HOLD_TYPES[hold.type];
    if (ht.slipTime) setMessage(`${ht.emoji} ${ht.name} — move!`);
    else if (ht.restRate > 0) setMessage(`${ht.emoji} ${ht.name} — rest up!`);
    else setMessage(`${ht.emoji} ${ht.name}`);
  }, [currentHold, holds, screen, difficulty, activeDino, ch]);

  const reachable = currentHold ? findReachable(holds, currentHold) : holds.filter(h => h.type === "start");
  const maxY = holds.length ? Math.max(...holds.map(h => h.y), 1) : 1;
  const progress = currentHold ? Math.round((currentHold.y / maxY) * 100) : 0;

  if (screen === "menu") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "20px" }}>
        <div style={{ fontSize: "72px", marginBottom: "8px" }}>🧗</div>
        <h1 style={{ fontSize: "clamp(48px, 10vw, 80px)", fontWeight: 900, letterSpacing: "-3px", margin: "0 0 4px 0", background: "linear-gradient(135deg, #f59e0b, #ef4444, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GRIP</h1>
        <p style={{ fontSize: "16px", color: "#94a3b8", margin: "0 0 40px 0", letterSpacing: "4px", textTransform: "uppercase" }}>A climbing game by Ephraim</p>
        <div style={{ fontSize: "36px", marginBottom: "4px" }}>{ch.emoji}</div>
        <div style={{ fontSize: "13px", color: ch.color, fontWeight: 700, marginBottom: "32px" }}>Playing as {ch.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "min(320px, 90vw)", marginBottom: "16px" }}>
          <button onClick={() => setScreen("officialRoutes")} style={{ padding: "16px 24px", background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", color: "#fbbf24", fontSize: "18px", fontWeight: 700, cursor: "pointer", textAlign: "center", letterSpacing: "1px" }}>Official Routes</button>
          <button onClick={() => setScreen("communityRoutes")} style={{ padding: "16px 24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e2e8f0", fontSize: "18px", fontWeight: 700, cursor: "pointer", textAlign: "center" }}>Community Routes</button>
          <button onClick={() => setScreen("routeCreator")} style={{ padding: "16px 24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e2e8f0", fontSize: "18px", fontWeight: 700, cursor: "pointer", textAlign: "center" }}>Route Creator</button>
          <button onClick={() => setScreen("characterSelect")} style={{ padding: "16px 24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e2e8f0", fontSize: "18px", fontWeight: 700, cursor: "pointer", textAlign: "center" }}>Character Selection</button>
        </div>
        <button onClick={() => setScreen("routeTypes")} style={{ padding: "10px 20px", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#64748b", fontSize: "13px", cursor: "pointer" }}>Route Types Guide</button>
      </div>
    );
  }

  if (screen === "officialRoutes") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", color: "#e2e8f0", padding: "20px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 900, marginBottom: "8px" }}>Official Routes</h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>Choose your difficulty</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "min(320px, 90vw)", marginBottom: "32px" }}>
          {Object.entries(DIFFICULTY).map(([d, cfg]) => (
            <button key={d} onClick={() => startGame(Number(d))} style={{
              padding: "16px 20px", background: "rgba(255,255,255,0.03)",
              border: `1px solid ${cfg.color}33`, borderRadius: "12px",
              color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}15`; e.currentTarget.style.borderColor = cfg.color; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = `${cfg.color}33`; }}>
              <div>
                <div style={{ color: cfg.color, fontSize: "20px", fontWeight: 900 }}>{cfg.label}</div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 400, marginTop: "2px" }}>{cfg.desc}</div>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{cfg.wallHeight} rows</div>
            </button>
          ))}
        </div>
        <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Back to Menu</button>
      </div>
    );
  }

  if (screen === "characterSelect") return <CharacterSelect selected={character} onSelect={(c) => { setCharacter(c); }} onBack={() => setScreen("menu")} />;
  if (screen === "routeTypes") return <RouteTypesScreen onBack={() => setScreen("menu")} />;
  if (screen === "routeCreator") return (
    <RouteCreatorScreen
      onBack={() => setScreen("menu")}
      onTestRoute={(route, wh, name) => startCustomGame(route, wh, name)}
      onPlaySaved={(sr) => {
        const route = sr.holds.map((h, i) => ({ ...h, id: i }));
        startCustomGame(route, sr.wallRows, sr.name, sr.id);
      }}
      character={character}
      editorState={editorState}
      setEditorState={setEditorState}
      savedRoutes={savedRoutes}
      onSaveRoute={(route) => setSavedRoutes(prev => [...prev, route])}
      onDeleteRoute={(id) => setSavedRoutes(prev => prev.filter(r => r.id !== id))}
    />
  );
  if (screen === "communityRoutes") return (
    <CommunityRoutesScreen
      onBack={() => setScreen("menu")}
      savedRoutes={savedRoutes}
      onPlay={(sr) => {
        const route = sr.holds.map((h, i) => ({ ...h, id: i }));
        startCustomGame(route, sr.wallRows, sr.name, sr.id);
      }}
    />
  );

  if (screen === "victory") {
    const elapsed = endTime && startTime ? ((endTime - startTime) / 1000).toFixed(1) : "?";
    const score = Math.max(0, Math.floor(1000 - (moveCount * 15) - (falls * 200) - (parseFloat(elapsed) * 3) + (difficulty * 400) + (dinosBeaten * 150) + (checkpointsHit * 50)));
    const isCustom = !!customRoute;
    const canRate = isCustom && customRouteId;
    return (
      <VictoryScreen
        ch={ch} isCustom={isCustom} customRouteName={customRouteName} customWallHeight={customWallHeight}
        difficulty={difficulty} moveCount={moveCount} falls={falls} elapsed={elapsed}
        dinosBeaten={dinosBeaten} checkpointsHit={checkpointsHit} score={score}
        canRate={canRate} customRouteId={customRouteId}
        onClimbAgain={() => isCustom ? startCustomGame(customRoute, customWallHeight, customRouteName, customRouteId) : startGame(difficulty)}
        onGoHarder={difficulty < 4 && !isCustom ? () => startGame(difficulty + 1) : null}
        onBack={() => isCustom ? setScreen("routeCreator") : setScreen("menu")}
        onRate={(stars, tags) => {
          if (!customRouteId) return;
          setSavedRoutes(prev => prev.map(r => {
            if (r.id !== customRouteId) return r;
            return {
              ...r,
              ratings: [...(r.ratings || []), stars],
              tags: [...(r.tags || []), ...tags],
            };
          }));
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", fontFamily: "'Georgia', serif", color: "#e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", padding: "8px" }}>
      {activeDino && <TimingBar dino={activeDino} stamina={stamina} onResult={handleDinoResult} />}
      <div style={{ width: "min(420px, 95vw)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", gap: "6px" }}>
        <button onClick={() => customRoute ? setScreen("routeCreator") : setScreen("menu")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#94a3b8", padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}>{customRoute ? "Editor" : "Menu"}</button>
        <div style={{ fontSize: "12px", color: "#64748b" }}>{ch.emoji} {ch.name}</div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>Moves: {moveCount}</div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>Falls: {falls}</div>
        <div style={{ fontSize: "12px", color: "#22c55e" }}>🦖{dinosBeaten}</div>
      </div>
      <div style={{ width: "min(420px, 95vw)", height: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", overflow: "hidden", marginBottom: "3px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ height: "100%", width: `${stamina}%`, background: stamina > 60 ? `linear-gradient(90deg, ${ch.color}, ${ch.color}cc)` : stamina > 30 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #ef4444, #f87171)", borderRadius: "8px", transition: "width 0.15s" }} />
      </div>
      <div style={{ width: "min(420px, 95vw)", display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "#64748b" }}>Stamina: {Math.round(stamina)}%</span>
        <span style={{ fontSize: "11px", color: "#64748b" }}>Height: {progress}%</span>
        {slipTimeLeft > 0 && currentHold && HOLD_TYPES[currentHold.type]?.slipTime && <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 700 }}>SLIP: {(slipTimeLeft / 1000).toFixed(1)}s</span>}
      </div>
      <div style={{ width: "min(420px, 95vw)", padding: "6px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "6px", fontSize: "13px", textAlign: "center", marginBottom: "8px", minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>{message}</div>
      <div style={{ width: `${WALL_W * CELL}px`, height: `${VIEW_ROWS * CELL}px`, overflow: "hidden", position: "relative", borderRadius: "10px", border: `2px solid ${ch.color}33`, background: "linear-gradient(180deg, rgba(30,30,50,0.9), rgba(20,20,40,0.95))", maxWidth: "95vw" }}>
        <div style={{ position: "absolute", width: "100%", height: `${(wallHeight + 2) * CELL}px`, bottom: `${-cameraY * CELL}px`, transition: "bottom 0.3s ease-out", background: `repeating-linear-gradient(0deg, transparent, transparent ${CELL - 1}px, rgba(255,255,255,0.03) ${CELL - 1}px, rgba(255,255,255,0.03) ${CELL}px), repeating-linear-gradient(90deg, transparent, transparent ${CELL - 1}px, rgba(255,255,255,0.03) ${CELL - 1}px, rgba(255,255,255,0.03) ${CELL}px)` }}>
          {holds.map(hold => {
            const ht = HOLD_TYPES[hold.type];
            const isCur = currentHold?.id === hold.id;
            const isR = reachable.some(h => h.id === hold.id);
            const hasDino = hold.dino && !isCur;
            const isCp = hold.type === "checkpoint";
            const wasCp = lastCheckpoint?.id === hold.id;
            return (
              <div key={hold.id} onClick={() => { if (isR || hold.type === "start") grabHold(hold); }}
                style={{
                  position: "absolute", left: `${hold.x * CELL + CELL / 2}px`, bottom: `${hold.y * CELL + CELL / 2}px`, transform: "translate(-50%, 50%)",
                  width: isCur ? "38px" : isCp ? "36px" : "30px", height: isCur ? "38px" : isCp ? "36px" : "30px",
                  borderRadius: ht.shape,
                  background: isCur ? `radial-gradient(circle, ${ht.color}, ${ht.color}88)` : isR ? `radial-gradient(circle, ${ht.color}cc, ${ht.color}66)` : `radial-gradient(circle, ${ht.color}44, ${ht.color}22)`,
                  border: isCur ? `3px solid ${ch.color}` : wasCp ? "2px solid #38bdf8" : isR ? `2px solid ${ht.color}aa` : `1px solid ${ht.color}33`,
                  cursor: isR || hold.type === "start" ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isCp ? "16px" : "13px", transition: "all 0.2s",
                  boxShadow: isCur ? `0 0 20px ${ch.color}44, 0 0 40px ${ch.color}22` : isCp && isR ? "0 0 15px #38bdf844" : isR ? `0 0 8px ${ht.color}33` : "none",
                  animation: isCur ? "pulse 1.5s ease-in-out infinite" : hasDino && isR ? "dinoShake 0.5s ease-in-out infinite" : isCp && isR ? "checkGlow 2s ease-in-out infinite" : "none",
                  zIndex: isCur ? 10 : isR ? 5 : 1, opacity: (!isR && !isCur && currentHold) ? 0.25 : 1,
                }}>
                {hold.type === "finish" ? "⭐" : hold.type === "start" ? "⬆️" : isCp ? "🔷" : hasDino ? DINO_TYPES[hold.dino].emoji : ""}
              </div>
            );
          })}
          {currentHold && (
            <div style={{ position: "absolute", left: `${currentHold.x * CELL + CELL / 2}px`, bottom: `${currentHold.y * CELL + CELL / 2 + 26}px`, transform: "translate(-50%, 50%)", fontSize: "22px", filter: `drop-shadow(0 2px 8px ${ch.color}66)`, transition: "all 0.3s ease-out", zIndex: 20 }}>{ch.emoji}</div>
          )}
        </div>
        <div style={{ position: "absolute", right: "4px", top: "4px", bottom: "4px", width: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
          <div style={{ position: "absolute", bottom: `${progress}%`, width: "6px", height: "12px", background: ch.color, borderRadius: "3px", transition: "bottom 0.3s" }} />
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { transform: translate(-50%, 50%) scale(1); } 50% { transform: translate(-50%, 50%) scale(1.15); } }
        @keyframes dinoShake { 0%, 100% { transform: translate(-50%, 50%) rotate(0deg); } 25% { transform: translate(-50%, 50%) rotate(-3deg); } 75% { transform: translate(-50%, 50%) rotate(3deg); } }
        @keyframes checkGlow { 0%, 100% { box-shadow: 0 0 8px #38bdf844; } 50% { box-shadow: 0 0 20px #38bdf866, 0 0 30px #38bdf833; } }
      `}</style>
    </div>
  );
}
