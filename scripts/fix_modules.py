import os
import re

files = [
    'semiconductor.js', 'rectifier.js', 'amplifier.js', 'filter_circuits.js', 
    'oscillator.js', 'digital_gates.js', 'digital_circuits.js', 'vlsi.js', 
    'power_electronics.js', 'signal_systems.js', 'electromagnetics.js', 
    'antennas.js', 'thermal_fluid.js', 'structures.js', 'sensors.js', 
    'rf_microwave.js', 'materials.js', 'process_chem.js', 'energy.js', 
    'optics.js', 'manufacturing.js', 'aerospace.js', 'rlc_filter.js' # rlc_filter is another one?
]

dir_path = r'c:\VS_Code\new_project\frontend\js\three-scenes'
for f in os.listdir(dir_path):
    if f.endswith('.js') and f not in files and f != 'common.js' and f != 'registry.js' and f != 'viewer.js' and f != 'component_properties.js' and f != 'electron_flow.js' and f != 'magnetic_field.js':
        files.append(f)

for f in files:
    path = os.path.join(dir_path, f)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Bug 3: `template` in build context.
    # Signature fix: export function build({ THREE, style, params, quality })
    content = re.sub(
        r'export function build\(\{\s*THREE,\s*style,\s*params,\s*quality\s*\}\)\s*\{',
        r'export function build({ THREE, style, params, quality, template }) {',
        content
    )
    
    # type assignment fix: const type = params.type || 'default';
    content = re.sub(
        r'const type = params\.type \|\| ([\'"].*?[\'"]);',
        r'const type = template || \1;',
        content
    )

    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)

# Bug 4 Fixes (Manual patches to correct dispatch logic)
def patch_file(filename, old_str, new_str):
    path = os.path.join(dir_path, filename)
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as file:
        c = file.read()
    c = c.replace(old_str, new_str)
    with open(path, 'w', encoding='utf-8') as file:
        file.write(c)

# digital_gates.js: fix schmitt_trigger, tri_state missing
patch_file('digital_gates.js', "else if (type === 'buffer_gate') kind = 'BUF';", "else if (type === 'buffer_gate' || type === 'tri_state' || type === 'schmitt_trigger') kind = 'BUF';")

# power_electronics.js: flyback, forward_converter, cuk_converter, sepic, charge_pump missing (map them to buck_converter for visual fallback)
patch_file('power_electronics.js', "if (type === 'buck_converter') {", "if (type === 'buck_converter' || ['flyback', 'forward_converter', 'cuk_converter', 'sepic', 'charge_pump'].includes(type)) {")
patch_file('power_electronics.js', "if (type === 'buck_converter') {", "if (type === 'buck_converter' || ['flyback', 'forward_converter', 'cuk_converter', 'sepic', 'charge_pump'].includes(type)) {")

# rectifier.js
patch_file('rectifier.js', "if (type === 'half_wave') {", "if (type === 'half_wave' || type === 'precision_rectifier') {")
patch_file('rectifier.js', "if (type === 'half_wave' ||", "if (type === 'half_wave' || type === 'precision_rectifier' ||")
patch_file('rectifier.js', "type === 'half_wave' || type === 'full_wave_ct'", "type === 'half_wave' || type === 'full_wave_ct' || type === 'precision_rectifier'")

# amplifier.js: cascode_amplifier, transconductance_amp, tuned_amplifier missing (fallback to common_emitter)
patch_file('amplifier.js', "if (type === 'common_emitter') {", "if (type === 'common_emitter' || ['cascode_amplifier', 'transconductance_amp', 'tuned_amplifier'].includes(type)) {")

# filter_circuits.js: chebyshev_lp, active_bpf missing (fallback to active_lowpass)
patch_file('filter_circuits.js', "if (type === 'active_lowpass') {", "if (type === 'active_lowpass' || ['chebyshev_lp', 'active_bpf'].includes(type)) {")

# oscillator.js: lc_oscillator, vco_block missing (fallback to colpitts)
patch_file('oscillator.js', "if (type === 'colpitts') {", "if (type === 'colpitts' || ['lc_oscillator', 'vco_block'].includes(type)) {")

# vlsi.js: cmos_and, cmos_or, pass_transistor missing (fallback to cmos_nand)
patch_file('vlsi.js', "if (type === 'cmos_nand') {", "if (type === 'cmos_nand' || ['cmos_and', 'cmos_or', 'pass_transistor'].includes(type)) {")

print("Fixed modules.")
