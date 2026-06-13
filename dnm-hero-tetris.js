/* =====================================================================
   dnm-hero-tetris.js  —  DNM (getdnm.com) hero motion: Naming Tetris only
   Falcrex Inc · "messy file names -> one clean standard, at save."

   Gist-ready ES module. Mounts ONLY variant A (Naming Tetris) into:
       [data-dnm-hero3d]   or   #dnm-hero-3d
   with a TRANSPARENT background so it drops straight into the existing
   hero section (the page's own backdrop shows through).

   Behaviour (identical guarantees to dnm-motion-lab.js):
     - Loads three.js r0.160 itself if window.THREE is absent.
     - Double-init guarded (window.__dnmHeroTetris + per-host flag).
     - Sizes canvas to host; handles resize.
     - prefers-reduced-motion: ONE static tidy frame, no RAF loop.
     - Caps DPR at 2; IntersectionObserver + visibilitychange pause loop.
     - Disposes geometries/materials/textures on clear; reuses CanvasTextures.
     - Never throws into the page.

   Usage (inside your hero):
       <div id="dnm-hero-3d" style="position:absolute;inset:0"></div>
       <script type="module" src="https://your-gist/dnm-hero-tetris.js"></script>
   ===================================================================== */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let THREE = null;

const C = {
  bg0: 0x14161c, indigo: 0x4338ca, indigoHi: 0x6366f1,
  tileMuted: 0x2a2f3b, tileClean: 0x4338ca,
};

const MESSY = [
  "IMG_2381.JPG",
  "Scan_0007 (1).pdf",
  "final v2 FINAL contract.docx",
  "DCIM_4471.jpg",
  "Untitled spreadsheet (3).xlsx",
  "doc1 (copy).pdf",
];
const CLEAN = [
  { name: "Smith_20260613_PLE_Contract.pdf", type: "PLE" },
  { name: "Acme_20260612_INV_Invoice.pdf", type: "INV" },
  { name: "Site12_20260611_RPT_Inspection.pdf", type: "RPT" },
  { name: "Jones_20260610_PHO_SiteVisit.jpg", type: "PHO" },
  { name: "Vault_20260609_PLE_Affidavit.pdf", type: "PLE" },
  { name: "North_20260608_RPT_Survey.pdf", type: "RPT" },
];
const TYPE_LABEL = { PLE: "Legal", INV: "Invoice", RPT: "Report", PHO: "Photo" };

