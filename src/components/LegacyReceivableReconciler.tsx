import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { FinancialMovement } from '../types';
import { calculateGuaranteeFinances } from '../utils/calculations';

const MIGRATION_KEY = 'fauna_receivable_reconcile_v2';

const sumMovement = (movements: FinancialMovement[], type: FinancialMovement['type']) => movements
  .filter(m => m.type === type)
  .reduce((sum, m) => sum + Math.max(0, m.amount), 0);

/**
 * Reconciliación de datos históricos del prototipo con las reglas financieras vigentes:
 * 1) el pago del arrendatario recupera primero fondos efectivamente aportados por el propietario;
 * 2) solo un caso Plan Full puede tener financiamiento/cobertura Fauna recuperable;
 * 3) el remanente del pago se aplica al resto de la deuda (por ejemplo GC/servicios);
 * 4) una cobranza resuelta no vuelve a imponer una gestión antigua del arrendatario.
 */
export const LegacyReceivableReconciler: React.FC = () => {
  const { cases, receivables, settings, updateGuaranteeCase } = useApp();

  useEffect(() => {
    if (localStorage.getItem(MIGRATION_KEY) === 'done') return;

    receivables.forEach((receivable) => {
      const guaranteeCase = cases.find((c) => c.id === receivable.caseId);
      if (!guaranteeCase) return;

      const fin = calculateGuaranteeFinances(guaranteeCase, settings);
      const rawMovements = [...(guaranteeCase.movements || [])];

      const ownerProvisionMovements = sumMovement(rawMovements, 'APORTE_PROPIETARIO');
      const rawOwnerRecoveries = sumMovement(rawMovements, 'RECUPERACION_PROPIETARIO');
      const ownerProvisionedTotal = ownerProvisionMovements > 0
        ? ownerProvisionMovements
        : Math.max(0, (guaranteeCase.ownerContribution || 0) + rawOwnerRecoveries);

      // Standard y Plus nunca deben arrastrar financiamiento Fauna por esta liquidación.
      // En Full, el monto recuperable máximo es la cobertura que corresponde a los daños.
      const validFaunaFinancingTotal = guaranteeCase.plan === 'FULL'
        ? Math.max(
            fin.faunaFinancingRequired,
            sumMovement(rawMovements, 'FINANCIAMIENTO_FAUNA'),
            Math.max(0, guaranteeCase.faunaFinancing || 0) + sumMovement(rawMovements, 'RECUPERACION_FAUNA')
          )
        : 0;

      const totalPaid = Math.max(0, receivable.totalPaid || 0);
      const ownerRecoveryTarget = Math.min(totalPaid, ownerProvisionedTotal);
      const afterOwner = Math.max(0, totalPaid - ownerRecoveryTarget);
      const faunaRecoveryTarget = Math.min(afterOwner, validFaunaFinancingTotal);
      const tenantSettlementTarget = Math.max(0, afterOwner - faunaRecoveryTarget);

      // Elimina clasificaciones Fauna heredadas que son inválidas en planes no Full.
      let movements = guaranteeCase.plan === 'FULL'
        ? rawMovements
        : rawMovements.filter(m => m.type !== 'FINANCIAMIENTO_FAUNA' && m.type !== 'RECUPERACION_FAUNA');

      const existingTenantPayments = sumMovement(movements, 'PAGO_ARRENDATARIO');
      const existingOwnerRecoveries = sumMovement(movements, 'RECUPERACION_PROPIETARIO');
      const existingFaunaRecoveries = sumMovement(movements, 'RECUPERACION_FAUNA');
      const existingTenantSettlement = sumMovement(movements, 'SALDO_PAGO_ARRENDATARIO');

      const reconciliationDate = receivable.lastManagementDate || receivable.createdDate;

      const appendMovement = (movement: FinancialMovement) => {
        movements = [...movements, movement];
      };

      const missingTenantPayment = Math.max(0, totalPaid - existingTenantPayments);
      if (missingTenantPayment > 0) {
        appendMovement({
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

      const missingOwnerRecovery = Math.max(0, ownerRecoveryTarget - existingOwnerRecoveries);
      if (missingOwnerRecovery > 0) {
        appendMovement({
          id: `MOV-SYNC-PROP-${receivable.id}`,
          caseId: guaranteeCase.id,
          date: reconciliationDate,
          time: '12:01',
          type: 'RECUPERACION_PROPIETARIO',
          description: 'Recuperación histórica de aporte propietario conciliada',
          amount: missingOwnerRecovery,
          user: 'Migración de sistema',
          reference: `SYNC-PROP-${receivable.id}`,
          observation: 'Distribución reconstruida con prioridad de recuperación al propietario.'
        });
      }

      const missingFaunaRecovery = Math.max(0, faunaRecoveryTarget - existingFaunaRecoveries);
      if (missingFaunaRecovery > 0) {
        appendMovement({
          id: `MOV-SYNC-FAUNA-${receivable.id}`,
          caseId: guaranteeCase.id,
          date: reconciliationDate,
          time: '12:02',
          type: 'RECUPERACION_FAUNA',
          description: 'Recuperación histórica de cobertura Full conciliada',
          amount: missingFaunaRecovery,
          user: 'Migración de sistema',
          reference: `SYNC-FAUNA-${receivable.id}`,
          observation: 'Distribución reconstruida después de recuperar el aporte del propietario.'
        });
      }

      const missingTenantSettlement = Math.max(0, tenantSettlementTarget - existingTenantSettlement);
      if (missingTenantSettlement > 0) {
        appendMovement({
          id: `MOV-SYNC-SALDO-${receivable.id}`,
          caseId: guaranteeCase.id,
          date: reconciliationDate,
          time: '12:03',
          type: 'SALDO_PAGO_ARRENDATARIO',
          description: 'Saldo histórico de pago aplicado a la deuda del arrendatario',
          amount: missingTenantSettlement,
          user: 'Migración de sistema',
          reference: `SYNC-SALDO-${receivable.id}`,
          observation: 'Remanente conciliado después de recuperar propietario y, solo si corresponde, cobertura Full.'
        });
      }

      const ownerOutstanding = Math.max(0, ownerProvisionedTotal - ownerRecoveryTarget);
      const faunaOutstanding = Math.max(0, validFaunaFinancingTotal - faunaRecoveryTarget);

      const hasDifferences =
        guaranteeCase.ownerContribution !== ownerOutstanding ||
        guaranteeCase.faunaFinancing !== faunaOutstanding ||
        guaranteeCase.receivableStatus !== receivable.status ||
        JSON.stringify(movements) !== JSON.stringify(rawMovements);

      if (!hasDifferences) return;

      updateGuaranteeCase(guaranteeCase.id, {
        ownerContribution: ownerOutstanding,
        faunaFinancing: faunaOutstanding,
        receivableStatus: receivable.status,
        movements
      });
    });

    localStorage.setItem(MIGRATION_KEY, 'done');
  }, [cases, receivables, settings, updateGuaranteeCase]);

  return null;
};