import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { registry } from '../frontend/js/three-scenes/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const threeScenesDir = path.join(__dirname, '../frontend/js/three-scenes');
  
  // Group keys by module
  const moduleToKeys = {};
  for (const [key, moduleObj] of Object.entries(registry)) {
    // Hack to figure out the filename based on the exported module name or just scanning imports
    // Actually, it's easier to scan registry.js source code to map keys to files.
  }
  
  const registrySrc = fs.readFileSync(path.join(threeScenesDir, 'registry.js'), 'utf8');
  
  const imports = {}; // varName -> file.js
  const importRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(registrySrc)) !== null) {
    imports[match[1]] = match[2];
  }
  
  const exportRegistryRegex = /export\s+const\s+registry\s*=\s*{([^}]+)}/s;
  const registryMatch = exportRegistryRegex.exec(registrySrc);
  if (!registryMatch) throw new Error("Could not find registry export");
  
  const registryBlock = registryMatch[1];
  const mappings = {}; // file.js -> Set of keys
  
  const pairRegex = /([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)/g;
  while ((match = pairRegex.exec(registryBlock)) !== null) {
    const key = match[1];
    const varName = match[2];
    const file = imports[varName];
    if (file) {
      if (!mappings[file]) mappings[file] = new Set();
      mappings[file].add(key);
    }
  }

  // The 21 category modules
  const categoryModules = [
    'semiconductor.js', 'rectifier.js', 'amplifier.js', 'filter_circuits.js', 
    'oscillator.js', 'digital_gates.js', 'digital_circuits.js', 'vlsi.js', 
    'power_electronics.js', 'signal_systems.js', 'electromagnetics.js', 
    'antennas.js', 'thermal_fluid.js', 'structures.js', 'sensors.js', 
    'rf_microwave.js', 'materials.js', 'process_chem.js', 'energy.js', 
    'optics.js', 'manufacturing.js', 'aerospace.js'
  ];

  let totalMismatches = 0;

  for (const file of categoryModules) {
    const filePath = path.join(threeScenesDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${file}`);
      continue;
    }
    
    const src = fs.readFileSync(filePath, 'utf8');
    const expectedKeys = Array.from(mappings[file] || []);
    
    // Naively extract strings used in switch/case or if blocks. 
    // Usually they are `case 'some_key':` or `template === 'some_key'`
    const regex = /case\s+['"]([^'"]+)['"]/g;
    const branches = new Set();
    let m;
    while ((m = regex.exec(src)) !== null) {
      branches.add(m[1]);
    }
    // Also look for `template === 'foo'` or `type === 'foo'`
    const ifRegex = /(?:template|type)\s*===\s*['"]([^'"]+)['"]/g;
    while ((m = ifRegex.exec(src)) !== null) {
      branches.add(m[1]);
    }

    // A module might dispatch using a mapping object too, but let's just check the branches.
    const missing = expectedKeys.filter(k => !branches.has(k) && !branches.has(k.replace(/_layout$/, ''))); 
    // some might be slightly named differently but we should fix them to match exactly.
    // For this simple static check, we just flag them.
    
    // We'll be more strict: expectedKeys must be found in the file as a string literal.
    const missingLiteral = expectedKeys.filter(k => !src.includes(`'${k}'`) && !src.includes(`"${k}"`));
    
    if (missingLiteral.length > 0) {
      console.error(`❌ [${file}] Missing dispatch branches for: ${missingLiteral.join(', ')}`);
      totalMismatches += missingLiteral.length;
    } else {
      console.log(`✅ [${file}] All keys matched`);
    }
  }

  if (totalMismatches > 0) {
    console.error(`\nFound ${totalMismatches} total mismatches.`);
    process.exit(1);
  }
}

main().catch(console.error);
