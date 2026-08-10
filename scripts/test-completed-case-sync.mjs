import assert from 'node:assert/strict';

const reconcileResolvedCollection = ({
  blockedBy,
  pendingBalance,
  receivableStatus,
  nextManagement,
  isCompleted,
  ownerServicePending = 0
}) => {
  const collectionResolved =
    (receivableStatus === 'PAGADA' && pendingBalance === 0) ||
    receivableStatus === 'INCOBRABLE';
  const hasUnrelatedBlock = blockedBy !== 'SIN_BLOQUEO' && blockedBy !== 'ARRENDATARIO';

  if (!collectionResolved || hasUnrelatedBlock) {
    return { blockedBy, nextManagement };
  }

  return {
    blockedBy: 'SIN_BLOQUEO',
    nextManagement: isCompleted
      ? 'Cerrar caso'
      : ownerServicePending > 0
        ? `Gestionar $${ownerServicePending} de gastos comunes/servicios con propietario`
        : 'Revisar pendientes para cierre del caso'
  };
};

const paidAndCompleted = reconcileResolvedCollection({
  blockedBy: 'ARRENDATARIO',
  pendingBalance: 0,
  receivableStatus: 'PAGADA',
  nextManagement: 'Verificar transferencia cuota 2',
  isCompleted: true
});

assert.equal(paidAndCompleted.blockedBy, 'SIN_BLOQUEO');
assert.equal(paidAndCompleted.nextManagement, 'Cerrar caso');

const paidButOwnerServicesPending = reconcileResolvedCollection({
  blockedBy: 'ARRENDATARIO',
  pendingBalance: 0,
  receivableStatus: 'PAGADA',
  nextManagement: 'Cobrar arrendatario',
  isCompleted: false,
  ownerServicePending: 100000
});

assert.equal(paidButOwnerServicesPending.blockedBy, 'SIN_BLOQUEO');
assert.equal(paidButOwnerServicesPending.nextManagement.includes('propietario'), true);

const unrelatedOwnerBlock = reconcileResolvedCollection({
  blockedBy: 'PROPIETARIO',
  pendingBalance: 0,
  receivableStatus: 'PAGADA',
  nextManagement: 'Esperar autorización propietario',
  isCompleted: false
});

assert.equal(unrelatedOwnerBlock.blockedBy, 'PROPIETARIO');
assert.equal(unrelatedOwnerBlock.nextManagement, 'Esperar autorización propietario');

console.log('✓ completed-case cleanup rules: 3 escenarios');
