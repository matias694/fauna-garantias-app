import assert from 'node:assert/strict';
import type { GuaranteeCase, SystemSettings, FinancialMovement, OwnerPaymentPurpose } from '../types';
import {
  calculateFundingReadiness,
  calculateGuaranteeFinances,
  calculatePaymentDistribution
} from '../utils/calculations';

const settings: SystemSettings = {
  maxLiquidationDays: 60,
  alertDay: 45,
  fullCoverageLimitMode: 'MONTHLY_RENT',
  fullCoverageFixedLimit: 500000,
  fullCoverageRentMultiplier: 1,
  faunaCompanyName: 'Fauna Propiedades SpA',
  faunaRut: '00.000.000-0',
  faunaAddress: 'Dirección de prueba',
  faunaEmail: 'demo@example.com',
  faunaPhone: '+56 9 0000 0000',
  chargeCategories: ['REPARACIONES', 'GASTOS_COMUNES'],
  repairCategories: ['REPARACION'],
  responsiblesList: ['Usuario prueba']
};

const movement = (
  type: FinancialMovement['type'],
  amount: number,
  id: string,
  ownerPaymentPurpose?: OwnerPaymentPurpose
): FinancialMovement => ({
  id,
  caseId: 'GAR-FULL-FLUJO-PROP',
  date: '11/08/2026',
  time: '12:00',
  type,
  description: id,
  amount,
  user: 'Usuario prueba',
  reference: id,
  observation: '',
  ownerPaymentPurpose
});

const baseCase: GuaranteeCase = {
  id: 'GAR-FULL-FLUJO-PROP',
  propertyAddress: 'Caso prueba Full',
  propertyComuna: 'Providencia',
  propertyUnit: 'Depto 999',
  ownerName: 'Propietario prueba',
  ownerRut: '00.000.000-0',
  ownerEmail: 'propietario@example.com',
  ownerPhone: '+56 9 0000 0000',
  tenantName: 'Arrendatario prueba',
  tenantRut: '00.000.000-0',
  tenantEmail: 'arrendatario@example.com',
  tenantPhone: '+56 9 0000 0000',
  monthlyRent: 400000,
  plan: 'FULL',
  contractStartDate: '01/01/2025',
  contractEndDate: '01/01/2026',
  guaranteeAmount: 400000,
  receptionDate: '11/08/2026',
  deadlineDate: '10/10/2026',
  alertDate: '25/09/2026',
  responsible: 'Usuario prueba',
  initialNotes: '',
  preparationStatus: 'LISTA',
  liquidationStatus: 'LISTA',
  requirements: [],
  blockedBy: 'SIN_BLOQUEO',
  nextManagement: '',
  nextManagementDate: '',
  nextManagementResponsible: 'Usuario prueba',
  followUps: [],
  repairs: [],
  charges: [
    {
      id: 'CHG-DANOS',
      category: 'REPARACIONES',
      description: 'Daños superiores a garantía + Full',
      amount: 950000,
      date: '11/08/2026',
      type: 'DAÑO_REPARACION',
      notes: '',
      documents: [],
      photos: []
    },
    {
      id: 'CHG-SERVICIOS',
      category: 'GASTOS_COMUNES',
      description: 'Gastos comunes y servicios finales',
      amount: 200000,
      date: '11/08/2026',
      type: 'GASTO_COMUN',
      notes: '',
      documents: [],
      photos: []
    }
  ],
  attachments: [],
  movements: [],
  ownerContribution: 0,
  fullCoverageApplied: 400000,
  faunaFinancing: 400000,
  isClosed: false
};

const fin = calculateGuaranteeFinances(baseCase, settings);
assert.equal(fin.guaranteeForDamage, 400000);
assert.equal(fin.fullCoverageApplied, 400000);
assert.equal(fin.ownerRepairFundingRequired, 150000);
assert.equal(fin.ownerServiceObligation, 200000);
assert.equal(fin.ownerContributionRequired, 350000);
assert.equal(fin.tenantReceivableAmount, 750000);

