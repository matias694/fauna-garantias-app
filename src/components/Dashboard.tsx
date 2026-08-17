import React from 'react';
import { useApp } from '../context/AppContext';
import { GuaranteeCase } from '../types';
import { formatCLP, calculateDaysDifference, parseLocalDate } from '../utils/formatters';
import { calculateFundingReadiness } from '../utils/calculations';
import { getEffectiveNextManagement } from '../utils/nextManagement';
import {
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { cases, settings, setSelectedCaseId, setActiveView } = useApp();

  const openCases = cases.filter(c => !c.isClosed);
  const activeCases = openCases.filter(c => !c.isCompleted);

  const isOverdue = (dateStr?: string) => {
    const d = parseLocalDate(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isTodayDate = (dateStr?: string) => {
    const d = parseLocalDate(dateStr);
    if (!d) return false;
    return d.toDateString() === new Date().toDateString();
  };

  const formatShortDateStr = (dateStr?: string) => {
    if (!dateStr) return 'Ahora';
    if (isTodayDate(dateStr)) return 'Hoy';
    if (isOverdue(dateStr)) {
      const d = parseLocalDate(dateStr)!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.max(1, Math.round((today.getTime() - d.getTime()) / (1000 * 3600 * 24)));
      return `Vencida hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    }
    return dateStr;
  };

  const repairCharges = (c: GuaranteeCase) => (c.charges || []).filter(ch =>
    ch.amount > 0 && ch.type === 'DAÑO_REPARACION'
  );

  const activeRepairCharges = (c: GuaranteeCase) => repairCharges(c).filter(ch => {
    const status = ch.repairTracking?.status || 'PENDIENTE';
    return status !== 'TERMINADA' && status !== 'CANCELADA';
  });

  const casesWithActiveRepairs = activeCases.filter(c =>
    activeRepairCharges(c).length > 0 || c.preparationStatus === 'REPARANDO'
  );

  const activeRepairCount = activeCases.reduce((sum, c) => sum + activeRepairCharges(c).length, 0);

  const fundingByCase = new Map<string, ReturnType<typeof calculateFundingReadiness>>(
    openCases.map(c => [c.id, calculateFundingReadiness(c, settings)] as const)
  );

  const getAttentionCategory = (c: GuaranteeCase) => {
    if (c.isCompleted) {
      return { priority: 0, reason: 'Caso completado · pendiente de cerrar' };
    }

    const daysOpen = calculateDaysDifference(c.receptionDate);
    const managementOverdue = Boolean(c.nextManagementDate && isOverdue(c.nextManagementDate));
    const deadlineAlert = daysOpen >= settings.alertDay;
    const delayedRepair = activeRepairCharges(c).find(ch =>
      Boolean(ch.repairTracking?.commitmentDate && isOverdue(ch.repairTracking.commitmentDate))
    );
    const readiness = fundingByCase.get(c.id);
    const isBlocked = c.blockedBy !== 'SIN_BLOQUEO';
    const missingRecordedManagement = !c.nextManagement || !c.nextManagement.trim();

    if (managementOverdue) {
      return { priority: 1, reason: 'Próxima gestión vencida' };
    }
    if (deadlineAlert) {
      return {
        priority: 2,
        reason: daysOpen > settings.maxLiquidationDays
          ? `Plazo máximo superado (${daysOpen} días)`
          : `Caso en alerta de plazo (${daysOpen} días)`
      };
    }
    if (delayedRepair) {
      return { priority: 3, reason: `Reparación atrasada: ${delayedRepair.description}` };
    }
    if ((readiness?.ownerRepairPendingProvision || 0) > 0) {
      return { priority: 4, reason: `Faltan ${formatCLP(readiness!.ownerRepairPendingProvision)} del propietario para reparaciones` };
    }
    if (isBlocked) {
      return { priority: 5, reason: `Bloqueado por ${c.blockedBy.replace(/_/g, ' ').toLowerCase()}` };
    }
    if (c.liquidationStatus === 'LISTA') {
      return { priority: 6, reason: 'Lista para confirmar liquidación' };
    }
    if (missingRecordedManagement) {
      return { priority: 7, reason: 'Próxima gestión pendiente de programar' };
    }

    return null;
  };

  const prioritizedCases = openCases
    .map(c => ({ caseObj: c, category: getAttentionCategory(c) }))
    .filter((item): item is { caseObj: GuaranteeCase; category: { priority: number; reason: string } } => Boolean(item.category))
    .sort((a, b) => a.category.priority - b.category.priority);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setActiveView('case-detail');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Casos abiertos</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{openCases.length}</span>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-xl text-[#1E382B]"><Building2 className="w-4 h-4" /></div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Garantías que todavía están en gestión</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Requieren atención</span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">{prioritizedCases.length}</span>
            </div>
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <p className="text-[10px] text-amber-800 font-medium mt-2">Casos con una acción concreta pendiente</p>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">Reparaciones activas</span>
              <span className="text-2xl font-black text-blue-950 mt-1 block">{casesWithActiveRepairs.length}</span>
            </div>
            <div className="p-2.5 bg-blue-100 rounded-xl text-blue-800"><Wrench className="w-4 h-4" /></div>
          </div>
          <p className="text-[10px] text-blue-800 font-medium mt-2">{activeRepairCount} trabajos pendientes o en ejecución</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 bg-[#1E382B] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg shrink-0"><AlertTriangle className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm tracking-tight">Casos que requieren atención</h3>
              <p className="text-[11px] text-emerald-200/80 font-medium">Tu lista de trabajo: solo situaciones que requieren una acción concreta</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-900/90 border border-emerald-700/60 px-3 py-1 rounded-full font-bold text-emerald-200 shrink-0">
            {prioritizedCases.length} pendientes
          </span>
        </div>

        {prioritizedCases.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <strong className="text-slate-800 text-sm block mb-0.5">Todo al día</strong>
            No hay casos abiertos que requieran una acción inmediata.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {prioritizedCases.map(({ caseObj, category }) => {
              const nextManagement = getEffectiveNextManagement(caseObj, settings);
              const overdueManagement = Boolean(nextManagement.date && isOverdue(nextManagement.date));
              const formattedDate = nextManagement.source === 'SYSTEM'
                ? 'Ahora'
                : formatShortDateStr(nextManagement.date);
              const isReadyToClose = Boolean(caseObj.isCompleted);

              return (
                <div
                  key={caseObj.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors grid grid-cols-1 xl:grid-cols-[minmax(300px,0.9fr)_minmax(520px,1.45fr)_132px] xl:items-center gap-4 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#1E382B] shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-[#1E382B] font-extrabold text-sm shrink-0">{caseObj.id}</strong>
                        <span className="text-slate-800 font-semibold min-w-0">{caseObj.propertyAddress}, {caseObj.propertyUnit}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center gap-1 max-w-full ${isReadyToClose ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-rose-100 text-rose-900 border-rose-200'}`}>
                          {isReadyToClose ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />}
                          <span>{category.reason}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px_220px] min-w-0">
                    <div className="p-3 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Siguiente acción</span>
                      <p className="font-semibold text-slate-800 text-xs mt-0.5 break-words">
                        {nextManagement.action}
                      </p>
                    </div>

                    <div className="p-3 border-t sm:border-t-0 sm:border-l border-slate-200 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha</span>
                      <span className={`font-bold block mt-0.5 ${overdueManagement ? 'text-rose-600' : nextManagement.source === 'SYSTEM' ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {formattedDate}
                      </span>
                    </div>

                    <div className="p-3 border-t sm:border-t-0 sm:border-l border-slate-200 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Responsable</span>
                      <span className="font-semibold text-slate-800 flex items-start gap-1 mt-0.5 min-w-0">
                        <UserCheck className="w-3 h-3 text-[#2D8B73] shrink-0 mt-0.5" />
                        <span className="break-words min-w-0">{nextManagement.responsible}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectCase(caseObj.id)}
                    className="w-full xl:w-[132px] px-3.5 py-2.5 bg-[#1E382B] hover:bg-[#14261d] text-white rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  >
                    Ver caso <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
