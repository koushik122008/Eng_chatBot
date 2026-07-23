import { registry } from '../frontend/js/three-scenes/registry.js';
import THREE from './stub-three.mjs';

async function verifyAll() {
  let passCount = 0;
  let failCount = 0;

  for (const [key, moduleObj] of Object.entries(registry)) {
    try {
      if (typeof moduleObj.build === 'function') {
        moduleObj.build({
          THREE,
          style: 'realistic',
          params: {},
          quality: 'high',
          template: key,
        });
        passCount++;
      } else {
        console.error(`❌ Module ${key} missing build export`);
        failCount++;
      }
    } catch (err) {
      console.error(`❌ Module ${key} failed build(): ${err.message}`);
      failCount++;
    }
  }

  console.log(`\nVerification Summary: ${passCount} passed, ${failCount} failed.`);
  if (failCount > 0) process.exit(1);
}

verifyAll();
