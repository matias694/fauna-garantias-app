import assert from 'node:assert/strict';

const reconcilePaidCase = ({ blockedBy, pendingBalance, receivableStatus, nextManagement }) => {
  const receivablePaid = receivableStatus === 'PAGADA' && pendingBalance === 0;
  const hasUnrelatedBlock = blockedBy !== 'SIN_BLOQUEO' && blockedBy !== 'ARRENDATARIO';

  if (!receivablePaid || hasUnrelatedBlock) {
    return { blockedBy, nextManagement };
  }

  return {
    blockedBy: 'SIN_BLOQUEO',
    nextManagement: 'Cerrar caso'
  };
};

const paidCollection = reconcilePaidCase({
  blockedBy: 'ARRENDATARIO',
  pendingBalance: 0,
  receivableStatus: 'PAGADA',
  nextManagement: 'Verificar transferencia cuota 2'
});

assert.equal(paidCollection.blockedBy, 'SIN_BLOQUEO');
assert.equal(paidCollection.nextManagement, 'Cerrar caso');

const unrelatedOwnerBlock = reconcilePaidCase({
  blockedBy: 'PROPIETARIO',
  pendingBalance: 0,
  receivableStatus: 'PAGADA',
  nextManagement: 'Esperar autorización propietario'
});

assert.equal(unrelatedOwnerBlock.blockedBy, 'PROPIETARIO');
assert.equal(unrelatedOwnerBlock.nextManagement, 'Esperar autorización propietario');

console.log('✓ completed-case cleanup rules');
