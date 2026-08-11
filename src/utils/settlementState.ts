import { GuaranteeCase, Receivable, SystemSettings } from '../types';
import { calculateGuaranteeFinances } from './calculations';

export type SettlementStateKind =
  | 'PENDING_LIQUIDATION'
  | 'REFUND_PENDING'
  | 'REFUND_TRANSFERRED'
  | 'NO_BALANCE'
  | 'RECEIVABLE_PENDING'
  | 'RECEIVABLE_PARTIAL'
  | 'RECEIVABLE_PAID'
  | 'RECEIVABLE_UNCOLLECTIBLE';

export interface SettlementState {
  kind: SettlementStateKind;
  originalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  projectedAmount: number;
}

/**
 * Devuelve el estado ACTUAL posterior a la liquidación.
 * El resultado financiero original no cambia, pero una deuda puede pasar de
 * pendiente a parcial, pagada o incobrable, y una devolución puede transferirse.
 */
export function getSettlementState(
  guaranteeCase: GuaranteeCase,
  receivable: Receivable | undefined,
  settings: SystemSettings
): SettlementState {
  const fin = calculateGuaranteeFinances(guaranteeCase, settings);

  if (guaranteeCase.liquidationStatus !== 'EMITIDA') {
    return {
      kind: 'PENDING_LIQUIDATION',
      originalAmount: fin.tenantDeficit,
      paidAmount: 0,
      pendingAmount: fin.tenantDeficit,
      projectedAmount: fin.isSurplus ? fin.refundToTenant : fin.tenantDeficit
    };
  }

  if (fin.isSurplus) {
    return {
      kind: guaranteeCase.refund?.status === 'TRANSFERIDA' ? 'REFUND_TRANSFERRED' : 'REFUND_PENDING',
      originalAmount: fin.refundToTenant,
      paidAmount: guaranteeCase.refund?.status === 'TRANSFERIDA' ? fin.refundToTenant : 0,
      pendingAmount: guaranteeCase.refund?.status === 'TRANSFERIDA' ? 0 : fin.refundToTenant,
      projectedAmount: fin.refundToTenant
    };
  }

  if (fin.isExact) {
    return {
      kind: 'NO_BALANCE',
      originalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      projectedAmount: 0
    };
  }

  const status = receivable?.status || guaranteeCase.receivableStatus || 'PENDIENTE';
  const originalAmount = receivable?.originalAmount ?? fin.tenantDeficit;
  const paidAmount = receivable?.totalPaid ?? (status === 'PAGADA' ? originalAmount : 0);
  const pendingAmount = receivable?.pendingBalance ?? (status === 'PAGADA' ? 0 : originalAmount);

  if (status === 'PAGADA') {
    return {
      kind: 'RECEIVABLE_PAID',
      originalAmount,
      paidAmount,
      pendingAmount: 0,
      projectedAmount: fin.tenantDeficit
    };
  }

  if (status === 'INCOBRABLE') {
    return {
      kind: 'RECEIVABLE_UNCOLLECTIBLE',
      originalAmount,
      paidAmount,
      pendingAmount,
      projectedAmount: fin.tenantDeficit
    };
  }

  return {
    kind: status === 'PAGO_PARCIAL' ? 'RECEIVABLE_PARTIAL' : 'RECEIVABLE_PENDING',
    originalAmount,
    paidAmount,
    pendingAmount,
    projectedAmount: fin.tenantDeficit
  };
}
