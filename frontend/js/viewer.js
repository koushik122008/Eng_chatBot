// 3D viewer: renderer/camera/controls management, scene-spec loading,
// animation triggering (sync with the chat stream), WebGL fallback.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { registry } from './three-scenes/registry.js';
import { attachLabels, disposeGroup } from './three-scenes/common.js';

function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function detectLowPoly() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  return cores <= 4 || mem <= 4;
}

export class Viewer {
  constructor(container) {
    this.container = container;
    this.spec = null;
    this.template = null;      // build() result: {group, targets, tick, onClick}
    this.actions = new Map();  // anim id -> {start, stop, tween?}
    this.rotating = new Map(); // object -> speed (rad/s), for "rotate" actions
    this.lowPoly = detectLowPoly();
    this.enabled = webglSupported();

    if (!this.enabled) {
      this._showFallback('WebGL is not available in this browser. ' +
        '3D models are disabled — explanations will still work.');
      return;
    }
    this._initThree();
  }

  _initThree() {
    const { container } = this;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.lowPoly,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.lowPoly ? 1.25 : 2));
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    Object.assign(this.labelRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0', pointerEvents: 'none',
    });
    container.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1020);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(4, 3, 7);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 25;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 8, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.4);
    rim.position.set(-6, 2, -4);
    this.scene.add(rim);

    const grid = new THREE.GridHelper(20, 20, 0x1e293b, 0x16203a);
    grid.position.y = -2.2;
    this.scene.add(grid);

    this._resize = this._resize.bind(this);
    new ResizeObserver(this._resize).observe(this.container);
    this._resize();

    this.renderer.domElement.addEventListener('pointerdown', (e) => this._onPointer(e));

    this._raycaster = new THREE.Raycaster();
    this._clock = new THREE.Clock();
    this._visible = true;
    document.addEventListener('visibilitychange', () => {
      this._visible = document.visibilityState === 'visible';
    });

    const animate = () => {
      requestAnimationFrame(animate);
      if (!this._visible || this.container.offsetParent === null) return;
      const dt = Math.min(this._clock.getDelta(), 0.05);
      const t = this._clock.elapsedTime;
      this.controls.update();
      this.template?.tick?.(dt, t);
      for (const [obj, speed] of this.rotating) obj.rotation.y += dt * speed;
      Object.values(this.template?.targets || {}).forEach((tg) => tg.flow?.update(dt));
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    };
    animate();
  }

  _resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  _onPointer(e) {
    if (!this.template?.onClick) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this.template.group.children, true);
    if (hits.length) this.template.onClick(hits[0].object);
  }

  _showFallback(message) {
    this.container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'viewer-fallback';
    div.innerHTML = `<div class="fallback-icon">◇</div><p>${message}</p>`;
    this.container.appendChild(div);
  }

  setTitle(title) {
    document.dispatchEvent(new CustomEvent('scene-title', { detail: title }));
  }

  loadScene(spec) {
    if (!this.enabled) {
      this._showFallback(`3D model "${spec.title}" can't be shown (no WebGL).`);
      return;
    }
    const entry = registry[spec.template];
    if (!entry) {
      console.warn('unknown template', spec.template);
      return;
    }

    this.clearScene();
    this.spec = spec;

    const ctx = {
      THREE,
      style: spec.style || 'schematic',
      params: spec.params || {},
      quality: this.lowPoly ? 'low' : 'high',
    };
    this.template = entry.build(ctx);
    this.scene.add(this.template.group);
    attachLabels(spec.labels, this.template.targets);
    this.setTitle(spec.title);

    this._buildActions(spec.animations || []);
    (spec.autoplay || []).forEach((id) => this.triggerAnim(id));
    this._applyCamera(spec.camera);
  }

  clearScene() {
    for (const action of this.actions.values()) action.stop?.();
    this.actions.clear();
    this.rotating.clear();
    if (this.template) {
      this.scene.remove(this.template.group);
      disposeGroup(this.template.group);
      this.template = null;
    }
  }

  _applyCamera(cam) {
    const [az, el] = cam?.orbit || [35, 20];
    const zoom = cam?.zoom || 1;
    const r = 9 / zoom;
    const azr = THREE.MathUtils.degToRad(az);
    const elr = THREE.MathUtils.degToRad(el);
    const target = {
      x: r * Math.cos(elr) * Math.sin(azr),
      y: r * Math.sin(elr),
      z: r * Math.cos(elr) * Math.cos(azr),
    };
    if (window.gsap) {
      window.gsap.to(this.camera.position, { ...target, duration: 1.2, ease: 'power2.inOut' });
    } else {
      this.camera.position.set(target.x, target.y, target.z);
    }
    this.controls.target.set(0, 0, 0);
  }

  _meshesOf(target) {
    const meshes = [];
    (target.objects || []).forEach((o) => o.traverse((c) => { if (c.isMesh) meshes.push(c); }));
    return meshes;
  }

  _buildActions(animations) {
    const gsap = window.gsap;
    for (const anim of animations) {
      const target = this.template.targets[anim.target] || {};
      const speed = anim.speed || 1;
      const loop = anim.loop !== false;
      let action = null;

      if (target.custom?.[anim.type]) {
        action = target.custom[anim.type](anim);
      } else if (anim.type === 'flow' && target.flow) {
        action = {
          start: () => {
            target.flow.active = true;
            target.flow.speed = speed;
            if (!loop) setTimeout(() => { target.flow.active = false; }, 3500 / speed);
          },
          stop: () => { target.flow.active = false; },
        };
      } else if (anim.type === 'rotate') {
        const objs = target.objects || [];
        action = {
          start: () => {
            objs.forEach((o) => this.rotating.set(o, speed * 1.2));
            if (!loop) setTimeout(() => objs.forEach((o) => this.rotating.delete(o)), 3000 / speed);
          },
          stop: () => objs.forEach((o) => this.rotating.delete(o)),
        };
      } else if (anim.type === 'highlight' || anim.type === 'pulse') {
        const meshes = this._meshesOf(target);
        action = {
          tweens: [],
          start() {
            this.stop();
            for (const m of meshes) {
              if (anim.type === 'highlight') {
                m.material.emissive = new THREE.Color(0x38bdf8);
                this.tweens.push(gsap.to(m.material, {
                  emissiveIntensity: 0.9, duration: 0.5 / speed,
                  yoyo: true, repeat: loop ? 5 : 3, ease: 'sine.inOut',
                  onComplete: () => { m.material.emissiveIntensity = 0; },
                }));
              } else {
                this.tweens.push(gsap.to(m.scale, {
                  x: 1.12, y: 1.12, z: 1.12, duration: 0.45 / speed,
                  yoyo: true, repeat: loop ? 5 : 3, ease: 'sine.inOut',
                }));
              }
            }
          },
          stop() {
            this.tweens.forEach((tw) => tw.kill());
            this.tweens = [];
            meshes.forEach((m) => { m.material.emissiveIntensity = 0; m.scale.setScalar(1); });
          },
        };
      } else if (anim.type === 'oscillate') {
        const objs = target.objects || [];
        action = {
          tweens: [],
          start() {
            this.stop();
            for (const o of objs) {
              this.tweens.push(gsap.to(o.position, {
                y: o.position.y + 0.4, duration: 0.6 / speed,
                yoyo: true, repeat: loop ? -1 : 5, ease: 'sine.inOut',
              }));
            }
          },
          stop() { this.tweens.forEach((tw) => tw.kill()); this.tweens = []; },
        };
      } else if (anim.type === 'toggle' && target.custom?.toggle) {
        action = { start: () => target.custom.toggle(), stop: () => {} };
      }

      if (action) this.actions.set(anim.id, action);
    }
  }

  triggerAnim(id) {
    const action = this.actions.get(id);
    if (action) action.start();
    else console.warn('unknown animation id', id);
  }
}
