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
  /** Solo la provisión necesaria para reparaciones. Es el monto que puede bloquear. */
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

  // Campo agregado legacy. Sigue representando la diferencia económica total a cargo
  // del propietario, pero ya no significa que todo ese monto bloquee la liquidación.
  const ownerContributionRequired = ownerRepairFundingRequired + ownerServiceObligation;

  // Nombre interno legacy: faunaFinancingRequired. Operativamente representa la
  // cobertura Full que Fauna aplica al daño restante.
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

  // Cuando el arrendatario paga una parte que no corresponde a recuperar fondos ya
  // adelantados por propietario/Fauna, ese saldo puede extinguir obligaciones de
  // servicios que todavía seguían pendientes.
  const tenantUnallocatedPayments = (c.movements || [])
    .filter(m => m.type === 'SALDO_PAGO_ARRENDATARIO')
    .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

  // Compatibilidad con casos legacy que podían guardar solo el saldo vigente.
  const ownerProvisionedTotal = ownerProvisionMovements > 0
    ? ownerProvisionMovements
    : Math.max(0, (c.ownerContribution || 0) + ownerRecoveries);
  const fullCoverageExecutedTotal = fullCoverageExecutionMovements > 0
    ? fullCoverageExecutionMovements
    : Math.max(0, (c.faunaFinancing || 0) + faunaRecoveries);

  // Los fondos del propietario se asignan primero a cualquier diferencia de reparación,
  // porque esa es la condición que permite ejecutar los trabajos. Solo el remanente se
  // considera pago/provisión de gastos comunes y servicios.
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

  return {
    ownerRequired: fin.ownerContributionRequired,
    ownerProvisionedTotal,
    // Conservamos el nombre por compatibilidad, pero desde ahora representa solo
    // provisión BLOQUEANTE para reparaciones.
    ownerPendingProvision: ownerRepairPendingProvision,
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
