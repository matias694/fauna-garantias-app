import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';

/**
 * Reconciles operational case state after the related tenant receivable is fully paid.
 * It only clears collection-related state; unrelated blockers are preserved.
 */
export const CompletedCaseSync: React.FC = () => {
  const { cases, receivables, updateGuaranteeCase } = useApp();
  const synced = useRef<Set<string>>(new Set());

  useEffect(() => {
    cases.forEach(c => {
      if (!c.receivableId || synced.current.has(c.id)) return;

      const receivable = receivables.find(r => r.id === c.receivableId);
      if (!receivable || receivable.status !== 'PAGADA' || receivable.pendingBalance > 0) return;

      const hasUnrelatedBlock = c.blockedBy !== 'SIN_BLOQUEO' && c.blockedBy !== 'ARRENDATARIO';
      if (hasUnrelatedBlock) return;

      const needsCleanup =
        c.blockedBy === 'ARRENDATARIO' ||
        c.nextManagement !== 'Cerrar caso' ||
        !c.nextManagementDate?.trim();

      if (!needsCleanup) {
        synced.current.add(c.id);
        return;
      }

      synced.current.add(c.id);
      const today = formatDate(new Date().toISOString().split('T')[0]);

      updateGuaranteeCase(c.id, {
        blockedBy: 'SIN_BLOQUEO',
        blockedReasonNotes: '',
        nextManagement: 'Cerrar caso',
        nextManagementDate: today,
        nextManagementResponsible: c.responsible || ''
      });
    });
  }, [cases, receivables, updateGuaranteeCase]);

  return null;
};
