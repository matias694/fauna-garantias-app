import assert from 'node:assert/strict';
import {
  calculateGuaranteeFinances,
  calculateOwnerLiquidationReconciliation,
  calculatePaymentDistribution
} from '../utils/calculations';
import { isCaseCompleted } from '../context/AppContext';
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
    id: 'GAR-TEST',
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
    liquidationStatus: 'EMITIDA',
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
    isCompleted: false,
    isClosed: false,
    ...overrides
  };
}

// 1) Garantía con devolución
{
  const c = baseCase({
    charges: [{
      id: 'CHG-1', category: 'REPARACIONES', description: 'Cargo ficticio', amount: 300000,
      date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    }]
  });
  const fin = calculateGuaranteeFinances(c, settings);
  const ownerSettlement = calculateOwnerLiquidationReconciliation(c, settings);
  assert.equal(fin.isSurplus, true);
  assert.equal(fin.refundToTenant, 200000);
  assert.equal(ownerSettlement.refundToTenant, 200000);
  assert.equal(ownerSettlement.reconciliationBalance, 0);
  assert.equal(isCaseCompleted({ ...c, refund: { amount: 200000, status: 'PENDIENTE' } }), false);
  assert.equal(isCaseCompleted({ ...c, refund: { amount: 200000, status: 'TRANSFERIDA' } }), true);
}

// 2) Garantía exacta
{
  const c = baseCase({
    charges: [{
      id: 'CHG-2', category: 'REPARACIONES', description: 'Cargo ficticio', amount: 500000,
      date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    }]
  });
  const fin = calculateGuaranteeFinances(c, settings);
  const ownerSettlement = calculateOwnerLiquidationReconciliation(c, settings);
  assert.equal(fin.isExact, true);
  assert.equal(fin.refundToTenant, 0);
  assert.equal(fin.tenantDeficit, 0);
  assert.equal(ownerSettlement.reconciliationBalance, 0);
  assert.equal(isCaseCompleted(c), true);
}

// 3) Garantía insuficiente Estándar + pago posterior
{
  const c = baseCase({
    plan: 'ESTANDAR',
    charges: [{
      id: 'CHG-3', category: 'REPARACIONES', description: 'Cargo ficticio', amount: 800000,
      date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    }],
    receivableStatus: 'PENDIENTE'
  });
  const fin = calculateGuaranteeFinances(c, settings);
  const ownerSettlement = calculateOwnerLiquidationReconciliation(c, settings);
  assert.equal(fin.isInsufficient, true);
  assert.equal(fin.tenantDeficit, 300000);
  assert.equal(fin.ownerContributionRequired, 300000);
  assert.equal(fin.faunaFinancingRequired, 0);
  assert.equal(ownerSettlement.ownerContributionPending, 300000);
  assert.equal(ownerSettlement.reconciliationBalance, -300000);
  assert.equal(isCaseCompleted(c), false);
  assert.equal(isCaseCompleted({ ...c, receivableStatus: 'PAGADA' }), true);
  assert.equal(isCaseCompleted({ ...c, receivableStatus: 'INCOBRABLE' }), true);

  const dist = calculatePaymentDistribution(300000, 100000, 150000);
  assert.equal(dist.ownerRecovery, 100000);
  assert.equal(dist.faunaRecovery, 150000);
  assert.equal(dist.surplusPayment, 50000);
  assert.equal(dist.remainingOwnerContribution, 0);
  assert.equal(dist.remainingFaunaFinancing, 0);
}

// 4) Plan Full: cobertura adicional = 100% del monto de garantía, no del arriendo
// y los montos requeridos no implican que ya hayan sido desembolsados.
{
  const c = baseCase({
    plan: 'FULL',
    guaranteeAmount: 400000,
    monthlyRent: 450000,
    ownerContribution: 0,
    faunaFinancing: 0,
    charges: [
      {
        id: 'CHG-4', category: 'REPARACIONES', description: 'Daños ficticios', amount: 800000,
        date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
      },
      {
        id: 'CHG-5', category: 'GASTOS_COMUNES', description: 'Gastos comunes ficticios', amount: 100000,
        date: '01/07/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
      }
    ]
  });
  const fin = calculateGuaranteeFinances(c, settings);
  const ownerSettlement = calculateOwnerLiquidationReconciliation(c, settings);
  assert.equal(fin.damageCharges, 800000);
  assert.equal(fin.serviceCharges, 100000);
  assert.equal(fin.fullCoverageLimit, 400000);
  assert.equal(fin.fullCoverageApplied, 400000);
  assert.equal(fin.tenantDeficit, 500000);
  assert.equal(fin.ownerContributionRequired, 100000);
  assert.equal(fin.faunaFinancingRequired, 400000);
  assert.equal(ownerSettlement.ownerContributionPending, 100000);
  assert.equal(ownerSettlement.reconciliationBalance, -100000);
  assert.equal(c.ownerContribution, 0);
  assert.equal(c.faunaFinancing, 0);
}

// 5) Liquidación propietario Full conserva el aporte histórico aunque después sea recuperado.
{
  const c = baseCase({
    plan: 'FULL',
    guaranteeAmount: 400000,
    ownerContribution: 0,
    faunaFinancing: 350000,
    charges: [
      {
        id: 'CHG-6', category: 'REPARACIONES', description: 'Daños ficticios', amount: 800000,
        date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
      },
      {
        id: 'CHG-7', category: 'GASTOS_COMUNES', description: 'Gastos comunes ficticios', amount: 100000,
        date: '01/07/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
      }
    ],
    movements: [
      {
        id: 'MOV-1', caseId: 'GAR-TEST', date: '01/07/2026', time: '10:00',
        type: 'APORTE_PROPIETARIO', description: 'Aporte propietario', amount: 100000,
        user: 'Usuario de prueba', reference: 'APORTE', observation: ''
      },
      {
        id: 'MOV-2', caseId: 'GAR-TEST', date: '02/07/2026', time: '10:00',
        type: 'RECUPERACION_PROPIETARIO', description: 'Recuperación propietario', amount: 100000,
        user: 'Usuario de prueba', reference: 'RECUP', observation: ''
      }
    ]
  });

  const ownerSettlement = calculateOwnerLiquidationReconciliation(c, settings);
  assert.equal(ownerSettlement.ownerContributionRequired, 100000);
  assert.equal(ownerSettlement.ownerContributionFundedTotal, 100000);
  assert.equal(ownerSettlement.ownerContributionApplied, 100000);
  assert.equal(ownerSettlement.ownerContributionPending, 0);
  assert.equal(ownerSettlement.reconciliationBalance, 0);
}

console.log('✓ Reglas de negocio principales validadas: 5 escenarios OK');
