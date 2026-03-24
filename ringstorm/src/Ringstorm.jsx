import { useState, useEffect, useRef } from "react";

const D = Math.PI / 180;
const PW = [{id:"gun",n:"Gun",e:"🔫",c:"#f59e0b"},{id:"boost",n:"Boost",e:"🚀",c:"#22c55e"},{id:"missile",n:"Missile",e:"💥",c:"#ef4444"},{id:"star",n:"Star",e:"⭐",c:"#fbbf24"},{id:"flares",n:"Flares",e:"🛡️",c:"#38bdf8"},{id:"lightning",n:"Storm",e:"⚡",c:"#a855f7"},{id:"tornado",n:"Tornado",e:"🌪️",c:"#06b6d4"}];
const LAPS = 3, NG = 6;
const SHORTCUTS = [
  { cr: 0, gateFrom: 2, gateTo: 3, gateskip: 1, type: "canyon" },
  { cr: 1, gateFrom: 4, gateTo: 5, gateskip: 1, type: "island" },
  { cr: 2, gateFrom: 3, gateTo: 4, gateskip: 1, type: "mountain" },
  { cr: 3, gateFrom: 0, gateTo: 1, gateskip: 1, type: "ocean" },
  { cr: 4, gateFrom: 3, gateTo: 4, gateskip: 1, type: "volcano" },
  { cr: 5, gateFrom: 0, gateTo: 1, gateskip: 1, type: "ice" },
];

