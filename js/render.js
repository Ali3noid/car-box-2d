// js/render.js
// Canvas renderer for a Planck.js world.
// - Smooth follow camera (damping + offset)
// - Zoom with clamping
// - Grid background for debugging
// - Draws polygons, circles, edges and chains
// Notes:
//   * This module does not import planck directly; it only reads bodies/fixtures.
//   * Provide the world and the target body (car) from the outside.

/* Tunable defaults */
const DEFAULT_PIXELS_PER_METER = 30;        // base screen scale at zoom=1
const DEFAULT_MIN_ZOOM = 0.5;
const DEFAULT_MAX_ZOOM = 2.0;

const COLORS = {
  grid: '#3a3a3a',
  terrain: '#9cf',
  body: '#fff',
};

export class Renderer {
  /**
   * Construct a new renderer.
   * - Sets up DPR-aware canvas resolution (keeps crisp lines)
   * - Initializes camera near target position
   *
   * @param {HTMLCanvasElement} canvas - Target canvas to draw into.
   * @param {Object} world - Planck World instance (read-only for renderer).
   * @param {Object} target - Planck Body to follow (e.g., the car).
   * @param {Object} [opts]
   * @param {number} [opts.baseScale=30] - Pixels per meter at zoom=1.
   * @param {number} [opts.zoom=1] - Initial zoom.
   * @param {number} [opts.minZoom=0.5] - Min zoom clamp.
   * @param {number} [opts.maxZoom=2.0] - Max zoom clamp.
   * @param {number} [opts.damping=0.12] - Camera follow damping (0..1).
   * @param {number} [opts.offsetX=4.0] - Look-ahead in meters.
   * @param {number} [opts.offsetY=0.8] - Vertical lift in meters.
   * @param {number} [opts.horizon=0.45] - Screen Y (0..1) used as world center.
   */
  constructor(canvas, world, target, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.target = target;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.dpr = dpr;

    this.baseScale = opts.baseScale ?? DEFAULT_PIXELS_PER_METER;
    this.zoom = opts.zoom ?? 1;
    this.minZoom = opts.minZoom ?? DEFAULT_MIN_ZOOM;
    this.maxZoom = opts.maxZoom ?? DEFAULT_MAX_ZOOM;

    this.follow = {
      damping: opts.damping ?? 0.12,
      offsetX: opts.offsetX ?? 4.0,
      offsetY: opts.offsetY ?? 0.8,
      // horizon = screen Y (0..1 from top) where world camera.y maps to
      horizon: opts.horizon ?? 0.45,
    };

    const p = this._getTargetPos();
    this.camera = { x: p.x + this.follow.offsetX, y: p.y + this.follow.offsetY };

    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas(), { passive: true });

