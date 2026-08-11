import { GuaranteeCase, SystemSettings } from '../types';

export interface FinancialCalculationResult {
  guaranteeAmount: number;
  /** Cargos positivos antes de abonos. */
  grossCharges: number;
  /** Abonos ya recibidos del arrendatario. Se imputan primero a GC/servicios. */
  tenantCredits: number;
  /** Neto cargos - abonos. Puede ser negativo si hay más fondos abonados que cargos. */
  totalCharges: number;
  damageCharges: number;
  serviceCharges: number;
  rawBalance: number;
  guaranteeUsed: number;
  guaranteeForDamage: number;
  guaranteeForServices: number;
  /** Parte del abono proporcional usada primero en GC/servicios. */
  creditsForServices: number;
  /** Excedente del abono aplicado a la diferencia de reparaciones después de Garantía + Full. */
  creditsForDamage: number;
  /** Excedente del abono que recupera inmediatamente parte de la cobertura Full ya aplicada. */
  creditsForFaunaRecovery: number;
  /** Abono que queda libre después de cubrir servicios y obligaciones de daño. */
  tenantCreditsUnapplied: number;
  isSurplus: boolean;
  isExact: boolean;
  isInsufficient: boolean;
  refundToTenant: number;
  tenantDeficit: number;
  fullCoverageLimit: number;
  /** Beneficio contractual aplicado a daños. No se reduce por el abono proporcional de servicios. */
  fullCoverageApplied: number;
  ownerRepairFundingRequired: number;
  ownerServiceObligation: number;
  ownerContributionRequired: number;
  /** Desembolso neto de Fauna pendiente después de compensar excedentes del abono. */
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
 * Regla económica de cargos y abonos:
 * - CARGO: monto positivo que aumenta lo que debe cubrir la salida.
 * - ABONO: monto negativo que representa el proporcional de GC/servicios ya recibido
 *   del arrendatario antes de su salida.
 *
 * Prioridad:
 * 1) garantía a daños/reparaciones;
 * 2) Plan Full, si corresponde, al daño restante (el abono de servicios no reduce el beneficio Full);
 * 3) garantía sobrante a GC/servicios;
 * 4) abono proporcional a GC/servicios;
 * 5) si sobra abono, ese excedente compensa primero una diferencia de reparaciones del propietario
 *    y luego recupera inmediatamente financiamiento Full;
 * 6) solo después de compensar todo se determina devolución o cuenta por cobrar al arrendatario.
 *
 * De esta forma no se usa prematuramente un proporcional de servicios para financiar daños,
 * pero tampoco se devuelve un excedente mientras exista otra deuda del arrendatario.
 */
export function calculateGuaranteeFinances(
  c: GuaranteeCase,
  _settings: SystemSettings
): FinancialCalculationResult {
  const guaranteeAmount = Math.max(0, c.guaranteeAmount || 0);

  let damageCharges = 0;
  let serviceCharges = 0;
  let tenantCredits = 0;

  (c.charges || []).forEach(ch => {
    const amount = Number(ch.amount) || 0;

    if (amount < 0) {
      tenantCredits += Math.abs(amount);
      return;
    }

    if (amount <= 0) return;

    if (ch.type === 'DAÑO_REPARACION') {
      damageCharges += amount;
    } else {
      serviceCharges += amount;
    }
  });

  const grossCharges = damageCharges + serviceCharges;
  const totalCharges = grossCharges - tenantCredits;
  const rawBalance = guaranteeAmount + tenantCredits - grossCharges;

  const isSurplus = rawBalance > 0;
  const isExact = rawBalance === 0;
  const isInsufficient = rawBalance < 0;

  const refundToTenant = isSurplus ? rawBalance : 0;
  const tenantDeficit = isInsufficient ? Math.abs(rawBalance) : 0;

  // 1) La garantía se aplica primero a daños/reparaciones.
  const guaranteeForDamage = Math.min(guaranteeAmount, damageCharges);
  const guaranteeRemainingAfterDamage = Math.max(0, guaranteeAmount - guaranteeForDamage);
  const damageAfterGuarantee = Math.max(0, damageCharges - guaranteeForDamage);

  // 2) Full protege al propietario sobre el daño restante sin consumir antes el abono de servicios.
  const fullCoverageLimit = c.plan === 'FULL' ? guaranteeAmount : 0;
  const fullCoverageApplied = c.plan === 'FULL'
    ? Math.min(fullCoverageLimit, damageAfterGuarantee)
    : 0;
  const damageAfterGuaranteeAndFull = Math.max(0, damageAfterGuarantee - fullCoverageApplied);

  // 3) La garantía que sobra después de daños se usa en GC/servicios.
  const guaranteeForServices = Math.min(guaranteeRemainingAfterDamage, serviceCharges);
  const servicesAfterGuarantee = Math.max(0, serviceCharges - guaranteeForServices);

  // 4) El abono proporcional se imputa primero a GC/servicios.
  const creditsForServices = Math.min(tenantCredits, servicesAfterGuarantee);
  let creditsRemaining = Math.max(0, tenantCredits - creditsForServices);
  const ownerServiceObligation = Math.max(0, servicesAfterGuarantee - creditsForServices);

  // 5) Solo el excedente del abono puede pasar a daños. Respeta la prioridad de recuperación:
  // propietario primero y Fauna después.
  const creditsForDamage = Math.min(creditsRemaining, damageAfterGuaranteeAndFull);
  creditsRemaining -= creditsForDamage;
  const ownerRepairFundingRequired = Math.max(0, damageAfterGuaranteeAndFull - creditsForDamage);

  const creditsForFaunaRecovery = Math.min(creditsRemaining, fullCoverageApplied);
  creditsRemaining -= creditsForFaunaRecovery;
  const faunaFinancingRequired = Math.max(0, fullCoverageApplied - creditsForFaunaRecovery);
  const tenantCreditsUnapplied = creditsRemaining;

  const guaranteeUsed = guaranteeForDamage + guaranteeForServices;
  const ownerContributionRequired = ownerRepairFundingRequired + ownerServiceObligation;

  // Full no extingue la deuda del arrendatario. Garantía y abonos previos sí reducen su saldo.
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

  // La cobertura contractual puede ser mayor, pero solo el desembolso neto pendiente
  // debe estar ejecutado/registrado por Fauna.
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

  // Para cuadrar caja se usa el desembolso NETO de Fauna. El beneficio Full bruto
  // puede mostrarse por separado en el documento como beneficio contractual.
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
