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
 * Una vez emitida, el monto original proviene del snapshot y no se recalcula con
 * fórmulas futuras. La cobranza sí sigue evolucionando mediante Receivable.
 */
export function getSettlementState(
  guaranteeCase: GuaranteeCase,
  receivable: Receivable | undefined,
  settings: SystemSettings
): SettlementState {
  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  const snapshot = guaranteeCase.liquidationSnapshot;
  const originalDeficit = snapshot?.financials.tenantDeficit ?? fin.tenantDeficit;
  const originalRefund = snapshot?.financials.refundToTenant ?? fin.refundToTenant;

  if (guaranteeCase.liquidationStatus !== 'EMITIDA') {
    return {
      kind: 'PENDING_LIQUIDATION',
      originalAmount: fin.tenantDeficit,
      paidAmount: 0,
      pendingAmount: fin.tenantDeficit,
      projectedAmount: fin.isSurplus ? fin.refundToTenant : fin.tenantDeficit
    };
  }

  if (originalRefund > 0) {
    return {
      kind: guaranteeCase.refund?.status === 'TRANSFERIDA' ? 'REFUND_TRANSFERRED' : 'REFUND_PENDING',
      originalAmount: originalRefund,
      paidAmount: guaranteeCase.refund?.status === 'TRANSFERIDA' ? originalRefund : 0,
      pendingAmount: guaranteeCase.refund?.status === 'TRANSFERIDA' ? 0 : originalRefund,
      projectedAmount: originalRefund
    };
  }

  if (originalDeficit <= 0) {
    return {
      kind: 'NO_BALANCE',
      originalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      projectedAmount: 0
    };
  }

  const status = receivable?.status || guaranteeCase.receivableStatus || 'PENDIENTE';
  const originalAmount = receivable?.originalAmount ?? originalDeficit;
  const paidAmount = receivable?.totalPaid ?? (status === 'PAGADA' ? originalAmount : 0);
  const pendingAmount = receivable?.pendingBalance ?? (status === 'PAGADA' ? 0 : originalAmount);

  if (status === 'PAGADA') {
    return {
      kind: 'RECEIVABLE_PAID',
      originalAmount,
      paidAmount,
      pendingAmount: 0,
      projectedAmount: originalDeficit
    };
  }

  if (status === 'INCOBRABLE') {
    return {
      kind: 'RECEIVABLE_UNCOLLECTIBLE',
      originalAmount,
      paidAmount,
      pendingAmount,
      projectedAmount: originalDeficit
    };
  }

  return {
    kind: status === 'PAGO_PARCIAL' ? 'RECEIVABLE_PARTIAL' : 'RECEIVABLE_PENDING',
    originalAmount,
    paidAmount,
    pendingAmount,
    projectedAmount: originalDeficit
  };
}
