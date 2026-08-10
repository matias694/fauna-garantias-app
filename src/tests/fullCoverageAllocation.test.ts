import assert from 'node:assert/strict';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import type { GuaranteeCase, SystemSettings } from '../types';

const settings = {} as SystemSettings;

const makeFullCase = (damage: number, services: number) => ({
  plan: 'FULL', guaranteeAmount: 400000, ownerContribution: 0, faunaFinancing: 0, movements: [],
  charges: [
    { id: 'DAMAGE', category: 'DAÑOS', description: 'Daños de prueba', amount: damage, date: '09/08/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: [] },
    ...(services > 0 ? [{ id: 'SERVICE', category: 'GASTOS_COMUNES', description: 'Servicios de prueba', amount: services, date: '09/08/2026', type: 'GASTO_COMUN' as const, notes: '', documents: [], photos: [] }] : [])
  ]
} as GuaranteeCase);

{
  const fin = calculateGuaranteeFinances(makeFullCase(800000, 100000), settings);
  assert.equal(fin.fullCoverageApplied, 400000);
  assert.equal(fin.ownerContributionRequired, 100000);
}

{
  const c = makeFullCase(700000, 100000);
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);
  assert.equal(fin.totalCharges, 800000);
  assert.equal(fin.fullCoverageApplied, 300000);
  assert.equal(fin.ownerContributionRequired, 100000);
  assert.equal(readiness.ownerPendingProvision, 100000);
}

{
  const fin = calculateGuaranteeFinances(makeFullCase(450000, 0), settings);
  assert.equal(fin.fullCoverageApplied, 50000);
  assert.equal(fin.ownerContributionRequired, 0);
}

{
  const fin = calculateGuaranteeFinances(makeFullCase(300000, 100000), settings);
  assert.equal(fin.fullCoverageApplied, 0);
  assert.equal(fin.ownerContributionRequired, 0);
}

console.log('✓ Prioridad Plan Full validada: 4 escenarios OK');
