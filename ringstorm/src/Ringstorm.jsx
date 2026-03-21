import { useState, useEffect, useRef } from "react";

const D = Math.PI / 180;
const PW = [{id:"gun",n:"Gun",e:"🔫",c:"#f59e0b"},{id:"boost",n:"Boost",e:"🚀",c:"#22c55e"},{id:"missile",n:"Missile",e:"💥",c:"#ef4444"},{id:"star",n:"Star",e:"⭐",c:"#fbbf24"},{id:"flares",n:"Flares",e:"🛡️",c:"#38bdf8"}];
const LAPS = 3, NG = 12;

export default function Game() {
  const cv = useRef(null);
  const ky = useRef({});
  const af = useRef(null);
  const [sc, setSc] = useState("menu");
  const [gm, setGm] = useState(null);
  const [np, setNp] = useState(1);
  const [hd, setHd] = useState({});
  const [ed, setEd] = useState(null);

  function go(m, n) { setGm(m); setNp(n); setEd(null); setSc(m); }

  // Game engine
  useEffect(() => {
    if (sc !== "race" && sc !== "battle") return;
    const cn = cv.current;
    if (!cn) return;
    const x = cn.getContext("2d");
    const W = cn.width = 800, H = cn.height = 500;
    const i2 = np === 2, VH = i2 ? 250 : 500, iB = sc === "battle";

    // Course gates
    const crs = [];
    if (!iB) {
      for (let i = 0; i < NG; i++) {
        const a = (i / NG) * Math.PI * 2;
        crs.push({ x: Math.cos(a) * 1200 + Math.cos(a * 2) * 60, y: 180 + Math.sin(a * 2 + 1) * 30, z: Math.sin(a) * 1200 + Math.sin(a * 3) * 50, sz: 55 });
      }
    }

    // Powerup rings
    const br = [];
    for (let i = 0; i < (iB ? 16 : 8); i++) {
      const a = (i / (iB ? 16 : 8)) * Math.PI * 2, r = iB ? 200 + Math.random() * 350 : 300 + Math.random() * 500;
      br.push({ x: Math.cos(a) * r + (Math.random() - 0.5) * 120, y: 140 + Math.random() * 160, z: Math.sin(a) * r + (Math.random() - 0.5) * 120, sz: 25, cl: 0, rt: 0 });
    }

    // Simple terrain
    const TS = 3500, GR = 20, tH = [];
    for (let i = 0; i <= GR; i++) { tH[i] = []; for (let j = 0; j <= GR; j++) { const a = i / GR * 6, b = j / GR * 6; tH[i][j] = Math.sin(a * 1.2) * Math.cos(b * 0.8) * 80 + Math.sin(a * 2.5 + 1) * Math.cos(b * 1.8 + 2) * 40; } }
    function gH(wx, wz) {
      const gx = ((wx + TS / 2) / TS) * GR, gz = ((wz + TS / 2) / TS) * GR;
      const ix = Math.max(0, Math.min(GR - 1, Math.floor(gx))), iz = Math.max(0, Math.min(GR - 1, Math.floor(gz)));
      const fx = gx - ix, fz = gz - iz;
      return tH[ix][iz] * (1 - fx) * (1 - fz) + (tH[ix + 1]?.[iz] ?? tH[ix][iz]) * fx * (1 - fz) + (tH[ix]?.[iz + 1] ?? tH[ix][iz]) * (1 - fx) * fz + (tH[ix + 1]?.[iz + 1] ?? tH[ix][iz]) * fx * fz;
    }

    // Mountains (battle mode only)
    const mts = [];
    if (iB) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, d = 500 + Math.random() * 700;
        const mx = Math.cos(a) * d, mz = Math.sin(a) * d;
        mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht: 150 + Math.random() * 170, w: 50 + Math.random() * 55 });
      }
    }

    // Grand Canyon — continuous walls along course (race mode)
    const canyon = [];
    const canyonL = [], canyonR = [];
    if (!iB && crs.length > 1) {
      let ord = 0;
      for (let gi = 2; gi <= 9 && gi < NG; gi++) {
        const g1 = crs[gi], g2 = crs[(gi + 1) % NG];
        const steps = 8;
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const cx = g1.x + (g2.x - g1.x) * t, cz = g1.z + (g2.z - g1.z) * t;
          const dx = g2.x - g1.x, dz = g2.z - g1.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const px = -dz / len, pz = dx / len;
          const off = 55 + (Math.random() - 0.5) * 20;
          const ht = 220 + Math.random() * 130;
          const w = 45 + Math.random() * 10;
          const lx = cx + px * off, lz = cz + pz * off;
          const rx = cx - px * off, rz = cz - pz * off;
          const lw = { x: lx, z: lz, bY: gH(lx, lz), ht, w, side: 0, ord };
          const rw = { x: rx, z: rz, bY: gH(rx, rz), ht, w, side: 1, ord };
          canyon.push(lw); canyon.push(rw);
          canyonL.push(lw); canyonR.push(rw);
          ord++;
        }
      }
    }

    // Racers
    const defs = [
      { id: "p1", nm: "BLUE", ac: "#3b82f6", cp: "#60a5fa", npc: 0 },
      { id: "p2", nm: "RED", ac: "#ef4444", cp: "#f87171", npc: 0 },
      { id: "n1", nm: "VIPER", ac: "#22c55e", cp: "#4ade80", npc: 1 },
      { id: "n2", nm: "BLAZE", ac: "#f97316", cp: "#fb923c", npc: 1 },
      { id: "n3", nm: "STORM", ac: "#a855f7", cp: "#c084fc", npc: 1 },
    ];
    const ads = iB ? (i2 ? defs.slice(0, 2) : [defs[0], defs[2]]) : (i2 ? defs : [defs[0], ...defs.slice(2)]);
    const sp = iB ? { x: 0, y: 200, z: 0 } : (crs[0] || { x: 0, y: 200, z: 0 });
    const sd = (!iB && crs.length > 1) ? Math.atan2(crs[0].x - crs[NG - 1].x, crs[0].z - crs[NG - 1].z) : 0;

    const rs = ads.map((d, i) => {
      const row = Math.floor(i / 2), col = i % 2;
      const ox = (col === 0 ? -20 : 20), oz = -row * 45 - 70;
      return {
        ...d, x: sp.x + Math.cos(sd + Math.PI / 2) * ox + Math.sin(sd) * oz,
        y: sp.y + 10, z: sp.z + Math.sin(sd + Math.PI / 2) * ox + Math.cos(sd) * oz,
        p: 0, yw: sd, rl: 0, sp: 0, ms: d.npc ? 5.5 + Math.random() * 1 : 6,
        th: 0, tp: 0, tr: 0, wp: null, wt: 0, st: 0, bt: 0,
        cr: 0, ct: 0, cx: 0, cy: 0, cz: 0, ep: [],
        ng: 0, lp: 0, fn: 0, ft: 0, fp: 0, hf: 0,
        nw: Math.random() * 6, ns: 0.7 + Math.random() * 0.3, lv: 3, kl: 0,
      };
    });

    const cm = rs.filter(r => !r.npc).map(r => ({ x: r.x, y: r.y + 20, z: r.z - 50, lx: r.x, ly: r.y, lz: r.z }));
    let pj = [], fc = 0, cd = 240, started = 0, rt = 0, fo = [];

    function boom(p) {
      if (p.st > 0) return;
      p.cr = 1; p.ct = iB ? 70 : 80; p.cx = p.x; p.cy = p.y; p.cz = p.z; p.ep = [];
      for (let i = 0; i < 10; i++) p.ep.push({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 7, vy: Math.random() * 5 + 2, vz: (Math.random() - 0.5) * 7, s: 5 + Math.random() * 8, l: 25 + Math.random() * 30, ml: 55, t: 0 });
      for (let i = 0; i < 4; i++) p.ep.push({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 2, s: 7 + Math.random() * 10, l: 30 + Math.random() * 20, ml: 50, t: 1 });
      if (iB) p.lv--;
    }

    function boomFrom(p, attacker) { boom(p); if (iB && attacker && attacker !== p) attacker.kl++; }

    function resp(p) {
      p.cr = 0; p.ep = [];
      if (iB) {
        if (p.lv <= 0) { p.fn = 1; return; }
        const a = Math.random() * Math.PI * 2, d = 100 + Math.random() * 250;
        p.x = Math.cos(a) * d; p.y = 200 + Math.random() * 60; p.z = Math.sin(a) * d; p.yw = Math.random() * Math.PI * 2;
      } else {
        const g = crs[p.ng], v = crs[(p.ng - 1 + NG) % NG];
        p.x = (g.x + v.x) / 2; p.y = (g.y + v.y) / 2 + 30; p.z = (g.z + v.z) / 2;
        p.yw = Math.atan2(g.x - p.x, g.z - p.z);
      }
      p.p = 0; p.rl = 0; p.sp = 4; p.th = 0.5; p.tp = 0; p.tr = 0; p.wp = null; p.st = 0; p.bt = 0;
    }

    function checkCol(r) {
      if (r.y < gH(r.x, r.z) + 8) { boom(r); return 1; }
      for (const m of mts) {
        const d = Math.sqrt((r.x - m.x) ** 2 + (r.z - m.z) ** 2);
        const hf = Math.max(0, Math.min(1, (r.y - m.bY) / m.ht));
        if (d < m.w * 0.8 * (1 - hf * 0.7) + 10 && r.y < m.bY + m.ht && r.y > m.bY) { boom(r); return 1; }
      }
      for (const c of canyon) {
        const d = Math.sqrt((r.x - c.x) ** 2 + (r.z - c.z) ** 2);
        if (d < c.w + 10 && r.y < c.bY + c.ht && r.y > c.bY) { boom(r); return 1; }
      }
      if (r.y > 600) r.y = 600;
      return 0;
    }

    function getRings(r) {
      br.forEach(b => {
        if (b.cl) return;
        if (Math.sqrt((r.x - b.x) ** 2 + (r.y - b.y) ** 2 + (r.z - b.z) ** 2) < b.sz + 12) {
          b.cl = 1; b.rt = iB ? 200 : 300;
          const pw = PW[Math.floor(Math.random() * PW.length)];
          r.wp = pw.id; r.wt = pw.id === "gun" ? 8 : 0;
        }
      });
    }

    function checkGate(r) {
      if (iB || !crs.length) return;
      const g = crs[r.ng];
      if (Math.sqrt((r.x - g.x) ** 2 + (r.y - g.y) ** 2 + (r.z - g.z) ** 2) < g.sz + 18) {
        r.ng++;
        if (r.ng >= NG) { r.ng = 0; r.lp++; if (r.lp >= LAPS) { r.fn = 1; r.ft = rt; fo.push(r); r.fp = fo.length; } }
      }
    }

    function moveRacer(r, dt) {
      const cp = Math.cos(r.p), sp2 = Math.sin(r.p), cy = Math.cos(r.yw), sy = Math.sin(r.yw);
      r.x += sy * cp * r.sp; r.z += cy * cp * r.sp; r.y += sp2 * r.sp;
      return { sy, sp2, cy };
    }

    function updateNPC(r) {
      if (r.fn || r.cr) {
        if (r.cr) { r.ct--; r.ep.forEach(e => { e.x += e.vx * 0.3; e.y += e.vy * 0.3; e.z += e.vz * 0.3; e.vy -= 0.04; e.l--; e.s *= 0.98; }); r.ep = r.ep.filter(e => e.l > 0); if (r.ct <= 0) resp(r); }
        return;
      }
      let tx, ty, tz;
      if (iB) {
        const tg = rs.filter(t => t !== r && !t.cr && !t.fn);
        if (tg.length) { const t = tg.reduce((b, t) => { const d = Math.sqrt((t.x - r.x) ** 2 + (t.z - r.z) ** 2); return d < b.d ? { t, d } : b; }, { t: null, d: Infinity }).t; tx = t.x; ty = t.y; tz = t.z; }
        else { tx = r.x + 100; ty = r.y; tz = r.z; }
      } else { const g = crs[r.ng]; tx = g.x; ty = g.y; tz = g.z; }

      const dx = tx - r.x, dy = ty - r.y, dz = tz - r.z, dH = Math.sqrt(dx * dx + dz * dz);
      const tY = Math.atan2(dx, dz);
      r.nw += 0.02;
      let yd = tY + Math.sin(r.nw) * (1 - r.ns) * 5 * D - r.yw;
      while (yd > Math.PI) yd -= Math.PI * 2;
      while (yd < -Math.PI) yd += Math.PI * 2;

      r.tr = -Math.max(-50 * D, Math.min(50 * D, yd * 2.5));
      r.rl += (r.tr - r.rl) / 18;
      r.yw += (-r.rl * 2.2 * (r.sp / r.ms)) / 60;
      r.tp = Math.max(-15 * D, Math.min(15 * D, (dy / Math.max(50, dH)) * 40 * D));
      r.p += (r.tp - r.p) / 24;

      let ts = r.ms * (0.8 + r.ns * 0.2);
      if (r.bt > 0) { ts = r.ms * 1.25; r.bt--; }
      if (r.st > 0) { ts = Math.max(ts, r.ms * 1.2); r.st--; }
      r.sp += (ts - r.sp) / 40;

      const { sy, sp2, cy } = moveRacer(r, 1 / 60);

      // NPC weapon use
      if (r.wp && Math.random() < (iB ? 0.02 : 0.01)) {
        if (r.wp === "boost") { r.bt = 120; r.wp = null; }
        else if (r.wp === "star") { r.st = 180; r.wp = null; }
        else if (r.wp === "missile") {
          const tg = rs.filter(t => t !== r && !t.cr && !t.fn);
          if (tg.length) pj.push({ x: r.x, y: r.y, z: r.z, vx: sy * 12, vy: 0, vz: cy * 12, l: 180, s: 4, cl: "#ef4444", o: r, hm: 1, tg: tg[Math.floor(Math.random() * tg.length)] });
          r.wp = null;
        } else { r.wp = null; }
      }

      if (checkCol(r)) return;
      checkGate(r);
      getRings(r);
    }

    function updatePlayer(r, c, ks, uK, dK, lK, rK, upK, dvK, fK) {
      const dt = 1 / 60;
      if (r.fn) { c.lx += (r.x - c.lx) * dt * 3; c.ly += (r.y - c.ly) * dt * 3; c.lz += (r.z - c.lz) * dt * 3; return; }
      if (r.cr) {
        r.ct--; r.ep.forEach(e => { e.x += e.vx * 0.3; e.y += e.vy * 0.3; e.z += e.vz * 0.3; e.vy -= 0.04; e.l--; e.s *= 0.98; });
        r.ep = r.ep.filter(e => e.l > 0);
        c.lx += (r.cx - c.lx) * dt * 3; c.ly += (r.cy - c.ly) * dt * 3; c.lz += (r.cz - c.lz) * dt * 3;
        if (r.ct <= 0) resp(r);
        return;
      }

      r.th = 1;
      let ts = 1 + r.th * (r.ms - 1);
      if (r.bt > 0) { ts = r.ms * 1.25; r.bt--; }
      if (r.st > 0) { ts = Math.max(ts, r.ms * 1.2); r.st--; }
      r.sp += (ts - r.sp) * dt * 2;

      if (ks[lK]) r.tr = 50 * D; else if (ks[rK]) r.tr = -50 * D; else r.tr = 0;
      if (ks[uK]) r.tp = 25 * D; else if (ks[dK]) r.tp = -20 * D; else r.tp *= 0.9;
      r.rl += (r.tr - r.rl) * dt * 4;
      r.p += (r.tp - r.p) * dt * 3;
      r.yw += (-r.rl * 2.2 * (r.sp / r.ms)) * dt;

      const { sy, sp2, cy } = moveRacer(r, dt);

      // Fire weapon
      if (ks[fK] && r.wp && !ks["_" + fK]) {
        ks["_" + fK] = 1;
        setTimeout(() => { ks["_" + fK] = 0; }, 200);
        if (r.wp === "gun") {
          for (let i = -1; i <= 1; i += 2) pj.push({ x: r.x + i * 3, y: r.y, z: r.z, vx: sy * 20, vy: sp2 * 20, vz: cy * 20, l: 60, s: 2, cl: "#fbbf24", o: r, hm: 0 });
          r.wt--; if (r.wt <= 0) r.wp = null;
        } else if (r.wp === "missile") {
          const tgs = rs.filter(t => t !== r && !t.cr && !t.fn);
          const tg = tgs.length ? tgs.reduce((b, t) => { const d = Math.sqrt((t.x - r.x) ** 2 + (t.z - r.z) ** 2); return d < b.d ? { t, d } : b; }, { t: null, d: Infinity }).t : null;
          pj.push({ x: r.x, y: r.y, z: r.z, vx: sy * 12, vy: sp2 * 12, vz: cy * 12, l: 180, s: 4, cl: "#ef4444", o: r, hm: 1, tg: tg });
          r.wp = null;
        } else if (r.wp === "boost") { r.bt = 120; r.wp = null; }
        else if (r.wp === "star") { r.st = 180; r.wp = null; }
        else if (r.wp === "flares") {
          for (let i = 0; i < 6; i++) pj.push({ x: r.x, y: r.y, z: r.z, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 5 - 2, vz: (Math.random() - 0.5) * 12, l: 50, s: 3, cl: "#fff", o: r, hm: 0, fl: 1 });
          r.hf = 1; setTimeout(() => { r.hf = 0; }, 2000);
          r.wp = null;
        }
      }

      if (checkCol(r)) return;
      checkGate(r);
      getRings(r);

      const cD = 50 + r.sp * 2, cH = 10 + r.sp * 0.5;
      c.x += (r.x - sy * cD - c.x) * dt * 5;
      c.y += (r.y + cH - c.y) * dt * 4;
      c.z += (r.z - cy * cD - c.z) * dt * 5;
      c.lx += (r.x + sy * 25 - c.lx) * dt * 8;
      c.ly += (r.y - c.ly) * dt * 6;
      c.lz += (r.z + cy * 25 - c.lz) * dt * 8;
    }

    function proj(px, py, pz, cam, vh) {
      const dx = px - cam.x, dy = py - cam.y, dz = pz - cam.z;
      const lx = cam.lx - cam.x, ly = cam.ly - cam.y, lz = cam.lz - cam.z;
      const ll = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
      const fx = lx / ll, fy = ly / ll, fz = lz / ll;
      let rx = fz, rz = -fx;
      const rl = Math.sqrt(rx * rx + rz * rz) || 1;
      rx /= rl; rz /= rl;
      const cz = dx * fx + dy * fy + dz * fz;
      if (cz < 5) return null;
      const cx = dx * rx + dz * rz;
      const cy2 = -(dy - (dx * fx + dz * fz) * fy);
      return { sx: W / 2 + (cx / cz) * 500, sy: vh / 2 + (cy2 / cz) * 500, sc: 500 / cz, d: cz };
    }

    function renderView(cam, vw, yO, vh) {
      x.save();
      x.beginPath(); x.rect(0, yO, W, vh); x.clip(); x.translate(0, yO);
      // Sky
      const sg = x.createLinearGradient(0, 0, 0, vh);
      sg.addColorStop(0, "#0a1628"); sg.addColorStop(0.35, "#1a3a5c"); sg.addColorStop(0.75, "#4a8ab5"); sg.addColorStop(1, "#87CEEB");
      x.fillStyle = sg; x.fillRect(0, 0, W, vh);

      const rn = [];
      const stp = TS / GR, vD = 550;

      // Terrain
      for (let i = 0; i < GR; i += 2) {
        for (let j = 0; j < GR; j += 2) {
          const wx = -TS / 2 + i * stp, wz = -TS / 2 + j * stp;
          const dist = Math.sqrt((wx + stp - vw.x) ** 2 + (wz + stp - vw.z) ** 2);
          if (dist > vD) continue;
          const s2 = stp * 2;
          const p00 = proj(wx, tH[i][j], wz, cam, vh);
          const p10 = proj(wx + s2, tH[Math.min(i + 2, GR)]?.[j] ?? tH[i][j], wz, cam, vh);
          const p01 = proj(wx, tH[i]?.[Math.min(j + 2, GR)] ?? tH[i][j], wz + s2, cam, vh);
          const p11 = proj(wx + s2, tH[Math.min(i + 2, GR)]?.[Math.min(j + 2, GR)] ?? tH[i][j], wz + s2, cam, vh);
          if (!p00 && !p10 && !p01 && !p11) continue;
          const h = tH[i][j];
          let r, g, b;
          if (h < -20) { r = 30; g = 60; b = 100; } else if (h < 30) { r = 45; g = 85; b = 40; } else { r = 140; g = 130; b = 100; }
          const sh = Math.max(0.3, 1 - dist / vD);
          rn.push({ d: ((p00?.d || 9999) + (p10?.d || 9999)) / 2, f() {
            x.fillStyle = `rgba(${r * sh | 0},${g * sh | 0},${b * sh | 0},${sh})`;
            x.beginPath();
            if (p00) x.moveTo(p00.sx, p00.sy); else if (p10) x.moveTo(p10.sx, p10.sy);
            if (p10) x.lineTo(p10.sx, p10.sy);
            if (p11) x.lineTo(p11.sx, p11.sy);
            if (p01) x.lineTo(p01.sx, p01.sy);
            x.closePath(); x.fill();
          }});
        }
      }

      // Mountains
      mts.forEach(m => {
        const dist = Math.sqrt((m.x - vw.x) ** 2 + (m.z - vw.z) ** 2);
        if (dist > 1000) return;
        const al = Math.max(0.3, 1 - dist / 1000);
        const pP = proj(m.x, m.bY + m.ht, m.z, cam, vh);
        const pL = proj(m.x - m.w, m.bY, m.z, cam, vh);
        const pR = proj(m.x + m.w, m.bY, m.z, cam, vh);
        const pF = proj(m.x, m.bY, m.z - m.w, cam, vh);
        const pB = proj(m.x, m.bY, m.z + m.w, cam, vh);
        if (!pP) return;
        [[pL, pF, 0.6], [pF, pR, 0.8], [pR, pB, 0.5], [pB, pL, 0.4]].forEach(([a, b, sh]) => {
          if (!a || !b) return;
          rn.push({ d: (a.d + pP.d) / 2, f() {
            x.globalAlpha = al;
            x.fillStyle = `rgb(${70 * sh + 30 | 0},${60 * sh + 25 | 0},${50 * sh + 20 | 0})`;
            x.beginPath(); x.moveTo(a.sx, a.sy); x.lineTo(pP.sx, pP.sy); x.lineTo(b.sx, b.sy); x.closePath(); x.fill();
            // Snow
            x.fillStyle = `rgb(${200 * sh + 40 | 0},${200 * sh + 40 | 0},${210 * sh + 30 | 0})`;
            const sY = m.bY + m.ht * 0.7;
            const sA = proj((a.sx === pL?.sx ? m.x - m.w / 2 : a.sx === pF?.sx ? m.x : a.sx === pR?.sx ? m.x + m.w / 2 : m.x), sY, (a.sx === pL?.sx ? m.z : a.sx === pF?.sx ? m.z - m.w / 2 : a.sx === pR?.sx ? m.z : m.z + m.w / 2), cam, vh);
            x.globalAlpha = 1;
          }});
        });
      });

      // Canyon walls — smooth connected quads
      [canyonL, canyonR].forEach(side => {
        for (let i = 0; i < side.length - 1; i++) {
          const a = side[i], b = side[i + 1];
          const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
          const dist = Math.sqrt((mx - vw.x) ** 2 + (mz - vw.z) ** 2);
          if (dist > 500) continue;
          const al = Math.max(0.25, 1 - dist / 500);
          const minB = Math.min(a.bY, b.bY), maxT = Math.max(a.bY + a.ht, b.bY + b.ht);
          const totalH = maxT - minB;
          const thirds = [[minB, minB + totalH / 3, 100, 55, 35], [minB + totalH / 3, minB + totalH * 2 / 3, 170, 80, 40], [minB + totalH * 2 / 3, maxT, 210, 140, 75]];
          thirds.forEach(([yB, yT, lr, lg, lb]) => {
            const cyB = Math.max(yB, Math.max(a.bY, b.bY));
            const cyT = Math.min(yT, Math.min(a.bY + a.ht, b.bY + b.ht));
            if (cyB >= cyT) return;
            const pAB = proj(a.x, cyB, a.z, cam, vh);
            const pAT = proj(a.x, cyT, a.z, cam, vh);
            const pBB = proj(b.x, cyB, b.z, cam, vh);
            const pBT = proj(b.x, cyT, b.z, cam, vh);
            if (!pAB || !pAT || !pBB || !pBT) return;
            rn.push({ d: (pAB.d + pBB.d) / 2, f() {
              x.globalAlpha = al;
              x.fillStyle = `rgb(${lr},${lg},${lb})`;
              x.beginPath(); x.moveTo(pAB.sx, pAB.sy); x.lineTo(pAT.sx, pAT.sy); x.lineTo(pBT.sx, pBT.sy); x.lineTo(pBB.sx, pBB.sy); x.closePath(); x.fill();
              x.globalAlpha = 1;
            }});
          });
        }
      });

      // Course gates
      if (!iB) crs.forEach((ring, idx) => {
        const p = proj(ring.x, ring.y, ring.z, cam, vh);
        if (!p || p.d > 400) return;
        const s = ring.sz * p.sc;
        if (s < 2) return;
        const isN = idx === vw.ng;
        rn.push({ d: p.d, f() {
          x.strokeStyle = isN ? "rgba(50,255,50,1)" : "rgba(255,200,50,0.1)";
          x.lineWidth = isN ? Math.max(3, s * 0.14) : Math.max(1, s * 0.05);
          if (isN) { x.shadowColor = "rgba(50,255,50,0.5)"; x.shadowBlur = 8; }
          x.beginPath(); x.ellipse(p.sx, p.sy, s, s * 0.35, 0, 0, Math.PI * 2); x.stroke();
          x.shadowBlur = 0;
        }});
      });

      // Track rails (left and right lines along gate edges)
      if (!iB && crs.length > 1) {
        x.strokeStyle = "rgba(255,180,50,0.2)";
        x.lineWidth = 1.5;
        for (let i = 0; i < crs.length; i++) {
          const g1 = crs[i], g2 = crs[(i + 1) % crs.length];
          const dx = g2.x - g1.x, dz = g2.z - g1.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const px = -dz / len * 30, pz = dx / len * 30;
          const lA = proj(g1.x + px, g1.y, g1.z + pz, cam, vh);
          const lB = proj(g2.x + px, g2.y, g2.z + pz, cam, vh);
          const rA = proj(g1.x - px, g1.y, g1.z - pz, cam, vh);
          const rB = proj(g2.x - px, g2.y, g2.z - pz, cam, vh);
          if (lA && lB) { x.beginPath(); x.moveTo(lA.sx, lA.sy); x.lineTo(lB.sx, lB.sy); x.stroke(); }
          if (rA && rB) { x.beginPath(); x.moveTo(rA.sx, rA.sy); x.lineTo(rB.sx, rB.sy); x.stroke(); }
        }
      }

      // Bonus rings
      br.forEach(b => {
        if (b.cl) return;
        const p = proj(b.x, b.y, b.z, cam, vh);
        if (!p || p.d > 300) return;
        const s = b.sz * p.sc;
        if (s < 2) return;
        rn.push({ d: p.d, f() {
          x.strokeStyle = `rgba(255,150,255,${Math.min(0.6, 50 / p.d)})`;
          x.lineWidth = Math.max(1, s * 0.07);
          x.beginPath(); x.ellipse(p.sx, p.sy, s * 0.7, s * 0.25, 0, 0, Math.PI * 2); x.stroke();
        }});
      });

      // Other racers
      rs.forEach(r => {
        if (r === vw || r.cr || r.fn) return;
        const p = proj(r.x, r.y, r.z, cam, vh);
        if (!p || p.d > 400 || p.d < 5) return;
        const s = Math.max(3, 11 * p.sc);
        rn.push({ d: p.d, f() {
          x.save(); x.translate(p.sx, p.sy); x.rotate(-r.rl);
          const sc = s / 11;
          x.fillStyle = "#bbb";
          x.beginPath(); x.moveTo(-15 * sc, 2 * sc); x.lineTo(15 * sc, 2 * sc); x.lineTo(4 * sc, 3 * sc); x.lineTo(-4 * sc, 3 * sc); x.closePath(); x.fill();
          x.fillStyle = r.ac;
          x.fillRect(-16 * sc, 0, 3 * sc, 3 * sc); x.fillRect(13 * sc, 0, 3 * sc, 3 * sc);
          x.fillStyle = "#ddd";
          x.beginPath(); x.moveTo(0, -8 * sc); x.lineTo(2.5 * sc, 5 * sc); x.lineTo(-2.5 * sc, 5 * sc); x.closePath(); x.fill();
          if (r.st > 0) { x.fillStyle = "rgba(255,200,50,0.2)"; x.beginPath(); x.arc(0, 0, 16 * sc, 0, Math.PI * 2); x.fill(); }
          x.restore();
        }});
      });

      // Projectiles
      pj.forEach(pr => {
        const p = proj(pr.x, pr.y, pr.z, cam, vh);
        if (!p) return;
        const s = Math.max(1.5, pr.s * p.sc);
        rn.push({ d: p.d, f() { x.fillStyle = pr.cl; x.beginPath(); x.arc(p.sx, p.sy, s, 0, Math.PI * 2); x.fill(); }});
      });

      // Explosions
      rs.forEach(r => {
        r.ep.forEach(ep => {
          const p = proj(ep.x, ep.y, ep.z, cam, vh);
          if (!p) return;
          const s = ep.s * p.sc;
          if (s < 1) return;
          const lf = ep.l / ep.ml;
          rn.push({ d: p.d, f() {
            x.fillStyle = ep.t === 0 ? `rgba(255,${100 + lf * 155 | 0},${lf * 50 | 0},${lf * 0.8})` : `rgba(60,60,60,${lf * 0.3})`;
            x.beginPath(); x.arc(p.sx, p.sy, s, 0, Math.PI * 2); x.fill();
          }});
        });
      });

      // Sort and draw
      rn.sort((a, b) => b.d - a.d);
      rn.forEach(r => r.f());

      // Own plane
      if (!vw.cr && !vw.fn) {
        const sx = W / 2, sy = vh / 2 + (i2 ? 14 : 28);
        x.save(); x.translate(sx, sy - vw.p * (i2 ? 10 : 18)); x.rotate(-vw.rl);
        const s = i2 ? 0.85 : 1.3;
        if (vw.st > 0) { x.fillStyle = `rgba(255,200,50,${0.1 + Math.sin(fc * 0.3) * 0.05})`; x.beginPath(); x.arc(0, 0, 22 * s, 0, Math.PI * 2); x.fill(); }
        x.fillStyle = "#bbb"; x.beginPath(); x.moveTo(-15 * s, 2 * s); x.lineTo(15 * s, 2 * s); x.lineTo(4 * s, 3 * s); x.lineTo(-4 * s, 3 * s); x.closePath(); x.fill();
        x.fillStyle = vw.ac; x.fillRect(-16 * s, 0, 2.5 * s, 2.5 * s); x.fillRect(13.5 * s, 0, 2.5 * s, 2.5 * s);
        x.fillStyle = "#e0e0e0"; x.beginPath(); x.moveTo(0, -9 * s); x.lineTo(2.8 * s, -2 * s); x.lineTo(2.8 * s, 6 * s); x.lineTo(1.5 * s, 8 * s); x.lineTo(-1.5 * s, 8 * s); x.lineTo(-2.8 * s, 6 * s); x.lineTo(-2.8 * s, -2 * s); x.closePath(); x.fill();
        x.fillStyle = vw.cp; x.beginPath(); x.ellipse(0, -4.5 * s, 1.5 * s, 2.3 * s, 0, 0, Math.PI * 2); x.fill();
        if (vw.th > 0.3 || vw.bt > 0) { const ga = vw.bt > 0 ? 1 : (vw.th - 0.3) / 0.7; x.fillStyle = `rgba(${vw.bt > 0 ? "50,255,100" : "255," + (150 + ga * 105 | 0) + ",50"},${ga * 0.5})`; x.beginPath(); x.ellipse(0, 9 * s, 1.3 * s, (1 + ga * 2) * s, 0, 0, Math.PI * 2); x.fill(); }
        x.restore();
      } else if (vw.cr) {
        x.fillStyle = "#ef4444"; x.font = "bold " + (i2 ? 16 : 26) + "px Georgia"; x.textAlign = "center";
        x.fillText("CRASHED!", W / 2, vh / 2); x.font = (i2 ? 8 : 11) + "px Georgia"; x.fillStyle = "#94a3b8";
        x.fillText(Math.ceil(vw.ct / 60) + "...", W / 2, vh / 2 + (i2 ? 10 : 16)); x.textAlign = "start";
      } else if (vw.fn) {
        const txt = iB ? (vw.lv <= 0 ? "ELIMINATED" : "WINNER!") : (vw.fp === 1 ? "1st" : vw.fp === 2 ? "2nd" : vw.fp === 3 ? "3rd" : vw.fp + "th") + " PLACE!";
        x.fillStyle = vw.lv <= 0 ? "#ef4444" : "#fbbf24"; x.font = "bold " + (i2 ? 14 : 24) + "px Georgia"; x.textAlign = "center";
        x.fillText(txt, W / 2, vh / 2); x.textAlign = "start";
      }

      // HUD
      if (!iB) {
        x.font = "bold 10px Georgia"; x.textAlign = "right"; x.fillStyle = "#fbbf24";
        x.fillText("Lap " + Math.min(vw.lp + 1, LAPS) + "/" + LAPS, W - 5, 12);
        x.fillStyle = "#64748b"; x.font = "8px Georgia";
        x.fillText("Gate " + (vw.ng + 1) + "/" + NG, W - 5, 22); x.textAlign = "start";
        const so = [...rs].filter(r => !r.fn).sort((a, b) => (b.lp * NG + b.ng) - (a.lp * NG + a.ng));
        const pos = so.findIndex(r => r === vw) + 1 + fo.filter(r => r !== vw).length;
        x.fillStyle = pos === 1 ? "#fbbf24" : "#94a3b8"; x.font = "bold " + (i2 ? 11 : 16) + "px Georgia";
        x.fillText(pos + (pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th"), 4, vh - 5);
      }
      if (iB) {
        x.textAlign = "right"; x.font = "13px Georgia";
        let h = ""; for (let i = 0; i < 3; i++) h += i < vw.lv ? "❤️" : "🖤";
        x.fillText(h, W - 5, 15); x.textAlign = "start";
      }
      if (cd > 0) {
        const sec = Math.ceil(cd / 60);
        if (sec <= 3) { x.fillStyle = sec === 1 ? "#f97316" : "#fbbf24"; x.font = "bold " + (i2 ? 30 : 48) + "px Georgia"; x.textAlign = "center"; x.fillText(sec, W / 2, vh / 2); x.textAlign = "start"; }
      } else if (started && fc - 240 < 40) {
        x.fillStyle = "#22c55e"; x.font = "bold " + (i2 ? 30 : 48) + "px Georgia"; x.textAlign = "center"; x.fillText("GO!", W / 2, vh / 2); x.textAlign = "start";
      }
      x.restore();
    }

    function mainUpdate() {
      if (cd > 0) { cd--; fc++; return; }
      if (!started) { started = 1; rs.forEach(r => { r.th = 1; r.sp = 1; }); }
      rt++;

      const pl = rs.filter(r => !r.npc);
      if (pl[0]) updatePlayer(pl[0], cm[0], ky.current, "KeyW", "KeyS", "KeyA", "KeyD", "Space", "KeyQ", "KeyF");
      if (pl[1] && i2) updatePlayer(pl[1], cm[1], ky.current, "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Slash", "Period", "ShiftRight");
      rs.filter(r => r.npc).forEach(r => updateNPC(r));

      // Homing missiles
      pj.forEach(pr => {
        if (!pr.hm || !pr.tg) return;
        let tx = pr.tg.x, ty = pr.tg.y, tz = pr.tg.z;
        if (pr.tg.hf) {
          let nf = null, nd = Infinity;
          pj.forEach(fp => { if (fp.fl && fp.o === pr.tg) { const d = Math.sqrt((pr.x - fp.x) ** 2 + (pr.y - fp.y) ** 2 + (pr.z - fp.z) ** 2); if (d < nd) { nd = d; nf = fp; } } });
          if (nf) { tx = nf.x; ty = nf.y; tz = nf.z; }
        }
        const dx = tx - pr.x, dy = ty - pr.y, dz = tz - pr.z, dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        pr.vx += (dx / dist) * 0.4; pr.vy += (dy / dist) * 0.4; pr.vz += (dz / dist) * 0.4;
        const spd = Math.sqrt(pr.vx ** 2 + pr.vy ** 2 + pr.vz ** 2);
        if (spd > 14) { pr.vx *= 14 / spd; pr.vy *= 14 / spd; pr.vz *= 14 / spd; }
      });

      pj.forEach(p => { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.l--; });
      rs.forEach(pl => { if (pl.cr || pl.fn) return; pj.forEach(pr => { if (pr.o === pl) return; if (Math.sqrt((pl.x - pr.x) ** 2 + (pl.y - pr.y) ** 2 + (pl.z - pr.z) ** 2) < 15) { boomFrom(pl, pr.o); pr.l = 0; } }); });
      pj = pj.filter(p => p.l > 0);
      br.forEach(r => { if (r.cl) { r.rt--; if (r.rt <= 0) r.cl = 0; } });

      // End conditions
      if (iB) {
        const al = rs.filter(r => !r.fn);
        if (al.length <= 1) {
          const w = al[0] || rs.reduce((a, b) => a.kl > b.kl ? a : b);
          setEd({ w: w.nm, wc: w.ac, rs: [...rs].sort((a, b) => b.kl - a.kl || b.lv - a.lv).map(r => ({ nm: r.nm, ac: r.ac, kl: r.kl, lv: r.lv })) });
          setSc("battleEnd");
        }
      } else {
        if (rs.every(r => r.fn)) {
          setEd({ rs: fo.map((r, i) => ({ nm: r.nm, ac: r.ac, pl: i + 1, t: (r.ft / 60).toFixed(1) })) });
          setSc("raceEnd");
        }
      }

      fc++;
      const p1 = rs.find(r => r.id === "p1"), p2 = rs.find(r => r.id === "p2");
      setHd({ p1: p1 ? { s: p1.sp * 20 | 0, w: p1.wp, sa: p1.st > 0, ba: p1.bt > 0 } : {}, p2: p2 ? { s: p2.sp * 20 | 0, w: p2.wp, sa: p2.st > 0, ba: p2.bt > 0 } : {} });
    }

    function render() {
      x.clearRect(0, 0, W, H);
      const pl = rs.filter(r => !r.npc);
      if (i2) {
        renderView(cm[0], pl[0], 0, VH);
        renderView(cm[1], pl[1], VH, VH);
        x.fillStyle = "#000"; x.fillRect(0, VH - 1, W, 3);
        x.font = "bold 8px Georgia"; x.fillStyle = "#3b82f6"; x.fillText("P1", 3, VH - 3);
        x.fillStyle = "#ef4444"; x.fillText("P2", 3, VH + 10);
      } else {
        renderView(cm[0], pl[0], 0, H);
      }
    }

    function loop() { mainUpdate(); render(); af.current = requestAnimationFrame(loop); }
    af.current = requestAnimationFrame(loop);
    return () => { if (af.current) cancelAnimationFrame(af.current); };
  }, [sc, np]);

  // Key listeners
  useEffect(() => {
    const dn = (e) => { ky.current[e.code] = true; if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Slash", "Period", "ShiftRight"].includes(e.code)) e.preventDefault(); };
    const up = (e) => { ky.current[e.code] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  const bg = "linear-gradient(180deg,#0a1628,#1a1a2e,#16213e)";
  const ft = "'Georgia',serif";
  const btn = (text, color, onClick) => ({ padding: "18px", background: `linear-gradient(135deg,${color}22,${color}08)`, border: `2px solid ${color}66`, borderRadius: "14px", color, fontSize: "22px", fontWeight: 900, cursor: "pointer", letterSpacing: "3px" });

  // MENU
  if (sc === "menu") return (
    <div style={{ width: "100%", minHeight: "100vh", background: "linear-gradient(180deg,#0a1628,#1a3a5c,#4a8ab5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: ft, color: "#e2e8f0", padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "56px", marginBottom: "4px" }}>✈️</div>
      <h1 style={{ fontSize: "clamp(32px,7vw,48px)", fontWeight: 900, letterSpacing: "-2px", margin: "0 0 2px", background: "linear-gradient(135deg,#fbbf24,#ef4444,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>RINGSTORM</h1>
      <h2 style={{ fontSize: "clamp(13px,2.5vw,20px)", fontWeight: 400, letterSpacing: "6px", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 32px" }}>RACERS</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "min(280px,85vw)" }}>
        <button onClick={() => { setGm("race"); setSc("pick"); }} style={btn("RACE", "#fbbf24")}>RACE</button>
        <button onClick={() => { setGm("battle"); setSc("pick"); }} style={btn("BATTLE", "#ef4444")}>BATTLE</button>
        <button onClick={() => setSc("ctrl")} style={{ padding: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", color: "#94a3b8", fontSize: "16px", fontWeight: 700, cursor: "pointer", letterSpacing: "2px" }}>CONTROLS</button>
      </div>
      <p style={{ fontSize: "10px", color: "#4a5568", marginTop: "20px" }}>A flying racing game by Ephraim</p>
    </div>
  );

  // PICK PLAYERS
  if (sc === "pick") return (
    <div style={{ width: "100%", minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: ft, color: "#e2e8f0", padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "40px", marginBottom: "8px" }}>{gm === "race" ? "🏁" : "💥"}</div>
      <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 4px", color: gm === "race" ? "#fbbf24" : "#ef4444" }}>{gm === "race" ? "RACE" : "BATTLE"}</h2>
      <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "24px" }}>{gm === "race" ? LAPS + " laps · Fly through gates" : "3 lives · Last plane flying"}</p>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => go(gm, 1)} style={{ padding: "16px 32px", background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "18px", fontWeight: 900, cursor: "pointer" }}>1 PLAYER</button>
        <button onClick={() => go(gm, 2)} style={{ padding: "16px 32px", background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "18px", fontWeight: 900, cursor: "pointer" }}>2 PLAYER</button>
      </div>
      <button onClick={() => setSc("menu")} style={{ padding: "8px 20px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#64748b", fontSize: "12px", cursor: "pointer" }}>Back</button>
    </div>
  );

  // CONTROLS
  if (sc === "ctrl") return (
    <div style={{ width: "100%", minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: ft, color: "#e2e8f0", padding: "20px", textAlign: "center" }}>
      <h2 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "20px" }}>CONTROLS</h2>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginBottom: "20px", width: "min(500px,95vw)" }}>
        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: "12px", padding: "16px 20px", border: "2px solid #3b82f644", flex: "1", minWidth: "180px", textAlign: "left" }}>
          <div style={{ color: "#3b82f6", fontWeight: 900, fontSize: "14px", marginBottom: "10px" }}>PLAYER 1 — BLUE</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "2" }}>
            <div><b style={{ color: "#e2e8f0" }}>W</b> Rise</div>
            <div><b style={{ color: "#e2e8f0" }}>S</b> Dive</div>
            <div><b style={{ color: "#e2e8f0" }}>A/D</b> Turn</div>
            <div><b style={{ color: "#e2e8f0" }}>F</b> Weapon</div>
          </div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: "12px", padding: "16px 20px", border: "2px solid #ef444444", flex: "1", minWidth: "180px", textAlign: "left" }}>
          <div style={{ color: "#ef4444", fontWeight: 900, fontSize: "14px", marginBottom: "10px" }}>PLAYER 2 — RED</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "2" }}>
            <div><b style={{ color: "#e2e8f0" }}>↑</b> Rise</div>
            <div><b style={{ color: "#e2e8f0" }}>↓</b> Dive</div>
            <div><b style={{ color: "#e2e8f0" }}>←/→</b> Turn</div>
            <div><b style={{ color: "#e2e8f0" }}>Shift</b> Weapon</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "20px" }}>🟣 Purple rings = powerups · 🔫 Gun · 🚀 Boost · 💥 Homing Missile · ⭐ Star · 🛡️ Flares</div>
      <button onClick={() => setSc("menu")} style={{ padding: "12px 28px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "#e2e8f0", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Back to Menu</button>
    </div>
  );

  // RACE RESULT
  if (sc === "raceEnd" && ed) return (
    <div style={{ width: "100%", minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: ft, color: "#e2e8f0", padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginBottom: "8px" }}>🏆</div>
      <h1 style={{ fontSize: "32px", fontWeight: 900, margin: "0 0 20px", color: "#fbbf24" }}>RACE RESULTS</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "min(280px,85vw)", marginBottom: "24px" }}>
        {ed.rs.map((r, i) => (
          <div key={i} style={{ padding: i === 0 ? "12px" : "8px 12px", background: i === 0 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.02)", border: i === 0 ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 900, color: i === 0 ? "#fbbf24" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#64748b" }}>{r.pl}{r.pl === 1 ? "st" : r.pl === 2 ? "nd" : r.pl === 3 ? "rd" : "th"}</span>
              <span style={{ fontWeight: 700, color: r.ac }}>{r.nm}</span>
            </div>
            <span style={{ fontSize: "10px", color: "#64748b" }}>{r.t}s</span>
          </div>
        ))}
      </div>
      <button onClick={() => setSc("menu")} style={{ padding: "12px 32px", background: "linear-gradient(135deg,#f59e0b,#ef4444)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "16px", fontWeight: 900, cursor: "pointer" }}>MENU</button>
    </div>
  );

  // BATTLE RESULT
  if (sc === "battleEnd" && ed) return (
    <div style={{ width: "100%", minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: ft, color: "#e2e8f0", padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginBottom: "8px" }}>👑</div>
      <h1 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 4px", color: ed.wc }}>{ed.w} WINS!</h1>
      <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "20px" }}>Last plane standing</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "min(280px,85vw)", marginBottom: "24px" }}>
        {ed.rs.map((r, i) => (
          <div key={i} style={{ padding: "8px 12px", background: i === 0 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.02)", border: i === 0 ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: r.ac }}>{r.nm}</span>
            <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#64748b" }}>
              <span>💥{r.kl}</span>
              <span>{"❤️".repeat(Math.max(0, r.lv))}{"🖤".repeat(Math.max(0, 3 - r.lv))}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setSc("menu")} style={{ padding: "12px 32px", background: "linear-gradient(135deg,#f59e0b,#ef4444)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "16px", fontWeight: 900, cursor: "pointer" }}>MENU</button>
    </div>
  );

  // GAME RUNNING
  const w1 = hd.p1?.w ? PW.find(p => p.id === hd.p1.w) : null;
  const w2 = hd.p2?.w ? PW.find(p => p.id === hd.p2.w) : null;
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#0a1628", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: ft, position: "relative" }}>
      <canvas ref={cv} style={{ width: "min(800px,100vw)", height: "min(500px,62.5vw)" }} />
      <div style={{ position: "absolute", top: "2px", left: "3px", display: "flex", gap: "3px", fontSize: "9px" }}>
        <div style={{ background: "rgba(0,0,0,0.5)", padding: "2px 5px", borderRadius: "4px", color: "#22c55e", fontWeight: 900 }}>{hd.p1?.s || 0}</div>
        {w1 && <div style={{ background: "rgba(0,0,0,0.5)", padding: "2px 4px", borderRadius: "4px", border: "1px solid " + w1.c, color: w1.c, fontWeight: 700 }}>{w1.e}</div>}
        {hd.p1?.sa && <span style={{ color: "#fbbf24" }}>⭐</span>}
        {hd.p1?.ba && <span style={{ color: "#22c55e" }}>🚀</span>}
      </div>
      {np === 2 && (
        <div style={{ position: "absolute", top: "calc(50% + 2px)", left: "3px", display: "flex", gap: "3px", fontSize: "9px" }}>
          <div style={{ background: "rgba(0,0,0,0.5)", padding: "2px 5px", borderRadius: "4px", color: "#22c55e", fontWeight: 900 }}>{hd.p2?.s || 0}</div>
          {w2 && <div style={{ background: "rgba(0,0,0,0.5)", padding: "2px 4px", borderRadius: "4px", border: "1px solid " + w2.c, color: w2.c, fontWeight: 700 }}>{w2.e}</div>}
          {hd.p2?.sa && <span style={{ color: "#fbbf24" }}>⭐</span>}
          {hd.p2?.ba && <span style={{ color: "#22c55e" }}>🚀</span>}
        </div>
      )}
    </div>
  );
}
