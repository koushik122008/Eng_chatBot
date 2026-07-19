// Template registry — maps scene-spec "template" names to builder modules.
// Keep names + params in sync with backend/scene_schema.py.
import * as npnTransistor from './npn_transistor.js';
import * as logicGate from './logic_gate.js';
import * as gearTrain from './gear_train.js';
import * as springMass from './spring_mass.js';
import * as wave from './wave.js';

export const registry = {
  npn_transistor: npnTransistor,
  logic_gate: logicGate,
  gear_train: gearTrain,
  spring_mass: springMass,
  wave: wave,
};
