// Inline 3D viewer — compact Three.js instance for rendering inside chat bubbles.
// Disposes cleanly; only one active inline viewer at a time.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { registry } from './three-scenes/registry.js';
import { disposeGroup } from './three-scenes/common.js';

export class InlineViewer {
  constructor(container) {
    this.container = container;
    this._disposed = false;
    this._group = null;
    this._targets = null;
    this._tick = null;
    this._rotating = new Map();

    this._initThree();
  }

  /* ---- renderer setup ---- */

  _initThree() {
    const { container } = this;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x0b1020);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(3, 2.2, 5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 12;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.5;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(5, 8, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
    rim.position.set(-6, 2, -4);
    this.scene.add(rim);

    // Subtle grid
    const grid = new THREE.GridHelper(10, 10, 0x1e293b, 0x16203a);
    grid.position.y = -1.8;
    this.scene.add(grid);

    // Resize
    this._resize();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(container);

    // Animation loop
    this._clock = new THREE.Clock();
    const animate = () => {
      if (this._disposed) return;
      requestAnimationFrame(animate);
      const dt = Math.min(this._clock.getDelta(), 0.05);
      const t = this._clock.elapsedTime;
      this.controls.update();
      this._tick?.(dt, t);
      for (const [obj, speed] of this._rotating) obj.rotation.y += dt * speed;
      Object.values(this._targets || {}).forEach((tg) => tg.flow?.update(dt));
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  _resize() {
    if (this._disposed) return;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /* ---- scene loading ---- */

  loadScene(spec) {
    if (this._disposed) return;
    this._clearScene();

    const entry = registry[spec.template];
    if (!entry) return;

    const ctx = {
      THREE,
      style: spec.style || 'schematic',
      params: spec.params || {},
      quality: 'low',
    };

    const result = entry.build(ctx);
    this._group = result.group;
    this._targets = result.targets || {};
    this._tick = result.tick || null;
    this.scene.add(this._group);

    // Auto-rotate for simple visual feedback
    this.controls.autoRotate = true;

    // Kick any autoplay animations (simple rotate only)
    (spec.autoplay || []).forEach((id) => {
      const anim = (spec.animations || []).find((a) => a.id === id);
      if (!anim) return;
      const target = this._targets[anim.target || ''];
      if (anim.type === 'rotate' && target?.objects) {
        const speed = anim.speed || 1;
        target.objects.forEach((o) => this._rotating.set(o, speed * 1.2));
      }
    });
  }

  _clearScene() {
    this.controls.autoRotate = true;
    this._rotating.clear();
    if (this._group) {
      this.scene.remove(this._group);
      disposeGroup(this._group);
      this._group = null;
    }
    this._targets = null;
    this._tick = null;
  }

  /* ---- cleanup ---- */

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._clearScene();
    this._resizeObserver?.disconnect();
    this.renderer.dispose();
    // Remove the canvas
    const canvas = this.renderer.domElement;
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    this.container.innerHTML = '';
  }
}
