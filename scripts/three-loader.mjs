// Node ESM resolve hook: redirect bare `three` and `three/addons/*` /
// `three/examples/*` specifiers to the headless stub in ./stub-three.mjs.
// Registered via `node --import ./scripts/register-loader.mjs ...`.
const STUB = new URL('./stub-three.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (
    specifier === 'three' ||
    specifier.startsWith('three/addons/') ||
    specifier.startsWith('three/examples/')
  ) {
    return { url: STUB, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
