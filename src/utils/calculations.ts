import { Charge, GuaranteeCase, SystemSettings } from '../types';

export interface FinancialCalculationResult {
  guaranteeAmount: number;
  grossCharges: number;
  tenantCredits: number;
  totalCharges: number;
  damageCharges: number;
  serviceCharges: number;
  rawBalance: number;
  guaranteeUsed: number;
  guaranteeForDamage: number;
  guaranteeForServices: number;
  creditsForServices: number;
  creditsForDamage: number;
  creditsForFaunaRecovery: number;
  tenantCreditsUnapplied: number;
  isSurplus: boolean;
  isExact: boolean;
  isInsufficient: boolean;
  refundToTenant: number;
  tenantDeficit: number;
  fullCoverageLimit: number;
  fullCoverageApplied: number;
  ownerRepairFundingRequired: number;
  ownerServiceObligation: number;
  ownerContributionRequired: number;
  faunaFinancingRequired: number;
  tenantReceivableAmount: number;
}

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

export function isChargeIncludedInLiquidation(ch: Charge): boolean {
  if (ch.amount < 0) return true;
  if (ch.amount <= 0) return false;
  if (ch.type === 'DAÑO_REPARACION' && ch.repairTracking?.status === 'CANCELADA') return false;
  return true;
}

export function calculateGuaranteeFinances(
  c: GuaranteeCase,
  _settings: SystemSettings
): FinancialCalculationResult {
  const guaranteeAmount = Math.max(0, c.guaranteeAmount || 0);

  let damageCharges = 0;
  let serviceCharges = 0;
  let tenantCredits = 0;

  (c.charges || []).forEach(ch => {
    if (!isChargeIncludedInLiquidation(ch)) return;
    const amount = Number(ch.amount) || 0;

    if (amount < 0) {
      tenantCredits += Math.abs(amount);
      return;
    }

    if (ch.type === 'DAÑO_REPARACION') damageCharges += amount;
    else serviceCharges += amount;
  });

  const grossCharges = damageCharges + serviceCharges;
  const totalCharges = grossCharges - tenantCredits;
  const rawBalance = guaranteeAmount + tenantCredits - grossCharges;
  const isSurplus = rawBalance > 0;
  const isExact = rawBalance === 0;
  const isInsufficient = rawBalance < 0;
  const refundToTenant = isSurplus ? rawBalance : 0;
  const tenantDeficit = isInsufficient ? Math.abs(rawBalance) : 0;

  const guaranteeForDamage = Math.min(guaranteeAmount, damageCharges);
  const guaranteeRemainingAfterDamage = Math.max(0, guaranteeAmount - guaranteeForDamage);
  const damageAfterGuarantee = Math.max(0, damageCharges - guaranteeForDamage);

  const fullCoverageLimit = c.plan === 'FULL' ? guaranteeAmount : 0;
  const fullCoverageApplied = c.plan === 'FULL'
    ? Math.min(fullCoverageLimit, damageAfterGuarantee)
    : 0;
  const damageAfterGuaranteeAndFull = Math.max(0, damageAfterGuarantee - fullCoverageApplied);

  const guaranteeForServices = Math.min(guaranteeRemainingAfterDamage, serviceCharges);
  const servicesAfterGuarantee = Math.max(0, serviceCharges - guaranteeForServices);

  const creditsForServices = Math.min(tenantCredits, servicesAfterGuarantee);
  let creditsRemaining = Math.max(0, tenantCredits - creditsForServices);
  const ownerServiceObligation = Math.max(0, servicesAfterGuarantee - creditsForServices);

  const creditsForDamage = Math.min(creditsRemaining, damageAfterGuaranteeAndFull);
  creditsRemaining -= creditsForDamage;
  const ownerRepairFundingRequired = Math.max(0, damageAfterGuaranteeAndFull - creditsForDamage);

  const creditsForFaunaRecovery = Math.min(creditsRemaining, fullCoverageApplied);
  creditsRemaining -= creditsForFaunaRecovery;
  const faunaFinancingRequired = Math.max(0, fullCoverageApplied - creditsForFaunaRecovery);
  const tenantCreditsUnapplied = creditsRemaining;

  const guaranteeUsed = guaranteeForDamage + guaranteeForServices;
  const ownerContributionRequired = ownerRepairFundingRequired + ownerServiceObligation;
  const tenantReceivableAmount = tenantDeficit;

  return {
    guaranteeAmount,
    grossCharges,
    tenantCredits,
    totalCharges,
    damageCharges,
    serviceCharges,
    rawBalance,
    guaranteeUsed,
    guaranteeForDamage,
    guaranteeForServices,
    creditsForServices,
    creditsForDamage,
    creditsForFaunaRecovery,
    tenantCreditsUnapplied,
    isSurplus,
    isExact,
    isInsufficient,
    refundToTenant,
    tenantDeficit,
    fullCoverageLimit,
    fullCoverageApplied,
    ownerRepairFundingRequired,
    ownerServiceObligation,
    ownerContributionRequired,
    faunaFinancingRequired,
    tenantReceivableAmount
  };
}