const reduceMotion = (() => {
  try { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch (e) { return false; }
})();

async function ensureThree() {
  if (THREE) return THREE;
  if (window.THREE && window.THREE.Scene) { THREE = window.THREE; return THREE; }
  const mod = await import(THREE_URL);
  THREE = mod;
  try { window.THREE = mod; } catch (e) {}
  return THREE;
}

/* ---------- CanvasTexture label ---------- */
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fitText(ctx, text, maxW, startPx, minPx, weight) {
  let px = startPx;
  const f = (p) => weight + " " + p + "px -apple-system, 'Segoe UI', Inter, Arial, sans-serif";
  ctx.font = f(px);
  while (ctx.measureText(text).width > maxW && px > minPx) { px -= 2; ctx.font = f(px); }
  return px;
}
function makeLabelTexture(opts) {
  const W = 512, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  drawLabel(ctx, W, H, opts);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex._cv = cv;
  return tex;
}
function drawLabel(ctx, W, H, opts) {
  const clean = opts.clean;
  ctx.clearRect(0, 0, W, H);
  const pad = 16;
  ctx.save();
  roundRectPath(ctx, pad, pad, W - pad * 2, H - pad * 2, 34);
  ctx.clip();
  if (clean) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#4f46d6"); g.addColorStop(1, "#3b32ac"); ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#333a48"); g.addColorStop(1, "#272c37"); ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.lineWidth = 3;
  ctx.strokeStyle = clean ? "rgba(165,170,255,0.55)" : "rgba(255,255,255,0.10)";
  roundRectPath(ctx, pad + 2, pad + 2, W - pad * 2 - 4, H - pad * 2 - 4, 32);
  ctx.stroke();

  const dotX = 56, dotY = 70, dotR = 22;
  ctx.beginPath(); ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = clean ? "#c7c9ff" : "#586074"; ctx.fill();
  ctx.font = "700 20px -apple-system, 'Segoe UI', Inter, Arial, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = clean ? "#2e2785" : "#aeb4c2";
  ctx.fillText(clean ? (opts.type || "DNM") : "?", dotX, dotY + 1);

  const pillTxt = clean ? "STANDARD" : "UNSORTED";
  ctx.font = "700 17px -apple-system, 'Segoe UI', Inter, Arial, sans-serif";
  const pw = ctx.measureText(pillTxt).width + 28;
  const px = W - pad - 14 - pw, py = 48, ph = 38;
  roundRectPath(ctx, px, py, pw, ph, 19);
  ctx.fillStyle = clean ? "rgba(199,201,255,0.22)" : "rgba(255,255,255,0.06)"; ctx.fill();
  ctx.fillStyle = clean ? "#dcddff" : "#9aa0ad";
  ctx.textAlign = "center"; ctx.fillText(pillTxt, px + pw / 2, py + ph / 2 + 1);

  const name = opts.name || "";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const fpx = fitText(ctx, name, W - 80, 40, 20, "600");
  ctx.font = "600 " + fpx + "px -apple-system, 'Segoe UI', Inter, Arial, sans-serif";
  ctx.fillStyle = clean ? "#ffffff" : "#e7e9ee";
  ctx.fillText(name, 48, 178);

  ctx.font = "500 18px -apple-system, 'Segoe UI', Inter, Arial, sans-serif";
  ctx.fillStyle = clean ? "rgba(220,221,255,0.85)" : "rgba(154,160,173,0.85)";
  const sub = clean
    ? (TYPE_LABEL[opts.type] ? (TYPE_LABEL[opts.type] + " · DNM convention") : "DNM convention")
    : "needs a name";
  ctx.fillText(sub, 48, 210);
}

/* ---------- geometry caches ---------- */
const geoCache = new Map();
function remapPlanarUV(geo, w, h) {
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
}
function roundedBox(w, h, d, r, seg) {
  const key = [w, h, d, r, seg].join("|");
  if (geoCache.has(key)) return geoCache.get(key);
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(r * 0.6, d * 0.28);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: seg || 2, curveSegments: 6,
  });
  geo.translate(0, 0, -(d - bevel * 2) / 2);
  geo.computeVertexNormals();
  remapPlanarUV(geo, w, h);
  geoCache.set(key, geo);
  return geo;
}
const planeCache = new Map();
function roundedPlane(w, h, r) {
  const key = "P" + [w, h, r].join("|");
  if (planeCache.has(key)) return planeCache.get(key);
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ShapeGeometry(shape, 6);
  remapPlanarUV(geo, w, h);
  planeCache.set(key, geo);
  return geo;
}

