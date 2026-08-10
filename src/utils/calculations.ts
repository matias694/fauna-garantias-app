import { GuaranteeCase, SystemSettings } from '../types';

export interface FinancialCalculationResult {
  guaranteeAmount: number;
  totalCharges: number;
  damageCharges: number;
  serviceCharges: number;
  rawBalance: number;
  guaranteeUsed: number;
  guaranteeForDamage: number;
  guaranteeForServices: number;
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
  /** Total legacy: reparaciones + servicios a cargo del propietario. */
  ownerRequired: number;
  ownerProvisionedTotal: number;
  /** Saldo legacy total pendiente del propietario; NO determina por sí solo el bloqueo. */
  ownerPendingProvision: number;
  ownerRepairRequired: number;
  ownerRepairFundedTotal: number;
  ownerRepairPendingProvision: number;
  /** Servicios/GC pueden quedar como obligación vigente sin bloquear la liquidación. */
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

/**
 * Los cargos se guardan positivos y los abonos como montos negativos.
 * Cada abono reduce solamente su grupo económico (daños o servicios), evitando
 * que un abono de servicios libere artificialmente cobertura para reparaciones o viceversa.
 */
export function calculateGuaranteeFinances(
  c: GuaranteeCase,
  _settings: SystemSettings
): FinancialCalculationResult {
  const guaranteeAmount = c.guaranteeAmount || 0;

  let rawDamageCharges = 0;
  let rawServiceCharges = 0;

  (c.charges || []).forEach(ch => {
    const amt = Number(ch.amount) || 0;
    if (ch.type === 'DAÑO_REPARACION') {
      rawDamageCharges += amt;
    } else {
      rawServiceCharges += amt;
    }
  });

  // Un abono nunca transforma una categoría en un cargo negativo.
  const damageCharges = Math.max(0, rawDamageCharges);
  const serviceCharges = Math.max(0, rawServiceCharges);
  const totalCharges = damageCharges + serviceCharges;

  const rawBalance = guaranteeAmount - totalCharges;
  const guaranteeUsed = Math.max(0, Math.min(guaranteeAmount, totalCharges));

  const isSurplus = rawBalance > 0;
  const isExact = rawBalance === 0;
  const isInsufficient = rawBalance < 0;

  const refundToTenant = isSurplus ? rawBalance : 0;
  const tenantDeficit = isInsufficient ? Math.abs(rawBalance) : 0;

  // Prioridad contractual/operativa:
  // 1) la garantía se aplica primero a daños/reparaciones;
  // 2) si no alcanza, Plan Full cubre SOLO el daño restante, hasta un máximo
  //    equivalente al 100% de la garantía;
  // 3) la garantía que eventualmente sobre después de los daños puede cubrir
  //    gastos comunes, servicios básicos y otros cargos;
  // 4) la diferencia de reparaciones requiere provisión previa del propietario,
  //    mientras la diferencia de servicios puede quedar como obligación vigente.
  const guaranteeForDamage = Math.min(guaranteeAmount, damageCharges);
  const guaranteeRemainingAfterDamage = Math.max(0, guaranteeAmount - guaranteeForDamage);
  const guaranteeForServices = Math.min(guaranteeRemainingAfterDamage, serviceCharges);

  const fullCoverageLimit = c.plan === 'FULL' ? guaranteeAmount : 0;
  let fullCoverageApplied = 0;

  if (c.plan === 'FULL') {
    const uncoveredDamage = Math.max(0, damageCharges - guaranteeForDamage);
    fullCoverageApplied = Math.min(fullCoverageLimit, uncoveredDamage);
  }

  const ownerRepairFundingRequired = Math.max(
    0,
    damageCharges - guaranteeForDamage - fullCoverageApplied
  );
  const ownerServiceObligation = Math.max(
    0,
    serviceCharges - guaranteeForServices
  );

  const ownerContributionRequired = ownerRepairFundingRequired + ownerServiceObligation;
  const faunaFinancingRequired = c.plan === 'FULL' ? fullCoverageApplied : 0;

  // La cobertura Full protege al propietario, pero no extingue la deuda del arrendatario.
  const tenantReceivableAmount = tenantDeficit;

  return {
    guaranteeAmount,
    totalCharges,
    damageCharges,
    serviceCharges,
    rawBalance,
    guaranteeUsed,
    guaranteeForDamage,
    guaranteeForServices,
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

/**
 * Determina qué fondos son requisito para confirmar y qué montos pueden permanecer
 * como obligación posterior. Una promesa del propietario nunca cuenta como fondos.
 *
 * - Reparaciones no cubiertas: deben estar efectivamente provisionadas antes de confirmar.
 * - Gastos comunes/servicios no cubiertos: pueden quedar pendientes del propietario y
 *   NO bloquean la confirmación de la liquidación.
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

  const tenantUnallocatedPayments = (c.movements || [])
    .filter(m => m.type === 'SALDO_PAGO_ARRENDATARIO')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

  const ownerProvisionedTotal = ownerProvisionMovements > 0
    ? ownerProvisionMovements
    : Math.max(0, (c.ownerContribution || 0) + ownerRecoveries);
  const fullCoverageExecutedTotal = fullCoverageExecutionMovements > 0
    ? fullCoverageExecutionMovements
    : Math.max(0, (c.faunaFinancing || 0) + faunaRecoveries);

  const ownerRepairRequired = fin.ownerRepairFundingRequired;
  const ownerRepairFundedTotal = Math.min(ownerProvisionedTotal, ownerRepairRequired);
  const ownerRepairPendingProvision = Math.max(0, ownerRepairRequired - ownerRepairFundedTotal);

  const ownerServiceRequired = fin.ownerServiceObligation;
  const ownerFundsAvailableForServices = Math.max(0, ownerProvisionedTotal - ownerRepairFundedTotal);
  const ownerServiceFundedTotal = Math.min(ownerFundsAvailableForServices, ownerServiceRequired);
  const ownerServiceSettledFromTenant = Math.min(
    Math.max(0, ownerServiceRequired - ownerServiceFundedTotal),
    tenantUnallocatedPayments
  );
  const ownerServicePending = Math.max(
    0,
    ownerServiceRequired - ownerServiceFundedTotal - ownerServiceSettledFromTenant
  );

  const fullCoverageRequired = fin.faunaFinancingRequired;
  const fullCoveragePendingExecution = Math.max(0, fullCoverageRequired - fullCoverageExecutedTotal);
  const ownerPendingProvision = Math.max(
    0,
    fin.ownerContributionRequired - ownerProvisionedTotal - tenantUnallocatedPayments
  );

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
    readyToConfirm: ownerRepairPendingProvision === 0 && fullCoveragePendingExecution === 0
  };
}

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
    ownerRepairFundingRequired: fin.ownerRepairFundingRequired,
    ownerRepairPending: readiness.ownerRepairPendingProvision,
    ownerServiceObligation: fin.ownerServiceObligation,
    ownerServicePending: readiness.ownerServicePending,
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