const sumPositiveMovements = (c: GuaranteeCase, type: GuaranteeCase['movements'][number]['type']) =>
  (c.movements || [])
    .filter(m => m.type === type)
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

export function calculateFundingReadiness(
  c: GuaranteeCase,
  settings: SystemSettings
): FundingReadiness {
  const fin = calculateGuaranteeFinances(c, settings);

  const ownerMovements = (c.movements || []).filter(m => m.type === 'APORTE_PROPIETARIO');
  const ownerRecoveries = sumPositiveMovements(c, 'RECUPERACION_PROPIETARIO');

  const explicitRepair = ownerMovements
    .filter(m => m.ownerPaymentPurpose === 'REPARACIONES')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);
  const explicitServices = ownerMovements
    .filter(m => m.ownerPaymentPurpose === 'SERVICIOS')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);
  const legacyOwnerFunds = ownerMovements
    .filter(m => !m.ownerPaymentPurpose)
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

  const ownerMovementsTotal = explicitRepair + explicitServices + legacyOwnerFunds;
  const reconstructedLegacyTotal = Math.max(0, (c.ownerContribution || 0) + ownerRecoveries);
  const ownerProvisionedTotal = ownerMovementsTotal > 0 ? ownerMovementsTotal : reconstructedLegacyTotal;

  const ownerRepairRequired = fin.ownerRepairFundingRequired;
  const repairFromExplicit = Math.min(explicitRepair, ownerRepairRequired);
  const repairLegacyCapacity = Math.max(0, ownerRepairRequired - repairFromExplicit);
  const repairFromLegacy = Math.min(legacyOwnerFunds || (ownerMovementsTotal === 0 ? reconstructedLegacyTotal : 0), repairLegacyCapacity);
  const ownerRepairFundedTotal = repairFromExplicit + repairFromLegacy;
  const ownerRepairPendingProvision = Math.max(0, ownerRepairRequired - ownerRepairFundedTotal);

  const ownerServiceRequired = fin.ownerServiceObligation;
  const legacyPool = ownerMovementsTotal > 0 ? legacyOwnerFunds : reconstructedLegacyTotal;
  const legacyRemainingAfterRepairs = Math.max(0, legacyPool - repairFromLegacy);
  const ownerServiceFundedTotal = Math.min(
    ownerServiceRequired,
    explicitServices + legacyRemainingAfterRepairs
  );

  const tenantUnallocatedPayments = sumPositiveMovements(c, 'SALDO_PAGO_ARRENDATARIO');
  const ownerServiceSettledFromTenant = Math.min(
    Math.max(0, ownerServiceRequired - ownerServiceFundedTotal),
    tenantUnallocatedPayments
  );
  const rawOwnerServicePending = Math.max(
    0,
    ownerServiceRequired - ownerServiceFundedTotal - ownerServiceSettledFromTenant
  );

  // Los servicios no financiados por Fauna son informativos: una vez emitida la
  // liquidación ya no generan una tarea pendiente ni bloquean el cierre del caso.
  const ownerServicePending = c.liquidationStatus === 'EMITIDA' ? 0 : rawOwnerServicePending;

  const fullCoverageExecutionMovements = sumPositiveMovements(c, 'FINANCIAMIENTO_FAUNA');
  const faunaRecoveries = sumPositiveMovements(c, 'RECUPERACION_FAUNA');
  const fullCoverageExecutedTotal = fullCoverageExecutionMovements > 0
    ? fullCoverageExecutionMovements
    : Math.max(0, (c.faunaFinancing || 0) + faunaRecoveries);

  const fullCoverageRequired = fin.faunaFinancingRequired;
  const fullCoveragePendingExecution = Math.max(0, fullCoverageRequired - fullCoverageExecutedTotal);
  const ownerPendingProvision = ownerRepairPendingProvision + ownerServicePending;

  return {
    ownerRequired: fin.ownerContributionRequired,
    ownerProvisionedTotal,
    ownerPendingProvision,
    ownerRepairRequired,
    ownerRepairFundedTotal,
    ownerRepairPendingProvision,
    ownerServiceRequired,
    ownerServiceFundedTotal,
    ownerServiceSettledFromTenant,
    ownerServicePending,
    fullCoverageRequired,
    fullCoverageExecutedTotal,
    fullCoveragePendingExecution,
    readyToConfirm: ownerRepairPendingProvision === 0
  };
}

