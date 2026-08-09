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

export interface OwnerLiquidationReconciliation {
  ownerContributionRequired: number;
  ownerContributionFundedTotal: number;
  ownerContributionApplied: number;
  ownerContributionPending: number;
  refundToTenant: number;
  reconciliationBalance: number;
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

  // Estos montos son NECESIDADES de la liquidación, no desembolsos realizados.
  // Los desembolsos efectivos siguen viviendo en c.ownerContribution y c.faunaFinancing
  // y solo deben aumentar cuando se registra el movimiento financiero correspondiente.
  const ownerContributionRequired = isInsufficient
    ? Math.max(0, tenantDeficit - fullCoverageApplied)
    : 0;
  const faunaFinancingRequired = c.plan === 'FULL' && isInsufficient
    ? fullCoverageApplied
    : 0;

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
 * Reconcilia la liquidación que ve el propietario.
 * La liquidación es histórica: una recuperación posterior del arrendatario no debe
 * borrar el aporte que el propietario realizó originalmente para cuadrar el caso.
 */
export function calculateOwnerLiquidationReconciliation(
  c: GuaranteeCase,
  settings: SystemSettings
): OwnerLiquidationReconciliation {
  const fin = calculateGuaranteeFinances(c, settings);

  const ownerFundingMovements = (c.movements || [])
    .filter(m => m.type === 'APORTE_PROPIETARIO')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

  const ownerRecoveries = (c.movements || [])
    .filter(m => m.type === 'RECUPERACION_PROPIETARIO')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

  // Compatibilidad con casos anteriores sin movimiento de origen explícito.
  const ownerContributionFundedTotal = ownerFundingMovements > 0
    ? ownerFundingMovements
    : Math.max(0, (c.ownerContribution || 0) + ownerRecoveries);

  const ownerContributionApplied = Math.min(
    fin.ownerContributionRequired,
    ownerContributionFundedTotal
  );

  const ownerContributionPending = Math.max(
    0,
    fin.ownerContributionRequired - ownerContributionApplied
  );

  // La devolución al arrendatario también forma parte de la cuadratura del dinero
  // que estaba en garantía. Si todo lo requerido fue aportado, el balance debe ser $0.
  const reconciliationBalance =
    fin.guaranteeAmount
    - fin.totalCharges
    + fin.fullCoverageApplied
    + ownerContributionApplied
    - fin.refundToTenant;

  return {
    ownerContributionRequired: fin.ownerContributionRequired,
    ownerContributionFundedTotal,
    ownerContributionApplied,
    ownerContributionPending,
    refundToTenant: fin.refundToTenant,
    reconciliationBalance
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
