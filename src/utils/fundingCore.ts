import { GuaranteeCase, SystemSettings } from '../types';
import { calculateGuaranteeFinances } from './financialCore';

export interface FundingReadiness {
  ownerRequired: number;
  ownerProvisionedTotal: number;
  ownerPendingProvision: number;
  ownerRepairRequired: number;
  ownerRepairFundedTotal: number;
  ownerRepairPendingProvision: number;
  ownerServiceRequired: number;
  ownerServiceFundedTotal: number;
  ownerServiceSettledFromTenant: number;
  ownerServicePending: number;
  ownerServiceInformationalPending: number;
  fullCoverageRequired: number;
  fullCoverageExecutedTotal: number;
  fullCoveragePendingExecution: number;
  readyToConfirm: boolean;
}

export interface OwnerLiquidationReconciliation {
  ownerContributionRequired: number;
  ownerContributionFundedTotal: number;
  ownerContributionApplied: number;
  ownerContributionPending: number;
  ownerRepairFundingRequired: number;
  ownerRepairPending: number;
  ownerServiceObligation: number;
  ownerServicePending: number;
  refundToTenant: number;
  reconciliationBalance: number;
}

const sum = (c: GuaranteeCase, type: GuaranteeCase['movements'][number]['type']) =>
  (c.movements || []).filter(m => m.type === type).reduce((s, m) => s + Math.max(0, m.amount), 0);

export function calculateFundingReadiness(c: GuaranteeCase, settings: SystemSettings): FundingReadiness {
  const fin = calculateGuaranteeFinances(c, settings);
  const ownerMovements = (c.movements || []).filter(m => m.type === 'APORTE_PROPIETARIO');
  const explicitRepair = ownerMovements
    .filter(m => m.ownerPaymentPurpose === 'REPARACIONES')
    .reduce((s, m) => s + Math.max(0, m.amount), 0);
  const explicitServices = ownerMovements
    .filter(m => m.ownerPaymentPurpose === 'SERVICIOS')
    .reduce((s, m) => s + Math.max(0, m.amount), 0);
  const legacy = ownerMovements
    .filter(m => !m.ownerPaymentPurpose)
    .reduce((s, m) => s + Math.max(0, m.amount), 0);
  const recoveries = sum(c, 'RECUPERACION_PROPIETARIO');
  const reconstructed = Math.max(0, (c.ownerContribution || 0) + recoveries);
  const movementTotal = explicitRepair + explicitServices + legacy;
  const ownerProvisionedTotal = movementTotal > 0 ? movementTotal : reconstructed;

  const repairLegacy = Math.min(
    legacy || (movementTotal === 0 ? reconstructed : 0),
    Math.max(0, fin.ownerRepairFundingRequired - explicitRepair)
  );
  const ownerRepairFundedTotal = Math.min(fin.ownerRepairFundingRequired, explicitRepair + repairLegacy);
  const ownerRepairPendingProvision = Math.max(0, fin.ownerRepairFundingRequired - ownerRepairFundedTotal);

  const serviceLegacy = Math.max(0, (movementTotal > 0 ? legacy : reconstructed) - repairLegacy);
  const ownerServiceFundedTotal = Math.min(fin.ownerServiceObligation, explicitServices + serviceLegacy);
  const ownerServiceSettledFromTenant = Math.min(
    Math.max(0, fin.ownerServiceObligation - ownerServiceFundedTotal),
    sum(c, 'SALDO_PAGO_ARRENDATARIO')
  );
  const ownerServiceInformationalPending = Math.max(
    0,
    fin.ownerServiceObligation - ownerServiceFundedTotal - ownerServiceSettledFromTenant
  );

  const executed = sum(c, 'FINANCIAMIENTO_FAUNA');
  const faunaRecoveries = sum(c, 'RECUPERACION_FAUNA');
  const fullCoverageExecutedTotal = executed > 0 ? executed : Math.max(0, (c.faunaFinancing || 0) + faunaRecoveries);
  const fullCoveragePendingExecution = Math.max(0, fin.faunaFinancingRequired - fullCoverageExecutedTotal);

  return {
    ownerRequired: fin.ownerContributionRequired,
    ownerProvisionedTotal,
    ownerPendingProvision: ownerRepairPendingProvision,
    ownerRepairRequired: fin.ownerRepairFundingRequired,
    ownerRepairFundedTotal,
    ownerRepairPendingProvision,
    ownerServiceRequired: fin.ownerServiceObligation,
    ownerServiceFundedTotal,
    ownerServiceSettledFromTenant,
    ownerServicePending: 0,
    ownerServiceInformationalPending,
    fullCoverageRequired: fin.faunaFinancingRequired,
    fullCoverageExecutedTotal,
    fullCoveragePendingExecution,
    readyToConfirm: ownerRepairPendingProvision === 0
  };
}

export function canConfirmGuaranteeLiquidation(c: GuaranteeCase, settings: SystemSettings): boolean {
  return c.liquidationStatus === 'LISTA'
    && c.preparationStatus === 'LISTA'
    && c.blockedBy === 'SIN_BLOQUEO'
    && calculateFundingReadiness(c, settings).readyToConfirm;
}

export function calculateOwnerLiquidationReconciliation(c: GuaranteeCase, settings: SystemSettings): OwnerLiquidationReconciliation {
  const fin = calculateGuaranteeFinances(c, settings);
  const r = calculateFundingReadiness(c, settings);
  const ownerContributionApplied = r.ownerRepairFundedTotal;
  return {
    ownerContributionRequired: fin.ownerContributionRequired,
    ownerContributionFundedTotal: r.ownerProvisionedTotal,
    ownerContributionApplied,
    ownerContributionPending: r.ownerRepairPendingProvision,
    ownerRepairFundingRequired: fin.ownerRepairFundingRequired,
    ownerRepairPending: r.ownerRepairPendingProvision,
    ownerServiceObligation: fin.ownerServiceObligation,
    ownerServicePending: r.ownerServiceInformationalPending,
    refundToTenant: fin.refundToTenant,
    reconciliationBalance: fin.guaranteeAmount - fin.totalCharges + fin.faunaFinancingRequired + ownerContributionApplied - fin.refundToTenant
  };
}

export function calculatePaymentDistribution(paymentAmount: number, ownerContributionToRecover: number, faunaFinancingToRecover: number) {
  let remaining = Math.max(0, paymentAmount);
  const ownerRecovery = Math.min(remaining, ownerContributionToRecover);
  remaining -= ownerRecovery;
  const faunaRecovery = Math.min(remaining, faunaFinancingToRecover);
  remaining -= faunaRecovery;
  return {
    paymentAmount,
    ownerRecovery,
    faunaRecovery,
    remainingOwnerContribution: ownerContributionToRecover - ownerRecovery,
    remainingFaunaFinancing: faunaFinancingToRecover - faunaRecovery,
    surplusPayment: remaining
  };
}
