import React from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, AuditLog, RequirementStatus, ChargeCategory } from '../../types';
import { formatCLP } from '../../utils/formatters';
import { History } from 'lucide-react';

interface HistoryTabProps {
  guaranteeCase: GuaranteeCase;
}

type HistoryEvent = {
  id: string;
  timestamp: string;
  user: string;
  userEmail?: string;
  action: string;
  detail: string;
  sortValue: number;
};

const parseChileTimestamp = (value: string) => {
  const match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, day, month, year, hour, minute, second = '0'] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const requirementStatusLabel = (status: string) => {
  if (status === 'COMPLETO') return 'Completo';
  if (status === 'NO_APLICA') return 'No aplica';
  if (status === 'PENDIENTE') return 'Pendiente';
  return status.replace(/_/g, ' ').toLowerCase();
};

const liquidationStatusLabel = (status: string) => {
  if (status === 'EMITIDA') return 'Confirmada';
  if (status === 'LISTA') return 'Lista para confirmar';
  if (status === 'EN_PREPARACION') return 'En preparación';
  return status.replace(/_/g, ' ').toLowerCase();
};

const blockedByLabel = (blockedBy: string) => {
  if (blockedBy === 'SIN_BLOQUEO') return 'Sin bloqueo';
  return blockedBy.replace(/_/g, ' ').toLowerCase();
};

const normalizeCategory = (category: ChargeCategory): ChargeCategory => {
  if (['PINTURA', 'LIMPIEZA', 'DAÑOS'].includes(category)) return 'REPARACIONES';
  return category;
};

const conceptLabel = (category?: ChargeCategory) => {
  if (!category) return 'Movimiento de liquidación';
  const normalized = normalizeCategory(category);
  const labels: Partial<Record<ChargeCategory, string>> = {
    REPARACIONES: 'Daño / reparación',
    GASTOS_COMUNES: 'Gastos comunes',
    AGUA: 'Agua',
    ELECTRICIDAD: 'Electricidad',
    GAS: 'Gas',
    OTROS_SERVICIOS: 'Otros servicios',
    OTRO: 'Otro'
  };
  return labels[normalized] || normalized.replace(/_/g, ' ').toLowerCase();
};

const formatCLPAmountsInText = (value: string) => value.replace(
  /\$(-?)(\d+(?:\.\d{3})*)/g,
  (_match, sign: string, rawAmount: string) => {
    const amount = Number(rawAmount.replace(/\./g, ''));
    if (!Number.isFinite(amount)) return _match;
    const formatted = amount.toLocaleString('es-CL');
    return sign === '-' ? `-$${formatted}` : `$${formatted}`;
  }
);

