// Component Properties Panel - shows detailed specs when clicking 3D models
// Displays real-world component data, reference images, and interactive controls.
import * as THREE from 'three';

// Real-world component data database
const COMPONENT_DATA = {
  npn_transistor: {
    name: 'NPN Bipolar Junction Transistor',
    category: 'Semiconductor',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Transistor_NPNSymbol.svg/200px-Transistor_NPNSymbol.svg.png',
    specs: {
      'Type': 'NPN BJT',
      'Package': 'TO-92 / TO-220',
      'Max Vceo': '40V (2N2222)',
      'Max Ic': '600mA (2N2222)',
      'hFE (β)': '100-300',
      'ft': '300MHz',
      'Power': '500mW',
    },
    pinout: ['Emitter', 'Base', 'Collector'],
    applications: ['Signal amplification', 'Switching circuits', 'Motor drivers', 'Audio amplifiers'],
    operatingRegions: ['Cutoff', 'Active', 'Saturation'],
  },
  mosfet: {
    name: 'MOSFET (N-Channel Enhancement)',
    category: 'Semiconductor',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/N-Ch_and_P-Ch_MOSFET.svg/200px-N-Ch_and_P-Ch_MOSFET.svg.png',
    specs: {
      'Type': 'N-Channel Enhancement',
      'Package': 'TO-92 / TO-220',
      'Max Vds': '60V (IRF540)',
      'Max Id': '33A (IRF540)',
      'Rds(on)': '44mΩ',
      'Vgs(th)': '2-4V',
      'Power': '130W',
    },
    pinout: ['Source', 'Gate', 'Drain'],
    applications: ['CMOS logic', 'Power switching', 'Motor control', 'Voltage regulators'],
    operatingRegions: ['Cutoff', 'Linear', 'Saturation'],
  },
  opamp: {
    name: 'Operational Amplifier',
    category: 'Analog IC',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Op-amp_symbol.svg/200px-Op-amp_symbol.svg.png',
    specs: {
      'Type': 'General Purpose',
      'Package': 'DIP-8 / SOIC-8',
      'Supply': '±5V to ±18V',
      'Input Offset': '<2mV (LM741)',
      'GBW': '1MHz (LM741)',
      'Slew Rate': '0.5V/µs',
      'Input Z': '2MΩ',
    },
    pinout: ['Inverting Input', 'Non-Inverting Input', 'Output', 'V+', 'V-'],
    applications: ['Amplification', 'Filters', 'Math operations', 'Signal conditioning'],
    configurations: ['Inverting', 'Non-Inverting', 'Differential', 'Summing'],
  },
  led: {
    name: 'Light Emitting Diode',
    category: 'Optoelectronic',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/LED_symbol.svg/200px-LED_symbol.svg.png',
    specs: {
      'Forward Voltage': '1.8-3.3V',
      'Forward Current': '20mA typical',
      'Luminous Intensity': '1000-5000mcd',
      'Wavelength': '620-625nm (Red)',
      'Viewing Angle': '15-30°',
      'Lifetime': '50,000 hours',
    },
    pinout: ['Anode (+)', 'Cathode (-)'],
    applications: ['Indicators', 'Lighting', 'Displays', 'Optical communication'],
    colors: {
      'Red': { vf: '1.8-2.2V', wl: '620-625nm' },
      'Green': { vf: '2.0-3.5V', wl: '520-530nm' },
      'Blue': { vf: '3.0-3.5V', wl: '465-475nm' },
      'White': { vf: '3.0-3.5V', wl: 'Broad spectrum' },
    },
  },
  resistor: {
    name: 'Resistor',
    category: 'Passive',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Resistor_symbol.svg/200px-Resistor_symbol.svg.png',
    specs: {
      'Type': 'Carbon Film / Metal Film',
      'Package': 'Axial / SMD',
      'Tolerance': '±5% (Gold), ±1% (Brown)',
      'Power Rating': '1/4W, 1/2W, 1W',
      'Temperature Co.': '±200 ppm/°C',
      'Values': '1Ω to 10MΩ',
    },
    colorCode: ['Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Grey', 'White'],
    applications: ['Current limiting', 'Voltage division', 'Pull-up/down', 'Timing circuits'],
  },
  capacitor: {
    name: 'Capacitor',
    category: 'Passive',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Capacitor_symbol.svg/200px-Capacitor_symbol.svg.png',
    specs: {
      'Type': 'Ceramic / Electrolytic',
      'Package': 'Radial / Axial / SMD',
      'Voltage Rating': '6.3V to 450V',
      'Capacitance': '1pF to 10000µF',
      'Tolerance': '±20% (Ceramic), ±10% (Electrolytic)',
      'ESR': '<100mΩ (Low ESR)',
    },
    types: {
      'Ceramic': 'High frequency, non-polarized',
      'Electrolytic': 'High capacitance, polarized',
      'Film': 'Good stability, non-polarized',
      'Tantalum': 'High density, polarized',
    },
    applications: ['Filtering', 'Decoupling', 'Timing', 'Energy storage'],
  },
  inductor: {
    name: 'Inductor',
    category: 'Passive',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Inductor_symbol.svg/200px-Inductor_symbol.svg.png',
    specs: {
      'Type': 'Ferrite Core / Air Core',
      'Package': 'Through-hole / SMD',
      'Inductance': '0.1µH to 100mH',
      'Current Rating': '100mA to 10A',
      'DCR': '<1Ω typical',
      'Q Factor': '>50 at 1MHz',
    },
    coreTypes: ['Ferrite', 'Iron', 'Air', 'Powdered Iron'],
    applications: ['Power supplies', 'Filters', 'Transformers', 'RF circuits'],
  },
  diode: {
    name: 'PN Junction Diode',
    category: 'Semiconductor',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Diode_symbol.svg/200px-Diode_symbol.svg.png',
    specs: {
      'Type': 'Silicon / Schottky',
      'Package': 'DO-35 / DO-41',
      'Forward Voltage': '0.7V (Si), 0.3V (Schottky)',
      'Max If': '1A (1N4001)',
      'Reverse Voltage': '50V (1N4001)',
      'Recovery Time': '<50ns (Si), <10ns (Schottky)',
    },
    types: {
      'Standard': 'General purpose rectification',
      'Zener': 'Voltage regulation',
      'Schottky': 'Fast switching, low Vf',
      'LED': 'Light emission',
    },
    applications: ['Rectification', 'Protection', 'Clamping', 'Detection'],
  },
};