/* ---------- Tile ---------- */
class Tile {
  constructor(w, h, d, messyIdx, cleanIdx) {
    this.w = w; this.h = h; this.d = d;
    this.texMessy = makeLabelTexture({ clean: false, name: MESSY[messyIdx % MESSY.length] });
    const cl = CLEAN[cleanIdx % CLEAN.length];
    this.texClean = makeLabelTexture({ clean: true, name: cl.name, type: cl.type });
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(C.tileMuted), roughness: 0.62, metalness: 0.18, emissive: new THREE.Color(0x000000),
    });
    const geo = roundedBox(w, h, d, Math.min(w, h) * 0.13, 2);
    this.mesh = new THREE.Group();
    this.body = new THREE.Mesh(geo, this.bodyMat);
    this.mesh.add(this.body);
    const planeGeo = roundedPlane(w * 0.94, h * 0.94, Math.min(w, h) * 0.11);
    this.faceMat = new THREE.MeshStandardMaterial({ map: this.texMessy, roughness: 0.5, metalness: 0.0, transparent: true });
    this.face = new THREE.Mesh(planeGeo, this.faceMat);
    this.face.position.z = d / 2 + 0.012;
    this.mesh.add(this.face);
    this._mix = 0;
    this.colMuted = new THREE.Color(C.tileMuted);
    this.colClean = new THREE.Color(C.tileClean);
    this.emClean = new THREE.Color(C.indigo);
    this.emZero = new THREE.Color(0x000000);
  }
  setCleanInstant(v) {
    this._mix = v ? 1 : 0;
    this.faceMat.map = v ? this.texClean : this.texMessy; this.faceMat.needsUpdate = true; this._apply();
  }
  morph(t) {
    if (t >= 0.5 && this.faceMat.map !== this.texClean) { this.faceMat.map = this.texClean; this.faceMat.needsUpdate = true; }
    else if (t < 0.5 && this.faceMat.map !== this.texMessy) { this.faceMat.map = this.texMessy; this.faceMat.needsUpdate = true; }
    this._mix = t; this._apply();
  }
  _apply() {
    const m = this._mix;
    this.bodyMat.color.copy(this.colMuted).lerp(this.colClean, m);
    this.bodyMat.emissive.copy(this.emZero).lerp(this.emClean, m * 0.32);
    this.bodyMat.emissiveIntensity = 1.0;
  }
  dispose() {
    try { this.bodyMat.dispose(); } catch (e) {}
    try { this.faceMat.dispose(); } catch (e) {}
    try { this.texMessy._cv = null; this.texMessy.dispose(); } catch (e) {}
    try { this.texClean._cv = null; this.texClean.dispose(); } catch (e) {}
  }
}

/* ---------- easing ---------- */
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const clamp01 = (t) => t < 0 ? 0 : t > 1 ? 1 : t;

