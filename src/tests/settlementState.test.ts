import assert from 'node:assert/strict';
import { getSettlementState } from '../utils/settlementState';
import type { GuaranteeCase, Receivable, SystemSettings } from '../types';

const settings = {} as SystemSettings;

const insufficientCase = {
  id: 'GAR-STATE-1',
  liquidationStatus: 'EMITIDA',
  guaranteeAmount: 700000,
  plan: 'ESTANDAR',
  charges: [
    {
      id: 'D', category: 'REPARACIONES', description: 'Daños', amount: 700000,
      date: '01/08/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    },
    {
      id: 'S', category: 'GASTOS_COMUNES', description: 'Servicios', amount: 350000,
      date: '01/08/2026', type: 'GASTO_COMUN', notes: '', documents: [], photos: []
    }
  ]
} as GuaranteeCase;

const paidReceivable = {
  caseId: 'GAR-STATE-1',
  originalAmount: 350000,
  totalPaid: 350000,
  pendingBalance: 0,
  status: 'PAGADA'
} as Receivable;

const paidState = getSettlementState(insufficientCase, paidReceivable, settings);
assert.equal(paidState.kind, 'RECEIVABLE_PAID');
assert.equal(paidState.originalAmount, 350000);
assert.equal(paidState.paidAmount, 350000);
assert.equal(paidState.pendingAmount, 0);

const partialState = getSettlementState(insufficientCase, {
  ...paidReceivable,
  totalPaid: 150000,
  pendingBalance: 200000,
  status: 'PAGO_PARCIAL'
}, settings);
assert.equal(partialState.kind, 'RECEIVABLE_PARTIAL');
assert.equal(partialState.paidAmount, 150000);
assert.equal(partialState.pendingAmount, 200000);

const refundCase = {
  ...insufficientCase,
  id: 'GAR-STATE-2',
  guaranteeAmount: 500000,
  charges: [
    {
      id: 'R', category: 'REPARACIONES', description: 'Daños', amount: 200000,
      date: '01/08/2026', type: 'DAÑO_REPARACION', notes: '', documents: [], photos: []
    }
  ],
  refund: { amount: 300000, status: 'TRANSFERIDA' }
} as GuaranteeCase;

const refundState = getSettlementState(refundCase, undefined, settings);
assert.equal(refundState.kind, 'REFUND_TRANSFERRED');
assert.equal(refundState.originalAmount, 300000);
assert.equal(refundState.pendingAmount, 0);

console.log('✓ Estado vigente posterior a liquidación: 3 escenarios OK');
