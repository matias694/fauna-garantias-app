import assert from 'node:assert/strict';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import type { GuaranteeCase, SystemSettings } from '../types';

const settings = {} as SystemSettings;

const makeFullCase = (damage: number, services: number) => ({
  plan: 'FULL',
  guaranteeAmount: 400000,
  ownerContribution: 0,
  faunaFinancing: 0,
  movements: [],
  charges: [
    {
      id: 'DAMAGE',
      category: 'DAÑOS',
      description: 'Daños de prueba',
      amount: damage,
      date: '09/08/2026',
      type: 'DAÑO_REPARACION',
      notes: '',
      documents: [],
      photos: []
    },
    ...(services > 0 ? [{
      id: 'SERVICE',
      category: 'GASTOS_COMUNES',
      description: 'Servicios de prueba',
      amount: services,
      date: '09/08/2026',
      type: 'GASTO_COMUN' as const,
      notes: '',
      documents: [],
      photos: []
    }] : [])
  ]
} as GuaranteeCase);

// Caso original: $900.000 = $800.000 daños + $100.000 servicios.
// Garantía $400.000 + Full $400.000 => propietario provisiona $100.000.
{
  const c = makeFullCase(800000, 100000);
  const fin = calculateGuaranteeFinances(c, settings);
  assert.equal(fin.fullCoverageApplied, 400000);
  assert.equal(fin.ownerContributionRequired, 100000);
}

// Regresión del caso reportado: al bajar daños en $100.000, el total queda en $800.000.
// La garantía cubre primero los $100.000 no cubiertos por Full y $300.000 de daños;
// Full cubre los $400.000 de daños restantes. No debe quedar provisión del propietario.
{
  const c = makeFullCase(700000, 100000);
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);

  assert.equal(fin.totalCharges, 800000);
  assert.equal(fin.fullCoverageApplied, 400000);
  assert.equal(fin.ownerContributionRequired, 0);
  assert.equal(readiness.ownerRequired, 0);
  assert.equal(readiness.ownerPendingProvision, 0);
}

// La cobertura no se fuerza al máximo: si solo hacen falta $150.000 de daños cubiertos,
// el beneficio Full aplicado debe ser exactamente $150.000.
{
  const c = makeFullCase(450000, 100000);
  const fin = calculateGuaranteeFinances(c, settings);

  assert.equal(fin.totalCharges, 550000);
  assert.equal(fin.tenantDeficit, 150000);
  assert.equal(fin.fullCoverageApplied, 150000);
  assert.equal(fin.ownerContributionRequired, 0);
}

console.log('✓ Asignación de garantía y cobertura Full validada: 3 escenarios OK');
