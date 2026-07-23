import os
import re
import json

schema_path = r'c:\VS_Code\new_project\backend\scene_schema.py'
registry_path = r'c:\VS_Code\new_project\frontend\js\three-scenes\registry.js'

with open(registry_path, 'r', encoding='utf-8') as f:
    reg_src = f.read()

# Extract keys from export const registry = { ... }
m = re.search(r'export const registry = \{([^}]+)\}', reg_src)
registry_block = m.group(1)
reg_keys = []
for line in registry_block.split('\n'):
    line = line.strip()
    if ':' in line:
        key = line.split(':')[0].strip()
        reg_keys.append(key)

with open(schema_path, 'r', encoding='utf-8') as f:
    schema_src = f.read()

# Find existing keys in python
existing_keys = re.findall(r'"([a-zA-Z0-9_]+)":\s*_category_schema', schema_src)
existing_keys += re.findall(r'"([a-zA-Z0-9_]+)":\s*\{', schema_src)

missing_keys = [k for k in reg_keys if k not in existing_keys]

print(f"Missing keys: {len(missing_keys)}")

if missing_keys:
    lines = schema_src.split('\n')
    # Find the end of TEMPLATE_PARAM_SCHEMAS dictionary
    for i, line in enumerate(lines):
        if 'ANIMATION_TYPES =' in line:
            insert_idx = i - 1
            break
            
    # Go back to find the closing brace of TEMPLATE_PARAM_SCHEMAS
    while lines[insert_idx].strip() != '}':
        insert_idx -= 1
        
    new_lines = []
    new_lines.append('    # ===== NEW CATEGORIES =====')
    for k in missing_keys:
        new_lines.append(f'    "{k}": _category_schema(["default"]),')
        
    lines = lines[:insert_idx] + new_lines + lines[insert_idx:]
    
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print("Added missing keys to scene_schema.py")
