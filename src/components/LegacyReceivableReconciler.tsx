import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { FinancialMovement } from '../types';

const MIGRATION_KEY = 'fauna_receivable_reconcile_v1';

/**
 * One-time reconciliation for prototype/demo data created before receivables
 * and guarantee cases were kept aligned. It normalizes the case balances and
 * next-management fields from the receivable and backfills missing historical
 * payment/recovery movements so dashboards and reports remain coherent.
 */
export const LegacyReceivableReconciler: React.FC = () => {
  const { cases, receivables, updateGuaranteeCase } = useApp();

  useEffect(() => {
    if (localStorage.getItem(MIGRATION_KEY) === 'done') return;

    receivables.forEach((receivable) => {
      const guaranteeCase = cases.find((c) => c.id === receivable.caseId);
      if (!guaranteeCase) return;

      const existingTenantPayments = guaranteeCase.movements
        .filter((m) => m.type === 'PAGO_ARRENDATARIO')
        .reduce((sum, m) => sum + m.amount, 0);

      const existingOwnerRecoveries = guaranteeCase.movements
        .filter((m) => m.type === 'RECUPERACION_PROPIETARIO')
        .reduce((sum, m) => sum + m.amount, 0);

      const existingFaunaRecoveries = guaranteeCase.movements
        .filter((m) => m.type === 'RECUPERACION_FAUNA')
        .reduce((sum, m) => sum + m.amount, 0);

      const missingTenantPayment = Math.max(0, receivable.totalPaid - existingTenantPayments);
      const ownerRecoveryDelta = Math.max(
        0,
        guaranteeCase.ownerContribution - receivable.ownerContributionToRecover - existingOwnerRecoveries
      );
      const faunaRecoveryDelta = Math.max(
        0,
        guaranteeCase.faunaFinancing - receivable.faunaFinancingToRecover - existingFaunaRecoveries
      );

      const reconciliationDate = receivable.lastManagementDate || receivable.createdDate;
      const movements: FinancialMovement[] = [...guaranteeCase.movements];

      if (missingTenantPayment > 0) {
        movements.push({
          id: `MOV-SYNC-PAGO-${receivable.id}`,
          caseId: guaranteeCase.id,
          date: reconciliationDate,
          time: '12:00',
          type: 'PAGO_ARRENDATARIO',
          description: 'Pago histórico de arrendatario conciliado',
          amount: missingTenantPayment,
          user: 'Migración de sistema',
          reference: `SYNC-${receivable.id}`,
          observation: 'Movimiento reconstruido desde la cuenta por cobrar para mantener coherencia histórica.'
        });
      }

      if (ownerRecoveryDelta > 0) {
        movements.push({
          id: `MOV-SYNC-PROP-${receivable.id}`,
          caseId: guaranteeCase.id,
          date: reconciliationDate,
          time: '12:01',
          type: 'RECUPERACION_PROPIETARIO',
          description: 'Recuperación histórica de aporte propietario conciliada',
          amount: ownerRecoveryDelta,
          user: 'Migración de sistema',
          reference: `SYNC-PROP-${receivable.id}`,
          observation: 'Reconstruida desde el saldo pendiente de recuperación del propietario.'
        });
      }

      if (faunaRecoveryDelta > 0) {
        movements.push({
          id: `MOV-SYNC-FAUNA-${receivable.id}`,
          caseId: guaranteeCase.id,
          date: reconciliationDate,
          time: '12:02',
          type: 'RECUPERACION_FAUNA',
          description: 'Recuperación histórica de financiamiento Fauna conciliada',
          amount: faunaRecoveryDelta,
          user: 'Migración de sistema',
          reference: `SYNC-FAUNA-${receivable.id}`,
          observation: 'Reconstruida desde el saldo pendiente de recuperación de Fauna.'
        });
      }

      const hasDifferences =
        guaranteeCase.ownerContribution !== receivable.ownerContributionToRecover ||
        guaranteeCase.faunaFinancing !== receivable.faunaFinancingToRecover ||
        guaranteeCase.receivableStatus !== receivable.status ||
        guaranteeCase.nextManagement !== receivable.nextManagement ||
        guaranteeCase.nextManagementDate !== receivable.nextManagementDate ||
        movements.length !== guaranteeCase.movements.length;

      if (!hasDifferences) return;

      updateGuaranteeCase(guaranteeCase.id, {
        ownerContribution: receivable.ownerContributionToRecover,
        faunaFinancing: receivable.faunaFinancingToRecover,
        receivableStatus: receivable.status,
        nextManagement: receivable.nextManagement,
        nextManagementDate: receivable.nextManagementDate,
        movements
      });
    });

    localStorage.setItem(MIGRATION_KEY, 'done');
  }, [cases, receivables, updateGuaranteeCase]);

  return null;
};
