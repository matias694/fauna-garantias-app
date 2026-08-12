import assert from 'node:assert/strict';
import type { GuaranteeCase, SystemSettings } from '../types';
import { calculateGuaranteeFinances } from '../utils/calculations';
import { isCaseCompleted } from '../context/AppContext';

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

// Un saldo de servicios del propietario puede cerrarse operacionalmente solo si existe un diferimiento explícito.
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
assert.equal(isCaseCompleted(ownerServicesPending, settings), false);
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

console.log('✓ Reglas de hardening, cargos y diferimiento de pendientes propietario validadas');
