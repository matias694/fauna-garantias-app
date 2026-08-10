import assert from 'node:assert/strict';
import { isCaseCompleted } from '../context/AppContext';
import { calculateFundingReadiness } from '../utils/calculations';
import type { GuaranteeCase } from '../types';

const baseCase: GuaranteeCase = {
  id: 'GAR-COBRANZA-TEST',
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
  plan: 'FULL',
  contractStartDate: '01/01/2025',
  contractEndDate: '01/01/2026',
  guaranteeAmount: 400000,
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
  charges: [
    {
      id: 'CHG-DANO', category: 'REPARACIONES', description: 'Daños', amount: 800000,
      date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    },
    {
      id: 'CHG-SERV', category: 'GASTOS_COMUNES', description: 'Gastos comunes', amount: 100000,
      date: '01/07/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
    }
  ],
  attachments: [],
  movements: [
    {
      id: 'MOV-FULL', caseId: 'GAR-COBRANZA-TEST', date: '01/07/2026', time: '10:00',
      type: 'FINANCIAMIENTO_FAUNA', description: 'Cobertura Full ejecutada', amount: 400000,
      user: 'Usuario de prueba', reference: 'FULL', observation: ''
    }
  ],
  ownerContribution: 0,
  fullCoverageApplied: 400000,
  faunaFinancing: 0,
  receivableStatus: 'PAGADA',
  isClosed: false
};

// Una cuenta del arrendatario pagada no basta para cerrar si GC/servicios siguen a cargo del propietario.
assert.equal(isCaseCompleted(baseCase), false);

// Si el propietario paga ese saldo, la obligación de servicios queda regularizada y el caso puede completar.
const withOwnerServicePayment: GuaranteeCase = {
  ...baseCase,
  ownerContribution: 100000,
  movements: [
    ...baseCase.movements,
    {
      id: 'MOV-PROP', caseId: 'GAR-COBRANZA-TEST', date: '02/07/2026', time: '10:00',
      type: 'APORTE_PROPIETARIO', description: 'Pago de servicios', amount: 100000,
      user: 'Usuario de prueba', reference: 'PAGO-SERVICIOS', observation: ''
    }
  ]
};
assert.equal(isCaseCompleted(withOwnerServicePayment), true);

// También puede regularizarse si el pago posterior del arrendatario cubre el tramo no financiado.
const withTenantSettlement: GuaranteeCase = {
  ...baseCase,
  movements: [
    ...baseCase.movements,
    {
      id: 'MOV-SALDO', caseId: 'GAR-COBRANZA-TEST', date: '02/07/2026', time: '10:00',
      type: 'SALDO_PAGO_ARRENDATARIO', description: 'Saldo aplicado a servicios', amount: 100000,
      user: 'Usuario de prueba', reference: 'SALDO', observation: ''
    }
  ]
};
assert.equal(isCaseCompleted(withTenantSettlement), true);

// Escenario equivalente a GAR-0002 bajo las reglas vigentes:
// Estándar, garantía $700.000, daños $700.000, servicios $350.000.
// Propietario adelanta $100.000 y el arrendatario luego paga los $350.000 completos.
// El pago recupera primero los $100.000 del propietario y los $250.000 restantes
// regularizan servicios. No existe financiamiento Fauna en un plan Estándar.
const standardPaidCase: GuaranteeCase = {
  ...baseCase,
  id: 'GAR-STANDARD-PAGADA',
  plan: 'ESTANDAR',
  guaranteeAmount: 700000,
  fullCoverageApplied: 0,
  faunaFinancing: 0,
  ownerContribution: 0,
  charges: [
    {
      id: 'STD-DANO', category: 'REPARACIONES', description: 'Daños', amount: 700000,
      date: '01/07/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    },
    {
      id: 'STD-SERV', category: 'GASTOS_COMUNES', description: 'Servicios', amount: 350000,
      date: '01/07/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
    }
  ],
  movements: [
    {
      id: 'STD-APORTE', caseId: 'GAR-STANDARD-PAGADA', date: '01/07/2026', time: '10:00',
      type: 'APORTE_PROPIETARIO', description: 'Aporte propietario', amount: 100000,
      user: 'Usuario de prueba', reference: 'APORTE', observation: ''
    },
    {
      id: 'STD-PAGO', caseId: 'GAR-STANDARD-PAGADA', date: '02/07/2026', time: '10:00',
      type: 'PAGO_ARRENDATARIO', description: 'Pago total arrendatario', amount: 350000,
      user: 'Usuario de prueba', reference: 'PAGO', observation: ''
    },
    {
      id: 'STD-REC-PROP', caseId: 'GAR-STANDARD-PAGADA', date: '02/07/2026', time: '10:01',
      type: 'RECUPERACION_PROPIETARIO', description: 'Recuperación propietario', amount: 100000,
      user: 'Usuario de prueba', reference: 'REC-PROP', observation: ''
    },
    {
      id: 'STD-SALDO', caseId: 'GAR-STANDARD-PAGADA', date: '02/07/2026', time: '10:02',
      type: 'SALDO_PAGO_ARRENDATARIO', description: 'Saldo aplicado a servicios', amount: 250000,
      user: 'Usuario de prueba', reference: 'SALDO', observation: ''
    }
  ],
  receivableStatus: 'PAGADA'
};

const standardReadiness = calculateFundingReadiness(standardPaidCase, {} as never);
assert.equal(standardReadiness.ownerServiceRequired, 350000);
assert.equal(standardReadiness.ownerServiceFundedTotal, 100000);
assert.equal(standardReadiness.ownerServiceSettledFromTenant, 250000);
assert.equal(standardReadiness.ownerServicePending, 0);
assert.equal(isCaseCompleted(standardPaidCase), true);
assert.equal(standardPaidCase.movements.some(m => m.type === 'FINANCIAMIENTO_FAUNA' || m.type === 'RECUPERACION_FAUNA'), false);

console.log('✓ Reglas de cobranza y cierre financiero validadas: 4 escenarios OK');
