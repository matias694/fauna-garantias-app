import { GuaranteeCase, SystemSettings } from '../types';
import { calculateFundingReadiness, calculateGuaranteeFinances } from './calculations';

export interface EffectiveNextManagement {
  action: string;
  date?: string;
  responsible: string;
  source: 'RECORDED' | 'SYSTEM';
}

/**
 * Read model operativo para la próxima gestión.
 *
 * Una gestión registrada por el usuario siempre tiene prioridad. Cuando un
 * caso abierto todavía no tiene una, el sistema deriva una acción inmediata
 * desde el estado del caso. No persiste fechas ficticias: las acciones
 * derivadas se presentan como "Ahora" en la UI hasta que el usuario programe
 * una fecha real.
 *
 * En el backend definitivo esta misma regla puede vivir en el read model/API
 * sin cambiar las pantallas consumidoras.
 */
export const getEffectiveNextManagement = (
  guaranteeCase: GuaranteeCase,
  settings: SystemSettings
): EffectiveNextManagement => {
  const responsible =
    guaranteeCase.nextManagementResponsible ||
    guaranteeCase.responsible ||
    'Sin asignar';

  const recordedAction = guaranteeCase.nextManagement?.trim();
  if (recordedAction) {
    return {
      action: recordedAction,
      date: guaranteeCase.nextManagementDate,
      responsible,
      source: 'RECORDED'
    };
  }

  if (guaranteeCase.isClosed) {
    return {
      action: 'Sin gestiones pendientes',
      responsible,
      source: 'SYSTEM'
    };
  }

  if (guaranteeCase.isCompleted) {
    return {
      action: 'Revisar cierre del caso',
      responsible,
      source: 'SYSTEM'
    };
  }

  const readiness = calculateFundingReadiness(guaranteeCase, settings);
  if (readiness.ownerRepairPendingProvision > 0) {
    return {
      action: 'Solicitar y registrar aporte del propietario',
      responsible,
      source: 'SYSTEM'
    };
  }

  if (guaranteeCase.blockedBy !== 'SIN_BLOQUEO') {
    return {
      action: `Resolver bloqueo con ${guaranteeCase.blockedBy.replace(/_/g, ' ').toLowerCase()}`,
      responsible,
      source: 'SYSTEM'
    };
  }

  if (guaranteeCase.liquidationStatus === 'LISTA') {
    return {
      action: 'Confirmar liquidación',
      responsible,
      source: 'SYSTEM'
    };
  }

  if (guaranteeCase.liquidationStatus === 'EMITIDA') {
    const fin = calculateGuaranteeFinances(guaranteeCase, settings);
    const refund = guaranteeCase.liquidationSnapshot?.financials.refundToTenant ?? fin.refundToTenant;
    const deficit = guaranteeCase.liquidationSnapshot?.financials.tenantDeficit ?? fin.tenantDeficit;

    if (refund > 0 && guaranteeCase.refund?.status !== 'TRANSFERIDA') {
      return {
        action: 'Realizar y registrar devolución al arrendatario',
        responsible,
        source: 'SYSTEM'
      };
    }

    if (deficit > 0) {
      return {
        action: 'Gestionar cobranza al arrendatario',
        responsible,
        source: 'SYSTEM'
      };
    }

    return {
      action: 'Revisar cierre del caso',
      responsible,
      source: 'SYSTEM'
    };
  }

  if (guaranteeCase.preparationStatus === 'REPARANDO') {
    return {
      action: 'Revisar avance de reparaciones',
      responsible,
      source: 'SYSTEM'
    };
  }

  if (guaranteeCase.preparationStatus === 'PENDIENTE') {
    return {
      action: 'Ingresar y coordinar reparaciones',
      responsible,
      source: 'SYSTEM'
    };
  }

  return {
    action: 'Completar antecedentes de liquidación',
    responsible,
    source: 'SYSTEM'
  };
};