// Default component data for unknown types
const DEFAULT_COMPONENT = {
  name: 'Electronic Component',
  category: 'General',
  image: null,
  specs: {
    'Type': 'Unknown',
    'Package': 'Various',
    'Voltage': 'Check datasheet',
    'Current': 'Check datasheet',
  },
  pinout: ['Pin 1', 'Pin 2', 'Pin 3'],
  applications: ['Various electronic circuits'],
};

/**
 * Component Properties Panel class
 * Displays detailed component information on click
 */
export class ComponentPropertiesPanel {
  constructor(viewer) {
    this.viewer = viewer;
    this.panel = null;
    this.isVisible = false;
    this.currentComponent = null;
    this.currentMesh = null;
    this._init();
  }

  _init() {
    // Create panel element
    this.panel = document.createElement('div');
    this.panel.className = 'component-properties-panel';
    this.panel.style.display = 'none';
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'prop-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => this.hide();
    this.panel.appendChild(closeBtn);

    // Content container
    this.content = document.createElement('div');
    this.content.className = 'prop-content';
    this.panel.appendChild(this.content);

    // Add to viewer container
    this.viewer.container.appendChild(this.panel);
  }

  /**
   * Show properties for a clicked component
   * @param {THREE.Object3D} mesh - The clicked mesh
   * @param {Object} spec - Scene specification
   */
  show(mesh, spec) {
    if (!mesh || !spec) return;

    this.currentMesh = mesh;
    this.currentComponent = this._getComponentData(spec.template);
    
    // Build panel content
    this._buildContent(spec);
    
    // Show panel with animation
    this.panel.style.display = 'block';
    this.panel.style.opacity = '0';
    this.panel.style.transform = 'translateX(20px)';
    
    requestAnimationFrame(() => {
      this.panel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translateX(0)';
    });
    
    this.isVisible = true;
  }

