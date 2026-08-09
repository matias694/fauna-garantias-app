import React from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase } from '../../types';
import { History } from 'lucide-react';

interface HistoryTabProps {
  guaranteeCase: GuaranteeCase;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ guaranteeCase }) => {
  const { auditLogs } = useApp();

  const caseLogs = auditLogs.filter(l => l.caseId === guaranteeCase.id);

  const getDisplayAction = (action: string) => {
    if (action === 'Emisión de Liquidación') return 'Confirmación de Liquidación';
    return action;
  };

  const getDisplayDetail = (detail: string) => detail
    .replace('Liquidación de garantía emitida formalmente', 'Liquidación de garantía confirmada como definitiva')
    .replace('cambió Liquidación a EMITIDA', 'cambió Liquidación a CONFIRMADA');

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Historial de Trazabilidad del Caso ({caseLogs.length} eventos)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro inmutable de acciones, cambios de estado y transacciones financieras.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        {caseLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No existen registros de auditoría almacenados para este caso.
          </div>
        ) : (
          <div className="relative border-l-2 border-emerald-200 ml-4 space-y-6 py-2">
            {caseLogs.map(log => (
              <div key={log.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="font-mono text-slate-700">{log.timestamp}</span>
                    <span className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px]">{log.user}</span>
                  </div>

                  <h5 className="font-bold text-slate-900 text-xs">{getDisplayAction(log.action)}</h5>
                  <p className="text-slate-600 text-xs">{getDisplayDetail(log.detail)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
