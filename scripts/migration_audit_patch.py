from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'{label} missing')
    p.write_text(s.replace(old, new, 1))


replace_once(
    'src/utils/formatters.ts',
    """  const diffTime = toDate.getTime() - fromDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
""",
    """  const fromCalendarDay = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const toCalendarDay = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.floor((toCalendarDay - fromCalendarDay) / (1000 * 60 * 60 * 24));
""",
    'calendar day difference',
)

p = Path('src/context/AppContext.tsx')
s = p.read_text()
marker = "const normalizeFinancialLedger = (c: GuaranteeCase): GuaranteeCase => {"
idx = s.find(marker)
if idx < 0:
    raise SystemExit('normalize ledger marker missing')
end_marker = "\n};\n\nexport function isCaseCompleted"
end = s.find(end_marker, idx)
if end < 0:
    raise SystemExit('normalize ledger end missing')
insert_at = end + 4
helper = """

export const normalizeClosedOwnerPending = (c: GuaranteeCase): GuaranteeCase => {
  if (!c.isClosed || c.ownerPostClosePending || !c.ownerServiceDeferral) return c;

  const readiness = calculateFundingReadiness(c, initialSettings);
  if (readiness.ownerServicePending <= 0) return c;

  return {
    ...c,
    ownerPostClosePending: {
      amountAtTransfer: readiness.ownerServicePending,
      reason: c.ownerServiceDeferral.reason,
      nextReviewDate: c.ownerServiceDeferral.nextReviewDate,
      responsible: c.ownerServiceDeferral.responsible,
      transferredAt: c.ownerServiceDeferral.createdAt,
      transferredBy: c.closedBy || c.ownerServiceDeferral.createdBy,
      status: 'PENDIENTE'
    },
    ownerServiceDeferral: undefined
  };
};
"""
s = s[:insert_at] + helper + s[insert_at:]
s = s.replace(
    "          const c = normalizeFinancialLedger(raw);\n          return { ...c, isCompleted: isCaseCompleted(c) };",
    "          const c = normalizeClosedOwnerPending(normalizeFinancialLedger(raw));\n          return { ...c, isCompleted: isCaseCompleted(c) };",
    1,
)
s = s.replace(
    "      const c = normalizeFinancialLedger(raw);\n      return { ...c, isCompleted: isCaseCompleted(c) };",
    "      const c = normalizeClosedOwnerPending(normalizeFinancialLedger(raw));\n      return { ...c, isCompleted: isCaseCompleted(c) };",
    1,
)
s = s.replace(
    "import { addDaysToDate, formatDate, getLocalDateInputValue } from '../utils/formatters';",
    "import { addDaysToDate, formatCLP, formatDate, getLocalDateInputValue } from '../utils/formatters';",
    1,
)
s = s.replace(
    "nextManagement: pendingPostClose ? `Revisar pendiente propietario de ${readiness.ownerServicePending}` : c.nextManagement,",
    "nextManagement: pendingPostClose ? `Revisar pendiente propietario de ${formatCLP(readiness.ownerServicePending)}` : c.nextManagement,",
    1,
)
p.write_text(s)

p = Path('src/tests/hardeningRules.test.ts')
s = p.read_text()
s = s.replace(
    "import { isCaseCompleted } from '../context/AppContext';",
    "import { isCaseCompleted, normalizeClosedOwnerPending } from '../context/AppContext';",
    1,
)
marker = "console.log('✓ Reglas de hardening, fechas, incobrables y seguimiento posterior validadas');"
addition = """const legacyClosedDeferred = {
  ...ownerServicesPending,
  isClosed: true,
  closedBy: 'ADMINISTRADOR',
  ownerServiceDeferral: {
    amountAtDeferral: 200000,
    reason: 'Pagar al próximo arriendo',
    nextReviewDate: '15/09/2026',
    responsible: 'Usuario',
    createdAt: '2026-08-12T01:00:00.000Z',
    createdBy: 'ADMINISTRADOR'
  }
};
const migratedClosed = normalizeClosedOwnerPending(legacyClosedDeferred);
assert.equal(migratedClosed.ownerServiceDeferral, undefined);
assert.equal(migratedClosed.ownerPostClosePending?.amountAtTransfer, 200000);
assert.equal(migratedClosed.ownerPostClosePending?.status, 'PENDIENTE');
assert.equal(isCaseCompleted(migratedClosed, settings), true);

console.log('✓ Reglas de hardening, fechas, migraciones, incobrables y seguimiento posterior validadas');"""
if marker not in s:
    raise SystemExit('hardening console marker missing')
p.write_text(s.replace(marker, addition, 1))
