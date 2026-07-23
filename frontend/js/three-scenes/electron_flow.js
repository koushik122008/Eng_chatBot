// Enhanced electron flow animations with multiple particle types and visual effects.
// Provides realistic current flow visualization with electron, hole, and photon particles.
import * as THREE from 'three';

// Particle configurations for different flow types
const PARTICLE_CONFIGS = {
  electron: {
    color: 0x60a5fa,
    size: 0.08,
    count: 28,
    speed: 0.3,
    glow: true,
    trail: true,
  },
  hole: {
    color: 0xfbbf24,
    size: 0.1,
    count: 16,
    speed: 0.2,
    glow: true,
    trail: false,
  },
  photon: {
    color: 0xfef08a,
    size: 0.06,
    count: 12,
    speed: 0.5,
    glow: true,
    trail: true,
  },
  current: {
    color: 0x22c55e,
    size: 0.12,
    count: 20,
    speed: 0.4,
    glow: true,
    trail: false,
  },
};

/**
 * Create an enhanced electron flow system with multiple particle types
 * @param {THREE.CatmullRomCurve3} curve - Path for particles to follow
 * @param {Object} options - Configuration options
 * @returns {Object} Flow system with update and control methods
 */
export function createEnhancedFlow(curve, options = {}) {
  const config = { ...PARTICLE_CONFIGS.electron, ...options };
  const {
    color = config.color,
    size = config.size,
    count = config.count,
    speed = config.speed,
    glow = config.glow,
    trail = config.trail,
    particleType = 'electron',
  } = options;

  // Main particle geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Particle material with glow effect
  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;

  // Trail geometry for continuous flow visualization
  let trailGeometry = null;
  let trailMaterial = null;
  let trailLine = null;

  if (trail) {
    trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(count * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    
    trailMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
    });
    
    trailLine = new THREE.Line(trailGeometry, trailMaterial);
    trailLine.visible = false;
    points.add(trailLine);
  }

  // Particle state
  const offsets = Array.from({ length: count }, (_, i) => i / count);
  const velocities = Array.from({ length: count }, () => speed * (0.8 + Math.random() * 0.4));

  // Cached color object for performance (avoids allocation in hot loop)
  const _tempColor = new THREE.Color(color);

  // Update positions and colors
  const update = (dt, t) => {
    if (!points.visible) return;

    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;
    const sz = geometry.attributes.size;

    for (let i = 0; i < count; i++) {
      // Move particle along curve
      offsets[i] = (offsets[i] + dt * velocities[i]) % 1;
      
      // Get position on curve
      const point = curve.getPoint(offsets[i]);
      pos.setXYZ(i, point.x, point.y, point.z);

      // Pulsating size effect
      const pulse = 0.8 + 0.2 * Math.sin(t * 3 + i * 0.5);
      sz.setX(i, size * pulse);

      // Color variation based on position (reuse cached color object)
      _tempColor.setHex(color);
      const hueShift = 0.1 * Math.sin(offsets[i] * Math.PI * 2);
      _tempColor.offsetHSL(hueShift, 0, 0);
      col.setXYZ(i, _tempColor.r, _tempColor.g, _tempColor.b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    sz.needsUpdate = true;

    // Update trail if enabled
    if (trail && trailLine) {
      const trailPos = trailGeometry.attributes.position;
      for (let i = 0; i < count; i++) {
        trailPos.setXYZ(i, pos.getX(i), pos.getY(i), pos.getZ(i));
      }
      trailPos.needsUpdate = true;
    }
  };

  // Control methods
  const setSpeed = (newSpeed) => {
    velocities.forEach((_, i) => {
      velocities[i] = newSpeed * (0.8 + Math.random() * 0.4);
    });
  };

  const setColor = (newColor) => {
    material.color.setHex(newColor);
    if (trailMaterial) trailMaterial.color.setHex(newColor);
  };

  return {
    object: points,
    active: false,
    speed,
    update,
    setSpeed,
    setColor,
    setCount: (newCount) => {
      // Dynamic count change would require geometry recreation
      // For now, just use the initial count
    },
  };
}

/**
 * Create a current flow visualization with animated arrows
 * @param {THREE.CatmullRomCurve3} curve - Path for current to follow
 * @param {Object} options - Configuration options
 * @returns {Object} Current flow system
 */
/**
 * Create a photon flow for LED/light emission visualization
 * @param {THREE.CatmullRomCurve3} curve - Path for photons
 * @param {Object} options - Configuration options
 * @returns {Object} Photon flow system
 */
export function createPhotonFlow(curve, options = {}) {
  return createEnhancedFlow(curve, {
    ...PARTICLE_CONFIGS.photon,
    ...options,
    particleType: 'photon',
  });
}

/**
 * Create electron-hole pair recombination animation
 * @param {THREE.Vector3} position - Center position for recombination
 * @param {Object} options - Configuration options
 * @returns {Object} Recombination animation system
 */
export function createRecombination(position, options = {}) {
  const {
    color = 0xfef08a,
    size = 0.15,
    duration = 1.0,
  } = options;

  // Create particle system for recombination effect
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(20 * 3);
  const colors = new Float32Array(20 * 3);
  const sizes = new Float32Array(20);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;
  points.position.copy(position);

  let animationTime = 0;
  let isAnimating = false;

  // Update animation
  const update = (dt) => {
    if (!isAnimating || !points.visible) return;

    animationTime += dt;
    const progress = Math.min(animationTime / duration, 1);

    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;
    const sz = geometry.attributes.size;

    for (let i = 0; i < 20; i++) {
      // Particles expand outward from center
      const angle = (i / 20) * Math.PI * 2;
      const radius = progress * 1.5;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (Math.random() - 0.5) * 0.5;
      
      pos.setXYZ(i, x, y, z);

      // Fade out as particles expand
      const alpha = 1 - progress;
      const colorObj = new THREE.Color(color);
      col.setXYZ(i, colorObj.r * alpha, colorObj.g * alpha, colorObj.b * alpha);

      // Particles shrink as they expand
      sz.setX(i, size * (1 - progress * 0.7));
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    sz.needsUpdate = true;

    // End animation when complete
    if (progress >= 1) {
      isAnimating = false;
      points.visible = false;
    }
  };

  // Start recombination animation
  const start = () => {
    animationTime = 0;
    isAnimating = true;
    points.visible = true;
  };

  return {
    object: points,
    update,
    start,
    isActive: () => isAnimating,
  };
}

export { PARTICLE_CONFIGS };