// CRÍTICO: pagar servicios no puede financiar reparaciones.
const ownerPaidServicesFirst: GuaranteeCase = {
  ...baseCase,
  ownerContribution: 200000,
  movements: [movement('APORTE_PROPIETARIO', 200000, 'SERVICIOS-DIRECTO', 'SERVICIOS')]
};
const servicesFirst = calculateFundingReadiness(ownerPaidServicesFirst, settings);
assert.equal(servicesFirst.ownerServiceFundedTotal, 200000);
assert.equal(servicesFirst.ownerServicePending, 0);
assert.equal(servicesFirst.ownerRepairFundedTotal, 0);
assert.equal(servicesFirst.ownerRepairPendingProvision, 150000);
assert.equal(servicesFirst.readyToConfirm, false);

// El propietario aporta SOLO lo necesario para terminar reparaciones.
const ownerRepairOnly: GuaranteeCase = {
  ...baseCase,
  ownerContribution: 150000,
  movements: [
    movement('FINANCIAMIENTO_FAUNA', 400000, 'FULL-EJECUTADO'),
    movement('APORTE_PROPIETARIO', 150000, 'APORTE-REPARACION', 'REPARACIONES')
  ]
};
const ready = calculateFundingReadiness(ownerRepairOnly, settings);
assert.equal(ready.ownerRepairPendingProvision, 0);
assert.equal(ready.ownerServicePending, 200000);
assert.equal(ready.readyToConfirm, true);

// Si luego el arrendatario paga los 750 completos:
// 150 recuperan al propietario, 400 recuperan a Fauna y 200 cubren servicios no pagados.
const paymentWithoutOwnerServicePayment = calculatePaymentDistribution(750000, 150000, 400000);
assert.equal(paymentWithoutOwnerServicePayment.ownerRecovery, 150000);
assert.equal(paymentWithoutOwnerServicePayment.faunaRecovery, 400000);
assert.equal(paymentWithoutOwnerServicePayment.surplusPayment, 200000);

const settledWithoutOwnerServicePayment: GuaranteeCase = {
  ...ownerRepairOnly,
  ownerContribution: 0,
  faunaFinancing: 0,
  movements: [
    ...ownerRepairOnly.movements,
    movement('RECUPERACION_PROPIETARIO', 150000, 'RECUP-PROP'),
    movement('RECUPERACION_FAUNA', 400000, 'RECUP-FAUNA'),
    movement('SALDO_PAGO_ARRENDATARIO', 200000, 'SALDO-SERVICIOS')
  ]
};
assert.equal(calculateFundingReadiness(settledWithoutOwnerServicePayment, settings).ownerServicePending, 0);

// Si el propietario sí pagó reparaciones y servicios, ambas bolsas quedan reconocidas y
// el pago posterior del arrendatario recupera primero los 350 del propietario.
const ownerPaidEverything: GuaranteeCase = {
  ...baseCase,
  ownerContribution: 350000,
  movements: [
    movement('APORTE_PROPIETARIO', 150000, 'PROP-REPARACIONES', 'REPARACIONES'),
    movement('APORTE_PROPIETARIO', 200000, 'PROP-SERVICIOS', 'SERVICIOS')
  ]
};
const everythingReady = calculateFundingReadiness(ownerPaidEverything, settings);
assert.equal(everythingReady.ownerRepairPendingProvision, 0);
assert.equal(everythingReady.ownerServicePending, 0);

const paymentAfterOwnerPaidEverything = calculatePaymentDistribution(750000, 350000, 400000);
assert.equal(paymentAfterOwnerPaidEverything.ownerRecovery, 350000);
assert.equal(paymentAfterOwnerPaidEverything.faunaRecovery, 400000);
assert.equal(paymentAfterOwnerPaidEverything.surplusPayment, 0);

console.log('✓ Flujo Full con fondos de propietario separados por destino validado');
