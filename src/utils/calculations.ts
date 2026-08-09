import { GuaranteeCase, SystemSettings } from '../types';

export interface FinancialCalculationResult {
  guaranteeAmount: number;
  totalCharges: number;
  damageCharges: number;
  serviceCharges: number;
  rawBalance: number;
  guaranteeUsed: number;
  isSurplus: boolean;
  isExact: boolean;
  isInsufficient: boolean;
  refundToTenant: number;
  tenantDeficit: number;
  fullCoverageLimit: number;
  fullCoverageApplied: number;
  ownerContributionRequired: number;
  faunaFinancingRequired: number;
  tenantReceivableAmount: number;
}

export function calculateGuaranteeFinances(
  c: GuaranteeCase,
  _settings: SystemSettings
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

  // Regla Plan Full: la cobertura adicional máxima equivale al 100% de la garantía.
  // Se aplica únicamente a daños/reparaciones y después de aplicar la garantía a daños.
  const fullCoverageLimit = c.plan === 'FULL' ? guaranteeAmount : 0;
  let fullCoverageApplied = 0;

  if (c.plan === 'FULL' && isInsufficient) {
    const guaranteeForDamage = Math.min(guaranteeAmount, damageCharges);
    const uncoveredDamage = Math.max(0, damageCharges - guaranteeForDamage);
    fullCoverageApplied = Math.min(fullCoverageLimit, uncoveredDamage);
  }

  const ownerContributionRequired = c.ownerContribution || 0;
  const faunaFinancingRequired = c.faunaFinancing || 0;

  // La cobertura Full protege al propietario, pero no extingue la deuda del arrendatario.
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
 * Distribuye pagos posteriores del arrendatario:
 * 1) recuperar aporte del propietario;
 * 2) recuperar financiamiento Fauna;
 * 3) el remanente se aplica al resto de la deuda del arrendatario.
 */
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
