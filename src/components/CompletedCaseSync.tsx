import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

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
        Boolean(c.nextManagement?.trim()) ||
        Boolean(c.nextManagementDate?.trim());

      if (!needsCleanup) {
        synced.current.add(c.id);
        return;
      }

      synced.current.add(c.id);
      updateGuaranteeCase(c.id, {
        blockedBy: 'SIN_BLOQUEO',
        blockedReasonNotes: '',
        nextManagement: '',
        nextManagementDate: '',
        nextManagementResponsible: ''
      });
    });
  }, [cases, receivables, updateGuaranteeCase]);

  return null;
};
