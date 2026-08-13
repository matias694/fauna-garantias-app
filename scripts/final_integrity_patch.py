from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'{label} missing in {path}')
    p.write_text(s.replace(old, new, 1))


# 1) Una única regla compartida para confirmar liquidación.
path = 'src/utils/calculations.ts'
p = Path(path)
s = p.read_text()
marker = "\nexport function calculateOwnerLiquidationReconciliation(\n"
helper = """

export function canConfirmGuaranteeLiquidation(
  c: GuaranteeCase,
  settings: SystemSettings
): boolean {
  if (c.liquidationStatus !== 'LISTA') return false;
  if (c.preparationStatus !== 'LISTA') return false;
  if (c.blockedBy !== 'SIN_BLOQUEO') return false;
  return calculateFundingReadiness(c, settings).readyToConfirm;
}
"""
if marker not in s:
    raise SystemExit('calculations insertion marker missing')
s = s.replace(marker, helper + marker, 1)
p.write_text(s)

# AppContext usa la misma regla y robustecemos completitud contra objetos faltantes.
p = Path('src/context/AppContext.tsx')
s = p.read_text()
s = s.replace(
    "  calculatePaymentDistribution,\n  isChargeIncludedInLiquidation",
    "  calculatePaymentDistribution,\n  canConfirmGuaranteeLiquidation,\n  isChargeIncludedInLiquidation",
    1,
)
old = """  if (c.refund && c.refund.amount > 0 && c.refund.status !== 'TRANSFERIDA') return false;

  if (c.receivableStatus && c.receivableStatus !== 'PAGADA' && c.receivableStatus !== 'INCOBRABLE') {
    return false;
  }

  const readiness = calculateFundingReadiness(c, settings);
"""
new = """  const fin = calculateGuaranteeFinances(c, settings);
  const originalRefund = c.liquidationSnapshot?.financials.refundToTenant ?? fin.refundToTenant;
  const originalDeficit = c.liquidationSnapshot?.financials.tenantDeficit ?? fin.tenantDeficit;

  if (originalRefund > 0 && c.refund?.status !== 'TRANSFERIDA') return false;

  if (originalDeficit > 0 && c.receivableStatus !== 'PAGADA' && c.receivableStatus !== 'INCOBRABLE') {
    return false;
  }

  const readiness = calculateFundingReadiness(c, settings);
"""
if old not in s:
    raise SystemExit('completion outcome block missing')
s = s.replace(old, new, 1)
old = """    if (!targetCase || targetCase.liquidationStatus !== 'LISTA' || targetCase.blockedBy !== 'SIN_BLOQUEO') return;

    const fin = calculateGuaranteeFinances(targetCase, settings);
    const readiness = calculateFundingReadiness(targetCase, settings);
    if (!readiness.readyToConfirm) return;
"""
new = """    if (!targetCase || !canConfirmGuaranteeLiquidation(targetCase, settings)) return;

    const fin = calculateGuaranteeFinances(targetCase, settings);
    const readiness = calculateFundingReadiness(targetCase, settings);
"""
if old not in s:
    raise SystemExit('emit guard missing')
s = s.replace(old, new, 1)

# El modal de cierre también explica objetos financieros faltantes según el resultado congelado.
old = """      if (targetCase.refund && targetCase.refund.amount > 0 && targetCase.refund.status !== 'TRANSFERIDA') pending.push('devolución al arrendatario');
      if (targetCase.receivableStatus && targetCase.receivableStatus !== 'PAGADA' && targetCase.receivableStatus !== 'INCOBRABLE') pending.push('cuenta por cobrar');
      if (calculateFundingReadiness(targetCase, settings).ownerServicePending > 0 && !targetCase.ownerServiceDeferral) pending.push('gastos comunes/servicios pendientes del propietario sin acuerdo de diferimiento');
"""
new = """      const closeFin = calculateGuaranteeFinances(targetCase, settings);
      const originalRefund = targetCase.liquidationSnapshot?.financials.refundToTenant ?? closeFin.refundToTenant;
      const originalDeficit = targetCase.liquidationSnapshot?.financials.tenantDeficit ?? closeFin.tenantDeficit;
      if (originalRefund > 0 && targetCase.refund?.status !== 'TRANSFERIDA') pending.push('devolución al arrendatario');
      if (originalDeficit > 0 && targetCase.receivableStatus !== 'PAGADA' && targetCase.receivableStatus !== 'INCOBRABLE') pending.push('cuenta por cobrar');
      if (calculateFundingReadiness(targetCase, settings).ownerServicePending > 0 && !targetCase.ownerServiceDeferral) pending.push('gastos comunes/servicios pendientes del propietario sin acuerdo de diferimiento');
"""
if old not in s:
    raise SystemExit('close pending outcome block missing')
s = s.replace(old, new, 1)
p.write_text(s)

# 2) UX de confirmación: reparaciones deben estar terminadas/canceladas y preparación LISTA.
p = Path('src/components/GuaranteeCaseDetail/LiquidationTab.tsx')
s = p.read_text()
s = s.replace(
    "import { calculateFundingReadiness, calculateGuaranteeFinances } from '../../utils/calculations';",
    "import { calculateFundingReadiness, calculateGuaranteeFinances, canConfirmGuaranteeLiquidation } from '../../utils/calculations';",
    1,
)
old = """  const checklistReady = guaranteeCase.liquidationStatus === 'LISTA';
  const hasManualBlock = guaranteeCase.blockedBy !== 'SIN_BLOQUEO';
  const canConfirm = checklistReady && readiness.readyToConfirm && !hasManualBlock;
"""
new = """  const checklistReady = guaranteeCase.liquidationStatus === 'LISTA';
  const preparationReady = guaranteeCase.preparationStatus === 'LISTA';
  const hasManualBlock = guaranteeCase.blockedBy !== 'SIN_BLOQUEO';
  const canConfirm = canConfirmGuaranteeLiquidation(guaranteeCase, settings);
"""
if old not in s:
    raise SystemExit('liquidation canConfirm block missing')
