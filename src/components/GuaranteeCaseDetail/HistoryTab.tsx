import React from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase } from '../../types';
import { History } from 'lucide-react';

interface HistoryTabProps {
  guaranteeCase: GuaranteeCase;
}

type HistoryEvent = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  detail: string;
  sortValue: number;
};

const parseChileTimestamp = (value: string) => {
  const match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4}),?\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const HistoryTab: React.FC<HistoryTabProps> = ({ guaranteeCase }) => {
  const { auditLogs } = useApp();

  const getDisplayAction = (action: string) => {
    if (action === 'Emisión de Liquidación') return 'Confirmación de Liquidación';
    return action;
  };

  const getDisplayDetail = (detail: string) => detail
    .replace('Liquidación de garantía emitida formalmente', 'Liquidación de garantía confirmada como definitiva')
    .replace('cambió Liquidación a EMITIDA', 'cambió Liquidación a CONFIRMADA');

  // Los comentarios de seguimiento se muestran con su contenido real. También se oculta
  // el audit técnico genérico de updateCharge: la pantalla de cargos registra un evento
  // descriptivo con el cambio real (monto, estado, proveedor, fecha, etc.).
  const auditEvents: HistoryEvent[] = auditLogs
    .filter(log => {
      if (log.caseId !== guaranteeCase.id) return false;
      if (log.action === 'Seguimiento Registrado') return false;
      if (log.action === 'Cargo Actualizado' && /^Cargo CHG-.* actualizado$/.test(log.detail)) return false;
      return true;
    })
    .map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      user: log.user,
      action: getDisplayAction(log.action),
      detail: getDisplayDetail(log.detail),
      sortValue: parseChileTimestamp(log.timestamp)
    }));

  const followUpEvents: HistoryEvent[] = (guaranteeCase.followUps || []).map(item => ({
    id: `HIST-${item.id}`,
    timestamp: item.createdAt,
    user: item.user,
    action: item.comment.startsWith('Próxima gestión actualizada desde Resumen')
      ? 'Próxima gestión actualizada'
      : `Seguimiento · ${item.area === 'Garantia' ? 'Garantía' : item.area === 'Reparacion' ? 'Reparación' : 'General'}`,
    detail: item.comment,
    sortValue: parseChileTimestamp(item.createdAt)
  }));

  const events = [...auditEvents, ...followUpEvents].sort((a, b) => b.sortValue - a.sortValue);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Historial del caso ({events.length} eventos)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Cambios de estado, seguimientos, gestiones y transacciones relevantes.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No existen registros para este caso.</div>
        ) : (
          <div className="relative border-l-2 border-emerald-200 ml-4 space-y-6 py-2">
            {events.map(event => (
              <div key={event.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="font-mono text-slate-700">{event.timestamp}</span>
                    <span className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px]">{event.user}</span>
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
