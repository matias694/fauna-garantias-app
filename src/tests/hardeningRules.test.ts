import assert from 'node:assert/strict';
import type { GuaranteeCase, SystemSettings } from '../types';
import { calculateFundingReadiness, calculateGuaranteeFinances, canConfirmGuaranteeLiquidation } from '../utils/calculations';
import { formatDate, getLocalDateInputValue, parseLocalDate } from '../utils/formatters';
import { isCaseCompleted, normalizeClosedOwnerPending } from '../context/AppContext';

const settings = {
  maxLiquidationDays: 60,
  alertDay: 45,
  faunaCompanyName: 'Fauna',
  faunaRut: '00.000.000-0',
  faunaAddress: 'Santiago',
  faunaEmail: 'demo@example.com',
  faunaPhone: '+56 9 0000 0000',
  chargeCategories: [],
  repairCategories: [],
  responsiblesList: []
} as SystemSettings;

const base = {
  id: 'GAR-HARDENING',
  propertyAddress: 'Prueba',
  propertyComuna: 'Providencia',
  propertyUnit: '1',
  ownerName: 'Propietario',
  ownerRut: '',
  ownerEmail: '',
  ownerPhone: '',
  tenantName: 'Arrendatario',
  tenantRut: '',
  tenantEmail: '',
  tenantPhone: '',
  monthlyRent: 500000,
  plan: 'FULL',
  contractStartDate: '',
  contractEndDate: '',
  guaranteeAmount: 500000,
  receptionDate: '11/08/2026',
  deadlineDate: '10/10/2026',
  alertDate: '25/09/2026',
  responsible: 'Usuario',
  initialNotes: '',
  preparationStatus: 'LISTA',
  liquidationStatus: 'LISTA',
  requirements: [],
  blockedBy: 'SIN_BLOQUEO',
  nextManagement: '',
  nextManagementDate: '',
  nextManagementResponsible: '',
  followUps: [],
  repairs: [],
  attachments: [],
  movements: [],
  ownerContribution: 0,
  fullCoverageApplied: 0,
  faunaFinancing: 0,
  charges: []
} as GuaranteeCase;

// Una reparación cancelada deja de cobrar al arrendatario y no consume garantía/Full.
const cancelled: GuaranteeCase = {
  ...base,
  charges: [{
    id: 'CHG-CANCELADA',
    category: 'REPARACIONES',
    description: 'Trabajo descartado',
    amount: 300000,
    date: '11/08/2026',
    type: 'DAÑO_REPARACION',
    notes: '',
    repairTracking: {
      provider: 'Maestro prueba',
      providerPhone: '+56 9 0000 0000',
      providerEmail: 'maestro@example.com',
      responsible: 'Usuario',
      status: 'CANCELADA',
      commitmentDate: '12/08/2026'
    },
    documents: [],
    photos: []
  }]
};
const cancelledFin = calculateGuaranteeFinances(cancelled, settings);
assert.equal(cancelledFin.grossCharges, 0);
assert.equal(cancelledFin.damageCharges, 0);
assert.equal(cancelledFin.fullCoverageApplied, 0);
assert.equal(cancelledFin.refundToTenant, 500000);

// “Otro” tiene una semántica conservadora: si se registra como type OTRO, no recibe
// cobertura de daños. Los daños siempre deben ingresarse como DAÑO_REPARACION.
const miscellaneous: GuaranteeCase = {
  ...base,
  charges: [{
    id: 'CHG-OTRO',
    category: 'OTRO',
    description: 'Cargo misceláneo no asociado a reparación',
    amount: 600000,
    date: '11/08/2026',
    type: 'OTRO',
    notes: '',
    documents: [],
    photos: []
  }]
};
const otherFin = calculateGuaranteeFinances(miscellaneous, settings);
assert.equal(otherFin.damageCharges, 0);
assert.equal(otherFin.serviceCharges, 600000);
assert.equal(otherFin.fullCoverageApplied, 0);

