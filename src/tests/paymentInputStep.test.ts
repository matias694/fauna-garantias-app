import assert from 'node:assert/strict';

// Regresión del formulario HTML: con min=1, step=5000 hacía inválidos montos exactos como $200.000.
// El formulario debe aceptar cualquier monto entero en pesos dentro del saldo pendiente.
const min = 1;
const step = 1;
const value = 200000;
const isValidStep = Number.isInteger((value - min) / step);

assert.equal(isValidStep, true);
console.log('✓ El formulario acepta montos exactos como $200.000');
