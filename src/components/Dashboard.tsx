import React from 'react';
import { useApp } from '../context/AppContext';
import { GuaranteeCase } from '../types';
import { formatCLP, calculateDaysDifference } from '../utils/formatters';
import { calculateFundingReadiness } from '../utils/calculations';
import {
  CheckCircle2,
  Wrench,
  DollarSign,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  UserCheck,
  ShieldAlert,
  Clock3,
  FileCheck2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { cases, receivables, settings, setSelectedCaseId, setActiveView } = useApp();

  const openCases = cases.filter(c => !c.isClosed);
  const activeCases = openCases.filter(c => !c.isCompleted);
  const completedPendingClose = openCases.filter(c => c.isCompleted);

  const parseDateStr = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isOverdue = (dateStr?: string) => {
    const d = parseDateStr(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isTodayDate = (dateStr?: string) => {
    const d = parseDateStr(dateStr);
    if (!d) return false;
    return d.toDateString() === new Date().toDateString();
  };

  const formatShortDateStr = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha';
    if (isTodayDate(dateStr)) return 'Hoy';
    if (isOverdue(dateStr)) {
      const d = parseDateStr(dateStr)!;
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

  const liveReceivables = receivables.filter(r =>
    r.pendingBalance > 0 && r.status !== 'PAGADA' && r.status !== 'INCOBRABLE'
  );
  const totalPendingTenant = liveReceivables.reduce((sum, r) => sum + r.pendingBalance, 0);

  const ownerContributionsToRecover = openCases.reduce((sum, c) => sum + Math.max(0, c.ownerContribution || 0), 0);
  const faunaFinancingToRecover = openCases.reduce((sum, c) => sum + Math.max(0, c.faunaFinancing || 0), 0);

  const fundingByCase = new Map<string, ReturnType<typeof calculateFundingReadiness>>(
    cases.map(c => [c.id, calculateFundingReadiness(c, settings)] as const)
  );
  const ownerRepairFundingPending = openCases.reduce(
    (sum, c) => sum + (fundingByCase.get(c.id)?.ownerRepairPendingProvision || 0),
    0
  );
  const ownerServicePendingOpen = openCases.reduce(
    (sum, c) => sum + (fundingByCase.get(c.id)?.ownerServicePending || 0),
    0
  );
  const ownerPostClosePending = cases
    .filter(c => c.isClosed && Boolean(c.ownerPostClosePending))
    .reduce((sum, c) => sum + (fundingByCase.get(c.id)?.ownerServicePending || 0), 0);
  const ownerServicePending = ownerServicePendingOpen + ownerPostClosePending;
  const ownerPostClosePendingCount = cases.filter(c =>
    c.isClosed && Boolean(c.ownerPostClosePending) && (fundingByCase.get(c.id)?.ownerServicePending || 0) > 0
  ).length;

  let faunaRecoveredThisMonth = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  cases.forEach(c => {
    (c.movements || []).forEach(m => {
      if (m.type !== 'RECUPERACION_FAUNA') return;
      const movementDate = parseDateStr(m.date);
      if (!movementDate) return;
      if (movementDate.getMonth() === currentMonth && movementDate.getFullYear() === currentYear) {
        faunaRecoveredThisMonth += Math.max(0, m.amount);
      }
    });
  });

  const monthLabelRaw = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(new Date());
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  type StageKey = 'PREPARANDO' | 'REPARACIONES' | 'ANTECEDENTES' | 'LISTA_CONFIRMAR' | 'CONFIRMADA' | 'LISTO_CERRAR';

  const stageForCase = (c: GuaranteeCase): StageKey => {
    if (c.isCompleted) return 'LISTO_CERRAR';
    if (c.liquidationStatus === 'EMITIDA') return 'CONFIRMADA';
    if (c.liquidationStatus === 'LISTA') return 'LISTA_CONFIRMAR';
    if (activeRepairCharges(c).length > 0 || c.preparationStatus === 'REPARANDO') return 'REPARACIONES';
    if (c.preparationStatus === 'PENDIENTE') return 'PREPARANDO';
    return 'ANTECEDENTES';
  };

  const stageCounts: Record<StageKey, number> = {
    PREPARANDO: 0,
    REPARACIONES: 0,
    ANTECEDENTES: 0,
    LISTA_CONFIRMAR: 0,
    CONFIRMADA: 0,
    LISTO_CERRAR: 0
  };

  openCases.forEach(c => {
    stageCounts[stageForCase(c)] += 1;
  });

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
    const missingManagement = !c.nextManagement || !c.nextManagement.trim();

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
    if ((readiness?.ownerServicePending || 0) > 0) {
      return { priority: 7, reason: `${formatCLP(readiness!.ownerServicePending)} en servicios pendientes del propietario` };
    }
    if (missingManagement) {
      return { priority: 8, reason: 'Sin próxima gestión registrada' };
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

  const stageCards: Array<[StageKey, string, string]> = [
    ['PREPARANDO', 'Preparando salida', 'Recepción y antecedentes iniciales'],
    ['REPARACIONES', 'Reparaciones en curso', 'Trabajos pendientes o en ejecución'],
    ['ANTECEDENTES', 'Completando antecedentes', 'Checklist previo a liquidar'],
    ['LISTA_CONFIRMAR', 'Lista para confirmar', 'Liquidación preparada'],
    ['CONFIRMADA', 'Liquidación confirmada', 'Pendiente de devolución o cobranza'],
    ['LISTO_CERRAR', 'Listo para cerrar', 'Sin obligaciones operativas pendientes']
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Casos abiertos</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{openCases.length}</span>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-xl text-[#1E382B]"><Building2 className="w-4 h-4" /></div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">
            {activeCases.length} en gestión · {completedPendingClose.length} listos para cerrar
          </p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Requieren atención</span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">{prioritizedCases.length}</span>
            </div>
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <p className="text-[10px] text-amber-800 font-medium mt-2">Gestiones, plazos, fondos o cierres pendientes</p>
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

        <div className="bg-emerald-900 p-4 rounded-2xl text-white shadow-md shadow-emerald-950/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">Por cobrar arrendatarios</span>
              <span className="text-xl font-black text-white mt-1 block font-mono">{formatCLP(totalPendingTenant)}</span>
            </div>
            <div className="p-2.5 bg-emerald-800/80 rounded-xl text-emerald-300"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-[10px] text-emerald-200/80 font-medium mt-2">{liveReceivables.length} cuentas con saldo vigente</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 bg-[#1E382B] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Casos que requieren atención</h3>
              <p className="text-[11px] text-emerald-200/80 font-medium">Solo situaciones que requieren una acción concreta</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-900/90 border border-emerald-700/60 px-3 py-1 rounded-full font-bold text-emerald-200">
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
              const overdueManagement = Boolean(caseObj.nextManagementDate && isOverdue(caseObj.nextManagementDate));
              const formattedDate = formatShortDateStr(caseObj.nextManagementDate);
              const isReadyToClose = Boolean(caseObj.isCompleted);

              return (
                <div key={caseObj.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3 min-w-[280px]">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#1E382B] shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-[#1E382B] font-extrabold text-sm">{caseObj.id}</strong>
                        <span className="text-slate-800 font-semibold">{caseObj.propertyAddress}, {caseObj.propertyUnit}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center gap-1 ${isReadyToClose ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-rose-100 text-rose-900 border-rose-200'}`}>
                          {isReadyToClose ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <ShieldAlert className="w-3 h-3 text-rose-600" />}
                          {category.reason}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Próxima gestión</span>
                      <p className="font-semibold text-slate-800 text-xs">
                        {caseObj.nextManagement || <span className="text-rose-500 italic">Pendiente definir gestión</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-slate-600">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha</span>
                        <span className={`font-bold ${overdueManagement ? 'text-rose-600' : 'text-slate-800'}`}>{formattedDate}</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Responsable</span>
                        <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-[#2D8B73]" />
                          {caseObj.nextManagementResponsible || caseObj.responsible || 'Sin asignar'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => handleSelectCase(caseObj.id)} className="px-3.5 py-2 bg-[#1E382B] hover:bg-[#14261d] text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0">
                    Ver caso <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-[#1E382B]" /> Estado actual de los casos
            </h3>
            <p className="text-xs text-slate-500 font-medium">Una sola etapa operativa por cada caso abierto</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {stageCards.map(([key, label, description]) => (
              <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide block">{label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight block mt-1">{description}</span>
                  </div>
                  <strong className="text-xl font-black text-[#1E382B]">{stageCounts[key]}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-900 flex items-start gap-2">
            <FileCheck2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>El dashboard toma el avance de las reparaciones directamente desde los cargos clasificados como Daño / reparación.</span>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#1E382B]" /> Estado financiero interno
            </h3>
            <p className="text-xs text-slate-500 font-medium">Saldos actuales mostrados por concepto</p>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div><span className="text-[10px] font-extrabold text-slate-500 uppercase block">Por cobrar a arrendatarios</span><span className="text-[11px] text-slate-500">Saldo vigente</span></div>
              <strong className="text-sm font-black text-slate-900 font-mono">{formatCLP(totalPendingTenant)}</strong>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
              <div><span className="text-[10px] font-extrabold text-blue-900 uppercase block">Aportes propietario por recuperar</span><span className="text-[11px] text-blue-700">Ya provisionados por el propietario</span></div>
              <strong className="text-sm font-black text-blue-900 font-mono">{formatCLP(ownerContributionsToRecover)}</strong>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div><span className="text-[10px] font-extrabold text-[#1E382B] uppercase block">Financiamiento Fauna por recuperar</span><span className="text-[11px] text-emerald-700">Cobertura Full efectivamente aplicada</span></div>
              <strong className="text-sm font-black text-[#1E382B] font-mono">{formatCLP(faunaFinancingToRecover)}</strong>
            </div>
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
              <div><span className="text-[10px] font-extrabold text-amber-900 uppercase block">Fondos propietario pendientes para reparar</span><span className="text-[11px] text-amber-700">Bloquean ejecución de reparaciones</span></div>
              <strong className="text-sm font-black text-amber-900 font-mono">{formatCLP(ownerRepairFundingPending)}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div><span className="text-[10px] font-extrabold text-slate-600 uppercase block">Servicios pendientes del propietario</span><span className="text-[11px] text-slate-500">{ownerPostClosePendingCount > 0 ? `${formatCLP(ownerPostClosePending)} en seguimiento posterior · ${ownerPostClosePendingCount} caso${ownerPostClosePendingCount > 1 ? 's' : ''}` : 'No bloquean la liquidación'}</span></div>
              <strong className="text-sm font-black text-slate-900 font-mono">{formatCLP(ownerServicePending)}</strong>
            </div>
            <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex items-center justify-between">
              <div><span className="text-[10px] font-extrabold text-slate-600 uppercase block">Recuperado por Fauna este mes</span><span className="text-[11px] text-slate-500">{monthLabel}</span></div>
              <strong className="text-sm font-black font-mono text-emerald-800">{formatCLP(faunaRecoveredThisMonth)}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};