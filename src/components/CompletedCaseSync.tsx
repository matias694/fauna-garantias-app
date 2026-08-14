import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateGuaranteeFinances } from '../utils/calculations';

/**
 * El usuario ejecuta acciones; el sistema administra el estado terminal del caso.
 *
 * Un caso se cierra automáticamente cuando:
 * - la preparación está lista;
 * - la liquidación fue confirmada;
 * - no existe un bloqueo operativo ajeno a una cobranza ya resuelta; y
 * - el resultado financiero ya no requiere acción:
 *   · saldo exacto: al confirmar;
 *   · devolución: al registrar la devolución;
 *   · deuda arrendatario: al quedar pagada o incobrable.
 *
 * Los gastos comunes/servicios a cargo del propietario son informativos y no
 * mantienen viva la garantía. Si un Administrador reabre manualmente un caso,
 * se respeta esa reapertura para permitir una revisión excepcional.
 */
export const CompletedCaseSync: React.FC = () => {
  const { cases, settings, updateGuaranteeCase, logAudit } = useApp();

  useEffect(() => {
    cases.forEach(c => {
      if (c.isClosed) {
        const needsClosedCleanup =
          c.blockedBy !== 'SIN_BLOQUEO' ||
          Boolean(c.blockedReasonNotes?.trim()) ||
          Boolean(c.nextManagement?.trim()) ||
          Boolean(c.nextManagementDate?.trim()) ||
          Boolean(c.nextManagementResponsible?.trim()) ||
          Boolean(c.ownerServiceDeferral) ||
          Boolean(c.ownerPostClosePending);

        if (needsClosedCleanup) {
          updateGuaranteeCase(c.id, {
            blockedBy: 'SIN_BLOQUEO',
            blockedReasonNotes: '',
            nextManagement: '',
            nextManagementDate: '',
            nextManagementResponsible: '',
            ownerServiceDeferral: undefined,
            ownerPostClosePending: undefined
          });
        }
        return;
      }

      // Reapertura manual: closedAt se conserva como señal de que un Administrador
      // decidió volver a abrir un caso que ya había llegado a estado terminal.
      if (c.closedAt) return;
      if (c.preparationStatus !== 'LISTA' || c.liquidationStatus !== 'EMITIDA') return;

      const fin = calculateGuaranteeFinances(c, settings);
      const originalRefund = c.liquidationSnapshot?.financials.refundToTenant ?? fin.refundToTenant;
      const originalDeficit = c.liquidationSnapshot?.financials.tenantDeficit ?? fin.tenantDeficit;
      const collectionResolved = c.receivableStatus === 'PAGADA' || c.receivableStatus === 'INCOBRABLE';

      const hasUnrelatedBlock =
        c.blockedBy !== 'SIN_BLOQUEO' &&
        !(c.blockedBy === 'ARRENDATARIO' && collectionResolved);
      if (hasUnrelatedBlock) return;

      let terminalReason = '';
      if (originalRefund > 0) {
        if (c.refund?.status !== 'TRANSFERIDA') return;
        terminalReason = 'devolución al arrendatario registrada';
      } else if (originalDeficit > 0) {
        if (!collectionResolved) return;
        terminalReason = c.receivableStatus === 'PAGADA'
          ? 'cobranza pagada completamente'
          : 'cobranza cerrada como incobrable';
      } else {
        terminalReason = 'liquidación confirmada sin saldo pendiente';
      }

      updateGuaranteeCase(c.id, {
        isClosed: true,
        isCompleted: true,
        closedAt: new Date().toISOString(),
        closedBy: 'Sistema',
        blockedBy: 'SIN_BLOQUEO',
        blockedReasonNotes: '',
        nextManagement: '',
        nextManagementDate: '',
        nextManagementResponsible: '',
        ownerServiceDeferral: undefined,
        ownerPostClosePending: undefined
      });

      logAudit(
        c.id,
        'Cierre automático de Caso',
        `Caso ${c.id} cerrado automáticamente: ${terminalReason}.`
      );
    });
  }, [cases, settings, updateGuaranteeCase, logAudit]);

  return null;
};