    // One-time debug (uncomment to inspect available shape types)
    // this._logShapeTypesOnce();
  }

  /**
   * Adjust the current zoom by a delta and clamp the result.
   * Useful for keyboard +/- zoom controls.
   * @param {number} delta - Positive to zoom in, negative to zoom out.
   */
  adjustZoom(delta) {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom + delta));
  }

  /**
   * Set the current zoom to an absolute value (clamped).
   * @param {number} z - Target zoom value.
   */
  setZoom(z) {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, z));
  }

  /**
   * Reset camera to target position and default zoom (1.0).
   * Keeps follow offsets.
   */
  resetCamera() {
    const p = this._getTargetPos();
    this.camera.x = p.x + this.follow.offsetX;
    this.camera.y = p.y + this.follow.offsetY;
    this.zoom = 1;
  }

  /**
   * Change the body the camera follows (e.g., on reset).
   * @param {Object} target - New Planck Body to follow.
   */
  setTarget(target) {
    this.target = target;
    this.resetCamera();
  }

  /**
   * Render one frame:
   * - Update camera position with damping towards target+offset
   * - Clear canvas
   * - Draw grid
   * - Draw all fixtures (polygons, circles, edges, chains)
   */
  render() {
    const ctx = this.ctx;
    this._followTarget();

    // Clear frame
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Debug grid
    this._drawGrid(COLORS.grid);

    // Bodies & fixtures
    for (let b = this.world.getBodyList(); b; b = b.getNext()) {
      for (let f = b.getFixtureList(); f; f = f.getNext()) {
        this._drawFixture(b, f);
      }
    }
  }

  // ---------- private helpers ----------

  _resizeCanvas() {
    // Make the internal canvas resolution match CSS size * DPR
    // so strokes are crisp on HiDPI displays.
    const cssW = this.canvas.clientWidth || this.canvas.width || 960;
    const cssH = this.canvas.clientHeight || this.canvas.height || 540;
    const W = Math.round(cssW * this.dpr);
    const H = Math.round(cssH * this.dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
  }

  _scale() {
    // Pixels per meter at current zoom (already in device pixels)
    return this.baseScale * this.zoom;
  }

  _screenCenter() {
    // X center is mid-screen; Y center is "horizon" fraction from top.
    return {
      x: this.canvas.width * 0.5,
      y: this.canvas.height * this.follow.horizon,
    };
  }

  _toScreen(vec) {
    // World (meters) -> Screen (device pixels, origin top-left)
    const s = this._scale();
    const c = this._screenCenter();
    return {
      x: (vec.x - this.camera.x) * s + c.x,
      y: (this.camera.y - vec.y) * s + c.y,
    };
  }

  _getTargetPos() {
    return this.target ? this.target.getPosition() : { x: 0, y: 0 };
  }

  _followTarget() {
    if (!this.target) return;
    const t = this._getTargetPos();
    const aim = {
      x: t.x + this.follow.offsetX,
      y: t.y + this.follow.offsetY,
    };
    const a = this.follow.damping;
    this.camera.x += (aim.x - this.camera.x) * a;
    this.camera.y += (aim.y - this.camera.y) * a;
  }

  _drawGrid(color = COLORS.grid) {
    const ctx = this.ctx;
    const s = this._scale();
    const c = this._screenCenter();

    // Compute visible world bounds (in meters)
    const left = this.camera.x - c.x / s;
    const right = this.camera.x + (this.canvas.width - c.x) / s;
    const top = this.camera.y + c.y / s; // world +Y is up
    const bottom = this.camera.y + (c.y - this.canvas.height) / s;

    const step = 1; // 1 meter grid
    ctx.lineWidth = Math.max(1, (1 * this.dpr) / this.zoom);
    ctx.strokeStyle = color;

    // Vertical lines
    const xStart = Math.floor(left / step) * step;
    ctx.beginPath();
    for (let x = xStart; x <= right; x += step) {
      const a = this._toScreen({ x, y: bottom });
      const b = this._toScreen({ x, y: top });
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // Horizontal lines
    const yStart = Math.floor(bottom / step) * step;
    ctx.beginPath();
    for (let y = yStart; y <= top; y += step) {
      const a = this._toScreen({ x: left, y });
      const b = this._toScreen({ x: right, y });
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }

  _setStroke(color) {
    const ctx = this.ctx;
    // Keep stroke readable across zoom levels; use DPR for crispness
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, (2 * this.dpr) / this.zoom);
  }

  _drawCircle(body, shape) {
    const ctx = this.ctx;
    this._setStroke(COLORS.body);
    const pos = body.getWorldPoint(shape.m_p);
    const p = this._toScreen(pos);
    const r = shape.m_radius * this._scale();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawPolygon(body, shape) {
    const ctx = this.ctx;
    this._setStroke(COLORS.body);
    const verts = shape.m_vertices;
    if (!verts || verts.length === 0) return;
    ctx.beginPath();
    let p = this._toScreen(body.getWorldPoint(verts[0]));
    ctx.moveTo(p.x, p.y);
    for (let i = 1; i < verts.length; i++) {
      p = this._toScreen(body.getWorldPoint(verts[i]));
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  _drawEdge(body, shape) {
    const ctx = this.ctx;
    this._setStroke(COLORS.terrain);
    const a = this._toScreen(body.getWorldPoint(shape.m_vertex1));
    const b = this._toScreen(body.getWorldPoint(shape.m_vertex2));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  _drawChain(body, shape) {
    const ctx = this.ctx;
    this._setStroke(COLORS.terrain);
    const verts = shape.m_vertices;
    if (!verts || verts.length < 2) return;
    ctx.beginPath();
    let p = this._toScreen(body.getWorldPoint(verts[0]));
    ctx.moveTo(p.x, p.y);
    for (let i = 1; i < verts.length; i++) {
      p = this._toScreen(body.getWorldPoint(verts[i]));
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  _drawFixture(body, fixture) {
    const shape = fixture.getShape();
    const t = shape.getType && shape.getType();
    switch (t) {
      case 'circle':  return this._drawCircle(body, shape);
      case 'polygon': return this._drawPolygon(body, shape);
      case 'edge':    return this._drawEdge(body, shape);
      case 'chain':   return this._drawChain(body, shape);
      default:
        // Fallback: if vertices exist, try drawing as polyline
        if (Array.isArray(shape.m_vertices) && shape.m_vertices.length) {
          return this._drawChain(body, shape);
        }
    }
  }

  _logShapeTypesOnce() {
    if (this._shapesLogged) return;
    this._shapesLogged = true;
    const seen = new Set();
    for (let b = this.world.getBodyList(); b; b = b.getNext()) {
      for (let f = b.getFixtureList(); f; f = f.getNext()) {
        const s = f.getShape();
        if (s && s.getType) seen.add(s.getType());
      }
    }
    console.log('[renderer] shapes:', Array.from(seen));
  }
}