export function canConfirmGuaranteeLiquidation(
  c: GuaranteeCase,
  settings: SystemSettings
): boolean {
  if (c.liquidationStatus !== 'LISTA') return false;
  if (c.preparationStatus !== 'LISTA') return false;
  if (c.blockedBy !== 'SIN_BLOQUEO') return false;
  return calculateFundingReadiness(c, settings).readyToConfirm;
}

export function calculateOwnerLiquidationReconciliation(
  c: GuaranteeCase,
  settings: SystemSettings
): OwnerLiquidationReconciliation {
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);

  const ownerContributionFundedTotal = readiness.ownerProvisionedTotal;
  const ownerContributionApplied = readiness.ownerRepairFundedTotal + readiness.ownerServiceFundedTotal;
  const ownerContributionPending = readiness.ownerRepairPendingProvision + readiness.ownerServicePending;

  const reconciliationBalance =
    fin.guaranteeAmount
    - fin.totalCharges
    + fin.faunaFinancingRequired
    + ownerContributionApplied
    - fin.refundToTenant;

  return {
    ownerContributionRequired: fin.ownerContributionRequired,
    ownerContributionFundedTotal,
    ownerContributionApplied,
    ownerContributionPending,
    ownerRepairFundingRequired: fin.ownerRepairFundingRequired,
    ownerRepairPending: readiness.ownerRepairPendingProvision,
    ownerServiceObligation: fin.ownerServiceObligation,
    ownerServicePending: readiness.ownerServicePending,
    refundToTenant: fin.refundToTenant,
    reconciliationBalance
  };
}

export function calculatePaymentDistribution(
  paymentAmount: number,
  ownerContributionToRecover: number,
  faunaFinancingToRecover: number
) {
  let remainingPayment = Math.max(0, paymentAmount);

  const ownerRecovery = Math.min(remainingPayment, ownerContributionToRecover);
  remainingPayment -= ownerRecovery;

  const faunaRecovery = Math.min(remainingPayment, faunaFinancingToRecover);
  remainingPayment -= faunaRecovery;

  const surplusPayment = remainingPayment;

  return {
    paymentAmount,
    ownerRecovery,
    faunaRecovery,
    remainingOwnerContribution: ownerContributionToRecover - ownerRecovery,
    remainingFaunaFinancing: faunaFinancingToRecover - faunaRecovery,
    surplusPayment
  };
}
