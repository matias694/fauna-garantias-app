import assert from 'node:assert/strict';
import { calculateGuaranteeFinances } from '../utils/calculations';
import type { GuaranteeCase, SystemSettings } from '../types';

const settings: SystemSettings = {
  maxLiquidationDays: 60,
  alertDay: 45,
  fullCoverageLimitMode: 'FIXED',
  fullCoverageFixedLimit: 300000,
  fullCoverageRentMultiplier: 1,
  faunaCompanyName: 'Fauna Propiedades SpA',
  faunaRut: '00.000.000-0',
  faunaAddress: 'Dirección ficticia',
  faunaEmail: 'demo@example.com',
  faunaPhone: '+56 9 0000 0000',
  chargeCategories: ['REPARACIONES'],
  repairCategories: ['REPARACION'],
  responsiblesList: ['Usuario de prueba']
};

function baseCase(overrides: Partial<GuaranteeCase> = {}): GuaranteeCase {
  return {
    id: 'GAR-ABONO-TEST',
    propertyAddress: 'Propiedad ficticia',
    propertyComuna: 'Providencia',
    propertyUnit: '101',
    ownerName: 'Propietario ficticio',
    ownerRut: '00.000.000-0',
    ownerEmail: 'owner@example.com',
    ownerPhone: '+56 9 0000 0000',
    tenantName: 'Arrendatario ficticio',
    tenantRut: '00.000.000-0',
    tenantEmail: 'tenant@example.com',
    tenantPhone: '+56 9 0000 0000',
    monthlyRent: 500000,
    plan: 'ESTANDAR',
    contractStartDate: '01/01/2025',
    contractEndDate: '01/01/2026',
    guaranteeAmount: 500000,
    receptionDate: '01/07/2026',
    deadlineDate: '30/08/2026',
    alertDate: '15/08/2026',
    responsible: 'Usuario de prueba',
    initialNotes: '',
    preparationStatus: 'LISTA',
    liquidationStatus: 'LISTA',
    requirements: [],
    blockedBy: 'SIN_BLOQUEO',
    nextManagement: '',
    nextManagementDate: '',
    nextManagementResponsible: 'Usuario de prueba',
    followUps: [],
    repairs: [],
    charges: [],
    attachments: [],
    movements: [],
    ownerContribution: 0,
    fullCoverageApplied: 0,
    faunaFinancing: 0,
    isClosed: false,
    ...overrides
  };
}

// 1) Caso típico: el abono previo se suma globalmente y reduce el saldo final,
// aunque se haya registrado solo como referencia de servicios.
{
  const c = baseCase({
    charges: [
      {
        id: 'CHG-DANO', category: 'REPARACIONES', description: 'Daños', amount: 400000,
        date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
      },
      {
        id: 'CHG-GC', category: 'GASTOS_COMUNES', description: 'Gastos comunes', amount: 100000,
        date: '01/07/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
      },
      {
        id: 'CHG-AGUA', category: 'AGUA', description: 'Agua', amount: 80000,
        date: '01/07/2026', type: 'SERVICIO_CONSUMO', notes: '', documents: [], photos: []
      },
      {
        id: 'CHG-LUZ', category: 'ELECTRICIDAD', description: 'Electricidad', amount: 60000,
        date: '01/07/2026', type: 'SERVICIO_CONSUMO', notes: '', documents: [], photos: []
      },
      {
        id: 'ABONO', category: 'GASTOS_COMUNES', description: 'Proporcional GC y servicios último voucher', amount: -120000,
        date: '01/07/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
      }
    ]
  });

  const fin = calculateGuaranteeFinances(c, settings);
  assert.equal(fin.grossCharges, 640000);
  assert.equal(fin.tenantCredits, 120000);
  assert.equal(fin.totalCharges, 520000);
  assert.equal(fin.tenantDeficit, 20000);
  assert.equal(fin.tenantReceivableAmount, 20000);
}

// 2) El concepto del abono no limita su efecto financiero. Puede existir un abono
// referenciado como Agua aunque no haya un cargo de Agua y sigue siendo fondo del arrendatario.
{
  const c = baseCase({
    guaranteeAmount: 500000,
    charges: [
      {
        id: 'CHG-DANO', category: 'REPARACIONES', description: 'Daños', amount: 700000,
        date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
      },
      {
        id: 'ABONO-AGUA', category: 'AGUA', description: 'Abono previo estimado', amount: -300000,
        date: '01/07/2026', type: 'SERVICIO_CONSUMO', notes: '', documents: [], photos: []
      }
    ]
  });

  const fin = calculateGuaranteeFinances(c, settings);
  assert.equal(fin.tenantCredits, 300000);
  assert.equal(fin.creditsForDamage, 200000);
  assert.equal(fin.ownerRepairFundingRequired, 0);
  assert.equal(fin.refundToTenant, 100000);
}

// 3) En Full, los abonos disponibles se usan antes de financiar daño con Fauna.
{
  const c = baseCase({
    plan: 'FULL',
    guaranteeAmount: 400000,
    charges: [
      {
        id: 'CHG-DANO', category: 'REPARACIONES', description: 'Daños', amount: 800000,
        date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
      },
      {
        id: 'ABONO', category: 'OTRO', description: 'Abono previo', amount: -100000,
        date: '01/07/2026', type: 'OTRO', notes: '', documents: [], photos: []
      }
    ]
  });

  const fin = calculateGuaranteeFinances(c, settings);
  assert.equal(fin.guaranteeForDamage, 400000);
  assert.equal(fin.creditsForDamage, 100000);
  assert.equal(fin.fullCoverageApplied, 300000);
  assert.equal(fin.faunaFinancingRequired, 300000);
  assert.equal(fin.tenantDeficit, 300000);
}

console.log('✓ Abonos globales validados: 3 escenarios OK');
