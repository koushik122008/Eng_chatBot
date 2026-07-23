import os

dir_path = r'c:\VS_Code\new_project\frontend\js\three-scenes'

def patch_file(filename, old_str, new_str):
    path = os.path.join(dir_path, filename)
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as file:
        c = file.read()
    c = c.replace(old_str, new_str)
    with open(path, 'w', encoding='utf-8') as file:
        file.write(c)

# digital_gates.js: fix or_gate
patch_file('digital_gates.js', "else if (type.includes('or')", "else if ((type.includes('or') || type === 'or_gate')")

# filter_circuits.js
patch_file('filter_circuits.js', "if (type === 'active_lowpass' || ['chebyshev_lp', 'active_bpf'].includes(type)) {", "if (type === 'active_lowpass' || ['chebyshev_lp', 'active_bpf'].includes(type)) {")
patch_file('filter_circuits.js', "if (type === 'active_lowpass') {", "if (type === 'active_lowpass' || ['chebyshev_lp', 'active_bpf'].includes(type)) {")

# oscillator.js
patch_file('oscillator.js', "if (type === 'colpitts' || ['lc_oscillator', 'vco_block'].includes(type)) {", "if (type === 'colpitts' || ['lc_oscillator', 'vco_block'].includes(type)) {")
patch_file('oscillator.js', "if (type === 'colpitts') {", "if (type === 'colpitts' || ['lc_oscillator', 'vco_block'].includes(type)) {")

# rectifier.js
patch_file('rectifier.js', "if (type === 'half_wave' || type === 'precision_rectifier') {", "if (type === 'half_wave' || type === 'precision_rectifier' || type === 'half_wave_rectifier') {")
patch_file('rectifier.js', "} else if (type === 'full_wave_ct') {", "} else if (type === 'full_wave_ct' || type === 'full_wave_ct_rectifier') {")
patch_file('rectifier.js', "} else if (type === 'three_phase') {", "} else if (type === 'three_phase' || type === 'three_phase_rectifier') {")

print("Fixed modules again.")