export default function Game() {
  const cv = useRef(null);
  const ky = useRef({});
  const af = useRef(null);
  const [sc, setSc] = useState("menu");
  const [gm, setGm] = useState(null);
  const [np, setNp] = useState(1);
  const [hd, setHd] = useState({});
  const [ed, setEd] = useState(null);
  const [cr, setCr] = useState(0);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [night, setNight] = useState(false);
  const pauseRef = useRef(false);
  pauseRef.current = paused;

  function go(m, n) { setGm(m); setNp(n); setEd(null); setPaused(false); setSc(m); }

  // Game engine
  useEffect(() => {
    if (sc !== "race" && sc !== "battle") return;
    const cn = cv.current;
    if (!cn) return;
    const x = cn.getContext("2d");
    const W = cn.width = 800, H = cn.height = 500;
    const i2 = np === 2, VH = i2 ? 250 : 500, iB = sc === "battle";
    const isNight = night;

    // Course gates
    const crs = [];
    const baseY = cr === 3 ? 80 : cr === 1 ? 220 : cr === 5 ? 160 : 180;
    const yVar = cr === 3 ? 15 : 30;
    const courseR = cr === 4 ? 1500 : 1200;
    if (!iB) {
      for (let i = 0; i < NG; i++) {
        const a = (i / NG) * Math.PI * 2;
        crs.push({ x: Math.cos(a) * courseR + Math.cos(a * 2) * 60, y: baseY + Math.sin(a * 2 + 1) * yVar, z: Math.sin(a) * courseR + Math.sin(a * 3) * 50, sz: 55 });
      }
    }

    // Course-specific gate height overrides
    if (!iB && cr === 2 && crs.length >= NG) {
      // Mountain Pass: roller coaster profile
      crs[0].y = 180; crs[1].y = 180;
      crs[2].y = 100; crs[3].y = 110;
      crs[4].y = 300; crs[5].y = 180;
    }
    if (!iB && cr === 3 && crs.length >= NG) {
      // Ocean Run: wave skimming + low gates through arches at 1, 3, 5
      crs[0].y = 80;
      crs[1].y = 30; // through arch — low
      crs[2].y = 40;
      crs[3].y = 35; // through arch — low
      crs[4].y = 80;
      crs[5].y = 30; // through arch — low
    }

    // Mystery cubes — row of 4 cubes halfway between each gate pair
    const cubes = [];

    // Simple terrain
    const TS = 3500, GR = 20, tH = [];
    if (cr === 3) {
      // Ocean course — flat water
      for (let i = 0; i <= GR; i++) { tH[i] = []; for (let j = 0; j <= GR; j++) { tH[i][j] = -30 + Math.sin(i * 0.5) * 5 + Math.cos(j * 0.4) * 5; } }
    } else if (cr === 4) {
      // Volcano course — volcanic terrain with central peak
      for (let i = 0; i <= GR; i++) { tH[i] = []; for (let j = 0; j <= GR; j++) {
        const a = i / GR * 6, b = j / GR * 6;
        let h = Math.sin(a * 1.2) * Math.cos(b * 0.8) * 50 + Math.sin(a * 2.5 + 1) * Math.cos(b * 1.8 + 2) * 25;
        const wx = -TS / 2 + (i / GR) * TS, wz = -TS / 2 + (j / GR) * TS;
        const distC = Math.sqrt(wx * wx + wz * wz);
        h += 500 * Math.max(0, 1 - distC / 650);
        tH[i][j] = h;
      } }
    } else if (cr === 5) {
      // Ice Cavern — mostly flat frozen plains with gentle snow hills
      for (let i = 0; i <= GR; i++) { tH[i] = []; for (let j = 0; j <= GR; j++) {
        const a = i / GR * 6, b = j / GR * 6;
        let h = Math.sin(a * 1.5) * Math.cos(b * 1.1) * 30 + Math.sin(a * 2.8 + 1.5) * Math.cos(b * 2.0 + 1) * 15;
        const wx = -TS / 2 + (i / GR) * TS, wz = -TS / 2 + (j / GR) * TS;
        const distC = Math.sqrt(wx * wx + wz * wz);
        if (distC < 600) h = Math.min(h, -10); // frozen lake in center
        tH[i][j] = h;
      } }
    } else {
      for (let i = 0; i <= GR; i++) { tH[i] = []; for (let j = 0; j <= GR; j++) { const a = i / GR * 6, b = j / GR * 6; tH[i][j] = Math.sin(a * 1.2) * Math.cos(b * 0.8) * 80 + Math.sin(a * 2.5 + 1) * Math.cos(b * 1.8 + 2) * 40; } }
    }
    function gH(wx, wz) {
      const gx = ((wx + TS / 2) / TS) * GR, gz = ((wz + TS / 2) / TS) * GR;
      const ix = Math.max(0, Math.min(GR - 1, Math.floor(gx))), iz = Math.max(0, Math.min(GR - 1, Math.floor(gz)));
      const fx = gx - ix, fz = gz - iz;
      return tH[ix][iz] * (1 - fx) * (1 - fz) + (tH[ix + 1]?.[iz] ?? tH[ix][iz]) * fx * (1 - fz) + (tH[ix]?.[iz + 1] ?? tH[ix][iz]) * (1 - fx) * fz + (tH[ix + 1]?.[iz + 1] ?? tH[ix][iz]) * fx * fz;
    }

    // Mountains
    const mts = [];
    if (iB) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2, d = 500 + Math.random() * 700;
        const mx = Math.cos(a) * d, mz = Math.sin(a) * d;
        mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht: 150 + Math.random() * 170, w: 50 + Math.random() * 55 });
      }
    }
    // Course 0 (Grand Canyon): distant background mountains
    if (!iB && cr === 0 && crs.length > 1) {
      for (let i = 0; i < 5; i++) {
        const gi = Math.floor(Math.random() * NG);
        const g = crs[gi];
        const a = Math.atan2(g.z, g.x) + (Math.random() - 0.5) * 0.5;
        const d = 350 + Math.random() * 200;
        const mx = g.x + Math.cos(a) * d, mz = g.z + Math.sin(a) * d;
        mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht: 200 + Math.random() * 150, w: 60 + Math.random() * 50 });
      }
    }
    // Course 2 (Mountain Pass): clusters of mountains close to track
    if (!iB && cr === 2 && crs.length > 1) {
      for (let gi = 0; gi < NG; gi++) {
        const g1 = crs[gi], g2 = crs[(gi + 1) % NG];
        const dx = g2.x - g1.x, dz = g2.z - g1.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / len, pz = dx / len;
        // Valley section (gates 2-3): tight mountains on both sides
        const isValley = gi === 2 || gi === 3;
        const isPeak = gi === 4;
        const nmt = isValley ? 4 : isPeak ? 3 : 2;
        for (let j = 0; j < nmt; j++) {
          const t = 0.15 + Math.random() * 0.7;
          const cx = g1.x + dx * t, cz = g1.z + dz * t;
          const side = isValley ? (j < nmt / 2 ? 1 : -1) : (Math.random() < 0.5 ? 1 : -1);
          const off = isValley ? 80 + Math.random() * 40 : isPeak ? 60 + Math.random() * 50 : 80 + Math.random() * 100;
          const mx = cx + px * off * side + (Math.random() - 0.5) * 20;
          const mz = cz + pz * off * side + (Math.random() - 0.5) * 20;
          const ht = isValley ? 220 + Math.random() * 150 : isPeak ? 280 + Math.random() * 180 : 180 + Math.random() * 200;
          mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht, w: 40 + Math.random() * 40 });
        }
      }
    }
    // Course 1 (Island Skies): floating islands along the path
    const islands = [];
    if (!iB && cr === 1 && crs.length > 1) {
      for (let gi = 0; gi < NG; gi++) {
        const g1 = crs[gi], g2 = crs[(gi + 1) % NG];
        const dx = g2.x - g1.x, dz = g2.z - g1.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / len, pz = dx / len;
        const ni = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < ni; j++) {
          const t = 0.1 + Math.random() * 0.8;
          const cx = g1.x + dx * t, cz = g1.z + dz * t;
          const side = Math.random() < 0.5 ? 1 : -1;
          const off = 60 + Math.random() * 120;
          const ix = cx + px * off * side + (Math.random() - 0.5) * 40;
          const iz = cz + pz * off * side + (Math.random() - 0.5) * 40;
          islands.push({ x: ix, z: iz, y: 160 + Math.random() * 100, w: 20 + Math.random() * 35, h: 10 + Math.random() * 15 });
        }
      }
    }

    // Course 3 (Ocean Run): rock pillars sticking out of the ocean
    if (!iB && cr === 3 && crs.length > 1) {
      for (let i = 0; i < 12; i++) {
        const gi = Math.floor(Math.random() * NG);
        const g1 = crs[gi], g2 = crs[(gi + 1) % NG];
        const t = Math.random();
        const dx = g2.x - g1.x, dz = g2.z - g1.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / len, pz = dx / len;
        const side = Math.random() < 0.5 ? 1 : -1;
        const off = 60 + Math.random() * 100;
        const mx = g1.x + dx * t + px * off * side;
        const mz = g1.z + dz * t + pz * off * side;
        mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht: 40 + Math.random() * 40, w: 15 + Math.random() * 20 });
      }
    }

    // Pirate ships (Ocean Run scenery)
    const ships = [];
    if (!iB && cr === 3 && crs.length > 1) {
      for (let i = 0; i < 8; i++) {
        const gi = Math.floor(Math.random() * NG);
        const g = crs[gi];
        const a = Math.random() * Math.PI * 2;
        const d = 40 + Math.random() * 110;
        ships.push({ x: g.x + Math.cos(a) * d, z: g.z + Math.sin(a) * d, y: -25, phase: Math.random() * Math.PI * 2, rot: Math.random() * Math.PI * 2 });
      }
    }

    // Rock arches (Ocean Run scenery) — 3 big arches near gates 1, 3, 5
    const arches = [];
    if (!iB && cr === 3 && crs.length > 1) {
      [1, 3, 5].forEach(gi => {
        if (gi >= NG) return;
        const g = crs[gi];
        const g2 = crs[(gi + 1) % NG];
        const dx = g2.x - g.x, dz = g2.z - g.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / len, pz = dx / len;
        const spread = 60 + Math.random() * 15;
        arches.push({
          lx: g.x + px * spread, lz: g.z + pz * spread,
          rx: g.x - px * spread, rz: g.z - pz * spread,
          y: -25, ht: 60 + Math.random() * 20, w: 18 + Math.random() * 6
        });
      });
    }

    // Volcano course: dark rock formations + lava particles
    if (!iB && cr === 4 && crs.length > 1) {
      for (let i = 0; i < 6; i++) {
        const gi = Math.floor(Math.random() * NG);
        const g1 = crs[gi], g2 = crs[(gi + 1) % NG];
        const t = Math.random();
        const dx = g2.x - g1.x, dz = g2.z - g1.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / len, pz = dx / len;
        const side = Math.random() < 0.5 ? 1 : -1;
        const off = 80 + Math.random() * 120;
        const mx = g1.x + dx * t + px * off * side;
        const mz = g1.z + dz * t + pz * off * side;
        mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht: 100 + Math.random() * 120, w: 35 + Math.random() * 30, volcanic: 1 });
      }
    }
    const lavaP = [];
    if (!iB && cr === 4) {
      for (let i = 0; i < 14; i++) {
        lavaP.push({ x: (Math.random() - 0.5) * 60, y: 380 + Math.random() * 120, z: (Math.random() - 0.5) * 60, vy: 0.3 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
      }
    }

    // Ice Cavern — massive ice mountains forming narrow valleys, ice arches (Course 5)
    if (!iB && cr === 5 && crs.length > 1) {
      // Cluster 1: gates 0-1 — 4 mountains flanking the path
      // Cluster 2: gates 2-3 — 5 mountains, tight valley
      // Cluster 3: gates 4-5 — 4 mountains flanking
      const clusters = [
        { gates: [0, 1], count: 4 },
        { gates: [2, 3], count: 5 },
        { gates: [4, 5], count: 4 },
      ];
      clusters.forEach(cl => {
        const g1 = crs[cl.gates[0]], g2 = crs[cl.gates[1] % NG];
        const ddx = g2.x - g1.x, ddz = g2.z - g1.z;
        const dlen = Math.sqrt(ddx * ddx + ddz * ddz) || 1;
        const px = -ddz / dlen, pz = ddx / dlen;
        for (let i = 0; i < cl.count; i++) {
          const t = 0.15 + Math.random() * 0.7;
          const cx = g1.x + ddx * t, cz = g1.z + ddz * t;
          const side = (i % 2 === 0) ? 1 : -1;
          const off = 70 + Math.random() * 50;
          const mx = cx + px * side * off, mz = cz + pz * side * off;
          mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht: 150 + Math.random() * 130, w: 60 + Math.random() * 40, icy: 1 });
        }
      });
      // Extra scattered mountains between clusters
      for (let i = 0; i < 7; i++) {
        const gi = Math.floor(Math.random() * NG);
        const g = crs[gi];
        const a = Math.random() * Math.PI * 2, d = 100 + Math.random() * 200;
        const mx = g.x + Math.cos(a) * d, mz = g.z + Math.sin(a) * d;
        mts.push({ x: mx, z: mz, bY: gH(mx, mz), ht: 130 + Math.random() * 120, w: 50 + Math.random() * 30, icy: 1 });
      }
      // Ice arches — 3 arches at midpoints between gates 1-2, 3-4, 5-0
      [[1,2],[3,4],[5,0]].forEach(([ga, gb]) => {
        if (ga >= NG || gb >= NG) return;
        const g1 = crs[ga], g2 = crs[gb];
        const amx = (g1.x + g2.x) / 2, amz = (g1.z + g2.z) / 2;
        const adx = g2.x - g1.x, adz = g2.z - g1.z;
        const alen = Math.sqrt(adx * adx + adz * adz) || 1;
        const apx = -adz / alen, apz = adx / alen;
        const spread = 65 + Math.random() * 15;
        arches.push({
          lx: amx + apx * spread, lz: amz + apz * spread,
          rx: amx - apx * spread, rz: amz - apz * spread,
          y: gH(amx, amz), ht: 70 + Math.random() * 20, w: 20 + Math.random() * 8, iceArch: true
        });
      });
      // Safety cleanup: remove mountains that block the flight path
      for (let i = mts.length - 1; i >= 0; i--) {
        const m = mts[i];
        if (!m.icy) continue;
        let tooClose = false;
        for (const g of crs) {
          if (Math.sqrt((m.x - g.x) ** 2 + (m.z - g.z) ** 2) < 80) { tooClose = true; break; }
        }
        if (!tooClose) {
          for (let gi = 0; gi < NG; gi++) {
            const ga = crs[gi], gb = crs[(gi + 1) % NG];
            const mx = (ga.x + gb.x) / 2, mz2 = (ga.z + gb.z) / 2;
            if (Math.sqrt((m.x - mx) ** 2 + (m.z - mz2) ** 2) < 60) { tooClose = true; break; }
          }
        }
        if (tooClose) mts.splice(i, 1);
      }
    }

    // Grand Canyon — continuous walls along course (Course 0 only)
    const canyon = [];
    const canyonL = [], canyonR = [];
    if (!iB && cr === 0 && crs.length > 1) {
      let ord = 0;
      for (let gi = 1; gi <= 4 && gi < NG; gi++) {
        const g1 = crs[gi], g2 = crs[(gi + 1) % NG];
        const steps = 8;
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const cx = g1.x + (g2.x - g1.x) * t, cz = g1.z + (g2.z - g1.z) * t;
          const dx = g2.x - g1.x, dz = g2.z - g1.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const px = -dz / len, pz = dx / len;
          const off = 140 + (Math.random() - 0.5) * 8;
          const ht = 250 + Math.sin(ord * 0.3) * 50;
          const w = 45 + Math.random() * 10;
          const lx = cx + px * off, lz = cz + pz * off;
          const rx = cx - px * off, rz = cz - pz * off;
          const lw = { x: lx, z: lz, bY: gH(lx, lz), ht, w, side: 0, ord, px, pz };
          const rw = { x: rx, z: rz, bY: gH(rx, rz), ht, w, side: 1, ord, px: -px, pz: -pz };
          canyon.push(lw); canyon.push(rw);
          canyonL.push(lw); canyonR.push(rw);
          ord++;
        }
      }
      // Smoothing passes — average positions and heights with neighbors (2 passes)
      for (let pass = 0; pass < 2; pass++) {
        [canyonL, canyonR].forEach(side => {
          for (let i = 1; i < side.length - 1; i++) {
            side[i].x = (side[i - 1].x + side[i].x + side[i + 1].x) / 3;
            side[i].z = (side[i - 1].z + side[i].z + side[i + 1].z) / 3;
            side[i].ht = (side[i - 1].ht + side[i].ht + side[i + 1].ht) / 3;
          }
        });
      }
    }
    // Shortcut bonus gates — one per course (race only)
    const bonusGates = [];
    if (!iB && crs.length > 1) {
      const scut = SHORTCUTS.find(s => s.cr === cr);
      if (scut) {
        const g1 = crs[scut.gateFrom], g2 = crs[scut.gateTo];
        const mx = (g1.x + g2.x) / 2, mz = (g1.z + g2.z) / 2, my = (g1.y + g2.y) / 2;
        const ddx = g2.x - g1.x, ddz = g2.z - g1.z;
        const dlen = Math.sqrt(ddx * ddx + ddz * ddz) || 1;
        const px = -ddz / dlen, pz = ddx / dlen;
        let bx = mx, by = my, bz = mz;
        if (scut.type === "canyon") { bx = mx - px * 180; bz = mz - pz * 180; }
        else if (scut.type === "island") { bx = mx + px * 80; bz = mz + pz * 80; by = my - 40; }
        else if (scut.type === "mountain") { bx = mx + px * 100; bz = mz + pz * 100; by = my - 20; }
        else if (scut.type === "ocean") { bx = mx + px * 120; bz = mz + pz * 120; by = 40; }
        else if (scut.type === "volcano") {
          const toC = Math.atan2(-mx, -mz);
          bx = mx + Math.sin(toC) * 100; bz = mz + Math.cos(toC) * 100; by = my + 20;
        }
        else if (scut.type === "ice") { bx = mx + px * 60; bz = mz + pz * 60; by = my - 15; }
        bonusGates.push({ x: bx, y: by, z: bz, sz: 25, gateFrom: scut.gateFrom, gateskip: scut.gateskip, type: scut.type });
      }
      // Canyon shortcut: remove 2 right-wall segments between gates 2-3 to create a gap
      if (cr === 0 && bonusGates.length > 0) {
        const removeOrds = [10, 11];
        for (let i2 = canyon.length - 1; i2 >= 0; i2--) {
          if (canyon[i2].side === 1 && removeOrds.includes(canyon[i2].ord)) canyon.splice(i2, 1);
        }
        canyonR.length = 0;
        canyon.forEach(c => { if (c.side === 1) canyonR.push(c); });
      }
      // Island shortcut: add large island above bonus gate
      if (cr === 1 && bonusGates.length > 0) {
        const bg = bonusGates[0];
        islands.push({ x: bg.x, z: bg.z, y: bg.y + 30, w: 40, h: 20 });
      }
      // Ocean shortcut: add extra arch near bonus gate
      if (cr === 3 && bonusGates.length > 0) {
        const bg = bonusGates[0];
        const adx = crs[1].x - crs[0].x, adz = crs[1].z - crs[0].z;
        const alen = Math.sqrt(adx * adx + adz * adz) || 1;
        const apx = -adz / alen, apz = adx / alen;
        arches.push({ lx: bg.x + apx * 50, lz: bg.z + apz * 50, rx: bg.x - apx * 50, rz: bg.z - apz * 50, y: -25, ht: 55 + Math.random() * 15, w: 16 + Math.random() * 5 });
      }
    }

    // Generate mystery cube stations — race: 1 station per gate pair, battle: 4 stations (N/S/E/W)
    if (iB) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2, r = 250;
        const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = 200;
        const px = -Math.sin(a), pz = Math.cos(a);
        for (const off of [-20, 20]) {
          cubes.push({ x: cx + px * off, y: cy, z: cz + pz * off, active: true, rt: 0 });
        }
      }
    } else if (crs.length > 1) {
      for (let i = 0; i < NG; i++) {
        const g1 = crs[i], g2 = crs[(i + 1) % NG];
        const mx = (g1.x + g2.x) / 2, mz = (g1.z + g2.z) / 2, my = (g1.y + g2.y) / 2;
        const dx = g2.x - g1.x, dz = g2.z - g1.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / len, pz = dx / len;
        for (const off of [-45, -15, 15, 45]) {
          cubes.push({ x: mx + px * off, y: my, z: mz + pz * off, active: true, rt: 0 });
        }
      }
    }

    // Special cubes — lightning (station 2) and tornado (station 4, race only)
    const stormCubes = [];
    if (crs.length > 1) {
      // Lightning cube: extra cube at end of station 2
      const si = 2 < NG ? 2 : 0;
      const lg1 = crs[si], lg2 = crs[(si + 1) % NG];
      const lmx = (lg1.x + lg2.x) / 2, lmz = (lg1.z + lg2.z) / 2, lmy = (lg1.y + lg2.y) / 2;
      const ldx = lg2.x - lg1.x, ldz = lg2.z - lg1.z, llen = Math.sqrt(ldx * ldx + ldz * ldz) || 1;
      const lpx = -ldz / llen, lpz = ldx / llen;
      stormCubes.push({ x: lmx + lpx * 75, y: lmy, z: lmz + lpz * 75, active: true, rt: 0, noRespawn: true, gives: "lightning" });
      // Tornado cube: extra cube at end of station 4 (race only)
      if (!iB) {
        const ti = 4 < NG ? 4 : 0;
        const tg1 = crs[ti], tg2 = crs[(ti + 1) % NG];
        const tmx = (tg1.x + tg2.x) / 2, tmz = (tg1.z + tg2.z) / 2, tmy = (tg1.y + tg2.y) / 2;
        const tdx = tg2.x - tg1.x, tdz = tg2.z - tg1.z, tlen = Math.sqrt(tdx * tdx + tdz * tdz) || 1;
        const tpx = -tdz / tlen, tpz = tdx / tlen;
        stormCubes.push({ x: tmx + tpx * 75, y: tmy, z: tmz + tpz * 75, active: true, rt: 0, noRespawn: true, gives: "tornado" });
      }
    }

    // Flight path safety cleanup — remove terrain objects too close to gates or the path between them
    if (!iB && crs.length > 1) {
      const clearR = 80;
      // Collect all clearance points: gates + 4 midpoints between each consecutive gate pair
      const clearPts = [];
      crs.forEach(g => clearPts.push({ x: g.x, z: g.z }));
      for (let i = 0; i < NG; i++) {
        const g1 = crs[i], g2 = crs[(i + 1) % NG];
        for (let t = 0.2; t <= 0.8; t += 0.2) {
          clearPts.push({ x: g1.x + (g2.x - g1.x) * t, z: g1.z + (g2.z - g1.z) * t });
        }
      }
      function tooClose(obj) {
        for (const pt of clearPts) {
          if (Math.sqrt((obj.x - pt.x) ** 2 + (obj.z - pt.z) ** 2) < clearR) return true;
        }
        return false;
      }
      // Filter mountains/pillars
      for (let i = mts.length - 1; i >= 0; i--) { if (tooClose(mts[i])) mts.splice(i, 1); }
      // Filter floating islands
      for (let i = islands.length - 1; i >= 0; i--) { if (tooClose(islands[i])) islands.splice(i, 1); }
      // Filter canyon walls
      for (let i = canyon.length - 1; i >= 0; i--) { if (tooClose(canyon[i])) canyon.splice(i, 1); }
      // Rebuild canyonL/canyonR after cleanup
      canyonL.length = 0; canyonR.length = 0;
      canyon.forEach(c => { if (c.side === 0) canyonL.push(c); else canyonR.push(c); });
      // Filter ships
      for (let i = ships.length - 1; i >= 0; i--) { if (tooClose(ships[i])) ships.splice(i, 1); }
    }

    // Racers
    const defs = [
      { id: "p1", nm: "BLUE", ac: "#3b82f6", cp: "#60a5fa", sc: "#ffffff", npc: 0 },
      { id: "p2", nm: "RED", ac: "#ef4444", cp: "#f87171", sc: "#ffffff", npc: 0 },
      { id: "n1", nm: "VIPER", ac: "#22c55e", cp: "#4ade80", sc: "#1a1a1a", npc: 1 },
      { id: "n2", nm: "BLAZE", ac: "#f59e0b", cp: "#fbbf24", sc: "#1a1a1a", npc: 1 },
      { id: "n3", nm: "STORM", ac: "#a855f7", cp: "#c084fc", sc: "#1a1a1a", npc: 1 },
    ];
    const ads = iB ? (i2 ? [...defs] : [defs[0], ...defs.slice(2)]) : (i2 ? defs : [defs[0], ...defs.slice(2)]);
    const startY = cr === 3 ? 100 : cr === 1 ? 230 : cr === 5 ? 170 : 200;
    const sp = iB ? { x: 0, y: 200, z: 0 } : (crs[0] ? { ...crs[0], y: startY } : { x: 0, y: startY, z: 0 });
    const sd = (!iB && crs.length > 1) ? Math.atan2(crs[0].x - crs[NG - 1].x, crs[0].z - crs[NG - 1].z) : 0;

    const rs = ads.map((d, i) => {
      let sx, sy2, sz, syw;
      if (iB) {
        // Battle: wide circle, facing tangent direction
        const ang = (i / ads.length) * Math.PI * 2;
        sx = Math.cos(ang) * 200; sy2 = 200; sz = Math.sin(ang) * 200;
        syw = Math.atan2(0 - sx, 0 - sz); // face toward center
      } else {
        const row = Math.floor(i / 2), col = i % 2;
        const ox = (col === 0 ? -20 : 20), oz = -row * 45 - 70;
        sx = sp.x + Math.cos(sd + Math.PI / 2) * ox + Math.sin(sd) * oz;
        sy2 = sp.y + 10;
        sz = sp.z + Math.sin(sd + Math.PI / 2) * ox + Math.cos(sd) * oz;
        syw = sd;
      }
      return {
        ...d, x: sx, y: sy2, z: sz,
        p: 0, yw: syw, rl: 0, sp: 0, ms: d.npc ? 3.7 + Math.random() * 0.7 : 4,
        th: 0, tp: 0, tr: 0, wp: null, wt: 0, st: 0, bt: 0,
        cr: 0, ct: 0, cx: 0, cy: 0, cz: 0, ep: [],
        ng: 0, lp: 0, fn: 0, ft: 0, fp: 0, hf: 0,
        nw: Math.random() * 6, ns: 0.7 + Math.random() * 0.3, lv: 3, kl: 0, zap: 0, tumble: 0,
        slDraft: 0, slTarget: null, slBoost: 0, scUsed: new Set(),
        trail: [], trickRoll: 0, trickDir: 0, trickTimer: 0, trickFrame: 0, lastLF: 0, lastRF: 0,
      };
    });

    // Battle mode: force positions, yaw, and speed AFTER all init
    if (iB) {
      rs.forEach((r, i) => {
        const ang = (i / rs.length) * Math.PI * 2;
        r.x = Math.cos(ang) * 200;
        r.z = Math.sin(ang) * 200;
        r.y = 200;
        r.yw = Math.atan2(0 - r.x, 0 - r.z);
        r.sp = 0;
        r.th = 1;
      });
    }
    const cm = rs.filter(r => !r.npc).map(r => ({ x: r.x, y: r.y + 20, z: r.z - 50, lx: r.x, ly: r.y, lz: r.z }));
    // Battle mode: position cameras behind racers based on actual yaw
    if (iB) {
      const pls = rs.filter(r => !r.npc);
      pls.forEach((r, i) => {
        if (cm[i]) {
          cm[i].x = r.x - Math.sin(r.yw) * 50;
          cm[i].y = r.y + 20;
          cm[i].z = r.z - Math.cos(r.yw) * 50;
          cm[i].lx = r.x;
          cm[i].ly = r.y;
          cm[i].lz = r.z;
        }
      });
    }
    let pj = [], storms = [], fc = 0, cd = 240, started = 0, rt = 0, fo = [];
    let tsunami = { active: false, triggered: false, angle: 0, progress: 0, duration: 420, spray: [] };
    let earthquake = { active: false, triggered: false, progress: 0, duration: 360, intensity: 0, rocks: [] };
    let replayBuf = [], replayMode = false, replayFrame = 0, firstFinishFrame = 0;
    let announcements = [], fireworks = [], victoryTarget = null, victoryFrame = 0;
    function addAnnouncement(text, color) {
      if (announcements.some(a => a.text === text && a.timer > 60)) return;
      announcements.push({ text, color, timer: 90, y: 0 });
    }

    function boom(p) {
      if (p.st > 0) return;
      p.cr = 1; p.ct = iB ? 70 : 80; p.cx = p.x; p.cy = p.y; p.cz = p.z; p.ep = [];
      for (let i = 0; i < 10; i++) p.ep.push({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 7, vy: Math.random() * 5 + 2, vz: (Math.random() - 0.5) * 7, s: 5 + Math.random() * 8, l: 25 + Math.random() * 30, ml: 55, t: 0 });
      for (let i = 0; i < 4; i++) p.ep.push({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 2, s: 7 + Math.random() * 10, l: 30 + Math.random() * 20, ml: 50, t: 1 });
      for (let i = 0; i < 6; i++) p.ep.push({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 14, vy: Math.random() * 8 + 3, vz: (Math.random() - 0.5) * 14, s: 2 + Math.random() * 2, l: 10 + Math.random() * 10, ml: 20, t: 2 });
      if (iB) p.lv--;
      if (!p.npc) addAnnouncement("CRASH!", "#ef4444");
    }

    function boomFrom(p, attacker) { boom(p); if (iB && attacker && attacker !== p) attacker.kl++; }

    function resp(p) {
      p.cr = 0; p.ep = [];
      if (iB) {
        if (p.lv <= 0) { p.fn = 1; return; }
        // Safe respawn: try up to 10 positions, pick one far from all living racers
        let bestX, bestY, bestZ;
        for (let attempt = 0; attempt < 10; attempt++) {
          const a = Math.random() * Math.PI * 2, d = 100 + Math.random() * 250;
          const tx = Math.cos(a) * d, ty = 200 + Math.random() * 60, tz = Math.sin(a) * d;
          bestX = tx; bestY = ty; bestZ = tz;
          const tooClose = rs.some(r => r !== p && !r.cr && !r.fn && Math.sqrt((r.x - tx) ** 2 + (r.z - tz) ** 2) < 80);
          if (!tooClose) break;
        }
        p.x = bestX; p.y = bestY; p.z = bestZ; p.yw = Math.random() * Math.PI * 2;
      } else {
        const g = crs[p.ng], v = crs[(p.ng - 1 + NG) % NG];
        p.x = (g.x + v.x) / 2; p.y = (g.y + v.y) / 2 + 30; p.z = (g.z + v.z) / 2;
        p.yw = Math.atan2(g.x - p.x, g.z - p.z);
      }
      p.p = 0; p.rl = 0; p.sp = 4; p.th = 0.5; p.tp = 0; p.tr = 0; p.wp = null; p.st = 0; p.bt = 0;
      p.slDraft = 0; p.slTarget = null; p.slBoost = 0;
      p.trail = []; p.trickRoll = 0; p.trickFrame = 0; p.trickTimer = 0;
    }

    function checkSlipstream(r) {
      if (r.cr || r.fn) return;
      let found = false;
      for (const o of rs) {
        if (o === r || o.cr || o.fn) continue;
        const dx2 = r.x - o.x, dy2 = r.y - o.y, dz2 = r.z - o.z;
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);
        if (dist > 60) continue;
        const bx = -Math.sin(o.yw), bz = -Math.cos(o.yw);
        const hDist = Math.sqrt(dx2 * dx2 + dz2 * dz2) || 1;
        const dot = (dx2 * bx + dz2 * bz) / hDist;
        if (dot > 0 && Math.acos(Math.min(1, dot)) < 40 * D) {
          r.slDraft++;
          r.slTarget = o;
          found = true;
          if (r.slDraft >= 120) { r.slBoost = 90; r.slDraft = 0; r.slTarget = null; if (!r.npc) addAnnouncement("NICE DRAFT!", "#3b82f6"); }
          break;
        }
      }
      if (!found) { r.slDraft = Math.max(0, r.slDraft - 2); r.slTarget = null; }
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
      for (const il of islands) {
        const d = Math.sqrt((r.x - il.x) ** 2 + (r.z - il.z) ** 2);
        if (d < il.w + 8 && r.y < il.y + il.h / 2 && r.y > il.y - il.h / 2) { boom(r); return 1; }
      }
      for (const ar of arches) {
        // Left pillar collision
        const dL = Math.sqrt((r.x - ar.lx) ** 2 + (r.z - ar.lz) ** 2);
        if (dL < ar.w * 0.7 && r.y > ar.y && r.y < ar.y + ar.ht) { boom(r); return 1; }
        // Right pillar collision
        const dR = Math.sqrt((r.x - ar.rx) ** 2 + (r.z - ar.rz) ** 2);
        if (dR < ar.w * 0.7 && r.y > ar.y && r.y < ar.y + ar.ht) { boom(r); return 1; }
        // Beam collision — if between pillars horizontally and at beam height, crash
        const archMx = (ar.lx + ar.rx) / 2, archMz = (ar.lz + ar.rz) / 2;
        const archDx = ar.rx - ar.lx, archDz = ar.rz - ar.lz;
        const archLen = Math.sqrt(archDx * archDx + archDz * archDz) || 1;
        const toRx = r.x - ar.lx, toRz = r.z - ar.lz;
        const along2 = (toRx * archDx + toRz * archDz) / archLen;
        const perpDist = Math.abs(toRx * (-archDz / archLen) + toRz * (archDx / archLen));
        const beamThick = 10;
        if (along2 > 0 && along2 < archLen && perpDist < ar.w * 0.6 && r.y > ar.y + ar.ht - beamThick && r.y < ar.y + ar.ht + 5) { boom(r); return 1; }
      }
      if (r.y > 600) r.y = 600;
      return 0;
    }

    // Rubber banding — position-based item weights
    function getRacePos(racer) {
      if (iB) {
        const alive = rs.filter(r2 => !r2.fn);
        const sorted = [...alive].sort((a, b) => b.lv - a.lv || b.kl - a.kl);
        const idx = sorted.indexOf(racer);
        return idx >= 0 ? idx + 1 : alive.length;
      }
      const active = rs.filter(r2 => !r2.fn);
      const sorted = [...active].sort((a, b) => (b.lp * NG + b.ng) - (a.lp * NG + a.ng));
      const idx = sorted.indexOf(racer);
      const ahead = fo.filter(r2 => r2 !== racer).length;
      return (idx >= 0 ? idx + 1 : active.length) + ahead;
    }

    function weightedRandom(weights) {
      const total = weights.reduce((s, w) => s + w.weight, 0);
      let r = Math.random() * total;
      for (const w of weights) { r -= w.weight; if (r <= 0) return w.id; }
      return weights[weights.length - 1].id;
    }

    const W_FIRST = [{id:"gun",weight:40},{id:"boost",weight:40},{id:"missile",weight:15},{id:"star",weight:3},{id:"flares",weight:2}];
    const W_MID   = [{id:"gun",weight:20},{id:"boost",weight:24},{id:"missile",weight:30},{id:"star",weight:11},{id:"flares",weight:15}];
    const W_LAST  = [{id:"gun",weight:5},{id:"boost",weight:15},{id:"missile",weight:29},{id:"star",weight:35},{id:"flares",weight:16}];

    function getItemForPos(racer) {
      const pos = getRacePos(racer);
      const total = rs.filter(r2 => !r2.fn).length + fo.length;
      let tier;
      if (total <= 2) { tier = pos === 1 ? W_FIRST : W_LAST; }
      else { const lastStart = Math.max(2, total - 1); tier = pos <= 1 ? W_FIRST : pos >= lastStart ? W_LAST : W_MID; }
      return weightedRandom(tier);
    }

    function getCubes(r) {
      cubes.forEach(c => {
        if (!c.active) return;
        if (Math.sqrt((r.x - c.x) ** 2 + (r.y - c.y) ** 2 + (r.z - c.z) ** 2) < 20) {
          c.active = false; c.rt = 300;
          if (r.wp === null) {
            const id = getItemForPos(r);
            r.wp = id; r.wt = id === "gun" ? 8 : 0;
          }
        }
      });
      // Special cubes — give lightning or tornado
      stormCubes.forEach(c => {
        if (!c.active) return;
        if (Math.sqrt((r.x - c.x) ** 2 + (r.y - c.y) ** 2 + (r.z - c.z) ** 2) < 20) {
          c.active = false; c.rt = 300;
          if (r.wp === null) { r.wp = c.gives; r.wt = 0; }
        }
      });
    }

    function checkGate(r) {
      if (iB || !crs.length) return;
      const g = crs[r.ng];
      const dx = r.x - g.x, dy = r.y - g.y, dz = r.z - g.z;
      const dist3 = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Check if close enough to interact with gate
      if (dist3 < g.sz + 18) {
        // Check if racer hits the ring edge (outer 20%) vs passes through center (inner 80%)
        const distCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dist2d = Math.sqrt(dx * dx + dz * dz); // horizontal distance for ring edge check
        // Gate plane check: within 15 units along course direction
        const ng2 = (r.ng + 1) % NG;
        const gn = crs[ng2];
        const cdx = gn.x - g.x, cdz = gn.z - g.z;
        const clen = Math.sqrt(cdx * cdx + cdz * cdz) || 1;
        const along = (dx * cdx + dz * cdz) / clen;
        if (Math.abs(along) < 15) {
          // In the gate plane — check if hitting ring edge
          const hDist = Math.sqrt(dx * dx + dz * dz);
          const vDist = Math.abs(dy);
          // Elliptical gate: horizontal radius = sz, vertical radius = sz*0.35
          const ellipseDist = Math.sqrt((hDist / g.sz) ** 2 + (vDist / (g.sz * 0.35)) ** 2);
          if (ellipseDist > 0.8 && ellipseDist < 1.15) {
            // Hit the ring edge
            boom(r); return;
          }
        }
        // Passed through successfully
        if (!r.npc && r.trickRoll !== 0) { r.bt = 60; addAnnouncement("TRICK BOOST!", "#06b6d4"); }
        r.ng++;
        if (!r.npc) addAnnouncement("GATE " + r.ng + "!", "#fbbf24");
        if (r.ng >= NG) {
          r.ng = 0; r.lp++; r.scUsed = new Set();
          if (!r.npc) {
            if (r.lp === 1) addAnnouncement("LAP 2!", "#eab308");
            else if (r.lp === LAPS - 1) addAnnouncement("FINAL LAP!", "#ef4444");
          }
          if (r.lp >= LAPS) {
            r.fn = 1; r.ft = rt; fo.push(r); r.fp = fo.length;
            if (!r.npc && r.fp === 1) {
              addAnnouncement("1ST PLACE!", "#fbbf24");
              victoryTarget = r; victoryFrame = 0;
              // Spawn fireworks near finish gate
              const fg = crs[0];
              for (let b = 0; b < 5; b++) {
                setTimeout(() => {
                  const bx = fg.x + (Math.random() - 0.5) * 200, bz = fg.z + (Math.random() - 0.5) * 200, by2 = fg.y + 50 + Math.random() * 100;
                  const colors = ["#ef4444","#fbbf24","#3b82f6","#22c55e","#ffffff","#a855f7"];
                  for (let p2 = 0; p2 < 18; p2++) {
                    const spd = 3 + Math.random() * 5;
                    const ax = (Math.random() - 0.5) * 2, ay = (Math.random() - 0.5) * 2, az = (Math.random() - 0.5) * 2;
                    const mag = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
                    fireworks.push({ x: bx, y: by2, z: bz, vx: ax / mag * spd, vy: ay / mag * spd, vz: az / mag * spd, color: colors[Math.floor(Math.random() * colors.length)], size: 3 + Math.random() * 3, life: 60 + Math.random() * 30, maxLife: 90 });
                  }
                }, b * 300);
              }
            }
          }
        }
      }
    }

    function checkBonusGate(r) {
      if (iB || !bonusGates.length) return;
      for (const bg of bonusGates) {
        if (r.scUsed.has(bg.type)) continue;
        if (r.ng !== bg.gateFrom) continue;
        const ddx = r.x - bg.x, ddy = r.y - bg.y, ddz = r.z - bg.z;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
        if (dist < bg.sz + 18) {
          r.scUsed.add(bg.type);
          if (!r.npc) addAnnouncement("SHORTCUT!", "#3b82f6");
          r.ng += bg.gateskip;
          if (r.ng >= NG) { r.ng = 0; r.lp++; r.scUsed = new Set(); if (r.lp >= LAPS) { r.fn = 1; r.ft = rt; fo.push(r); r.fp = fo.length; } }
        }
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

      // NPC draft-seeking (race only) — nudge toward drafting position behind nearby racer
      if (!iB && !r.slBoost) {
        for (const o of rs) {
          if (o === r || o.cr || o.fn) continue;
          const dd = Math.sqrt((o.x - r.x) ** 2 + (o.z - r.z) ** 2);
          if (dd < 100 && dd > 20) {
            const oP = o.lp * NG + o.ng, rP = r.lp * NG + r.ng;
            if (oP >= rP) {
              const behX = o.x - Math.sin(o.yw) * 40, behZ = o.z - Math.cos(o.yw) * 40;
              tx = tx * 0.7 + behX * 0.3; tz = tz * 0.7 + behZ * 0.3;
              break;
            }
          }
        }
      }

      const dx = tx - r.x, dy = ty - r.y, dz = tz - r.z, dH = Math.sqrt(dx * dx + dz * dz);
      const tY = Math.atan2(dx, dz);
      r.nw += 0.02;
      let yd = tY + Math.sin(r.nw) * (1 - r.ns) * 5 * D - r.yw;
      while (yd > Math.PI) yd -= Math.PI * 2;
      while (yd < -Math.PI) yd += Math.PI * 2;

      const tMul = r.tumble > 0 ? 0.2 : 1;
      r.tr = -Math.max(-50 * D, Math.min(50 * D, yd * 2.5)) * tMul;
      r.rl += (r.tr - r.rl) / 18;
      r.yw += (-r.rl * 2.2 * (r.sp / r.ms)) / 60;
      // NPC event awareness
      if (cr === 3 && tsunami.active && tsunami.progress < 120 && !r.cr) {
        r.tp = 20 * D; // pitch up to fly over the wave
      } else if (cr === 0 && earthquake.active && earthquake.intensity > 0.5 && !r.cr) {
        // During earthquake, NPC steers toward track center (away from walls)
        r.tp = 5 * D; // slight climb
      } else {
        r.tp = Math.max(-15 * D, Math.min(15 * D, (dy / Math.max(50, dH)) * 40 * D)) * tMul;
      }
      r.p += (r.tp - r.p) / 24;
      if (r.tumble > 0) r.tumble--;

      let ts = r.ms * (0.8 + r.ns * 0.2);
      if (r.bt > 0) { ts = r.ms * 1.5; r.bt--; }
      if (r.st > 0) { ts = Math.max(ts, r.ms * 1.4); r.st--; }
      if (r.slBoost > 0) { ts = Math.max(ts, r.ms * 1.4); r.slBoost--; }
      r.sp += (ts - r.sp) / 40;

      const { sy, sp2, cy } = moveRacer(r, 1 / 60);
      checkSlipstream(r);

      // NPC weapon use
      if (r.wp && Math.random() < (iB ? 0.02 : 0.01)) {
        if (r.wp === "boost") { r.bt = 120; r.wp = null; }
        else if (r.wp === "star") { r.st = 180; r.wp = null; }
        else if (r.wp === "missile") {
          const tg = rs.filter(t => t !== r && !t.cr && !t.fn);
          if (tg.length) pj.push({ x: r.x, y: r.y, z: r.z, vx: sy * 12, vy: 0, vz: cy * 12, l: 180, s: 4, cl: "#ef4444", o: r, hm: 1, tg: tg[Math.floor(Math.random() * tg.length)] });
          r.wp = null;
        } else if (r.wp === "lightning") {
          storms.push({ x: r.x - sy * 30, y: r.y, z: r.z - cy * 30, timer: 480, owner: r, hit: new Set(), type: "lightning" });
          r.wp = null;
        } else if (r.wp === "tornado") {
          storms.push({ x: r.x - sy * 30, y: r.y, z: r.z - cy * 30, timer: 480, owner: r, hitRacers: [], type: "tornado" });
          r.wp = null;
        } else { r.wp = null; }
      }

      if (checkCol(r)) return;
      checkGate(r);
      checkBonusGate(r);
      getCubes(r);
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
      if (r.bt > 0) { ts = r.ms * 1.5; r.bt--; }
      if (r.st > 0) { ts = Math.max(ts, r.ms * 1.4); r.st--; }
      if (r.slBoost > 0) { ts = Math.max(ts, r.ms * 1.4); r.slBoost--; }
      r.sp += (ts - r.sp) * dt * 2;

      const tMulP = r.tumble > 0 ? 0.2 : 1;
      if (ks[lK]) r.tr = 50 * D * tMulP; else if (ks[rK]) r.tr = -50 * D * tMulP; else r.tr = 0;
      if (ks[uK]) r.tp = 25 * D * tMulP; else if (ks[dK]) r.tp = -20 * D * tMulP; else r.tp *= 0.9;
      r.rl += (r.tr - r.rl) * dt * 4;
      r.p += (r.tp - r.p) * dt * 3;
      r.yw += (-r.rl * 2.2 * (r.sp / r.ms)) * dt;
      if (r.tumble > 0) r.tumble--;
      // Barrel roll detection — double-tap left or right
      if (r.trickTimer > 0) r.trickTimer--;
      if (ks[lK] && !ks["_bl" + lK]) { ks["_bl" + lK] = 1; if (fc - r.lastLF < 18 && r.trickTimer <= 0 && r.trickFrame <= 0) { r.trickFrame = 30; r.trickDir = 1; r.trickRoll = 0; } r.lastLF = fc; }
      if (!ks[lK]) ks["_bl" + lK] = 0;
      if (ks[rK] && !ks["_bl" + rK]) { ks["_bl" + rK] = 1; if (fc - r.lastRF < 18 && r.trickTimer <= 0 && r.trickFrame <= 0) { r.trickFrame = 30; r.trickDir = -1; r.trickRoll = 0; } r.lastRF = fc; }
      if (!ks[rK]) ks["_bl" + rK] = 0;
      if (r.trickFrame > 0) { r.trickRoll += (Math.PI * 2 / 30) * r.trickDir; r.trickFrame--; if (r.trickFrame <= 0) { r.trickRoll = 0; r.trickTimer = 60; } }

      const { sy, sp2, cy } = moveRacer(r, dt);
      checkSlipstream(r);

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
          r.wp = null; addAnnouncement("MISSILE AWAY!", "#ef4444");
        } else if (r.wp === "boost") { r.bt = 120; r.wp = null; }
        else if (r.wp === "star") { r.st = 180; r.wp = null; addAnnouncement("STAR POWER!", "#fbbf24"); }
        else if (r.wp === "flares") {
          for (let i = 0; i < 6; i++) pj.push({ x: r.x, y: r.y, z: r.z, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 5 - 2, vz: (Math.random() - 0.5) * 12, l: 50, s: 3, cl: "#fff", o: r, hm: 0, fl: 1 });
          r.hf = 1; setTimeout(() => { r.hf = 0; }, 2000);
          r.wp = null;
        } else if (r.wp === "lightning") {
          const sy2 = Math.sin(r.yw), cy2 = Math.cos(r.yw);
          storms.push({ x: r.x - sy2 * 30, y: r.y, z: r.z - cy2 * 30, timer: 480, owner: r, hit: new Set(), type: "lightning" });
          r.wp = null;
        } else if (r.wp === "tornado") {
          const sy2 = Math.sin(r.yw), cy2 = Math.cos(r.yw);
          storms.push({ x: r.x - sy2 * 30, y: r.y, z: r.z - cy2 * 30, timer: 480, owner: r, hitRacers: [], type: "tornado" });
          r.wp = null;
        }
      }

      if (checkCol(r)) return;
      checkGate(r);
      checkBonusGate(r);
      getCubes(r);

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
      // Sky gradient
      const sg = x.createLinearGradient(0, 0, 0, vh);
      if (isNight) {
        sg.addColorStop(0, "#020408"); sg.addColorStop(0.3, "#0a0e1a"); sg.addColorStop(0.6, "#0f1525");
        sg.addColorStop(0.8, "#1a2035"); sg.addColorStop(1, "#1a2540");
      } else {
        sg.addColorStop(0, "#050d1a"); sg.addColorStop(0.12, "#0a1628"); sg.addColorStop(0.25, "#132d4a");
        sg.addColorStop(0.4, "#1a4a6e"); sg.addColorStop(0.55, "#3a7a9e"); sg.addColorStop(0.7, "#5a9ebe");
        sg.addColorStop(0.85, "#87CEEB"); sg.addColorStop(1, "#d4a060");
      }
      x.fillStyle = sg; x.fillRect(0, 0, W, vh);
      if (isNight) {
        // Stars
        for (let si = 0; si < 40; si++) {
          const sx2 = ((si * 137.5 + 23) % W), sy2 = ((si * 89.3 + 47) % (vh * 0.5));
          const tw = 0.5 + (si % 5 < 2 ? Math.sin(fc * 0.03 + si) * 0.3 : 0);
          x.fillStyle = `rgba(255,255,255,${0.5 + tw * 0.4})`;
          x.fillRect(sx2, sy2, si % 3 === 0 ? 2 : 1, si % 3 === 0 ? 2 : 1);
        }
        // Moon
        const moonX = W * 0.8, moonY = vh * 0.12;
        x.fillStyle = "rgba(200,210,230,0.8)"; x.beginPath(); x.arc(moonX, moonY, 15, 0, Math.PI * 2); x.fill();
        x.fillStyle = "rgba(220,230,245,0.3)"; x.beginPath(); x.arc(moonX, moonY, 25, 0, Math.PI * 2); x.fill();
      } else {
        // Sun glow
        const sunX = W * 0.75, sunY = vh * 0.15;
        const sunG = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
        sunG.addColorStop(0, "rgba(255,240,200,0.25)"); sunG.addColorStop(0.5, "rgba(255,220,180,0.1)"); sunG.addColorStop(1, "rgba(255,200,150,0)");
        x.fillStyle = sunG; x.fillRect(sunX - 80, sunY - 80, 160, 160);
      }

      const rn = [];
      const stp = TS / GR, vD = 900;
      let shakeX = 0, shakeY = 0;
      if (vw.cr && vw.ct > (iB ? 55 : 65)) { shakeX = (Math.random() - 0.5) * 8; shakeY = (Math.random() - 0.5) * 8; }
      if (earthquake.active && earthquake.intensity > 0) { shakeX += (Math.random() - 0.5) * 12 * earthquake.intensity; shakeY += (Math.random() - 0.5) * 12 * earthquake.intensity; }

      // Terrain — full detail within 300, skip-every-other beyond
      for (let step = 1; step <= 2; step++) {
        const skip = step === 1 ? 1 : 2;
        for (let i = 0; i < GR; i += skip) {
          for (let j = 0; j < GR; j += skip) {
          const wx = -TS / 2 + i * stp, wz = -TS / 2 + j * stp;
          const dist = Math.sqrt((wx + stp - vw.x) ** 2 + (wz + stp - vw.z) ** 2);
          if (step === 1 && dist > 300) continue;
          if (step === 2 && dist <= 300) continue;
          if (dist > vD) continue;
          const si = skip, s2 = stp * si;
          const ni = Math.min(i + si, GR), nj = Math.min(j + si, GR);
          const p00 = proj(wx, tH[i][j], wz, cam, vh);
          const p10 = proj(wx + s2, tH[ni]?.[j] ?? tH[i][j], wz, cam, vh);
          const p01 = proj(wx, tH[i]?.[nj] ?? tH[i][j], wz + s2, cam, vh);
          const p11 = proj(wx + s2, tH[ni]?.[nj] ?? tH[i][j], wz + s2, cam, vh);
          if (!p00 && !p10 && !p01 && !p11) continue;
          const h = tH[i][j];
          // Terrain normal shading — compare with neighbor to right
          const hR = tH[ni]?.[j] ?? h;
          const nShade = Math.max(0.7, Math.min(1.1, 1 + (h - hR) * 0.008));
          let r, g, b;
          if (cr === 3) {
            // Ocean course — water colors
            const wt = Math.max(0, Math.min(1, (h + 35) / 10));
            r = 20 + wt * 10; g = 60 + wt * 20; b = 120 + wt * 20;
            // Foam highlights at wave peaks
            if (h > -27) { const foam = (h + 27) / 5; r += foam * 140; g += foam * 120; b += foam * 80; }
          } else if (cr === 5) {
            // Ice Cavern — frozen plains and snow
            if (h < -5) {
              // Frozen water — dark ice with lighter crack patterns
              const crack = Math.sin(i * 3.7 + j * 2.3) > 0.5 ? 1 : 0;
              r = crack ? 70 : 45; g = crack ? 90 : 60; b = crack ? 120 : 85;
            } else {
              // Snow terrain
              const v = Math.sin(i * 1.5 + j * 0.8) * 8;
              r = 195 + v; g = 205 + v; b = 220 + v;
            }
          } else if (cr === 4) {
            // Volcano course — lava and volcanic rock with lava streaks on slopes
            const wx2 = -TS / 2 + i * stp + stp, wz2 = -TS / 2 + j * stp + stp;
            const dO = Math.sqrt(wx2 * wx2 + wz2 * wz2);
            const isLavaStreak = dO > 100 && dO < 550 && h > 30 && (Math.sin(i * 2.3 + j * 0.7) > 0.3 || Math.cos(i * 1.5 - j * 2.1) > 0.4);
            if (h < 0) { const lv = Math.sin(i * 1.3 + j * 0.7) * 0.5 + 0.5; r = 200 + lv * 40; g = 60 + lv * 60; b = 20 + lv * 10; }
            else if (isLavaStreak) { const br2 = Math.sin(i * 3.1 + j * 1.9) > 0.3 ? 1 : 0; r = br2 ? 255 : 240; g = br2 ? 160 : 100; b = br2 ? 40 : 20; }
            else if (h < 60) { r = 40; g = 35; b = 30; }
            else if (h < 150) { const t = (h - 60) / 90; r = 40 + t * 30; g = 35 + t * 30; b = 30 + t * 30; }
            else { r = 90; g = 40; b = 30; }
          } else {
            // 6-band smooth terrain: deep water, shallow water, beach, grass, rock, snow
            const bands = [[-60,20,40,90],[-20,35,55,100],[0,65,60,45],[20,50,95,40],[50,130,115,85],[90,220,220,230]];
            let bi = 0;
            while (bi < bands.length - 1 && h > bands[bi + 1][0]) bi++;
            if (bi >= bands.length - 1) { r = bands[bands.length-1][1]; g = bands[bands.length-1][2]; b = bands[bands.length-1][3]; }
            else { const lo = bands[bi], hi = bands[bi+1]; const t = Math.max(0, Math.min(1, (h - lo[0]) / (hi[0] - lo[0]))); r = lo[1] + (hi[1] - lo[1]) * t; g = lo[2] + (hi[2] - lo[2]) * t; b = lo[3] + (hi[3] - lo[3]) * t; }
          }
          if (isNight) {
            const nf = (cr === 4 && (h < 0 || (h > 30 && Math.sin(i * 2.3 + j * 0.7) > 0.3))) ? 0.8 : 0.3;
            r *= nf; g *= nf; b *= nf;
          }
          const sh = Math.max(0.3, 1 - dist / vD) * nShade;
          rn.push({ d: ((p00?.d || 9999) + (p10?.d || 9999)) / 2, f() {
            x.fillStyle = `rgba(${Math.min(255, r * sh) | 0},${Math.min(255, g * sh) | 0},${Math.min(255, b * sh) | 0},${Math.max(0.3, 1 - dist / vD)})`;
            x.beginPath();
            if (p00) x.moveTo(p00.sx, p00.sy); else if (p10) x.moveTo(p10.sx, p10.sy);
            if (p10) x.lineTo(p10.sx, p10.sy);
            if (p11) x.lineTo(p11.sx, p11.sy);
            if (p01) x.lineTo(p01.sx, p01.sy);
            x.closePath(); x.fill();
          }});
        }
        }
      }

      // Mountains
      mts.forEach(m => {
        const dist = Math.sqrt((m.x - vw.x) ** 2 + (m.z - vw.z) ** 2);
        if (dist > 1800) return;
        const al = Math.max(0.3, 1 - dist / 1800);
        const pP = proj(m.x, m.bY + m.ht, m.z, cam, vh);
        const pL = proj(m.x - m.w, m.bY, m.z, cam, vh);
        const pR = proj(m.x + m.w, m.bY, m.z, cam, vh);
        const pF = proj(m.x, m.bY, m.z - m.w, cam, vh);
        const pB = proj(m.x, m.bY, m.z + m.w, cam, vh);
        if (!pP) return;
        const iceFaceColors = [[90,110,140],[110,135,170],[140,165,200],[160,180,210]];
        [[pL, pF, 0.6, 0], [pF, pR, 0.8, 1], [pR, pB, 0.5, 2], [pB, pL, 0.4, 3]].forEach(([a, b, sh0, fi]) => {
          if (!a || !b) return;
          const sh = isNight ? sh0 * 0.35 : sh0;
          rn.push({ d: (a.d + pP.d) / 2, f() {
            x.globalAlpha = al;
            if (m.icy) {
              const ic = iceFaceColors[fi];
              x.fillStyle = `rgb(${ic[0] * sh + (isNight ? 10 : 40) | 0},${ic[1] * sh + (isNight ? 8 : 30) | 0},${ic[2] * sh + (isNight ? 5 : 20) | 0})`;
            } else if (m.volcanic) {
              x.fillStyle = `rgb(${50 * sh + 15 | 0},${40 * sh + 12 | 0},${35 * sh + 10 | 0})`;
            } else {
              x.fillStyle = `rgb(${70 * sh + 30 | 0},${60 * sh + 25 | 0},${50 * sh + 20 | 0})`;
            }
            x.beginPath(); x.moveTo(a.sx, a.sy); x.lineTo(pP.sx, pP.sy); x.lineTo(b.sx, b.sy); x.closePath(); x.fill();
            x.strokeStyle = "rgba(0,0,0,0.12)"; x.lineWidth = 0.5;
            x.beginPath(); x.moveTo(a.sx, a.sy); x.lineTo(pP.sx, pP.sy); x.lineTo(b.sx, b.sy); x.closePath(); x.stroke();
            // Snow cap — icy at 55%, regular at 70%
            if (!m.volcanic) {
              const capStart = m.icy ? 0.55 : 0.7;
              x.fillStyle = m.icy ? `rgb(${215 * sh + 30 | 0},${230 * sh + 15 | 0},${245 * sh + 5 | 0})` : `rgb(${200 * sh + 40 | 0},${200 * sh + 40 | 0},${210 * sh + 30 | 0})`;
              const aX = a.sx + (pP.sx - a.sx) * capStart, aY2 = a.sy + (pP.sy - a.sy) * capStart;
              const bX = b.sx + (pP.sx - b.sx) * capStart, bY2 = b.sy + (pP.sy - b.sy) * capStart;
              x.beginPath(); x.moveTo(aX, aY2); x.lineTo(pP.sx, pP.sy); x.lineTo(bX, bY2); x.closePath(); x.fill();
            }
            x.globalAlpha = 1;
          }});
        });
      });

      // Floating islands (Course 1) — solid connected 3D shapes
      islands.forEach(il => {
        const dist = Math.sqrt((il.x - vw.x) ** 2 + (il.z - vw.z) ** 2);
        if (dist > 1000) return;
        const al = Math.max(0.3, 1 - dist / 1000);
        // Three projected points: top-left, top-right, bottom-center
        const pTL = proj(il.x - il.w / 2, il.y + il.h / 2, il.z, cam, vh);
        const pTR = proj(il.x + il.w / 2, il.y + il.h / 2, il.z, cam, vh);
        const pBC = proj(il.x, il.y - il.h, il.z, cam, vh);
        if (!pTL || !pTR || !pBC) return;
        const sw = Math.abs(pTR.sx - pTL.sx);
        rn.push({ d: (pTL.d + pTR.d + pBC.d) / 3, f() {
          x.globalAlpha = al;
          // a. Full rock body — flat top, pointed bottom
          x.fillStyle = "rgb(100,70,45)";
          x.beginPath(); x.moveTo(pTL.sx, pTL.sy); x.lineTo(pTR.sx, pTR.sy); x.lineTo(pBC.sx, pBC.sy); x.closePath(); x.fill();
          // c. Darker right face for 3D depth
          const midLx = (pTL.sx + pBC.sx) / 2, midLy = (pTL.sy + pBC.sy) / 2;
          x.fillStyle = "rgb(75,50,30)";
          x.beginPath(); x.moveTo(pTR.sx, pTR.sy); x.lineTo(pBC.sx, pBC.sy); x.lineTo(midLx, midLy); x.closePath(); x.fill();
          // b. Green grass top surface — slight trapezoid
          const inset = sw * 0.08;
          x.fillStyle = "rgb(55,130,40)";
          x.beginPath();
          x.moveTo(pTL.sx, pTL.sy); x.lineTo(pTR.sx, pTR.sy);
          x.lineTo(pTR.sx - inset, pTR.sy + Math.max(2, sw * 0.12));
          x.lineTo(pTL.sx + inset, pTL.sy + Math.max(2, sw * 0.12));
          x.closePath(); x.fill();
          // d. Trees if large enough
          if (sw > 15) {
            const topCx = (pTL.sx + pTR.sx) / 2, topCy = (pTL.sy + pTR.sy) / 2;
            const positions = sw > 30 ? [-0.2, 0.15] : [0];
            positions.forEach((off, ti) => {
              const tx = topCx + off * sw;
              const trH = sw * 0.15;
              const canR2 = sw * 0.06;
              x.fillStyle = "rgb(90,60,30)"; x.fillRect(tx - 1, topCy - trH, 2, trH);
              x.fillStyle = ti === 0 ? "rgb(40,120,30)" : "rgb(55,145,40)";
              x.beginPath(); x.arc(tx, topCy - trH - canR2 * 0.5, canR2, 0, Math.PI * 2); x.fill();
            });
          }
          x.globalAlpha = 1;
        }});
      });

      // Pirate ships (Ocean Run scenery)
      ships.forEach(sh => {
        const dist = Math.sqrt((sh.x - vw.x) ** 2 + (sh.z - vw.z) ** 2);
        if (dist > 800) return;
        const bobY = sh.y + Math.sin(fc * 0.015 + sh.phase) * 2;
        const p = proj(sh.x, bobY, sh.z, cam, vh);
        if (!p || p.d > 800) return;
        const sc2 = p.sc;
        rn.push({ d: p.d, f() {
          x.save(); x.translate(p.sx, p.sy);
          const u = sc2;
          // Hull — boat shape
          x.fillStyle = "rgb(70,40,20)";
          x.beginPath(); x.moveTo(-10*u, 0); x.quadraticCurveTo(-8*u, 3*u, 0, 3.5*u); x.quadraticCurveTo(8*u, 3*u, 12*u, -1*u); x.lineTo(10*u, 0); x.closePath(); x.fill();
          // Deck
          x.fillStyle = "rgb(120,75,40)";
          x.fillRect(-8*u, -1*u, 16*u, 2*u);
          // Mast
          x.strokeStyle = "rgb(90,60,30)"; x.lineWidth = Math.max(1, 1.2*u);
          x.beginPath(); x.moveTo(0, -1*u); x.lineTo(0, -18*u); x.stroke();
          // Sail — triangle
          x.fillStyle = "rgb(230,220,200)";
          x.beginPath(); x.moveTo(0, -17*u); x.lineTo(0, -5*u); x.lineTo(8*u, -8*u); x.closePath(); x.fill();
          // Flag
          x.fillStyle = "rgb(200,30,30)";
          x.fillRect(0, -19*u, 4*u, 2.5*u);
          x.restore();
        }});
      });

      // Rock/ice arches — smooth tapered pillars + curved beam
      arches.forEach(ar => {
        const midX = (ar.lx + ar.rx) / 2, midZ = (ar.lz + ar.rz) / 2;
        const dist = Math.sqrt((midX - vw.x) ** 2 + (midZ - vw.z) ** 2);
        if (dist > 800) return;
        const pLB = proj(ar.lx, ar.y, ar.lz, cam, vh);
        const pLT = proj(ar.lx, ar.y + ar.ht, ar.lz, cam, vh);
        const pRB = proj(ar.rx, ar.y, ar.rz, cam, vh);
        const pRT = proj(ar.rx, ar.y + ar.ht, ar.rz, cam, vh);
        if (!pLB || !pLT || !pRB || !pRT) return;
        const avgD = (pLB.d + pRB.d) / 2;
        const isIce = ar.iceArch;
        rn.push({ d: avgD, f() {
          x.globalAlpha = 1;
          const lwB = Math.max(6, ar.w * pLB.sc); // base width
          const lwT = lwB * 0.6; // top width (tapered)
          const rwB = Math.max(6, ar.w * pRB.sc);
          const rwT = rwB * 0.6;
          // Smooth gradient pillars — tapered trapezoids with blended color
          const nSegs = 6;
          for (let si = 0; si < nSegs; si++) {
            const t0 = si / nSegs, t1 = (si + 1) / nSegs;
            const r0 = isIce ? 130 + (170 - 130) * t0 : 80 + (180 - 80) * t0;
            const g0 = isIce ? 160 + (195 - 160) * t0 : 50 + (130 - 50) * t0;
            const b0 = isIce ? 195 + (225 - 195) * t0 : 30 + (75 - 30) * t0;
            x.fillStyle = `rgb(${r0|0},${g0|0},${b0|0})`;
            // Left pillar segment (tapered)
            const lyB = pLB.sy + (pLT.sy - pLB.sy) * t0;
            const lyT = pLB.sy + (pLT.sy - pLB.sy) * t1;
            const lwS0 = lwB + (lwT - lwB) * t0, lwS1 = lwB + (lwT - lwB) * t1;
            const lCx = pLB.sx + (pLT.sx - pLB.sx) * ((t0 + t1) / 2);
            x.beginPath();
            x.moveTo(lCx - lwS0 / 2, lyB); x.lineTo(lCx + lwS0 / 2, lyB);
            x.lineTo(lCx + lwS1 / 2, lyT); x.lineTo(lCx - lwS1 / 2, lyT);
            x.closePath(); x.fill();
            // Right pillar segment (tapered)
            const ryB = pRB.sy + (pRT.sy - pRB.sy) * t0;
            const ryT = pRB.sy + (pRT.sy - pRB.sy) * t1;
            const rwS0 = rwB + (rwT - rwB) * t0, rwS1 = rwB + (rwT - rwB) * t1;
            const rCx = pRB.sx + (pRT.sx - pRB.sx) * ((t0 + t1) / 2);
            x.beginPath();
            x.moveTo(rCx - rwS0 / 2, ryB); x.lineTo(rCx + rwS0 / 2, ryB);
            x.lineTo(rCx + rwS1 / 2, ryT); x.lineTo(rCx - rwS1 / 2, ryT);
            x.closePath(); x.fill();
          }
          // Curved connecting beam — 10 units thick
          const beamH = Math.max(4, 10 * ((pLT.sc + pRT.sc) / 2));
          const midSx = (pLT.sx + pRT.sx) / 2;
          const midSy = Math.min(pLT.sy, pRT.sy);
          const cpYTop = midSy - beamH * 1.5; // arch curve upward
          const cpYBot = midSy + beamH * 0.3;
          // Fill beam body
          x.fillStyle = isIce ? "rgb(150,180,210)" : "rgb(140,85,45)";
          x.beginPath();
          x.moveTo(pLT.sx, pLT.sy);
          x.quadraticCurveTo(midSx, cpYBot, pRT.sx, pRT.sy);
          x.lineTo(pRT.sx, pRT.sy - beamH);
          x.quadraticCurveTo(midSx, cpYTop, pLT.sx, pLT.sy - beamH);
          x.closePath(); x.fill();
          // Top highlight
          x.fillStyle = isIce ? "rgb(190,210,235)" : "rgb(180,130,75)";
          x.beginPath();
          x.moveTo(pLT.sx, pLT.sy - beamH);
          x.quadraticCurveTo(midSx, cpYTop, pRT.sx, pRT.sy - beamH);
          x.lineTo(pRT.sx, pRT.sy - beamH * 1.3);
          x.quadraticCurveTo(midSx, cpYTop - beamH * 0.3, pLT.sx, pLT.sy - beamH * 1.3);
          x.closePath(); x.fill();
          x.globalAlpha = 1;
        }});
      });

      // Volcano peak glow + lava particles (Course 4)
      if (cr === 4) {
        const vp = proj(0, 500, 0, cam, vh);
        if (vp && vp.d < 1000) {
          rn.push({ d: vp.d, f() {
            x.globalAlpha = 0.2; x.fillStyle = "rgb(255,50,10)";
            x.beginPath(); x.arc(vp.sx, vp.sy, 90 * vp.sc, 0, Math.PI * 2); x.fill();
            x.globalAlpha = 0.3; x.fillStyle = "rgb(255,100,30)";
            x.beginPath(); x.arc(vp.sx, vp.sy, 55 * vp.sc, 0, Math.PI * 2); x.fill();
            const pulse = 0.8 + Math.sin(fc * 0.05) * 0.2;
            x.globalAlpha = 0.5 * pulse; x.fillStyle = "rgb(255,180,50)";
            x.beginPath(); x.arc(vp.sx, vp.sy, 30 * vp.sc, 0, Math.PI * 2); x.fill();
            x.globalAlpha = 1;
          }});
        }
        // Lava particles — drift upward (14 particles, larger)
        lavaP.forEach(lp => {
          lp.y += lp.vy;
          if (lp.y > 570) { lp.y = 380 + Math.random() * 50; lp.x = (Math.random() - 0.5) * 60; lp.z = (Math.random() - 0.5) * 60; }
          const pp = proj(lp.x, lp.y, lp.z, cam, vh);
          if (!pp) return;
          const flicker = 0.5 + Math.sin(fc * 0.1 + lp.phase) * 0.3;
          rn.push({ d: pp.d, f() {
            x.globalAlpha = flicker;
            x.fillStyle = Math.random() > 0.5 ? "rgb(255,100,30)" : "rgb(255,180,50)";
            x.beginPath(); x.arc(pp.sx, pp.sy, Math.max(4, 8 * pp.sc), 0, Math.PI * 2); x.fill();
            x.globalAlpha = 1;
          }});
        });
      }

      // Canyon walls — 3D with front face + rim
      const rimD = 40;
      const eqI = earthquake.intensity || 0;
      [canyonL, canyonR].forEach(side => {
        for (let i = 0; i < side.length - 1; i++) {
          const a = side[i], b = side[i + 1];
          // Visual rumble during earthquake (rendering only)
          const aRx = a.x + (eqI > 0 ? Math.sin(fc * 0.3 + a.ord) * 5 * eqI : 0);
          const aRz = a.z + (eqI > 0 ? Math.cos(fc * 0.25 + a.ord * 1.3) * 5 * eqI : 0);
          const bRx = b.x + (eqI > 0 ? Math.sin(fc * 0.3 + b.ord) * 5 * eqI : 0);
          const bRz = b.z + (eqI > 0 ? Math.cos(fc * 0.25 + b.ord * 1.3) * 5 * eqI : 0);
          const mx = (aRx + bRx) / 2, mz = (aRz + bRz) / 2;
          const dist = Math.sqrt((mx - vw.x) ** 2 + (mz - vw.z) ** 2);
          if (dist > 1000) continue;
          const al = Math.max(0.25, 1 - dist / 1000);
          const minB = Math.min(a.bY, b.bY), maxT = Math.max(a.bY + a.ht, b.bY + b.ht);
          const totalH = maxT - minB;
          // Front face — layered rock with per-segment color variation
          const cv = ((a.ord * 7 + 13) % 21 - 10);
          const nm = isNight ? 0.35 : 1;
          const thirds = [[minB, minB + totalH / 3, (80+cv)*nm, (40+cv/2)*nm, (25+cv/3)*nm], [minB + totalH / 3, minB + totalH * 2 / 3, (175+cv)*nm, (75+cv/2)*nm, (35+cv/3)*nm], [minB + totalH * 2 / 3, maxT, (215+cv)*nm, (145+cv/2)*nm, (80+cv/3)*nm]];
          thirds.forEach(([yB, yT, lr, lg, lb]) => {
            const cyB = Math.max(yB, Math.max(a.bY, b.bY));
            const cyT = Math.min(yT, Math.min(a.bY + a.ht, b.bY + b.ht));
            if (cyB >= cyT) return;
            const pAB = proj(aRx, cyB, aRz, cam, vh);
            const pAT = proj(aRx, cyT, aRz, cam, vh);
            const pBB = proj(bRx, cyB, bRz, cam, vh);
            const pBT = proj(bRx, cyT, bRz, cam, vh);
            if (!pAB || !pAT || !pBB || !pBT) return;
            rn.push({ d: (pAB.d + pBB.d) / 2, f() {
              x.globalAlpha = al;
              x.fillStyle = `rgb(${lr},${lg},${lb})`;
              x.beginPath(); x.moveTo(pAB.sx, pAB.sy); x.lineTo(pAT.sx, pAT.sy); x.lineTo(pBT.sx, pBT.sy); x.lineTo(pBB.sx, pBB.sy); x.closePath(); x.fill();
              x.globalAlpha = 1;
            }});
          });
          // Top rim face — flat horizontal quad at wall top
          const aTopY = a.bY + a.ht, bTopY = b.bY + b.ht;
          const aIT = proj(aRx, aTopY, aRz, cam, vh);
          const bIT = proj(bRx, bTopY, bRz, cam, vh);
          const aOT = proj(aRx + a.px * rimD, aTopY, aRz + a.pz * rimD, cam, vh);
          const bOT = proj(bRx + b.px * rimD, bTopY, bRz + b.pz * rimD, cam, vh);
          if (aIT && bIT && aOT && bOT) {
            rn.push({ d: (aIT.d + bIT.d) / 2 - 1, f() {
              x.globalAlpha = al;
              x.fillStyle = "rgb(210,150,80)";
              x.beginPath(); x.moveTo(aIT.sx, aIT.sy); x.lineTo(bIT.sx, bIT.sy); x.lineTo(bOT.sx, bOT.sy); x.lineTo(aOT.sx, aOT.sy); x.closePath(); x.fill();
              x.globalAlpha = 1;
            }});
          }
        }
      });

      // Course gates — solid torus rings
      if (!iB) crs.forEach((ring, idx) => {
        const p = proj(ring.x, ring.y, ring.z, cam, vh);
        if (!p || p.d > 800) return;
        const isN = idx === vw.ng;
        const isPassed = (!isN && idx < vw.ng) || (vw.lp > 0 && !isN && idx > vw.ng);
        const pulse = isN ? 1 + Math.sin(fc * 0.08) * 0.1 : 1;
        const s = ring.sz * p.sc * pulse;
        if (s < 2) return;
        rn.push({ d: p.d, f() {
          const gateAl = isPassed ? 0.05 : 1;
          x.globalAlpha = gateAl;
          // Solid filled ring band (outer - inner)
          const outerRx = s, outerRy = s * 0.35;
          const innerRx = s * 0.8, innerRy = s * 0.28;
          x.fillStyle = isN ? "rgba(50,255,50,0.2)" : "rgba(255,200,50,0.05)";
          x.beginPath(); x.ellipse(p.sx, p.sy, outerRx, outerRy, 0, 0, Math.PI * 2); x.ellipse(p.sx, p.sy, innerRx, innerRy, 0, 0, Math.PI * 2); x.fill("evenodd");
          // Outer thick glow stroke
          x.strokeStyle = isN ? "rgba(50,255,50,0.4)" : "rgba(255,200,50,0.06)";
          x.lineWidth = isN ? Math.max(8, s * 0.3) : Math.max(3, s * 0.15);
          x.beginPath(); x.ellipse(p.sx, p.sy, s, s * 0.35, 0, 0, Math.PI * 2); x.stroke();
          // Inner bright stroke
          x.strokeStyle = isN ? "rgba(50,255,50,1)" : "rgba(255,200,50,0.15)";
          x.lineWidth = isN ? Math.max(3, s * 0.1) : Math.max(1, s * 0.06);
          if (isN) { x.shadowColor = "rgba(50,255,50,0.6)"; x.shadowBlur = isNight ? 18 : 12; }
          x.beginPath(); x.ellipse(p.sx, p.sy, s, s * 0.35, 0, 0, Math.PI * 2); x.stroke();
          // Second inner ring for next gate
          if (isN) {
            const s2 = s * 0.7;
            x.strokeStyle = "rgba(100,255,100,0.6)"; x.lineWidth = Math.max(1.5, s2 * 0.08);
            x.beginPath(); x.ellipse(p.sx, p.sy, s2, s2 * 0.35, 0, 0, Math.PI * 2); x.stroke();
          }
          x.shadowBlur = 0;
          x.globalAlpha = 1;
        }});
      });

      // Bonus shortcut gates — smaller blue rings
      if (!iB) bonusGates.forEach(ring => {
        const p = proj(ring.x, ring.y, ring.z, cam, vh);
        if (!p || p.d > 600) return;
        const canUse = vw.ng === ring.gateFrom && !vw.scUsed.has(ring.type);
        const s = ring.sz * p.sc;
        if (s < 1.5) return;
        rn.push({ d: p.d, f() {
          x.globalAlpha = canUse ? 0.9 : 0.15;
          x.strokeStyle = canUse ? "rgba(60,150,255,1)" : "rgba(60,150,255,0.2)";
          x.lineWidth = canUse ? Math.max(2, s * 0.12) : Math.max(1, s * 0.06);
          if (canUse) { x.shadowColor = "rgba(60,150,255,0.6)"; x.shadowBlur = 10; }
          x.beginPath(); x.ellipse(p.sx, p.sy, s, s * 0.35, 0, 0, Math.PI * 2); x.stroke();
          if (canUse) {
            x.fillStyle = "rgba(60,150,255,0.15)";
            x.beginPath(); x.ellipse(p.sx, p.sy, s * 0.8, s * 0.28, 0, 0, Math.PI * 2); x.fill();
          }
          x.shadowBlur = 0; x.globalAlpha = 1;
        }});
      });

      // Track rails (left and right lines along gate edges)
      if (!iB && crs.length > 1) {
        x.strokeStyle = isNight ? "rgba(255,180,50,0.5)" : "rgba(255,180,50,0.2)";
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

      // Mystery cubes
      cubes.forEach(c => {
        const p = proj(c.x, c.y, c.z, cam, vh);
        if (!p || p.d > 600) return;
        const s = 12 * p.sc;
        if (s < 1.5) return;
        rn.push({ d: p.d, f() {
          x.save(); x.translate(p.sx, p.sy);
          const spin = Math.sin(fc * 0.03 + c.x) * 0.2;
          x.rotate(Math.PI / 4 + spin);
          if (c.active) {
            // Golden box
            x.shadowColor = "rgba(255,200,50,0.5)"; x.shadowBlur = isNight ? 12 : 8;
            x.fillStyle = "rgb(250,190,50)";
            x.fillRect(-s, -s, s * 2, s * 2);
            x.shadowBlur = 0;
            // Darker edges
            x.strokeStyle = "rgb(200,150,30)"; x.lineWidth = Math.max(1, s * 0.12);
            x.strokeRect(-s, -s, s * 2, s * 2);
            // Question mark
            x.rotate(-(Math.PI / 4 + spin));
            x.fillStyle = "#fff"; x.font = `bold ${Math.max(6, s * 1.2) | 0}px Georgia`;
            x.textAlign = "center"; x.textBaseline = "middle";
            x.fillText("?", 0, 0);
          } else {
            // Ghost outline for inactive
            x.strokeStyle = "rgba(255,200,50,0.12)"; x.lineWidth = 1;
            x.strokeRect(-s, -s, s * 2, s * 2);
          }
          x.restore();
        }});
      });

      // Special storm cubes — disguised as regular golden cubes
      stormCubes.forEach(c => {
        if (!c.active) return;
        const p = proj(c.x, c.y, c.z, cam, vh);
        if (!p || p.d > 600) return;
        const s = 12 * p.sc;
        if (s < 1.5) return;
        rn.push({ d: p.d, f() {
          x.save(); x.translate(p.sx, p.sy);
          const spin = Math.sin(fc * 0.03 + c.x) * 0.2;
          x.rotate(Math.PI / 4 + spin);
          if (c.active) {
            x.shadowColor = "rgba(255,200,50,0.5)"; x.shadowBlur = isNight ? 12 : 8;
            x.fillStyle = "rgb(250,190,50)";
            x.fillRect(-s, -s, s * 2, s * 2);
            x.shadowBlur = 0;
            x.strokeStyle = "rgb(200,150,30)"; x.lineWidth = Math.max(1, s * 0.12);
            x.strokeRect(-s, -s, s * 2, s * 2);
            x.rotate(-(Math.PI / 4 + spin));
            x.fillStyle = "#fff"; x.font = `bold ${Math.max(6, s * 1.2) | 0}px Georgia`;
            x.textAlign = "center"; x.textBaseline = "middle";
            x.fillText("?", 0, 0);
          }
          x.restore();
        }});
      });

      // Contrails — smoke trails behind planes
      rs.forEach(r => {
        if (r.trail.length < 2) return;
        const tc = r.bt > 0 ? [50,255,100] : r.st > 0 ? [255,200,50] : [255,255,255];
        for (let ti = 0; ti < r.trail.length - 1; ti++) {
          const t1 = r.trail[ti], t2 = r.trail[ti + 1];
          const p1 = proj(t1.x, t1.y, t1.z, cam, vh), p2 = proj(t2.x, t2.y, t2.z, cam, vh);
          if (!p1 || !p2 || p1.d > 400 || p2.d > 400) continue;
          const age = (r.trail.length - 1 - ti) / r.trail.length;
          const al = age * 0.3;
          const lw = 0.5 + age * 1.5;
          rn.push({ d: (p1.d + p2.d) / 2, f() {
            x.strokeStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${al})`; x.lineWidth = lw;
            x.beginPath(); x.moveTo(p1.sx, p1.sy); x.lineTo(p2.sx, p2.sy); x.stroke();
          }});
        }
      });
      // Firework particles
      fireworks.forEach(f => {
        const p = proj(f.x, f.y, f.z, cam, vh);
        if (!p || p.d > 500) return;
        const al = f.life / f.maxLife;
        rn.push({ d: p.d, f() {
          x.globalAlpha = al;
          x.fillStyle = f.color;
          x.beginPath(); x.arc(p.sx, p.sy, Math.max(1, f.size * p.sc), 0, Math.PI * 2); x.fill();
          x.globalAlpha = 1;
        }});
      });

      // Other racers — angular sci-fi fighter
      rs.forEach(r => {
        if (r === vw || r.cr || r.fn) return;
        const p = proj(r.x, r.y, r.z, cam, vh);
        if (!p || p.d > 700 || p.d < 5) return;
        const s = Math.max(3, 11 * p.sc);
        rn.push({ d: p.d, f() {
          x.save(); x.translate(p.sx, p.sy); x.rotate(-r.rl + (r.trickRoll || 0));
          const u = s / 11;
          // Star glow
          if (r.st > 0) { x.fillStyle = "rgba(255,200,50,0.2)"; x.beginPath(); x.arc(0, 0, 16 * u, 0, Math.PI * 2); x.fill(); }
          // Lower wings — angular delta
          x.fillStyle = r.sc; x.beginPath(); x.moveTo(-20*u, 3*u); x.lineTo(-4*u, 0); x.lineTo(4*u, 0); x.lineTo(20*u, 3*u); x.lineTo(12*u, 5*u); x.lineTo(-12*u, 5*u); x.closePath(); x.fill();
          // Upper canards
          x.fillStyle = r.sc; x.beginPath(); x.moveTo(-12*u, -3*u); x.lineTo(-3*u, -5*u); x.lineTo(3*u, -5*u); x.lineTo(12*u, -3*u); x.lineTo(7*u, -2*u); x.lineTo(-7*u, -2*u); x.closePath(); x.fill();
          // Fuselage — sharp
          x.fillStyle = r.ac; x.beginPath(); x.moveTo(0, -12*u); x.lineTo(2*u, -6*u); x.lineTo(3*u, -1*u); x.lineTo(3*u, 6*u); x.lineTo(1.5*u, 9*u); x.lineTo(-1.5*u, 9*u); x.lineTo(-3*u, 6*u); x.lineTo(-3*u, -1*u); x.lineTo(-2*u, -6*u); x.closePath(); x.fill();
          // Wing tip lights
          x.shadowColor = r.ac; x.shadowBlur = 4;
          x.fillStyle = r.ac; x.beginPath(); x.arc(-20*u, 3*u, 1.2*u, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(20*u, 3*u, 1.2*u, 0, Math.PI * 2); x.fill();
          x.shadowBlur = 0;
          // Exhaust flames
          if (r.sp > 1) { const ec = r.bt > 0 ? "rgba(50,255,100,0.6)" : r.st > 0 ? "rgba(255,220,80,0.6)" : "rgba(255,180,50,0.5)"; x.fillStyle = ec; x.beginPath(); x.ellipse(-9*u, 9*u, 1*u, 2*u, 0, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(9*u, 9*u, 1*u, 2*u, 0, 0, Math.PI * 2); x.fill(); }
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
            x.fillStyle = ep.t === 2 ? `rgba(255,255,255,${lf * 0.9})` : ep.t === 0 ? `rgba(255,${100 + lf * 155 | 0},${lf * 50 | 0},${lf * 0.8})` : `rgba(60,60,60,${lf * 0.3})`;
            x.beginPath(); x.arc(p.sx, p.sy, s, 0, Math.PI * 2); x.fill();
          }});
        });
      });

      // Storms — lightning and tornado hazards
      storms.forEach(st => {
        const p = proj(st.x, st.y, st.z, cam, vh);
        if (!p || p.d > 600) return;
        const fade = st.timer < 120 ? st.timer / 120 : 1;
        if (st.type === "tornado") {
          // Tornado rendering — swirling funnel
          const sz = 40 * p.sc;
          rn.push({ d: p.d, f() {
            x.save();
            // Bottom ellipse — large base
            x.globalAlpha = 0.3 * fade;
            x.fillStyle = "rgb(100,200,220)";
            x.beginPath(); x.ellipse(p.sx, p.sy, sz, sz * 0.35, 0, 0, Math.PI * 2); x.fill();
            // Middle ellipse — rotated
            x.globalAlpha = 0.4 * fade;
            x.fillStyle = "rgb(130,210,230)";
            x.save(); x.translate(p.sx, p.sy - 10 * p.sc); x.rotate(fc * 0.05);
            x.beginPath(); x.ellipse(0, 0, 25 * p.sc, 25 * p.sc * 0.35, 0, 0, Math.PI * 2); x.fill();
            x.restore();
            // Top ellipse — small, fast spin
            x.globalAlpha = 0.5 * fade;
            x.fillStyle = "rgb(180,230,240)";
            x.save(); x.translate(p.sx, p.sy - 22 * p.sc); x.rotate(fc * 0.08);
            x.beginPath(); x.ellipse(0, 0, 12 * p.sc, 12 * p.sc * 0.35, 0, 0, Math.PI * 2); x.fill();
            x.restore();
            // Spiral lines connecting ellipses
            x.strokeStyle = `rgba(150,220,235,${0.25 * fade})`; x.lineWidth = Math.max(1, 1.5 * p.sc);
            for (let si = 0; si < 2; si++) {
              x.beginPath();
              for (let t = 0; t <= 1; t += 0.1) {
                const ang = fc * 0.06 + si * Math.PI + t * Math.PI * 3;
                const rad = (40 - 28 * t) * p.sc;
                const fx = p.sx + Math.cos(ang) * rad;
                const fy = p.sy - t * 22 * p.sc + Math.sin(ang) * rad * 0.3;
                if (t === 0) x.moveTo(fx, fy); else x.lineTo(fx, fy);
              }
              x.stroke();
            }
            // Orbiting debris dots
            x.fillStyle = `rgba(150,100,60,${0.6 * fade})`;
            for (let di = 0; di < 5; di++) {
              const dAng = fc * (0.04 + di * 0.012) + di * 1.3;
              const dR = (18 + di * 5) * p.sc;
              const dY = p.sy - di * 4 * p.sc;
              x.beginPath(); x.arc(p.sx + Math.cos(dAng) * dR, dY + Math.sin(dAng) * dR * 0.3, Math.max(1, 2 * p.sc), 0, Math.PI * 2); x.fill();
            }
            x.globalAlpha = 1;
            x.restore();
          }});
        } else {
          // Lightning storm rendering
          const sz = 35 * p.sc;
          rn.push({ d: p.d, f() {
            x.globalAlpha = 0.3 * fade;
            x.fillStyle = "rgb(120,60,200)";
            x.beginPath(); x.arc(p.sx, p.sy, sz, 0, Math.PI * 2); x.fill();
            x.strokeStyle = `rgba(200,170,255,${0.8 * fade})`; x.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              const ax = p.sx + (Math.random() - 0.5) * sz * 1.6;
              const ay = p.sy + (Math.random() - 0.5) * sz * 1.2;
              x.beginPath(); x.moveTo(p.sx + (Math.random() - 0.5) * sz, p.sy + (Math.random() - 0.5) * sz * 0.6);
              x.lineTo(ax, ay);
              x.lineTo(ax + (Math.random() - 0.5) * sz * 0.5, ay + (Math.random() - 0.5) * sz * 0.4);
              x.stroke();
            }
            x.fillStyle = `rgba(220,200,255,${0.9 * fade})`;
            for (let i = 0; i < 5; i++) {
              const sx2 = p.sx + (Math.random() - 0.5) * sz * 1.4;
              const sy2 = p.sy + (Math.random() - 0.5) * sz * 0.8;
              x.beginPath(); x.arc(sx2, sy2, Math.max(1, 2 * p.sc), 0, Math.PI * 2); x.fill();
            }
            x.globalAlpha = 1;
          }});
        }
      });

      // Tsunami wave (Ocean Run only)
      if (cr === 3 && tsunami.active) {
        const wDir = { x: Math.cos(tsunami.angle), z: Math.sin(tsunami.angle) };
        const pDir = { x: -Math.sin(tsunami.angle), z: Math.cos(tsunami.angle) };
        const wFront = -1500 + tsunami.progress * 8;
        // Sample 20 points along the wave front
        const pts = 20, halfW = 2000;
        const topPts = [], botPts = [];
        let avgD = 0, validCount = 0;
        for (let i = 0; i <= pts; i++) {
          const t = (i / pts - 0.5) * 2; // -1 to 1
          const perpOff = t * halfW;
          const baseX = wDir.x * wFront + pDir.x * perpOff;
          const baseZ = wDir.z * wFront + pDir.z * perpOff;
          const perpNorm = Math.abs(t);
          const waveH = 120 * (1 - perpNorm * 0.5); // 120 at center, 60 at edges
          const pBot = proj(baseX, -25, baseZ, cam, vh);
          const pTop = proj(baseX, -25 + waveH, baseZ, cam, vh);
          if (pBot && pTop) {
            topPts.push(pTop); botPts.push(pBot);
            avgD += pBot.d; validCount++;
          }
        }
        if (validCount > 2) {
          avgD /= validCount;
          rn.push({ d: avgD, f() {
            // Main wave body
            x.globalAlpha = 0.8;
            x.fillStyle = "rgb(15,80,110)";
            x.beginPath();
            x.moveTo(botPts[0].sx, botPts[0].sy);
            topPts.forEach(p => x.lineTo(p.sx, p.sy));
            for (let i = botPts.length - 1; i >= 0; i--) x.lineTo(botPts[i].sx, botPts[i].sy);
            x.closePath(); x.fill();
            // Front face highlight
            x.fillStyle = "rgb(30,110,140)";
            x.globalAlpha = 0.6;
            x.beginPath();
            topPts.forEach((p, i) => { const b = botPts[i]; if (i === 0) x.moveTo(p.sx, p.sy); else x.lineTo(p.sx, p.sy); });
            for (let i = topPts.length - 1; i >= 0; i--) {
              const t2 = topPts[i], b = botPts[i];
              x.lineTo(t2.sx + (b.sx - t2.sx) * 0.3, t2.sy + (b.sy - t2.sy) * 0.3);
            }
            x.closePath(); x.fill();
            // White foam crest
            x.strokeStyle = "rgb(220,240,250)"; x.lineWidth = 3; x.globalAlpha = 0.9;
            x.beginPath();
            topPts.forEach((p, i) => { if (i === 0) x.moveTo(p.sx, p.sy); else x.lineTo(p.sx, p.sy); });
            x.stroke();
            // Spray particles
            x.fillStyle = "rgba(220,240,250,0.7)";
            tsunami.spray.forEach(sp => {
              const spX = wDir.x * wFront + pDir.x * sp.ox;
              const spZ = wDir.z * wFront + pDir.z * sp.ox;
              const spY = -25 + 90 + sp.oy + sp.life * 0.5;
              const pp = proj(spX, spY, spZ, cam, vh);
              if (pp) { x.beginPath(); x.arc(pp.sx, pp.sy, Math.max(1, 3 * pp.sc), 0, Math.PI * 2); x.fill(); }
            });
            x.globalAlpha = 1;
          }});
        }
      }

      // Earthquake falling rocks (Canyon)
      if (earthquake.active) {
        earthquake.rocks.forEach(rk => {
          if (!rk.alive) return;
          const p = proj(rk.x, rk.y, rk.z, cam, vh);
          if (!p || p.d > 600) return;
          rn.push({ d: p.d, f() {
            x.fillStyle = "rgb(140,90,50)";
            x.beginPath(); x.arc(p.sx, p.sy, Math.max(2, rk.sz * p.sc), 0, Math.PI * 2); x.fill();
          }});
        });
      }

      // Shadow under player plane
      if (!vw.cr && !vw.fn) {
        const shY = gH(vw.x, vw.z);
        const shP = proj(vw.x, shY, vw.z, cam, vh);
        if (shP) {
          const alt = Math.max(1, vw.y - shY);
          const shSz = Math.max(3, 20 / (1 + alt * 0.01)) * shP.sc;
          rn.push({ d: shP.d, f() {
            x.fillStyle = "rgba(0,0,0,0.15)";
            x.beginPath(); x.ellipse(shP.sx, shP.sy, shSz * 1.5, shSz * 0.5, 0, 0, Math.PI * 2); x.fill();
          }});
        }
      }

      // Sort and draw
      rn.sort((a, b) => b.d - a.d);
      rn.forEach(r => r.f());

      // Distance fog overlay — smooth horizon fade
      const fogG = x.createRadialGradient(W / 2, vh * 0.6, vh * 0.15, W / 2, vh * 0.4, vh * 0.9);
      if (isNight) {
        fogG.addColorStop(0, "rgba(10,15,30,0)"); fogG.addColorStop(0.6, "rgba(10,15,30,0.12)"); fogG.addColorStop(1, "rgba(10,15,30,0.45)");
      } else {
        fogG.addColorStop(0, "rgba(180,200,220,0)"); fogG.addColorStop(0.6, "rgba(180,200,220,0.08)"); fogG.addColorStop(1, "rgba(180,200,220,0.35)");
      }
      x.fillStyle = fogG; x.fillRect(0, 0, W, vh);

      // Screen shake offset
      if (shakeX || shakeY) { x.translate(shakeX, shakeY); }

      // Own plane — angular sci-fi fighter
      if (!vw.cr && !vw.fn) {
        const sx = W / 2, sy = vh / 2 + (i2 ? 14 : 28);
        x.save(); x.translate(sx, sy - vw.p * (i2 ? 10 : 18)); x.rotate(-vw.rl + (vw.trickRoll || 0));
        const s = i2 ? 0.85 : 1.3;
        // Star power glow (behind plane)
        if (vw.st > 0) { x.fillStyle = `rgba(255,200,50,${0.1 + Math.sin(fc * 0.3) * 0.05})`; x.beginPath(); x.arc(0, 0, 22 * s, 0, Math.PI * 2); x.fill(); }
        // Energy core glow
        x.fillStyle = vw.ac.replace(")", ",0.15)").replace("rgb(", "rgba("); x.globalAlpha = 0.15; x.fillStyle = vw.ac; x.beginPath(); x.arc(0, 0, 18 * s, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
        // Engine exhaust (behind wings)
        if (vw.th > 0.3 || vw.bt > 0) {
          const ga = vw.bt > 0 ? 1 : (vw.th - 0.3) / 0.7;
          const ey = vw.bt > 0 ? (2 + ga * 6) : (2 + ga * 3);
          const ec = vw.bt > 0 ? "rgba(50,255,100,0.8)" : vw.st > 0 ? "rgba(255,220,80,0.8)" : "rgba(255,180,50,0.7)";
          x.fillStyle = ec;
          x.beginPath(); x.ellipse(-11*s, 9*s, 1.5*s, ey*s, 0, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.ellipse(11*s, 9*s, 1.5*s, ey*s, 0, 0, Math.PI * 2); x.fill();
        }
        // Lower wings — angular delta
        x.fillStyle = vw.sc; x.beginPath(); x.moveTo(-22*s, 3*s); x.lineTo(-4*s, 0); x.lineTo(4*s, 0); x.lineTo(22*s, 3*s); x.lineTo(14*s, 5*s); x.lineTo(-14*s, 5*s); x.closePath(); x.fill();
        // Wing energy lines
        x.shadowColor = vw.ac; x.shadowBlur = 4;
        x.strokeStyle = vw.ac; x.lineWidth = 1;
        x.beginPath(); x.moveTo(-18*s, 3.5*s); x.lineTo(-6*s, 1*s); x.stroke();
        x.beginPath(); x.moveTo(18*s, 3.5*s); x.lineTo(6*s, 1*s); x.stroke();
        x.shadowBlur = 0;
        // Upper wings — forward-swept canards
        x.fillStyle = vw.sc; x.beginPath(); x.moveTo(-14*s, -3*s); x.lineTo(-4*s, -5*s); x.lineTo(4*s, -5*s); x.lineTo(14*s, -3*s); x.lineTo(8*s, -2*s); x.lineTo(-8*s, -2*s); x.closePath(); x.fill();
        // Canard energy lines
        x.shadowColor = vw.ac; x.shadowBlur = 4;
        x.strokeStyle = vw.ac; x.lineWidth = 1;
        x.beginPath(); x.moveTo(-12*s, -3*s); x.lineTo(-5*s, -4.5*s); x.stroke();
        x.beginPath(); x.moveTo(12*s, -3*s); x.lineTo(5*s, -4.5*s); x.stroke();
        x.shadowBlur = 0;
        // Engine pods — angular nacelles
        x.fillStyle = "rgba(0,0,0,0.4)"; x.fillRect(-12.5*s, 3*s, 3*s, 5*s); x.fillRect(9.5*s, 3*s, 3*s, 5*s);
        // Pod exhaust circles
        const podC = (vw.th > 0.3 || vw.bt > 0) ? (vw.bt > 0 ? "rgba(50,255,100,0.9)" : "rgba(255,160,40,0.8)") : "rgba(100,80,60,0.4)";
        x.fillStyle = podC; x.beginPath(); x.arc(-11*s, 8*s, 1.5*s, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(11*s, 8*s, 1.5*s, 0, Math.PI * 2); x.fill();
        // Fuselage — long angular
        x.fillStyle = vw.ac; x.beginPath(); x.moveTo(0, -14*s); x.lineTo(2*s, -8*s); x.lineTo(3.5*s, -2*s); x.lineTo(3.5*s, 6*s); x.lineTo(2*s, 10*s); x.lineTo(0, 11*s); x.lineTo(-2*s, 10*s); x.lineTo(-3.5*s, 6*s); x.lineTo(-3.5*s, -2*s); x.lineTo(-2*s, -8*s); x.closePath(); x.fill();
        // Center spine highlight
        x.strokeStyle = "rgba(255,255,255,0.3)"; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -14*s); x.lineTo(0, 10*s); x.stroke();
        // Tail fins — twin angular
        x.fillStyle = vw.ac;
        x.beginPath(); x.moveTo(-4*s, 7*s); x.lineTo(-7*s, 3*s); x.lineTo(-2.5*s, 10*s); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(4*s, 7*s); x.lineTo(7*s, 3*s); x.lineTo(2.5*s, 10*s); x.closePath(); x.fill();
        // Tail fin energy lines
        x.strokeStyle = "rgba(255,255,255,0.3)"; x.lineWidth = 1;
        x.beginPath(); x.moveTo(-5.5*s, 5*s); x.lineTo(-3*s, 9*s); x.stroke();
        x.beginPath(); x.moveTo(5.5*s, 5*s); x.lineTo(3*s, 9*s); x.stroke();
        // Cockpit — angular hexagon
        x.fillStyle = vw.cp; x.beginPath(); x.moveTo(0, -9.5*s); x.lineTo(2*s, -8*s); x.lineTo(2*s, -5.5*s); x.lineTo(0, -4.5*s); x.lineTo(-2*s, -5.5*s); x.lineTo(-2*s, -8*s); x.closePath(); x.fill();
        // Cockpit highlight
        x.strokeStyle = "rgba(255,255,255,0.5)"; x.lineWidth = 1; x.beginPath(); x.moveTo(-1.5*s, -9*s); x.lineTo(1.5*s, -9*s); x.stroke();
        // Wing tip lights — pulsing
        const pulse = 0.7 + Math.sin(fc * 0.15) * 0.3;
        x.shadowColor = vw.ac; x.shadowBlur = isNight ? 10 : 6;
        x.globalAlpha = pulse; x.fillStyle = vw.ac;
        x.beginPath(); x.arc(-22*s, 3*s, 1.5*s, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(22*s, 3*s, 1.5*s, 0, Math.PI * 2); x.fill();
        x.globalAlpha = 1; x.shadowBlur = 0;
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

      // Speed lines — streaks from edges toward center when fast
      if (!vw.cr && !vw.fn && vw.sp > 4) {
        const sla = Math.min(0.4, (vw.sp - 4) / 6 * 0.4);
        x.strokeStyle = `rgba(255,255,255,${sla})`; x.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + fc * 0.02;
          const r1 = vh * 0.45, r2 = r1 - 30 - Math.random() * 20;
          const sx2 = W / 2 + Math.cos(angle) * r1, sy2 = vh / 2 + Math.sin(angle) * r1;
          const ex = W / 2 + Math.cos(angle) * r2, ey = vh / 2 + Math.sin(angle) * r2;
          x.beginPath(); x.moveTo(sx2, sy2); x.lineTo(ex, ey); x.stroke();
        }
      }

      // Slipstream wind lines — when drafting
      if (!vw.cr && !vw.fn && vw.slDraft > 30) {
        const sla = Math.min(0.5, (vw.slDraft - 30) / 90 * 0.5);
        x.strokeStyle = `rgba(150,200,255,${sla})`; x.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + fc * 0.05;
          const r1 = vh * 0.35, r2 = r1 - 40 - Math.random() * 30;
          const sx2 = W / 2 + Math.cos(angle) * r1, sy2 = vh / 2 + Math.sin(angle) * r1;
          const ex = W / 2 + Math.cos(angle) * r2, ey2 = vh / 2 + Math.sin(angle) * r2;
          x.beginPath(); x.moveTo(sx2, sy2); x.lineTo(ex, ey2); x.stroke();
        }
      }
      // Slipstream boost — blue tint overlay
      if (!vw.cr && !vw.fn && vw.slBoost > 0) {
        const ba = Math.min(0.15, vw.slBoost / 90 * 0.15);
        x.fillStyle = `rgba(60,130,255,${ba})`;
        x.fillRect(0, 0, W, vh);
      }

      // Announcements — floating text callouts
      announcements.forEach((a, ai) => {
        const al = a.timer < 30 ? a.timer / 30 : 1;
        x.globalAlpha = al;
        const sz = (a.text === "FINAL LAP!" || a.text === "1ST PLACE!") ? (i2 ? 20 : 32) : (i2 ? 14 : 22);
        x.font = `bold ${sz}px Georgia`;
        x.fillStyle = a.color; x.textAlign = "center";
        x.fillText(a.text, W / 2, vh * 0.35 - a.y + ai * (i2 ? 18 : 25));
        x.textAlign = "start"; x.globalAlpha = 1;
      });

      // Undo screen shake
      if (shakeX || shakeY) { x.translate(-shakeX, -shakeY); }

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
      // Replay overlay text
      if (replayMode) {
        const pulse = 0.6 + Math.sin(fc * 0.08) * 0.4;
        x.globalAlpha = pulse;
        x.fillStyle = "#fbbf24"; x.font = "bold " + (i2 ? 18 : 28) + "px Georgia";
        x.textAlign = "center"; x.fillText("REPLAY", W / 2, 30);
        x.font = (i2 ? 8 : 11) + "px Georgia"; x.fillStyle = "#94a3b8"; x.globalAlpha = 0.8;
        x.fillText("Press any key to skip", W / 2, 30 + (i2 ? 14 : 20));
        x.textAlign = "start"; x.globalAlpha = 1;
      }
      // Tsunami warning — flashing "TSUNAMI!" during first 2 seconds
      if (cr === 3 && tsunami.active && tsunami.progress < 120) {
        const pulse = 0.5 + Math.sin(fc * 0.15) * 0.5;
        x.globalAlpha = pulse;
        x.fillStyle = "#f97316"; x.font = "bold " + (i2 ? 24 : 40) + "px Georgia";
        x.textAlign = "center"; x.fillText("🌊 TSUNAMI!", W / 2, vh * 0.35);
        x.textAlign = "start"; x.globalAlpha = 1;
      }
      // Earthquake warning — flashing "EARTHQUAKE!" for 1.5 seconds
      if (cr === 0 && earthquake.active && earthquake.progress < 90) {
        const pulse = 0.5 + Math.sin(fc * 0.15) * 0.5;
        x.globalAlpha = pulse;
        x.fillStyle = "#f97316"; x.font = "bold " + (i2 ? 24 : 40) + "px Georgia";
        x.textAlign = "center"; x.fillText("🏜️ EARTHQUAKE!", W / 2, vh * 0.35);
        x.textAlign = "start"; x.globalAlpha = 1;
      }
      x.restore();
    }

    function mainUpdate() {
      if (ky.current["KeyP"] && !ky.current._pauseCD) {
        ky.current._pauseCD = true;
        setTimeout(() => { ky.current._pauseCD = false; }, 300);
        setPaused(p => !p);
      }
      if (pauseRef.current) return;
      if (cd > 0) { cd--; fc++; return; }
      if (!started) { started = 1; rs.forEach(r => { r.th = 1; r.sp = iB ? 0 : 0.5; }); }
      rt++;

      // Replay recording — capture positions after first racer finishes
      if (!iB && !replayMode && fo.length > 0) {
        if (firstFinishFrame === 0) firstFinishFrame = rt;
        if (rt % 6 === 0) {
          replayBuf.push({ racers: rs.map(r => ({ x: r.x, y: r.y, z: r.z, yw: r.yw, p: r.p, rl: r.rl, ac: r.ac, nm: r.nm, cr: r.cr, fn: r.fn })) });
          if (replayBuf.length > 30) replayBuf.shift();
        }
      }

      // Replay playback
      if (replayMode) {
        const anyKey = Object.keys(ky.current).some(k => k !== "_pauseCD" && k !== "KeyP" && ky.current[k]);
        if (anyKey && replayFrame > 10) {
          setEd({ rs: fo.map((r, i) => ({ nm: r.nm, ac: r.ac, pl: i + 1, t: (r.ft / 60).toFixed(1) })) });
          setSc("raceEnd"); return;
        }
        if (fc % 2 === 0) replayFrame++;
        if (replayFrame >= replayBuf.length) {
          setEd({ rs: fo.map((r, i) => ({ nm: r.nm, ac: r.ac, pl: i + 1, t: (r.ft / 60).toFixed(1) })) });
          setSc("raceEnd"); return;
        }
        const snap = replayBuf[replayFrame];
        if (snap) snap.racers.forEach((s, i) => { if (rs[i]) { rs[i].x = s.x; rs[i].y = s.y; rs[i].z = s.z; rs[i].yw = s.yw; rs[i].p = s.p; rs[i].rl = s.rl; } });
        // Cinematic camera orbiting the leader
        const leader = fo[0] || rs[0];
        const cAng = replayFrame * 0.03;
        cm[0].x = leader.x + Math.sin(cAng) * 120; cm[0].y = leader.y + 40; cm[0].z = leader.z + Math.cos(cAng) * 120;
        cm[0].lx = leader.x; cm[0].ly = leader.y; cm[0].lz = leader.z;
        if (i2) { cm[1].x = cm[0].x; cm[1].y = cm[0].y; cm[1].z = cm[0].z; cm[1].lx = cm[0].lx; cm[1].ly = cm[0].ly; cm[1].lz = cm[0].lz; }
        // Render but skip normal update
        const pl2 = rs.filter(r2 => !r2.npc);
        if (i2) {
          renderView(cm[0], pl2[0] || rs[0], 0, VH);
          if (pl2[1]) renderView(cm[1], pl2[1], VH, VH);
        } else {
          renderView(cm[0], pl2[0] || rs[0], 0, H);
        }
        fc++;
        return;
      }

      const pl = rs.filter(r => !r.npc);
      if (pl[0]) updatePlayer(pl[0], cm[0], ky.current, "KeyW", "KeyS", "KeyA", "KeyD", "Space", "KeyQ", "Space");
      if (pl[1] && i2) updatePlayer(pl[1], cm[1], ky.current, "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Slash", "Period", "ShiftRight");
      rs.filter(r => r.npc).forEach(r => updateNPC(r));

      // Contrails — record positions every 3 frames
      if (fc % 3 === 0) rs.forEach(r => { if (!r.cr && !r.fn) { r.trail.push({ x: r.x, y: r.y, z: r.z }); if (r.trail.length > 30) r.trail.shift(); } });
      // Tick announcements
      announcements.forEach(a => { a.timer--; a.y += 0.5; });
      announcements = announcements.filter(a => a.timer > 0);
      // Tick fireworks
      fireworks.forEach(f => { f.x += f.vx; f.y += f.vy; f.z += f.vz; f.vx *= 0.97; f.vy *= 0.97; f.vz *= 0.97; f.vy -= 0.05; f.life--; });
      fireworks = fireworks.filter(f => f.life > 0);
      // Victory roll
      if (victoryTarget && victoryFrame < 120) { victoryTarget.rl = Math.sin(fc * 0.15) * 30 * D; victoryFrame++; }
      // Race start announcement
      if (!iB && started && fc === 241) addAnnouncement("GO GO GO!", "#22c55e");

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
      cubes.forEach(c => { if (!c.active) { c.rt--; if (c.rt <= 0) c.active = true; } });
      stormCubes.forEach(c => { if (!c.active && !c.noRespawn) { c.rt--; if (c.rt <= 0) c.active = true; } });

      // Storms — update timers, apply effects
      storms.forEach(st => {
        st.timer--;
        rs.forEach(r => {
          if (r === st.owner || r.cr || r.fn) return;
          if (r.st > 0) return; // star immunity
          const d = Math.sqrt((r.x - st.x) ** 2 + (r.z - st.z) ** 2);
          if (st.type === "tornado") {
            // Tornado: pull effect within 60 units
            if (d < 60) {
              r.x += (st.x - r.x) * 0.03;
              r.y += (st.y - r.y) * 0.03;
              r.z += (st.z - r.z) * 0.03;
              // Throw at center (< 20 units) if not already thrown by this tornado
              if (d < 20 && !st.hitRacers.includes(r)) {
                st.hitRacers.push(r);
                if (!r.npc) addAnnouncement("CAUGHT!", "#06b6d4");
                r.yw += Math.PI; // flip direction
                r.sp = 2;
                const sy2 = Math.sin(r.yw), cy2 = Math.cos(r.yw);
                r.x += sy2 * 30; r.z += cy2 * 30;
              }
            }
          } else {
            // Lightning: zap once
            if (d < 50 && !st.hit.has(r)) {
              st.hit.add(r);
              r.sp = 1; r.bt = 0;
              r.zap = 60;
              if (!r.npc) addAnnouncement("ZAPPED!", "#a855f7");
            }
          }
        });
      });
      storms = storms.filter(st => st.timer > 0);
      // Apply zap slowdown
      rs.forEach(r => { if (r.zap > 0) { r.sp = Math.min(r.sp, 1); r.zap--; } });

      // Tsunami — Ocean Run (cr===3) only, triggers on lap 2
      if (cr === 3 && !iB) {
        // Trigger check: any racer starts lap 2
        if (!tsunami.triggered) {
          for (const r of rs) {
            if (r.lp >= 1) {
              tsunami.active = true;
              tsunami.triggered = true;
              tsunami.progress = 0;
              tsunami.angle = Math.random() * Math.PI * 2;
              // Init spray particles
              tsunami.spray = [];
              for (let i = 0; i < 10; i++) tsunami.spray.push({ ox: (Math.random() - 0.5) * 3000, oy: Math.random() * 20, life: 0 });
              break;
            }
          }
        }
        // Update tsunami
        if (tsunami.active) {
          tsunami.progress++;
          if (tsunami.progress >= tsunami.duration) { tsunami.active = false; }
          else {
            // Wave front position along travel direction
            const wDir = { x: Math.cos(tsunami.angle), z: Math.sin(tsunami.angle) };
            const wFront = -1500 + tsunami.progress * 8;
            // Check each racer
            rs.forEach(r => {
              if (r.cr || r.fn) return;
              if (r.st > 0) return; // star immunity
              // Racer's position along wave travel axis
              const rAlong = r.x * wDir.x + r.z * wDir.z;
              const distToFront = Math.abs(rAlong - wFront);
              if (distToFront < 40) {
                // Wave height at racer's perpendicular position
                const rPerp = -r.x * wDir.z + r.z * wDir.x;
                const perpNorm = Math.abs(rPerp) / 2000;
                const waveH = 80 + (1 - Math.min(1, perpNorm)) * 40;
                if (r.y < -25 + waveH) {
                  // Hit by tsunami — push and tumble
                  r.x += wDir.x * 4;
                  r.z += wDir.z * 4;
                  r.sp = 1;
                  if (r.tumble <= 0) r.tumble = 60;
                }
              }
            });
            // Update spray particles
            tsunami.spray.forEach(sp => { sp.life++; if (sp.life > 40) { sp.ox = (Math.random() - 0.5) * 3000; sp.oy = Math.random() * 20; sp.life = 0; } });
          }
        }
      }

      // Earthquake — Grand Canyon (cr===0) only, triggers on lap 3
      if (cr === 0 && !iB) {
        if (!earthquake.triggered) {
          for (const r of rs) {
            if (r.lp >= 2) {
              earthquake.active = true;
              earthquake.triggered = true;
              earthquake.progress = 0;
              // Spawn falling rocks from canyon wall tops
              earthquake.rocks = [];
              for (let i = 0; i < 10; i++) {
                const ci = Math.floor(Math.random() * canyon.length);
                if (!canyon[ci]) continue;
                const cw = canyon[ci];
                earthquake.rocks.push({ x: cw.x + (Math.random() - 0.5) * 20, y: cw.bY + cw.ht, z: cw.z + (Math.random() - 0.5) * 20, vy: 0, sz: 3 + Math.random() * 3, alive: true });
              }
              break;
            }
          }
        }
        if (earthquake.active) {
          earthquake.progress++;
          // Intensity ramp: up for 60, full for 240, down for 60
          if (earthquake.progress < 60) earthquake.intensity = earthquake.progress / 60;
          else if (earthquake.progress < 300) earthquake.intensity = 1;
          else earthquake.intensity = (earthquake.duration - earthquake.progress) / 60;
          if (earthquake.progress >= earthquake.duration) { earthquake.active = false; earthquake.intensity = 0; }
          // Update falling rocks
          earthquake.rocks.forEach(rk => {
            if (!rk.alive) return;
            rk.vy -= 0.15; rk.y += rk.vy;
            if (rk.y < gH(rk.x, rk.z)) { rk.alive = false; return; }
            // Rock-racer collision
            rs.forEach(r => {
              if (r.cr || r.fn || r.st > 0) return;
              if (Math.sqrt((r.x - rk.x) ** 2 + (r.y - rk.y) ** 2 + (r.z - rk.z) ** 2) < 12) {
                boom(r); rk.alive = false;
              }
            });
          });
        }
      }

      // End conditions
      if (iB) {
        const al = rs.filter(r => !r.fn);
        if (al.length <= 1) {
          const w = al[0] || rs.reduce((a, b) => a.kl > b.kl ? a : b);
          setEd({ w: w.nm, wc: w.ac, rs: [...rs].sort((a, b) => b.kl - a.kl || b.lv - a.lv).map(r => ({ nm: r.nm, ac: r.ac, kl: r.kl, lv: r.lv })) });
          setSc("battleEnd");
        }
      } else {
        const timedOut = firstFinishFrame > 0 && (rt - firstFinishFrame) > 600;
        if (rs.every(r => r.fn) || timedOut) {
          if (!replayMode && replayBuf.length > 0) {
            replayMode = true; replayFrame = 0;
            rs.forEach(r => { if (!r.fn) { r.fn = 1; r.ft = rt; fo.push(r); r.fp = fo.length; } });
          } else if (!replayMode) {
            setEd({ rs: fo.map((r, i) => ({ nm: r.nm, ac: r.ac, pl: i + 1, t: (r.ft / 60).toFixed(1) })) });
            setSc("raceEnd");
          }
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
  }, [sc, np, cr, restartKey, night]);

  // Key listeners
  useEffect(() => {
    const dn = (e) => { ky.current[e.code] = true; if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Slash", "Period", "ShiftRight", "KeyP"].includes(e.code)) e.preventDefault(); };
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
        <button onClick={() => { setNp(1); if (gm === "race") setSc("coursePick"); else go(gm, 1); }} style={{ padding: "16px 32px", background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "18px", fontWeight: 900, cursor: "pointer" }}>1 PLAYER</button>
        <button onClick={() => { setNp(2); if (gm === "race") setSc("coursePick"); else go(gm, 2); }} style={{ padding: "16px 32px", background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", borderRadius: "12px", color: "#fff", fontSize: "18px", fontWeight: 900, cursor: "pointer" }}>2 PLAYER</button>
      </div>
      <button onClick={() => setSc("menu")} style={{ padding: "8px 20px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#64748b", fontSize: "12px", cursor: "pointer" }}>Back</button>
    </div>
  );

  // COURSE PICK
  if (sc === "coursePick") {
    const courses = [
      { name: "GRAND CANYON", desc: "Race through towering red rock canyon walls", color: "#f97316", emoji: "\u{1F3DC}\u{FE0F}" },
      { name: "ISLAND SKIES", desc: "Weave between floating islands high above the clouds", color: "#22c55e", emoji: "\u{1F3DD}\u{FE0F}" },
      { name: "MOUNTAIN PASS", desc: "Thread the needle between snow-capped peaks", color: "#3b82f6", emoji: "\u{1F3D4}\u{FE0F}" },
      { name: "OCEAN RUN", desc: "Skim the waves over endless open ocean", color: "#06b6d4", emoji: "\u{1F30A}" },
      { name: "VOLCANO", desc: "Fly over rivers of lava around an active volcano", color: "#dc2626", emoji: "\u{1F30B}" },
      { name: "ICE CAVERN", desc: "Fly through frozen valleys and ice arches", color: "#67e8f9", emoji: "❄️" },
    ];
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: ft, color: "#e2e8f0", padding: "20px", textAlign: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 4px", color: "#fbbf24" }}>SELECT COURSE</h2>
        <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "20px" }}>{LAPS} laps · {np === 2 ? "2 players" : "1 player"}</p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginBottom: "20px", width: "min(560px,95vw)" }}>
          {courses.map((c, i) => (
            <button key={i} onClick={() => { setCr(i); go("race", np); }} style={{ padding: "16px", background: `linear-gradient(135deg,${c.color}18,${c.color}08)`, border: `2px solid ${c.color}55`, borderRadius: "14px", color: "#e2e8f0", cursor: "pointer", flex: "1", minWidth: "140px", maxWidth: "260px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "6px" }}>{c.emoji}</div>
              <div style={{ fontSize: "14px", fontWeight: 900, color: c.color, letterSpacing: "1px", marginBottom: "4px" }}>{c.name}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", lineHeight: "1.4" }}>{c.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
          <button onClick={() => setNight(n => !n)} style={{ padding: "8px 16px", background: night ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.03)", border: night ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: night ? "#fbbf24" : "#64748b", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{night ? "🌙 NIGHT MODE ON" : "🌙 NIGHT MODE"}</button>
        </div>
        <button onClick={() => setSc("pick")} style={{ padding: "8px 20px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#64748b", fontSize: "12px", cursor: "pointer" }}>Back</button>
      </div>
    );
  }

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
            <div><b style={{ color: "#e2e8f0" }}>Space</b> Weapon</div>
            <div><b style={{ color: "#06b6d4" }}>Double-tap A/D</b> Barrel Roll</div>
          </div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: "12px", padding: "16px 20px", border: "2px solid #ef444444", flex: "1", minWidth: "180px", textAlign: "left" }}>
          <div style={{ color: "#ef4444", fontWeight: 900, fontSize: "14px", marginBottom: "10px" }}>PLAYER 2 — RED</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "2" }}>
            <div><b style={{ color: "#e2e8f0" }}>↑</b> Rise</div>
            <div><b style={{ color: "#e2e8f0" }}>↓</b> Dive</div>
            <div><b style={{ color: "#e2e8f0" }}>←/→</b> Turn</div>
            <div><b style={{ color: "#e2e8f0" }}>Shift</b> Weapon</div>
            <div><b style={{ color: "#06b6d4" }}>Double-tap ←/→</b> Barrel Roll</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "20px" }}>🟨 Gold cubes = powerups · 🔫 Gun · 🚀 Boost · 💥 Homing Missile · ⭐ Star · 🛡️ Flares · ⚡ Lightning Storm · 🌪️ Tornado — pulls racers in and throws them backward</div>
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
      {paused && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: ft, zIndex: 50 }}>
          <h2 style={{ fontSize: "36px", fontWeight: 900, color: "#e2e8f0", marginBottom: "32px" }}>PAUSED</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "200px" }}>
            <button onClick={() => setPaused(false)} style={{ padding: "14px", background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "16px", fontWeight: 900, cursor: "pointer" }}>RESUME</button>
            <button onClick={() => { setPaused(false); setRestartKey(k => k + 1); }} style={{ padding: "14px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "16px", fontWeight: 900, cursor: "pointer" }}>RESTART</button>
            <button onClick={() => { setPaused(false); setSc("menu"); }} style={{ padding: "14px", background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "16px", fontWeight: 900, cursor: "pointer" }}>MAIN MENU</button>
          </div>
          <p style={{ fontSize: "10px", color: "#64748b", marginTop: "16px" }}>Press P to resume</p>
        </div>
      )}
    </div>
  );
}