export const HistoryTab: React.FC<HistoryTabProps> = ({ guaranteeCase }) => {
  const { auditLogs } = useApp();

  const findRequirementName = (requirementId: string) => {
    const exact = guaranteeCase.requirements.find(req => req.id === requirementId);
    if (exact) return exact.name;

    const compatible = guaranteeCase.requirements.find(req =>
      requirementId.endsWith(req.id) || req.id.endsWith(requirementId)
    );
    return compatible?.name || 'Requisito de liquidación';
  };

  const findChargeByDescription = (description: string) => {
    const matches = guaranteeCase.charges.filter(ch => ch.description.trim() === description.trim());
    return matches[matches.length - 1];
  };

  const normalizeAuditLog = (log: AuditLog): HistoryEvent | null => {
    if (log.action === 'Actualización de Caso') return null;
    if (log.action === 'Seguimiento Registrado') return null;
    if (log.action === 'Preparación Actualizada') return null;
    if (log.action === 'Cargo Actualizado' && /^Cargo\s+.+\s+actualizado$/i.test(log.detail)) return null;
    if (log.action === 'Reparación Actualizada' && /^Reparación\s+.+\s+actualizada$/i.test(log.detail)) return null;

    let action = log.action;
    let detail = log.detail;

    if (action === 'Emisión de Liquidación') {
      action = 'Liquidación confirmada';
      detail = 'La liquidación de garantía fue confirmada como definitiva.';
    }

    if (action === 'Requisito Actualizado') {
      const match = detail.match(/^Requisito\s+(.+?)\s+marcado como\s+(PENDIENTE|COMPLETO|NO_APLICA)$/i);
      if (match) {
        const [, requirementId, status] = match;
        const requirementName = findRequirementName(requirementId);
        action = `${requirementName} actualizado`;
        detail = `Estado: ${requirementStatusLabel(status.toUpperCase() as RequirementStatus)}.`;
      }
    }

    if (action === 'Estado Liquidación Cambiado') {
      const match = detail.match(/cambió Liquidación a\s+([A-Z_]+)\s+\(Bloqueo:\s*([A-Z_]+)\)/i);
      if (match) {
        const [, status, blockedBy] = match;
        action = 'Estado de liquidación actualizado';
        detail = `Liquidación: ${liquidationStatusLabel(status.toUpperCase())}.`;
        if (blockedBy.toUpperCase() !== 'SIN_BLOQUEO') {
          detail += ` Bloqueado por: ${blockedByLabel(blockedBy.toUpperCase())}.`;
        }
      }
    }

    if (action === 'Cargo Creado') {
      const match = detail.match(/^Cargo\s+[“"](.+?)[”"]\s+por\s+\$(-?\d+)\s+añadido$/i);
      if (match) {
        const [, description, rawAmount] = match;
        const amount = Number(rawAmount);
        const charge = findChargeByDescription(description);
        const isCredit = amount < 0 || Boolean(charge && charge.amount < 0);
        action = isCredit ? 'Abono agregado' : 'Cargo agregado';
        detail = `${conceptLabel(charge?.category)} · “${description}” · ${isCredit ? '+' : '-'}${formatCLP(Math.abs(amount))}`;
      }
    }

    if (action === 'Estado de reparación actualizado') {
      const match = detail.match(/^[“"](.+?)[”"]\s+cambió de\s+(.+?)\s+a\s+(.+?)\.$/i);
      if (match) {
        const [, description, fromStatus, toStatus] = match;
        const charge = findChargeByDescription(description);
        const chargeContext = charge
          ? `${conceptLabel(charge.category)} · “${description}” · ${formatCLP(Math.abs(charge.amount))}`
          : `Reparación · “${description}”`;
        detail = `${chargeContext}\nEstado: ${fromStatus} → ${toStatus}.`;
      }
    }

    if (action === 'Documento Adjuntado') {
      const match = detail.match(/^Archivo\s+(.+?)\s+adjuntado$/i);
      if (match) {
        const fileName = match[1];
        const attachment = guaranteeCase.attachments.find(att => att.name === fileName);
        action = 'Documento adjuntado';
        detail = `${attachment?.category || 'Documento'} · ${fileName}`;
      }
    }

    if (action === 'Cargo Eliminado' && /^Cargo\s+.+\s+eliminado$/i.test(detail)) {
      action = 'Cargo eliminado';
      detail = 'Se eliminó un movimiento de la liquidación.';
    }

    if (action === 'Reparación Eliminada' && /^Reparación\s+.+\s+eliminada$/i.test(detail)) {
      action = 'Reparación eliminada';
      detail = 'Se eliminó una reparación del caso.';
    }

    if (action === 'Cierre de Caso') detail = 'El caso fue cerrado.';
    if (action === 'Reapertura de Caso') detail = 'El caso fue reabierto.';

    detail = formatCLPAmountsInText(detail);

    return {
      id: log.id,
      timestamp: log.timestamp,
      user: log.actorName || log.user,
      userEmail: log.actorEmail,
      action,
      detail,
      sortValue: parseChileTimestamp(log.timestamp)
    };
  };

  const auditEvents: HistoryEvent[] = auditLogs
    .filter(log => log.caseId === guaranteeCase.id)
    .map(normalizeAuditLog)
    .filter((event): event is HistoryEvent => Boolean(event));

  const followUpEvents: HistoryEvent[] = (guaranteeCase.followUps || []).map(item => {
    const sourceComment = item.originalComment || item.comment;
    const sourceArea = item.originalArea || item.area;
    const isNextManagementUpdate = sourceComment.startsWith('Próxima gestión actualizada desde Resumen');
    const cleanedComment = isNextManagementUpdate
      ? sourceComment.replace(/^Próxima gestión actualizada desde Resumen:\s*/i, '').trim()
      : sourceComment;

    return {
      id: `HIST-${item.id}`,
      timestamp: item.createdAt,
      user: item.userName || item.user,
      userEmail: item.userEmail,
      action: isNextManagementUpdate
        ? 'Próxima gestión actualizada'
        : `Seguimiento · ${sourceArea === 'Garantia' ? 'Garantía' : sourceArea === 'Reparacion' ? 'Reparación' : 'General'}`,
      detail: formatCLPAmountsInText(cleanedComment),
      sortValue: parseChileTimestamp(item.createdAt)
    };
  });

  const sortedEvents = [...auditEvents, ...followUpEvents].sort((a, b) => b.sortValue - a.sortValue);

  const events = sortedEvents.filter((event, index, all) => {
    if (event.action === 'Cargo agregado') {
      const detailedRepairEvent = all.some(candidate =>
        candidate.id !== event.id &&
        candidate.action === 'Reparación incorporada' &&
        candidate.user === event.user &&
        Math.abs(candidate.sortValue - event.sortValue) <= 3000
      );
      if (detailedRepairEvent) return false;
    }

    const duplicate = all.findIndex(candidate =>
      candidate.action === event.action &&
      candidate.detail === event.detail &&
      candidate.user === event.user &&
      Math.abs(candidate.sortValue - event.sortValue) <= 1000
    );
    return duplicate === index;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Historial del caso ({events.length} eventos)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Acciones, cambios y transacciones relevantes del caso.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No existen registros relevantes para este caso.</div>
        ) : (
          <div className="relative border-l-2 border-emerald-200 ml-4 space-y-6 py-2">
            {events.map(event => (
              <div key={event.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-start justify-between gap-3 text-[11px] text-slate-500 font-medium">
                    <span className="font-mono text-slate-700">{event.timestamp}</span>
                    <div className="text-right">
                      <span className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px] inline-block">{event.user}</span>
                      {event.userEmail && (
                        <span className="block text-[9px] text-slate-400 mt-0.5">{event.userEmail}</span>
                      )}
                    </div>
                  </div>
                  <h5 className="font-bold text-slate-900 text-xs">{event.action}</h5>
                  <p className="text-slate-600 text-xs whitespace-pre-line">{event.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
