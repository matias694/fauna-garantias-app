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

  // Solo se cobra lo que fue desembolsado para cubrir danos.
  const ownerContributionRequired = ownerRepairFundingRequired;
  const tenantReceivableAmount = ownerRepairFundingRequired + faunaFinancingRequired;

  const refundToTenant = rawBalance > 0 ? rawBalance : 0;
  const tenantDeficit = tenantReceivableAmount;
  const isSurplus = refundToTenant > 0;
  const isInsufficient = tenantDeficit > 0;
  const isExact = !isSurplus && !isInsufficient;

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
