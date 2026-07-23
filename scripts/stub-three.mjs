// Headless stub for `three` / `three/addons/*` so scene builders can be exercised
// in Node without a WebGL context.

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({}),
      appendChild: () => {},
      style: {},
      setAttribute: () => {},
      addEventListener: () => {},
    }),
    body: { appendChild: () => {} },
  };
}

const handler = {
  get(t, prop) {
    if (prop === 'length') return 0;
    if (prop === Symbol.iterator) return function* () {};
    if (prop === Symbol.toPrimitive) return () => 0;
    if (prop === 'then') return undefined; // never look like a thenable
    if (prop in t) return t[prop];
    return makeProxy();
  },
  apply() { return makeProxy(); },
  construct() { return makeProxy(); },
  set() { return true; },
};

function makeProxy() {
  const f = function () {};
  return new Proxy(f, handler);
}

const root = makeProxy();
export default root;

// Named exports commonly used across the category builders and common.js
export const MeshStandardMaterial = makeProxy();
export const MeshBasicMaterial = makeProxy();
export const MeshPhongMaterial = makeProxy();
export const MeshLambertMaterial = makeProxy();
export const PointsMaterial = makeProxy();
export const Points = makeProxy();
export const BoxGeometry = makeProxy();
export const SphereGeometry = makeProxy();
export const CylinderGeometry = makeProxy();
export const CircleGeometry = makeProxy();
export const TubeGeometry = makeProxy();
export const ExtrudeGeometry = makeProxy();
export const RingGeometry = makeProxy();
export const CatmullRomCurve3 = makeProxy();
export const Vector3 = makeProxy();
export const Color = makeProxy();
export const Group = makeProxy();
export const Mesh = makeProxy();
export const Shape = makeProxy();
export const Line = makeProxy();
export const BufferGeometry = makeProxy();
export const BufferAttribute = makeProxy();
export const Float32BufferAttribute = makeProxy();
export const DoubleSide = 2;
export const FrontSide = 0;
export const BackSide = 1;
export const SRGBColorSpace = 'srgb';
export const ACESFilmicToneMapping = 4;
export const AmbientLight = makeProxy();
export const DirectionalLight = makeProxy();
export const PointLight = makeProxy();
export const SpotLight = makeProxy();
export const HemisphereLight = makeProxy();
export const GridHelper = makeProxy();
export const PerspectiveCamera = makeProxy();
export const WebGLRenderer = makeProxy();
export const Raycaster = makeProxy();
export const Clock = makeProxy();
export const CSS2DObject = makeProxy();
export const CSS2DRenderer = makeProxy();
export const OrbitControls = makeProxy();