s = s.replace(old, new, 1)
old = """    : checklistReady && hasManualBlock
      ? 'Lista con bloqueo'
      : checklistReady && !readiness.readyToConfirm
        ? 'Lista · faltan fondos para reparar'
        : checklistReady
          ? 'Lista para confirmar'
          : 'En preparación';
"""
new = """    : checklistReady && !preparationReady
      ? 'Lista · reparaciones pendientes'
      : checklistReady && hasManualBlock
        ? 'Lista con bloqueo'
        : checklistReady && !readiness.readyToConfirm
          ? 'Lista · faltan fondos para reparar'
          : checklistReady
            ? 'Lista para confirmar'
            : 'En preparación';
"""
if old not in s:
    raise SystemExit('stage label block missing')
s = s.replace(old, new, 1)
old = """            {checklistReady && hasManualBlock && !isConfirmed && (
              <span className=\"text-xs text-amber-800 font-semibold flex items-center gap-1.5\">
                <AlertTriangle className=\"w-4 h-4 text-amber-600\" /> El caso está bloqueado por {guaranteeCase.blockedBy.toLowerCase()}. Debe quedar “Sin bloqueo” antes de confirmar.
              </span>
            )}
"""
new = """            {checklistReady && !preparationReady && !isConfirmed && (
              <span className=\"text-xs text-amber-800 font-semibold flex items-center gap-1.5\">
                <AlertTriangle className=\"w-4 h-4 text-amber-600\" /> Finaliza o cancela las reparaciones pendientes antes de confirmar la liquidación.
              </span>
            )}
            {checklistReady && preparationReady && hasManualBlock && !isConfirmed && (
              <span className=\"text-xs text-amber-800 font-semibold flex items-center gap-1.5\">
                <AlertTriangle className=\"w-4 h-4 text-amber-600\" /> El caso está bloqueado por {guaranteeCase.blockedBy.toLowerCase()}. Debe quedar “Sin bloqueo” antes de confirmar.
              </span>
            )}
"""
if old not in s:
    raise SystemExit('liquidation manual block warning missing')
s = s.replace(old, new, 1)
s = s.replace(
    "{checklistReady && !hasManualBlock && !readiness.readyToConfirm && !isConfirmed && (",
    "{checklistReady && preparationReady && !hasManualBlock && !readiness.readyToConfirm && !isConfirmed && (",
    1,
)
p.write_text(s)

# 3) Pruebas de regresión: no confirmar durante reparaciones y no completar si falta la acción financiera creada por emisión.
p = Path('src/tests/hardeningRules.test.ts')
s = p.read_text()
s = s.replace(
    "import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';",
    "import { calculateFundingReadiness, calculateGuaranteeFinances, canConfirmGuaranteeLiquidation } from '../utils/calculations';",
    1,
)
marker = "console.log('✓ Reglas de hardening, fechas, migraciones, incobrables y seguimiento posterior validadas');"
addition = """// Confirmar la liquidación exige que la preparación física esté lista.
assert.equal(canConfirmGuaranteeLiquidation({ ...base, preparationStatus: 'REPARANDO' }, settings), false);
assert.equal(canConfirmGuaranteeLiquidation({ ...base, preparationStatus: 'LISTA' }, settings), true);

// Un resultado emitido con devolución no puede completarse si falta registrar la transferencia.
const emittedSurplus = {
  ...base,
  liquidationStatus: 'EMITIDA' as const,
  guaranteeAmount: 500000,
  charges: [{
    id: 'CHG-SURPLUS', category: 'GASTOS_COMUNES' as const, description: 'Cargo final', amount: 400000,
    date: '12/08/2026', type: 'GASTO_COMUN' as const, notes: '', documents: [], photos: []
  }],
  refund: undefined,
  receivableStatus: undefined
};
assert.equal(isCaseCompleted(emittedSurplus, settings), false);
assert.equal(isCaseCompleted({
  ...emittedSurplus,
  refund: { amount: 100000, status: 'TRANSFERIDA' as const }
}, settings), true);

// Un déficit emitido tampoco puede completarse si, por inconsistencia, falta su estado de cobranza.
const deferredOwnerServices = {
  amountAtDeferral: 200000,
  reason: 'Pago posterior',
  nextReviewDate: '15/09/2026',
  responsible: 'Usuario',
  createdAt: '2026-08-12T01:00:00.000Z',
  createdBy: 'ADMINISTRADOR'
};
assert.equal(isCaseCompleted({
  ...ownerServicesPending,
  receivableStatus: undefined,
  ownerServiceDeferral: deferredOwnerServices
}, settings), false);

console.log('✓ Reglas de hardening, confirmación, acciones financieras, fechas, migraciones e incobrables validadas');"""
if marker not in s:
    raise SystemExit('hardening final marker missing')
p.write_text(s.replace(marker, addition, 1))

# 4) Componentes legacy no montados: eliminarlos evita mantener una segunda UX con alerts y reglas antiguas.
for stale in [
    'src/components/GuaranteeCaseDetail/RepairsTab.tsx',
    'src/components/GuaranteeCaseDetail/MovementsTab.tsx',
]:
    Path(stale).unlink(missing_ok=True)
