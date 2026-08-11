import assert from 'node:assert/strict';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import type { GuaranteeCase, SystemSettings } from '../types';

const settings = {} as SystemSettings;

const makeFullCase = (damage: number, services: number, faunaFinancing = 0, ownerContribution = 0) => ({
  plan: 'FULL', guaranteeAmount: 400000, ownerContribution, faunaFinancing, movements: [],
  charges: [
    { id: 'DAMAGE', category: 'DAÑOS', description: 'Daños de prueba', amount: damage, date: '09/08/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: [] },
    ...(services !== 0 ? [{ id: 'SERVICE', category: 'GASTOS_COMUNES', description: 'Servicios de prueba', amount: services, date: '09/08/2026', type: 'GASTO_COMUN' as const, notes: '', documents: [], photos: [] }] : [])
  ]
} as GuaranteeCase);

// Caso original: Full cubre todo el daño adicional y queda $100.000 de servicios
// como obligación del propietario. Esa obligación NO bloquea la liquidación.
{
  const c = makeFullCase(800000, 100000, 400000);
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);
  assert.equal(fin.fullCoverageApplied, 400000);
  assert.equal(fin.ownerRepairFundingRequired, 0);
  assert.equal(fin.ownerServiceObligation, 100000);
  assert.equal(fin.ownerContributionRequired, 100000);
  assert.equal(readiness.ownerPendingProvision, 100000);
  assert.equal(readiness.ownerRepairPendingProvision, 0);
  assert.equal(readiness.ownerServicePending, 100000);
  assert.equal(readiness.readyToConfirm, true);
}

// Al bajar daños a $700.000, Full usa $300.000. Los $100.000 de GC siguen
// pendientes del propietario, pero tampoco bloquean la confirmación.
{
  const c = makeFullCase(700000, 100000, 300000);
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);
  assert.equal(fin.totalCharges, 800000);
  assert.equal(fin.fullCoverageApplied, 300000);
  assert.equal(fin.ownerRepairFundingRequired, 0);
  assert.equal(fin.ownerServiceObligation, 100000);
  assert.equal(readiness.ownerPendingProvision, 100000);
  assert.equal(readiness.ownerRepairPendingProvision, 0);
  assert.equal(readiness.ownerServicePending, 100000);
  assert.equal(readiness.readyToConfirm, true);
}

// Si garantía + Full no alcanzan para los DAÑOS, esa diferencia sí es provisión
// previa obligatoria y bloquea hasta recibir fondos o reducir reparaciones.
{
  const c = makeFullCase(900000, 0, 400000);
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);
  assert.equal(fin.fullCoverageApplied, 400000);
  assert.equal(fin.ownerRepairFundingRequired, 100000);
  assert.equal(fin.ownerServiceObligation, 0);
  assert.equal(readiness.ownerRepairPendingProvision, 100000);
  assert.equal(readiness.readyToConfirm, false);
}

// Si conviven ambos tipos de diferencia, solo la parte de reparaciones bloquea.
{
  const c = makeFullCase(850000, 100000, 400000);
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);
  assert.equal(fin.ownerRepairFundingRequired, 50000);
  assert.equal(fin.ownerServiceObligation, 100000);
  assert.equal(readiness.ownerRepairPendingProvision, 50000);
  assert.equal(readiness.ownerServicePending, 100000);
  assert.equal(readiness.readyToConfirm, false);
}

// Caso de informe propietario: $1.000.000 en reparaciones + $200.000 en servicios.
// La garantía cubre $400.000 de daños, Full otros $400.000, y el propietario queda
// con $200.000 de reparaciones + $200.000 de servicios = $400.000 en total.
{
  const c = makeFullCase(1000000, 200000, 400000);
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);
  assert.equal(fin.totalCharges, 1200000);
  assert.equal(fin.guaranteeForDamage, 400000);
  assert.equal(fin.fullCoverageApplied, 400000);
  assert.equal(fin.ownerRepairFundingRequired, 200000);
  assert.equal(fin.ownerServiceObligation, 200000);
  assert.equal(fin.ownerContributionRequired, 400000);
  assert.equal(readiness.ownerRepairPendingProvision, 200000);
  assert.equal(readiness.ownerServicePending, 200000);
  assert.equal(readiness.ownerPendingProvision, 400000);
}

// Cobertura Full parcial.
{
  const fin = calculateGuaranteeFinances(makeFullCase(450000, 0), settings);
  assert.equal(fin.fullCoverageApplied, 50000);
  assert.equal(fin.ownerRepairFundingRequired, 0);
  assert.equal(fin.ownerContributionRequired, 0);
}

// Si la garantía alcanza para daños y servicios, no se usa Full ni queda obligación.
{
  const fin = calculateGuaranteeFinances(makeFullCase(300000, 100000), settings);
  assert.equal(fin.fullCoverageApplied, 0);
  assert.equal(fin.guaranteeForDamage, 300000);
  assert.equal(fin.guaranteeForServices, 100000);
  assert.equal(fin.ownerContributionRequired, 0);
}

// Un abono es fondo global: el daño bruto no cambia, pero el abono se usa a favor
// del arrendatario antes de activar financiamiento adicional de Full.
{
  const c = makeFullCase(800000, 100000, 350000);
  c.charges.push({
    id: 'CREDIT', category: 'DAÑOS', description: 'Abono previo', amount: -50000,
    date: '09/08/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
  });
  const fin = calculateGuaranteeFinances(c, settings);
  assert.equal(fin.damageCharges, 800000);
  assert.equal(fin.serviceCharges, 100000);
  assert.equal(fin.tenantCredits, 50000);
  assert.equal(fin.totalCharges, 850000);
  assert.equal(fin.creditsForDamage, 50000);
  assert.equal(fin.fullCoverageApplied, 350000);
  assert.equal(fin.ownerServiceObligation, 100000);
}

// El concepto del abono es referencial: aunque diga gastos comunes, financieramente
// entra al fondo general y sigue la prioridad de cobertura del caso.
{
  const c = makeFullCase(800000, 100000, 300000);
  c.charges.push({
    id: 'CREDIT-SERVICE', category: 'GASTOS_COMUNES', description: 'Abono proporcional de servicios', amount: -100000,
    date: '09/08/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
  });
  const fin = calculateGuaranteeFinances(c, settings);
  assert.equal(fin.damageCharges, 800000);
  assert.equal(fin.serviceCharges, 100000);
  assert.equal(fin.tenantCredits, 100000);
  assert.equal(fin.totalCharges, 800000);
  assert.equal(fin.creditsForDamage, 100000);
  assert.equal(fin.creditsForServices, 0);
  assert.equal(fin.fullCoverageApplied, 300000);
  assert.equal(fin.ownerContributionRequired, 100000);
}

console.log('✓ Prioridad Plan Full, obligaciones y abonos globales: 9 escenarios OK');
