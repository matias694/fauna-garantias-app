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

export interface FundingReadiness {
  ownerRequired: number;
  ownerProvisionedTotal: number;
  ownerPendingProvision: number;
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

  // Regla Plan Full:
  // - la cobertura adicional máxima equivale al 100% de la garantía;
  // - solo cubre daños/reparaciones;
  // - la garantía base puede cubrir cualquier cargo, por lo que primero se reserva
  //   para cargos que Full NO cubre (servicios/otros) y luego para daños.
  // Así se usa correctamente el beneficio Full sin pedir provisión al propietario
  // cuando garantía + cobertura alcanzan para el presupuesto total.
  const fullCoverageLimit = c.plan === 'FULL' ? guaranteeAmount : 0;
  let fullCoverageApplied = 0;

  if (c.plan === 'FULL' && isInsufficient) {
    const guaranteeForNonDamage = Math.min(guaranteeAmount, serviceCharges);
    const guaranteeRemainingForDamage = Math.max(0, guaranteeAmount - guaranteeForNonDamage);
    const guaranteeForDamage = Math.min(guaranteeRemainingForDamage, damageCharges);
    const uncoveredDamage = Math.max(0, damageCharges - guaranteeForDamage);
    fullCoverageApplied = Math.min(fullCoverageLimit, uncoveredDamage);
  }

  // Nombres internos legacy: ownerContributionRequired y faunaFinancingRequired.
  // Operativamente representan la diferencia que debe provisionar el propietario
  // y la cobertura Full que Fauna debe aplicar, respectivamente.
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
 * Determina si los fondos necesarios para sostener la liquidación ya ocurrieron.
 * Una promesa o aprobación del propietario no cuenta como fondos: solo una provisión
 * efectivamente recibida. La cobertura Full puede ser asignada automáticamente según
 * el presupuesto antes de confirmar la liquidación.
 */
export function calculateFundingReadiness(
  c: GuaranteeCase,
  settings: SystemSettings
): FundingReadiness {
  const fin = calculateGuaranteeFinances(c, settings);

  const ownerProvisionMovements = (c.movements || [])
    .filter(m => m.type === 'APORTE_PROPIETARIO')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);
  const ownerRecoveries = (c.movements || [])
    .filter(m => m.type === 'RECUPERACION_PROPIETARIO')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

  const fullCoverageExecutionMovements = (c.movements || [])
    .filter(m => m.type === 'FINANCIAMIENTO_FAUNA')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);
  const faunaRecoveries = (c.movements || [])
    .filter(m => m.type === 'RECUPERACION_FAUNA')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

  // Compatibilidad con casos legacy que podían guardar solo el saldo vigente.
  const ownerProvisionedTotal = ownerProvisionMovements > 0
    ? ownerProvisionMovements
    : Math.max(0, (c.ownerContribution || 0) + ownerRecoveries);
  const fullCoverageExecutedTotal = fullCoverageExecutionMovements > 0
    ? fullCoverageExecutionMovements
    : Math.max(0, (c.faunaFinancing || 0) + faunaRecoveries);

  const ownerRequired = fin.ownerContributionRequired;
  const fullCoverageRequired = fin.faunaFinancingRequired;
  const ownerPendingProvision = Math.max(0, ownerRequired - ownerProvisionedTotal);
  const fullCoveragePendingExecution = Math.max(0, fullCoverageRequired - fullCoverageExecutedTotal);

  return {
    ownerRequired,
    ownerProvisionedTotal,
    ownerPendingProvision,
    fullCoverageRequired,
    fullCoverageExecutedTotal,
    fullCoveragePendingExecution,
    readyToConfirm: ownerPendingProvision === 0 && fullCoveragePendingExecution === 0
  };
}

/**
 * Reconcilia la liquidación que ve el propietario.
 * La liquidación es histórica: una recuperación posterior del arrendatario no debe
 * borrar los fondos que el propietario provisionó originalmente para cuadrar el caso.
 */
export function calculateOwnerLiquidationReconciliation(
  c: GuaranteeCase,
  settings: SystemSettings
): OwnerLiquidationReconciliation {
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);

  const ownerContributionFundedTotal = readiness.ownerProvisionedTotal;

  const ownerContributionApplied = Math.min(
    fin.ownerContributionRequired,
    ownerContributionFundedTotal
  );

  const ownerContributionPending = Math.max(
    0,
    fin.ownerContributionRequired - ownerContributionApplied
  );

  // La devolución al arrendatario también forma parte de la cuadratura del dinero
  // que estaba en garantía. Si todo lo requerido fue provisionado, el balance debe ser $0.
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
 * 1) devolver la provisión efectivamente realizada por el propietario;
 * 2) recuperar la cobertura Full efectivamente desembolsada por Fauna;
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