  /**
   * Hide the properties panel
   */
  hide() {
    if (!this.isVisible) return;
    
    this.panel.style.opacity = '0';
    this.panel.style.transform = 'translateX(20px)';
    
    setTimeout(() => {
      this.panel.style.display = 'none';
      this.isVisible = false;
      this.currentComponent = null;
      this.currentMesh = null;
    }, 300);
  }

  /**
   * Get component data from database or return default
   */
  _getComponentData(template) {
    // Try to match template name to component data
    const templateLower = template.toLowerCase();
    
    for (const [key, data] of Object.entries(COMPONENT_DATA)) {
      if (templateLower.includes(key) || key.includes(templateLower)) {
        return data;
      }
    }
    
    return DEFAULT_COMPONENT;
  }

  /**
   * Build panel content HTML
   */
  _buildContent(spec) {
    const comp = this.currentComponent;
    const meta = this.viewer._lastMeta || {};
    
    let html = `
      <div class="prop-header">
        <h3>${comp.name}</h3>
        <span class="prop-category">${comp.category}</span>
      </div>
    `;

    // Reference image
    if (comp.image) {
      html += `
        <div class="prop-image-container">
          <img src="${comp.image}" alt="${comp.name}" class="prop-image" 
               onerror="this.style.display='none'">
        </div>
      `;
    }

    // Description
    if (meta.desc) {
      html += `
        <div class="prop-description">
          <p>${meta.desc}</p>
        </div>
      `;
    }

    // Specifications table
    html += `
      <div class="prop-specs">
        <h4>Specifications</h4>
        <table class="prop-specs-table">
    `;
    
    for (const [key, value] of Object.entries(comp.specs)) {
      html += `
        <tr>
          <td class="spec-key">${key}</td>
          <td class="spec-value">${value}</td>
        </tr>
      `;
    }
    
    html += `
        </table>
      </div>
    `;

    // Pinout
    if (comp.pinout) {
      html += `
        <div class="prop-pinout">
          <h4>Pinout</h4>
          <div class="pinout-list">
            ${comp.pinout.map((pin, i) => `
              <span class="pinout-pin">${i + 1}: ${pin}</span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Applications
    if (comp.applications) {
      html += `
        <div class="prop-applications">
          <h4>Applications</h4>
          <div class="applications-list">
            ${comp.applications.map(app => `
              <span class="application-tag">${app}</span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Operating mode (for transistors)
    if (meta.purpose) {
      html += `
        <div class="prop-operation">
          <h4>How it Works</h4>
          <p class="operation-text">${meta.purpose}</p>
        </div>
      `;
    }

    // Interactive controls hint
    html += `
      <div class="prop-controls-hint">
        <span class="hint-icon">💡</span>
        <span class="hint-text">Click components to toggle states • Scroll to zoom • Drag to rotate</span>
      </div>
    `;

    this.content.innerHTML = html;
  }

  /**
   * Update panel position based on mesh position
   */
  updatePosition() {
    if (!this.isVisible || !this.currentMesh) return;
    
    // Project 3D position to 2D screen coordinates
    const vector = new THREE.Vector3();
    this.currentMesh.getWorldPosition(vector);
    vector.project(this.viewer.camera);
    
    const rect = this.viewer.container.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width;
    const y = (-vector.y * 0.5 + 0.5) * rect.height;
    
    // Position panel near the component but keep it in view
    const panelWidth = 320;
    const panelHeight = this.panel.offsetHeight || 400;
    
    let panelX = x + 20;
    let panelY = y - panelHeight / 2;
    
    // Keep panel in bounds
    if (panelX + panelWidth > rect.width) {
      panelX = x - panelWidth - 20;
    }
    if (panelY < 10) panelY = 10;
    if (panelY + panelHeight > rect.height - 10) {
      panelY = rect.height - panelHeight - 10;
    }
    
    this.panel.style.left = panelX + 'px';
    this.panel.style.top = panelY + 'px';
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    this.panel = null;
    this.content = null;
  }
}

export { COMPONENT_DATA, DEFAULT_COMPONENT };
