import { GuaranteeCase, SystemSettings } from '../types';

export interface FinancialCalculationResult {
  guaranteeAmount: number;
  totalCharges: number;
  damageCharges: number;
  serviceCharges: number;
  rawBalance: number; // guaranteeAmount - totalCharges
  guaranteeUsed: number;
  
  // Scenarios
  isSurplus: boolean; // rawBalance > 0
  isExact: boolean;   // rawBalance === 0
  isInsufficient: boolean; // rawBalance < 0
  
  refundToTenant: number; // Amount to return to tenant
  tenantDeficit: number;  // Total deficit (amount tenant owes)

  // Plan Full breakdown
  fullCoverageLimit: number;
  fullCoverageApplied: number;
  
  // Balances
  ownerContributionRequired: number;
  faunaFinancingRequired: number;
  
  tenantReceivableAmount: number;
}

export function calculateGuaranteeFinances(
  c: GuaranteeCase,
  settings: SystemSettings
): FinancialCalculationResult {
  const guaranteeAmount = c.guaranteeAmount || 0;
  
  let totalCharges = 0;
  let damageCharges = 0;
  let serviceCharges = 0;

  (c.charges || []).forEach(ch => {
    const amt = ch.amount || 0;
    totalCharges += amt;
    if (ch.type === 'DAÑO_REPARACION') {
      damageCharges += amt;
    } else {
      serviceCharges += amt;
    }
  });

  const rawBalance = guaranteeAmount - totalCharges;
  const guaranteeUsed = Math.min(guaranteeAmount, totalCharges);

  const isSurplus = rawBalance > 0;
  const isExact = rawBalance === 0;
  const isInsufficient = rawBalance < 0;

  const refundToTenant = isSurplus ? rawBalance : 0;
  const tenantDeficit = isInsufficient ? Math.abs(rawBalance) : 0;

  // Calculate Full Coverage if plan === 'FULL'
  let fullCoverageLimit = 0;
  if (c.plan === 'FULL') {
    if (settings.fullCoverageLimitMode === 'MONTHLY_RENT') {
      fullCoverageLimit = (c.monthlyRent || 0) * (settings.fullCoverageRentMultiplier || 1);
    } else {
      fullCoverageLimit = settings.fullCoverageFixedLimit || 500000;
    }
  }

  let fullCoverageApplied = 0;
  if (c.plan === 'FULL' && isInsufficient) {
    // Full coverage applies ONLY to damage/repair charges
    // Guarantee is applied first proportionally or to service/damage
    // Damage amount not covered by guarantee:
    const guaranteeForDamage = Math.min(guaranteeAmount, damageCharges);
    const uncoveredDamage = damageCharges - guaranteeForDamage;
    
    if (uncoveredDamage > 0) {
      fullCoverageApplied = Math.min(fullCoverageLimit, uncoveredDamage);
    }
  }

  // Owner contribution & Fauna financing calculations
  const ownerContributionRequired = c.ownerContribution || 0;
  const faunaFinancingRequired = c.faunaFinancing || 0;
  
  // Tenant owes the total deficit minus nothing (unless forgiven, debt is generated)
  const tenantReceivableAmount = tenantDeficit;

  return {
    guaranteeAmount,
    totalCharges,
    damageCharges,
    serviceCharges,
    rawBalance,
    guaranteeUsed,
    isSurplus,
    isExact,
    isInsufficient,
    refundToTenant,
    tenantDeficit,
    fullCoverageLimit,
    fullCoverageApplied,
    ownerContributionRequired,
    faunaFinancingRequired,
    tenantReceivableAmount
  };
}

/**
 * Distributes tenant payment strictly according to RULE 17:
 * Priority 1: Recover Owner Contribution FIRST
 * Priority 2: Recover Fauna Financing SECOND
 */
export function calculatePaymentDistribution(
  paymentAmount: number,
  ownerContributionToRecover: number,
  faunaFinancingToRecover: number
) {
  let remainingPayment = Math.max(0, paymentAmount);

  // 1. Recover Owner Contribution
  const ownerRecovery = Math.min(remainingPayment, ownerContributionToRecover);
  remainingPayment -= ownerRecovery;

  // 2. Recover Fauna Financing
  const faunaRecovery = Math.min(remainingPayment, faunaFinancingToRecover);
  remainingPayment -= faunaRecovery;

  // 3. Excess / Surplus
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
