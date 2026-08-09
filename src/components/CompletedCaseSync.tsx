import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';

/**
 * Keeps the operational state of completed/closed cases coherent.
 * - Any completed case is left ready only for the final "Cerrar caso" action.
 * - A closed case has no active blocker or pending next-management action.
 * - Unrelated blockers are preserved and are never cleared automatically.
 */
export const CompletedCaseSync: React.FC = () => {
  const { cases, updateGuaranteeCase } = useApp();

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

      if (!c.isCompleted) return;

      const hasUnrelatedBlock = c.blockedBy !== 'SIN_BLOQUEO' && c.blockedBy !== 'ARRENDATARIO';
      if (hasUnrelatedBlock) return;

      const needsCompletionCleanup =
        c.blockedBy === 'ARRENDATARIO' ||
        c.nextManagement !== 'Cerrar caso' ||
        !c.nextManagementDate?.trim();

      if (!needsCompletionCleanup) return;

      const today = formatDate(new Date().toISOString().split('T')[0]);

      updateGuaranteeCase(c.id, {
        blockedBy: 'SIN_BLOQUEO',
        blockedReasonNotes: '',
        nextManagement: 'Cerrar caso',
        nextManagementDate: today,
        nextManagementResponsible: c.responsible || ''
      });
    });
  }, [cases, updateGuaranteeCase]);

  return null;
};