/* ---------- Hero Tetris scene (transparent) ---------- */
class HeroTetris {
  constructor(host, opts) {
    this.host = host;
    this.opts = opts || {};
    this.transparent = this.opts.transparent !== false; // default TRUE for hero
    const T = THREE;

    this.scene = new T.Scene();
    if (!this.transparent) this.scene.background = new T.Color(C.bg0);

    const rect = host.getBoundingClientRect();
    const w = Math.max(2, rect.width), h = Math.max(2, rect.height || 420);

    this.camera = new T.PerspectiveCamera(42, w / h, 0.1, 200);
    this.camera.position.set(0, 0.5, 19.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: this.transparent, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    if (this.transparent) this.renderer.setClearColor(0x000000, 0);
    this.canvas = this.renderer.domElement;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    host.appendChild(this.canvas);

    this._buildLights();

    this.group = new T.Group();
    this.scene.add(this.group);

    this.cols = 3; this.rows = 4;
    this.tileW = 5.2; this.tileH = 1.85; this.tileD = 0.9;
    this.gapX = 0.5; this.gapY = 0.42;
    const totalW = this.cols * this.tileW + (this.cols - 1) * this.gapX;
    const totalH = this.rows * this.tileH + (this.rows - 1) * this.gapY;
    this.originX = -totalW / 2 + this.tileW / 2;
    this.bottomY = -totalH / 2 + this.tileH / 2;

    this.slots = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        this.slots.push({ x: this.originX + c * (this.tileW + this.gapX), y: this.bottomY + r * (this.tileH + this.gapY), r, c });

    this.tiles = [];
    this._spawnSeq = 0; this._dropTimer = 0; this._dropEvery = 0.42;
    this._state = "filling"; this._holdT = 0; this._clearT = 0;

    this._running = false; this._visible = !document.hidden; this._inView = true;
    this._paused = false; this._raf = 0; this._last = 0; this._t = 0;

    this._onResize = this._resize.bind(this);
    window.addEventListener("resize", this._onResize, { passive: true });
    this._onVis = () => { this._visible = !document.hidden; this._sync(); };
    document.addEventListener("visibilitychange", this._onVis);
    try {
      this._io = new IntersectionObserver((ents) => { for (const e of ents) this._inView = e.isIntersecting; this._sync(); }, { threshold: 0.01 });
      this._io.observe(host);
    } catch (e) { this._io = null; }

    if (reduceMotion) { this._buildStatic(); this.renderOnce(); return; }
    this._sync();
    if (!this._running) this.renderOnce();
  }

  _buildLights() {
    const T = THREE;
    this.scene.add(new T.AmbientLight(0xb8c0d8, 0.55));
    const key = new T.DirectionalLight(0xffffff, 2.1); key.position.set(6, 12, 10); this.scene.add(key);
    const fill = new T.DirectionalLight(0xc9d2ff, 0.5); fill.position.set(-8, 4, 6); this.scene.add(fill);
    const rim = new T.DirectionalLight(C.indigoHi, 1.5); rim.position.set(-4, -3, -8); this.scene.add(rim);
    const rim2 = new T.PointLight(C.indigo, 0.8, 60); rim2.position.set(0, 6, -10); this.scene.add(rim2);
  }
  _resize() {
    const rect = this.host.getBoundingClientRect();
    const w = Math.max(2, rect.width), h = Math.max(2, rect.height || 420);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    if (!this._running) this.renderOnce();
  }
  _sync() {
    const should = this._visible && this._inView && !this._paused && !reduceMotion;
    if (should && !this._running) this.start();
    else if (!should && this._running) this.stop();
  }
  start() {
    if (this._running) return;
    this._running = true; this._last = performance.now();
    const loop = (now) => {
      if (!this._running) return;
      this._raf = requestAnimationFrame(loop);
      let dt = (now - this._last) / 1000; this._last = now;
      if (dt > 0.05) dt = 0.05;
      this._t += dt;
      try { this.update(dt, this._t); } catch (e) {}
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }
  stop() { this._running = false; if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }
  renderOnce() { try { this.renderer.render(this.scene, this.camera); } catch (e) {} }

  _makeTile(slotIndex) {
    const t = new Tile(this.tileW, this.tileH, this.tileD, this._spawnSeq, this._spawnSeq);
    this._spawnSeq++;
    const slot = this.slots[slotIndex];
    t.slotIndex = slotIndex;
    t.mesh.position.set(slot.x + (Math.random() - 0.5) * 1.4, 12 + Math.random() * 3, (Math.random() - 0.5) * 0.6);
    t.mesh.rotation.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.6);
    t.startPos = t.mesh.position.clone();
    t.startRot = { x: t.mesh.rotation.x, y: t.mesh.rotation.y, z: t.mesh.rotation.z };
    t.targetY = slot.y; t.fall = 0; t.fallDur = 0.62 + Math.random() * 0.12;
    t.locked = false; t.snap = 0; t.appear = 0;
    this.group.add(t.mesh); this.tiles.push(t);
  }
  _buildStatic() {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const t = new Tile(this.tileW, this.tileH, this.tileD, i, i);
      t.mesh.position.set(slot.x, slot.y, 0);
      t.setCleanInstant(true);
      this.group.add(t.mesh); this.tiles.push(t);
    }
  }
  update(dt, time) {
    if (this._state === "filling") {
      this._dropTimer += dt;
      if (this.tiles.length < this.slots.length && this._dropTimer >= this._dropEvery) { this._dropTimer = 0; this._makeTile(this.tiles.length); }
    }
    for (const t of this.tiles) {
      if (t.appear < 1) { t.appear = clamp01(t.appear + dt * 4); t.mesh.scale.setScalar(0.6 + 0.4 * easeOutBack(t.appear)); }
      if (!t.locked) {
        t.fall = clamp01(t.fall + dt / t.fallDur);
        const ej = easeOutBack(t.fall);
        const slot = this.slots[t.slotIndex];
        t.mesh.position.set(
          t.startPos.x + (slot.x - t.startPos.x) * easeOutCubic(t.fall),
          t.startPos.y + (t.targetY - t.startPos.y) * ej,
          t.startPos.z + (0 - t.startPos.z) * easeOutCubic(t.fall)
        );
        const rf = easeOutCubic(t.fall);
        t.mesh.rotation.set(t.startRot.x * (1 - rf), t.startRot.y * (1 - rf), t.startRot.z * (1 - rf));
        if (t.fall >= 1) { t.locked = true; t.mesh.position.set(slot.x, t.targetY, 0); t.mesh.rotation.set(0, 0, 0); }
      } else if (t.snap < 1) {
        t.snap = clamp01(t.snap + dt * 1.8);
        t.morph(easeOutCubic(t.snap));
        t.mesh.scale.setScalar(1 + Math.sin(Math.min(t.snap, 1) * Math.PI) * 0.06);
      } else { t.mesh.scale.setScalar(1); }
    }
    this.group.rotation.y = Math.sin(time * 0.25) * 0.05;
    this.group.position.y = Math.sin(time * 0.6) * 0.05;

    const allLocked = this.tiles.length === this.slots.length && this.tiles.every((t) => t.locked && t.snap >= 1);
    if (this._state === "filling" && allLocked) { this._state = "hold"; this._holdT = 0; }
    else if (this._state === "hold") { this._holdT += dt; if (this._holdT > 1.6) { this._state = "clearing"; this._clearT = 0; } }
    else if (this._state === "clearing") {
      this._clearT += dt; const p = clamp01(this._clearT / 1.0);
      for (let i = this.tiles.length - 1; i >= 0; i--) {
        const t = this.tiles[i];
        t.mesh.scale.setScalar(Math.max(0.001, 1 - easeInCubic(p)));
        t.mesh.position.y = this.slots[t.slotIndex].y + easeInCubic(p) * 2.0;
        const op = 1 - p;
        t.faceMat.opacity = op; t.bodyMat.opacity = op; t.bodyMat.transparent = true;
      }
      if (p >= 1) {
        for (const t of this.tiles) { this.group.remove(t.mesh); t.dispose(); }
        this.tiles.length = 0; this._spawnSeq = 0; this._dropTimer = 0; this._state = "filling";
      }
    }
  }
  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("visibilitychange", this._onVis);
    if (this._io) { try { this._io.disconnect(); } catch (e) {} }
    try { for (const t of this.tiles) t.dispose(); } catch (e) {}
    try { this.renderer.dispose(); } catch (e) {}
    try { if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas); } catch (e) {}
  }
}

/* ---------- mount ---------- */
function mountAll() {
  return ensureThree().then(() => {
    const hosts = document.querySelectorAll('[data-dnm-hero3d], #dnm-hero-3d');
    hosts.forEach((host) => {
      if (host.__dnmMounted) return;
      host.__dnmMounted = true;
      try { host.__dnmInstance = new HeroTetris(host, { transparent: true }); }
      catch (e) { host.__dnmMounted = false; try { console.error('[dnm-hero-tetris] mount failed', e); } catch (_) {} }
    });
  });
}

function boot() {
  if (window.__dnmHeroTetris) return;
  window.__dnmHeroTetris = true;
  const run = () => mountAll().catch((e) => { try { console.error('[dnm-hero-tetris] init error', e); } catch (_) {} });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}

try { boot(); } catch (e) { try { console.error('[dnm-hero-tetris] boot error', e); } catch (_) {} }

export { mountAll, HeroTetris };
