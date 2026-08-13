import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCLP, formatDate, getLocalDateInputValue } from '../utils/formatters';
import { calculateFundingReadiness } from '../utils/calculations';

/**
 * Mantiene coherentes los estados operativos después de resolver obligaciones.
 * - Una cobranza pagada/incobrable deja de bloquear por arrendatario y deja de
 *   conservar una próxima gestión antigua de cobranza.
 * - Un caso completado queda listo únicamente para la acción final "Cerrar caso".
 * - Un caso cerrado no conserva bloqueos ni próximas gestiones activas.
 * - Bloqueos ajenos a la cobranza nunca se eliminan automáticamente.
 */
export const CompletedCaseSync: React.FC = () => {
  const { cases, settings, updateGuaranteeCase } = useApp();

  useEffect(() => {
    cases.forEach(c => {
      if (c.isClosed) {
        const needsClosedCleanup =
          c.blockedBy !== 'SIN_BLOQUEO' ||
          Boolean(c.blockedReasonNotes?.trim()) ||
          Boolean(c.nextManagement?.trim()) ||
          Boolean(c.nextManagementDate?.trim()) ||
          Boolean(c.nextManagementResponsible?.trim());

        if (needsClosedCleanup) {
          updateGuaranteeCase(c.id, {
            blockedBy: 'SIN_BLOQUEO',
            blockedReasonNotes: '',
            nextManagement: '',
            nextManagementDate: '',
            nextManagementResponsible: ''
          });
        }
        return;
      }

      const collectionResolved = c.receivableStatus === 'PAGADA' || c.receivableStatus === 'INCOBRABLE';
      const hasUnrelatedBlock = c.blockedBy !== 'SIN_BLOQUEO' && c.blockedBy !== 'ARRENDATARIO';
      const today = formatDate(getLocalDateInputValue());

      // Cuando termina la cobranza, su bloqueo y su próxima gestión dejan de aplicar.
      // Si existe un bloqueo distinto (propietario, documento, proveedor, etc.), se preserva.
      if (collectionResolved && !hasUnrelatedBlock) {
        const readiness = calculateFundingReadiness(c, settings);
        const targetNextManagement = c.isCompleted
          ? 'Cerrar caso'
          : readiness.ownerServicePending > 0
            ? `Gestionar ${formatCLP(readiness.ownerServicePending)} de gastos comunes/servicios con propietario`
            : 'Revisar pendientes para cierre del caso';
        const targetResponsible = c.responsible || '';

        const needsCollectionCleanup =
          c.blockedBy !== 'SIN_BLOQUEO' ||
          Boolean(c.blockedReasonNotes?.trim()) ||
          c.nextManagement !== targetNextManagement ||
          !c.nextManagementDate?.trim() ||
          c.nextManagementResponsible !== targetResponsible;

        if (needsCollectionCleanup) {
          updateGuaranteeCase(c.id, {
            blockedBy: 'SIN_BLOQUEO',
            blockedReasonNotes: '',
            nextManagement: targetNextManagement,
            nextManagementDate: today,
            nextManagementResponsible: targetResponsible
          });
        }
        return;
      }

      if (!c.isCompleted || hasUnrelatedBlock) return;

      const needsCompletionCleanup =
        c.blockedBy === 'ARRENDATARIO' ||
        c.nextManagement !== 'Cerrar caso' ||
        !c.nextManagementDate?.trim();

      if (!needsCompletionCleanup) return;

      updateGuaranteeCase(c.id, {
        blockedBy: 'SIN_BLOQUEO',
        blockedReasonNotes: '',
        nextManagement: 'Cerrar caso',
        nextManagementDate: today,
        nextManagementResponsible: c.responsible || ''
      });
    });
  }, [cases, settings, updateGuaranteeCase]);

  return null;
};
