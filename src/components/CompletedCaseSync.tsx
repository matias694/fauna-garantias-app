import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCLP, formatDate } from '../utils/formatters';
import { calculateFundingReadiness } from '../utils/calculations';

/**
 * Mantiene coherentes los estados operativos después de resolver obligaciones.
 * - Una cobranza pagada/incobrable deja de bloquear por arrendatario aunque todavía
 *   exista otra acción posterior (por ejemplo, servicios pendientes del propietario).
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
      const today = formatDate(new Date().toISOString().split('T')[0]);

      // "Bloqueado por Arrendatario" puede haber sido el bloqueo de la cobranza.
      // Una vez resuelta, se limpia inmediatamente, sin esperar a que todo el caso complete.
      if (collectionResolved && c.blockedBy === 'ARRENDATARIO') {
        const readiness = calculateFundingReadiness(c, settings);
        const nextManagement = c.isCompleted
          ? 'Cerrar caso'
          : readiness.ownerServicePending > 0
            ? `Gestionar ${formatCLP(readiness.ownerServicePending)} de gastos comunes/servicios con propietario`
            : 'Revisar pendientes para cierre del caso';

        updateGuaranteeCase(c.id, {
          blockedBy: 'SIN_BLOQUEO',
          blockedReasonNotes: '',
          nextManagement,
          nextManagementDate: today,
          nextManagementResponsible: c.responsible || ''
        });
        return;
      }

      if (!c.isCompleted) return;

      const hasUnrelatedBlock = c.blockedBy !== 'SIN_BLOQUEO' && c.blockedBy !== 'ARRENDATARIO';
      if (hasUnrelatedBlock) return;

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
