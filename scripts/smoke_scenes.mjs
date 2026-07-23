import { registry } from '../frontend/js/three-scenes/registry.js';
import THREE from './stub-three.mjs';

async function main() {
  const keys = Object.keys(registry);
  let passed = 0;
  let failed = 0;
  
  // Minimal DOM stub for CSS2DObject
  global.document = {
    createElement: () => ({ style: {}, className: '', appendChild: () => {}, textContent: '' }),
  };

  console.log(`Running smoke test on ${keys.length} scene builders...`);
  
  for (const key of keys) {
    const builder = registry[key];
    try {
      const ctx = {
        THREE,
        style: 'schematic',
        params: {},
        quality: 'high',
        template: key,
      };
      const result = builder.build(ctx);
      if (!result || !result.group) {
        throw new Error('Builder did not return an object with a "group" property');
      }
      passed++;
    } catch (err) {
      console.error(`❌ [${key}] Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