// Un saldo de servicios informado al propietario no bloquea el cierre de la garantía.
const ownerServicesPending: GuaranteeCase = {
  ...base,
  plan: 'ESTANDAR',
  liquidationStatus: 'EMITIDA',
  guaranteeAmount: 400000,
  receivableStatus: 'INCOBRABLE',
  charges: [
    {
      id: 'CHG-DANO-CUBIERTO', category: 'REPARACIONES', description: 'Daño cubierto', amount: 400000,
      date: '11/08/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    },
    {
      id: 'CHG-SERVICIO-PENDIENTE', category: 'GASTOS_COMUNES', description: 'GC final', amount: 200000,
      date: '11/08/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
    }
  ]
};
assert.equal(isCaseCompleted(ownerServicesPending, settings), true);
assert.equal(isCaseCompleted({
  ...ownerServicesPending,
  ownerServiceDeferral: {
    amountAtDeferral: 200000,
    reason: 'Propietario pagará al ingresar un nuevo arrendatario',
    nextReviewDate: '15/09/2026',
    responsible: 'Usuario',
    createdAt: '2026-08-11T23:00:00.000Z',
    createdBy: 'ADMINISTRADOR'
  }
}, settings), true);

assert.equal(isCaseCompleted({
  ...ownerServicesPending,
  isClosed: true,
  ownerPostClosePending: {
    amountAtTransfer: 200000,
    reason: 'Propietario pagará al ingresar un nuevo arrendatario',
    nextReviewDate: '15/09/2026',
    responsible: 'Usuario',
    transferredAt: '2026-08-12T03:00:00.000Z',
    transferredBy: 'ADMINISTRADOR',
    status: 'PENDIENTE'
  }
}, settings), true);

// Un seguimiento legacy tampoco debe impedir completar una garantía ya emitida.
const postCloseOnly = {
  ...ownerServicesPending,
  isClosed: false,
  ownerPostClosePending: {
    amountAtTransfer: 200000,
    reason: 'Pendiente previo',
    nextReviewDate: '15/09/2026',
    responsible: 'Usuario',
    transferredAt: '2026-08-12T03:00:00.000Z',
    transferredBy: 'ADMINISTRADOR',
    status: 'PENDIENTE' as const
  }
};
assert.equal(isCaseCompleted(postCloseOnly, settings), true);

// Si la cobranza ya es incobrable y el propietario asume servicios, el pago cubre
// la obligación operativa aunque no quede un monto recuperable para el propietario.
const ownerCostAfterWriteOff = {
  ...ownerServicesPending,
  ownerContribution: 0,
  movements: [
    {
      id: 'MOV-PROP-POST', caseId: ownerServicesPending.id, date: '12/08/2026', time: '10:00',
      type: 'APORTE_PROPIETARIO' as const, ownerPaymentPurpose: 'SERVICIOS' as const,
      ownerPaymentMode: 'PAGADO_DIRECTO' as const, description: 'Pago servicios', amount: 200000,
      user: 'Usuario', reference: 'POST', observation: ''
    },
    {
      id: 'MOV-CAST-POST', caseId: ownerServicesPending.id, date: '12/08/2026', time: '10:00',
      type: 'CASTIGO_PROPIETARIO' as const, description: 'Costo definitivo propietario', amount: 200000,
      user: 'Usuario', reference: 'CAST', observation: ''
    }
  ]
};
assert.equal(calculateFundingReadiness(ownerCostAfterWriteOff, settings).ownerServicePending, 0);
assert.equal(isCaseCompleted(ownerCostAfterWriteOff, settings), true);

// Fechas de calendario: YYYY-MM-DD se interpreta localmente y los ISO completos se formatean bien.
const localSample = new Date(2026, 7, 12, 23, 30, 0);
assert.equal(getLocalDateInputValue(localSample), '2026-08-12');
assert.equal(parseLocalDate('2026-08-12')?.getDate(), 12);
assert.equal(formatDate('2026-08-12T03:00:00.000Z'), '12/08/2026');

// Los diferimientos legacy cerrados ya no se migran a seguimiento posterior si el saldo
// de servicios dejó de ser una tarea operacional de la garantía.
const legacyClosedDeferred = {
  ...ownerServicesPending,
  isClosed: true,
  closedBy: 'ADMINISTRADOR',
  ownerServiceDeferral: {
    amountAtDeferral: 200000,
    reason: 'Pagar al próximo arriendo',
    nextReviewDate: '15/09/2026',
    responsible: 'Usuario',
    createdAt: '2026-08-12T01:00:00.000Z',
    createdBy: 'ADMINISTRADOR'
  }
};
const migratedClosed = normalizeClosedOwnerPending(legacyClosedDeferred);
assert.equal(migratedClosed.ownerServiceDeferral?.amountAtDeferral, 200000);
assert.equal(migratedClosed.ownerPostClosePending, undefined);
assert.equal(isCaseCompleted(migratedClosed, settings), true);

// Confirmar la liquidación exige que la preparación física esté lista.
assert.equal(canConfirmGuaranteeLiquidation({ ...base, preparationStatus: 'REPARANDO' }, settings), false);
assert.equal(canConfirmGuaranteeLiquidation({ ...base, preparationStatus: 'LISTA' }, settings), true);

// Un resultado emitido con devolución no puede completarse si falta registrar la transferencia.
const emittedSurplus = {
  ...base,
  liquidationStatus: 'EMITIDA' as const,
  guaranteeAmount: 500000,
  charges: [{
    id: 'CHG-SURPLUS', category: 'GASTOS_COMUNES' as const, description: 'Cargo final', amount: 400000,
    date: '12/08/2026', type: 'GASTO_COMUN' as const, notes: '', documents: [], photos: []
  }],
  refund: undefined,
  receivableStatus: undefined
};
assert.equal(isCaseCompleted(emittedSurplus, settings), false);
assert.equal(isCaseCompleted({
  ...emittedSurplus,
  refund: { amount: 100000, status: 'TRANSFERIDA' as const }
}, settings), true);

// Un déficit emitido tampoco puede completarse si, por inconsistencia, falta su estado de cobranza.
const deferredOwnerServices = {
  amountAtDeferral: 200000,
  reason: 'Pago posterior',
  nextReviewDate: '15/09/2026',
  responsible: 'Usuario',
  createdAt: '2026-08-12T01:00:00.000Z',
  createdBy: 'ADMINISTRADOR'
};
assert.equal(isCaseCompleted({
  ...ownerServicesPending,
  receivableStatus: undefined,
  ownerServiceDeferral: deferredOwnerServices
}, settings), false);

console.log('✓ Reglas de hardening, confirmación, acciones financieras, fechas, migraciones e incobrables validadas');
