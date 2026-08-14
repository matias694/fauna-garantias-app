import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCLP } from '../utils/formatters';
import { ShieldAlert, TrendingUp, Clock3, Ban } from 'lucide-react';

export const SensitiveMetricsPanel: React.FC = () => {
  const { cases, settings, userRole } = useApp();
  const allowedRoles = settings.sensitiveMetricsRoles?.length
    ? settings.sensitiveMetricsRoles
    : ['ADMINISTRADOR'];

  if (!allowedRoles.includes(userRole)) return null;

  let financedHistorical = 0;
  let recoveredHistorical = 0;
  let writtenOffHistorical = 0;

  cases.forEach(c => {
    (c.movements || []).forEach(m => {
      if (m.type === 'FINANCIAMIENTO_FAUNA') financedHistorical += Math.max(0, m.amount);
      if (m.type === 'RECUPERACION_FAUNA') recoveredHistorical += Math.max(0, m.amount);
      if (m.type === 'CASTIGO_FAUNA') writtenOffHistorical += Math.max(0, m.amount);
    });
  });

  const pendingRecovery = cases.reduce((sum, c) => sum + Math.max(0, c.faunaFinancing || 0), 0);
  const resolvedExposure = recoveredHistorical + writtenOffHistorical;
  const recoveryRate = resolvedExposure > 0 ? Math.round((recoveredHistorical / resolvedExposure) * 100) : null;

  return (
    <section className="px-4 sm:px-6 pb-6 max-w-7xl mx-auto">
      <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-purple-500/15 border border-purple-400/20 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">Riesgo Plan Full</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Información sensible · visible solo para roles autorizados.</p>
            </div>
          </div>
          {recoveryRate !== null && (
            <span className="text-[11px] text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              Recuperación sobre casos resueltos: <strong className="text-white">{recoveryRate}%</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-800">
          <div className="p-4">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block">Financiado histórico</span>
            <strong className="text-lg font-black font-mono text-white block mt-1">{formatCLP(financedHistorical)}</strong>
            <span className="text-[10px] text-slate-500">Desembolsos realizados por Fauna</span>
          </div>
          <div className="p-4">
            <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400 block flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Recuperado</span>
            <strong className="text-lg font-black font-mono text-emerald-300 block mt-1">{formatCLP(recoveredHistorical)}</strong>
            <span className="text-[10px] text-slate-500">Financiamiento recuperado de arrendatarios</span>
          </div>
          <div className="p-4">
            <span className="text-[9px] uppercase tracking-wider font-bold text-amber-400 block flex items-center gap-1"><Clock3 className="w-3 h-3" /> Pendiente</span>
            <strong className="text-lg font-black font-mono text-amber-300 block mt-1">{formatCLP(pendingRecovery)}</strong>
            <span className="text-[10px] text-slate-500">Exposición vigente aún por recuperar</span>
          </div>
          <div className="p-4">
            <span className="text-[9px] uppercase tracking-wider font-bold text-rose-400 block flex items-center gap-1"><Ban className="w-3 h-3" /> Castigado</span>
            <strong className="text-lg font-black font-mono text-rose-300 block mt-1">{formatCLP(writtenOffHistorical)}</strong>
            <span className="text-[10px] text-slate-500">Financiamiento no recuperado</span>
          </div>
        </div>

        <div className="px-4 py-3 bg-white/[0.03] border-t border-slate-800 text-[10px] text-slate-500">
          Este bloque mide riesgo y recuperación. No representa rentabilidad neta porque los ingresos adicionales del Plan Full todavía no están integrados en este módulo.
        </div>
      </div>
    </section>
  );
};
