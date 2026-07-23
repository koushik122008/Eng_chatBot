// 3D viewer: renderer/camera/controls management, scene-spec loading,
// animation triggering (sync with the chat stream), WebGL fallback.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { registry, templateMeta } from './three-scenes/registry.js';
import { attachLabels, disposeGroup, makeEnvironment, makeFloor } from './three-scenes/common.js';
import { ComponentPropertiesPanel } from './three-scenes/component_properties.js';
import { createEnhancedFlow } from './three-scenes/electron_flow.js';

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

    // Hover state tracking
    this._hoveredMesh = null;
    this._hoveredGlowTween = null;
    this._meshOrigProps = new Map(); // mesh -> { emissive, emissiveIntensity }
    this.enabled = webglSupported();
    
    // Component properties panel
    this._propertiesPanel = null;
    this._electronFlowIndicator = null;

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
      alpha: true,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.lowPoly ? 1.25 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    Object.assign(this.labelRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0', pointerEvents: 'none',
    });
    container.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(4, 3, 7);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.5;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 25;
    this.controls.enablePan = true;
    this.controls.target.set(0, 0, 0);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;

    // Base lighting (always on)
    this._ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this._ambient);
    this._keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this._keyLight.position.set(5, 8, 6);
    this.scene.add(this._keyLight);
    this._rimLight = new THREE.DirectionalLight(0x88aaff, 0.4);
    this._rimLight.position.set(-6, 2, -4);
    this.scene.add(this._rimLight);

    // Realistic-mode lighting (created on demand)
    this._hemiLight = null;
    this._fillLight = null;
    this._envMesh = null;
    this._floorMesh = null;

    const grid = new THREE.GridHelper(20, 20, 0x1e293b, 0x16203a);
    grid.position.y = -2.2;
    this.scene.add(grid);

    this._resize = this._resize.bind(this);
    this._resizeObserver = new ResizeObserver(this._resize);
    this._resizeObserver.observe(this.container);
    this._resize();
    // Also manually resize when the bottom sheet finishes its snap animation
    window.addEventListener('sheet-resize', () => this._resize());

    this.renderer.domElement.addEventListener('pointerdown', (e) => this._onPointer(e));
    this.renderer.domElement.addEventListener('pointermove', (e) => this._onHover(e));
    this.renderer.domElement.addEventListener('pointerleave', () => {
      this._hideTooltip();
      this._hideHoverInfo();
      this._removeGlow();
    });

    this._raycaster = new THREE.Raycaster();
    this._clock = new THREE.Clock();
    this._visible = true;
    document.addEventListener('visibilitychange', () => {
      this._visible = document.visibilityState === 'visible';
    });
    
    // Initialize component properties panel
    this._propertiesPanel = new ComponentPropertiesPanel(this);
    
    // Create electron flow indicator
    this._createElectronFlowIndicator();

    const animate = () => {
      requestAnimationFrame(animate);
      if (!this._visible || this.container.offsetParent === null) return;
      const dt = Math.min(this._clock.getDelta(), 0.05);
      const t = this._clock.elapsedTime;
      this.controls.update();
      // Tick the builder if active, otherwise tick the scene template
      if (this._builder?.active) {
        this._builder.tick(dt, t);
      } else {
        this.template?.tick?.(dt, t);
        for (const [obj, speed] of this.rotating) obj.rotation.y += dt * speed;
        Object.values(this.template?.targets || {}).forEach((tg) => tg.flow?.update(dt));
      }
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    };
    animate();
  }

  /* ========== Hover Glow / Hover Info Panel ========== */

  /**
   * Store original material emissive properties so we can restore them.
   * Handles material arrays and shared materials by cloning.
   */
  _storeOrigMaterialProps(mesh) {
    if (this._meshOrigProps.has(mesh)) return;
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      const props = mat.map((m) => ({
        emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0),
        emissiveIntensity: m.emissiveIntensity ?? 0,
      }));
      this._meshOrigProps.set(mesh, props);
    } else {
      this._meshOrigProps.set(mesh, {
        emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0),
        emissiveIntensity: mat.emissiveIntensity ?? 0,
      });
    }
  }

  /**
   * Apply a subtle emissive glow to a mesh on hover.
   * Uses GSAP for smooth pulse animation. Stores original props first.
   */
  _applyGlow(mesh) {
    if (!mesh || !mesh.isMesh) return;

    // If same mesh is already glowing, just keep the tween going
    if (this._hoveredMesh === mesh) return;

    // Remove previous glow
    this._removeGlow();

    this._hoveredMesh = mesh;
    this._storeOrigMaterialProps(mesh);

    const mat = mesh.material;
    const gsap = window.gsap;

    if (Array.isArray(mat)) {
      this._hoveredGlowTween = [];
      for (let i = 0; i < mat.length; i++) {
        const m = mat[i];
        const orig = this._meshOrigProps.get(mesh)[i];
        m.emissive = new THREE.Color(0x38bdf8);
        m.emissiveIntensity = orig.emissiveIntensity || 0;
        if (gsap) {
          this._hoveredGlowTween.push(
            gsap.to(m, {
              emissiveIntensity: 0.55,
              duration: 0.3,
              ease: 'power2.out',
            })
          );
        } else {
          m.emissiveIntensity = 0.55;
        }
      }
    } else {
      const orig = this._meshOrigProps.get(mesh);
      mat.emissive = new THREE.Color(0x38bdf8);
      mat.emissiveIntensity = orig.emissiveIntensity || 0;
      if (gsap) {
        this._hoveredGlowTween = gsap.to(mat, {
          emissiveIntensity: 0.55,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        mat.emissiveIntensity = 0.55;
      }
    }
  }

  /**
   * Remove the glow effect and restore original material properties.
   */
  _removeGlow() {
    if (this._hoveredGlowTween) {
      if (Array.isArray(this._hoveredGlowTween)) {
        this._hoveredGlowTween.forEach((tw) => tw.kill());
      } else {
        this._hoveredGlowTween.kill();
      }
      this._hoveredGlowTween = null;
    }

    if (this._hoveredMesh) {
      const orig = this._meshOrigProps.get(this._hoveredMesh);
      if (orig) {
        const mat = this._hoveredMesh.material;
        // Direct restore — no GSAP animation to avoid fighting with incoming glow tweens
        if (Array.isArray(mat)) {
          for (let i = 0; i < mat.length; i++) {
            mat[i].emissive = orig[i].emissive.clone();
            mat[i].emissiveIntensity = orig[i].emissiveIntensity;
          }
        } else {
          mat.emissive = orig.emissive.clone();
          mat.emissiveIntensity = orig.emissiveIntensity;
        }
      }
      this._hoveredMesh = null;
    }
  }

  /** Create the floating hover info panel element */
  _initHoverInfo() {
    if (this._hoverInfoEl) return;
    this._hoverInfoEl = document.createElement('div');
    this._hoverInfoEl.className = 'hover-info-panel';
    this._hoverInfoEl.style.display = 'none';
    this.container.appendChild(this._hoverInfoEl);
  }

  /**
   * Show the floating hover info panel with parsed component specs.
   * Parses the tooltip string to extract structured data.
   */
  _showHoverInfo(mesh, clientX, clientY) {
    if (!this._hoverInfoEl) this._initHoverInfo();

    // Find tooltip data — walk up parents if needed
    const data = mesh.userData?.tooltip || mesh.parent?.userData?.tooltip;
    if (!data) { this._hideHoverInfo(); return; }

    const resolved = typeof data === 'function' ? data() : data;
    if (!resolved || resolved.length < 3) { this._hideHoverInfo(); return; }

    // Try to get component name from the scene template meta
    let compName = mesh.name || mesh.type || 'Component';
    let compCategory = '';
    if (this.spec) {
      const meta = this._lastMeta;
      if (meta) {
        compCategory = meta.category || '';
      }
    }

    // Parse tooltip for structured values
    // Format is typically: "ComponentName • value1 • value2 • ..." or with <br> or • separators
    const text = resolved.replace(/<br\s*\/?>/gi, ' • ').replace(/<[^>]+>/g, '');
    const parts = text.split(' • ').map((s) => s.trim()).filter(Boolean);

    // Build panel content
    let html = '';
    if (parts.length >= 1) {
      html += `<div class="hip-name">${parts[0]}</div>`;
    }
    if (compCategory && parts.length > 1) {
      html += `<div class="hip-category">${compCategory}</div>`;
    }
    if (parts.length > 1) {
      html += '<div class="hip-values">';
      for (let i = 1; i < Math.min(parts.length, 6); i++) {
        html += `<div class="hip-value">${parts[i]}</div>`;
      }
      html += '</div>';
    }

    // Look for numeric values in the tooltip text to show as specs
    const numbers = text.match(/[≈~]?\s*\d+(\.\d+)?\s*[A-Za-zμ°ΩkMGTPE]*\/?[A-Za-z]*/g);
    if (numbers && numbers.length > 0) {
      html += '<div class="hip-specs">';
      numbers.slice(0, 4).forEach((n) => {
        html += `<span class="hip-spec">${n.trim()}</span>`;
      });
      html += '</div>';
    }

    this._hoverInfoEl.innerHTML = html;
    this._hoverInfoEl.style.display = 'block';
    this._hoverInfoEl.style.opacity = '0';

    // Animate in
    requestAnimationFrame(() => {
      this._hoverInfoEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      this._hoverInfoEl.style.opacity = '1';
      this._hoverInfoEl.style.transform = 'translateY(0)';
    });
  }

  /** Hide the floating hover info panel */
  _hideHoverInfo() {
    if (!this._hoverInfoEl) return;
    this._hoverInfoEl.style.display = 'none';
    this._hoverInfoEl.style.opacity = '0';
    this._hoverInfoEl.style.transform = 'translateY(8px)';
  }

  /** Clean up all hover-related state (on scene change, etc.) */
  _cleanHoverState() {
    this._removeGlow();
    this._hideHoverInfo();
    this._hideTooltip();
    this._meshOrigProps.clear();
    this.renderer.domElement.style.cursor = '';
  }

  /* ---- Circuit Builder Mode ---- */

  /**
   * Set (or clear) the active CircuitBuilder instance.
   * When set, pointer events are delegated to the builder instead of the
   * current 3D model, and OrbitControls are disabled to prevent dragging
   * from interfering with component placement.
   */
  setBuilder(builder) {
    // Deactivate previous
    if (this._builder) {
      this._builder.deactivate();
      if (this.controls) this.controls.enabled = true;
    }
    this._builder = builder;
    if (builder) {
      if (this.controls) this.controls.enabled = false;
      builder.activate();
    }
  }

  _resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  /** Create a single tooltip element that follows the pointer */
  _initTooltip() {
    this._tooltipEl = document.createElement('div');
    this._tooltipEl.className = 'scene-tooltip';
    this._tooltipEl.style.display = 'none';
    this.container.appendChild(this._tooltipEl);
    this._tooltipTarget = null;
  }

  _showTooltip(obj, clientX, clientY) {
    if (!this._tooltipEl) this._initTooltip();
    const data = obj.userData?.tooltip || obj.parent?.userData?.tooltip;
    if (!data) { this._hideTooltip(); return; }
    // Resolve dynamic values (functions update on each hover)
    const resolved = typeof data === 'function' ? data() : data;
    if (!resolved) { this._hideTooltip(); return; }
    this._tooltipEl.innerHTML = resolved;
    this._tooltipEl.style.display = 'block';
    // Position near the cursor, keeping within bounds
    const rect = this.container.getBoundingClientRect();
    let left = clientX - rect.left + 14;
    let top = clientY - rect.top - 10;
    const tw = this._tooltipEl.offsetWidth;
    const th = this._tooltipEl.offsetHeight;
    if (left + tw + 10 > rect.width) left = clientX - rect.left - tw - 14;
    if (top + th + 10 > rect.height) top = rect.height - th - 10;
    if (top < 4) top = 4;
    this._tooltipEl.style.left = left + 'px';
    this._tooltipEl.style.top = top + 'px';
  }

  _hideTooltip() {
    if (this._tooltipEl) this._tooltipEl.style.display = 'none';
    this._tooltipTarget = null;
    this._removeGlow();
    this._hideHoverInfo();
  }

  _onPointer(e) {
    // Delegate to circuit builder if active
    if (this._builder?.active) {
      this._builder.handleClick(e.clientX, e.clientY);
      return;
    }
    if (!this.template?.group) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this.template.group.children, true);
    
    if (hits.length) {
      const hitObject = hits[0].object;
      
      // Show component properties panel on click
      if (this._propertiesPanel && this.spec) {
        this._propertiesPanel.show(hitObject, this.spec);
        this._updatePropertiesPanelPosition();
        
        // Add click feedback animation to the canvas element
        this.renderer.domElement.classList.add('component-click-feedback');
        setTimeout(() => this.renderer.domElement.classList.remove('component-click-feedback'), 300);
      }
      
      // Call template onClick if exists
      if (this.template?.onClick) {
        this.template.onClick(hitObject);
      }
    }
  }

  _onHover(e) {
    // Delegate to circuit builder if active
    if (this._builder?.active) {
      this._builder.handlePointerMove(e.clientX, e.clientY);
      return;
    }
    if (!this.template?.group) { this._hideTooltip(); return; }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this.template.group.children, true);
    if (hits.length && hits[0].object.userData?.tooltip) {
      this._showTooltip(hits[0].object, e.clientX, e.clientY);
      this._applyGlow(hits[0].object);
      this._showHoverInfo(hits[0].object, e.clientX, e.clientY);
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this._hideTooltip();
      this.renderer.domElement.style.cursor = '';
    }
  }

  _showFallback(message) {
    this.container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'viewer-fallback';
    div.innerHTML = `<div class="fallback-icon">◇</div><p>${message}</p>`;
    this.container.appendChild(div);
  }

  /** Create electron flow indicator at bottom of viewer */
  _createElectronFlowIndicator() {
    if (this._electronFlowIndicator) return;
    
    this._electronFlowIndicator = document.createElement('div');
    this._electronFlowIndicator.className = 'electron-flow-indicator';
    this._electronFlowIndicator.innerHTML = `
      <span class="flow-indicator-dot"></span>
      <span>Electron Flow: </span>
      <button class="flow-toggle-btn" style="background:rgba(56,189,248,0.2);border:1px solid rgba(56,189,248,0.4);color:#38bdf8;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px;">ON</button>
    `;
    
    const toggleBtn = this._electronFlowIndicator.querySelector('.flow-toggle-btn');
    toggleBtn.onclick = () => {
      this._toggleElectronFlow();
      toggleBtn.textContent = this._electronFlowActive ? 'ON' : 'OFF';
      toggleBtn.style.background = this._electronFlowActive ? 'rgba(56,189,248,0.2)' : 'rgba(100,116,139,0.2)';
    };
    
    this.container.appendChild(this._electronFlowIndicator);
    this._electronFlowActive = true;
  }

  /** Toggle electron flow animations on/off */
  _toggleElectronFlow() {
    this._electronFlowActive = !this._electronFlowActive;
    if (this.template?.targets) {
      Object.values(this.template.targets).forEach((tg) => {
        if (tg.flow) {
          tg.flow.active = this._electronFlowActive && this._electronFlowToggled;
        }
      });
    }
  }

  /** Update properties panel position */
  _updatePropertiesPanelPosition() {
    if (this._propertiesPanel?.isVisible) {
      this._propertiesPanel.updatePosition();
    }
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

    // Cancel any in-progress camera transition before loading new scene
    if (this._transitioning && this._cameraTweens) {
      this._cameraTweens.forEach((tw) => tw.kill());
      this._cameraTweens = [];
      this._transitioning = false;
      this.controls.enabled = true;
      this.renderer.domElement.style.opacity = '1';
    }

    this.clearScene();
    this.spec = spec;

    const ctx = {
      THREE,
      style: spec.style || 'schematic',
      params: spec.params || {},
      quality: this.lowPoly ? 'low' : 'high',
      template: spec.template,
    };
    this.template = entry.build(ctx);
    this.scene.add(this.template.group);
    attachLabels(spec.labels, this.template.targets);
    this.setTitle(spec.title);
    this._dispatchInfo(spec);

    // Realistic mode enhancements
    this._applyLighting(spec.style || 'schematic');

    this._buildActions(spec.animations || []);
    (spec.autoplay || []).forEach((id) => this.triggerAnim(id));
    this._applyCamera(spec.camera);
    
    // Initialize electron flow for targets that have flow animations
    this._electronFlowToggled = true;
    if (this.template?.targets) {
      Object.values(this.template.targets).forEach((tg) => {
        if (tg.flow) {
          tg.flow.active = this._electronFlowActive;
        }
      });
    }
  }

  async _dispatchInfo(spec) {
    try {
      const meta = templateMeta?.[spec.template];
      this._lastMeta = meta || null;
      if (meta) {
        document.dispatchEvent(new CustomEvent('scene-info', {
          detail: { ...meta, template: spec.template },
        }));
      }
    } catch {
      this._lastMeta = null;
    }
  }

  _applyLighting(style) {
    const realistic = style === 'realistic';

    // Adjust base lighting
    this._ambient.intensity = realistic ? 0.4 : 0.55;
    this._keyLight.intensity = realistic ? 1.8 : 1.1;
    this._keyLight.castShadow = realistic;
    this._rimLight.intensity = realistic ? 0.6 : 0.4;

    if (realistic) {
      // Hemisphere light for natural sky/ground
      if (!this._hemiLight) {
        this._hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1f, 0.6);
        this.scene.add(this._hemiLight);
      }
      this._hemiLight.visible = true;

      // Fill light
      if (!this._fillLight) {
        this._fillLight = new THREE.DirectionalLight(0x4466ff, 0.3);
        this._fillLight.position.set(-4, 1, -6);
        this.scene.add(this._fillLight);
      }
      this._fillLight.visible = true;

      // Environment mesh
      if (!this._envMesh) {
        this._envMesh = makeEnvironment(THREE, style);
        if (this._envMesh) this.scene.add(this._envMesh);
      }
      if (this._envMesh) this._envMesh.visible = true;

      // Floor
      if (!this._floorMesh) {
        this._floorMesh = makeFloor(THREE, style);
        if (this._floorMesh) this.scene.add(this._floorMesh);
      }
      if (this._floorMesh) this._floorMesh.visible = true;

      // Shadow setup on renderer
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      if (this._hemiLight) this._hemiLight.visible = false;
      if (this._fillLight) this._fillLight.visible = false;
      if (this._envMesh) this._envMesh.visible = false;
      if (this._floorMesh) this._floorMesh.visible = false;
      this.renderer.shadowMap.enabled = false;
    }
  }

  clearScene() {
    for (const action of this.actions.values()) action.stop?.();
    this.actions.clear();
    this.rotating.clear();
    this._cleanHoverState();
    
    // Reset electron flow state
    this._electronFlowToggled = false;
    
    if (this.template) {
      this.scene.remove(this.template.group);
      disposeGroup(this.template.group);
      this.template = null;
    }
    
    // Hide properties panel when scene changes
    if (this._propertiesPanel?.isVisible) {
      this._propertiesPanel.hide();
    }
    
    document.dispatchEvent(new CustomEvent('scene-info', { detail: null }));
  }

  /** Clean up all resources when viewer is destroyed */
  dispose() {
    this.clearScene();
    
    // Dispose properties panel
    if (this._propertiesPanel) {
      this._propertiesPanel.dispose();
      this._propertiesPanel = null;
    }
    
    // Remove electron flow indicator
    if (this._electronFlowIndicator && this._electronFlowIndicator.parentNode) {
      this._electronFlowIndicator.parentNode.removeChild(this._electronFlowIndicator);
      this._electronFlowIndicator = null;
    }
    
    // Remove hover info panel
    if (this._hoverInfoEl && this._hoverInfoEl.parentNode) {
      this._hoverInfoEl.parentNode.removeChild(this._hoverInfoEl);
      this._hoverInfoEl = null;
    }
    
    // Remove tooltip
    if (this._tooltipEl && this._tooltipEl.parentNode) {
      this._tooltipEl.parentNode.removeChild(this._tooltipEl);
      this._tooltipEl = null;
    }
    
    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Disconnect ResizeObserver
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    // Remove event listeners
    window.removeEventListener('sheet-resize', this._resize);
  }

  /**
   * Smoothly transition the camera to a new position.
   * Animates both camera.position and controls.target simultaneously.
   * Blocks user interaction during the transition for a polished feel.
   */
  _applyCamera(cam, duration = 1.4) {
    const [az, el] = cam?.orbit || [35, 20];
    const zoom = cam?.zoom || 1;
    const r = 9 / zoom;
    const azr = THREE.MathUtils.degToRad(az);
    const elr = THREE.MathUtils.degToRad(el);
    const pos = {
      x: r * Math.cos(elr) * Math.sin(azr),
      y: r * Math.sin(elr),
      z: r * Math.cos(elr) * Math.cos(azr),
    };

    const canvas = this.renderer.domElement;
    const gsap = window.gsap;

    if (gsap) {
      // Kill any in-progress transition tweens to prevent conflicts
      if (this._cameraTweens) {
        this._cameraTweens.forEach((tw) => tw.kill());
      }
      this._cameraTweens = [];

      // Block controls during transition
      this._transitioning = true;
      this.controls.enabled = false;

      // Phase 1: Fade out
      this._cameraTweens.push(
        gsap.to(canvas, {
          opacity: 0.15,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            // Phase 2: Animate camera position + target in parallel
            const camTween = gsap.to(this.camera.position, {
              ...pos,
              duration: duration * 0.6,
              ease: 'power3.inOut',
            });
            const targetTween = gsap.to(this.controls.target, {
              x: 0, y: 0, z: 0,
              duration: duration * 0.6,
              ease: 'power3.inOut',
              onComplete: () => {
                // Phase 3: Fade back in only after camera arrives
                this._cameraTweens.push(
                  gsap.to(canvas, {
                    opacity: 1,
                    duration: 0.4,
                    ease: 'power2.out',
                    onComplete: () => {
                      this._transitioning = false;
                      this.controls.enabled = true;
                    },
                  })
                );
              },
            });
            this._cameraTweens.push(camTween, targetTween);
          },
        })
      );
    } else {
      // Fallback: instant snap
      this.camera.position.set(pos.x, pos.y, pos.z);
      this.controls.target.set(0, 0, 0);
    }
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
