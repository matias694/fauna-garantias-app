import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCLP, calculateDaysDifference } from '../utils/formatters';
import {
  Clock,
  CheckCircle2,
  Wrench,
  DollarSign,
  AlertTriangle,
  Building2,
  BarChart3,
  ArrowUpRight,
  UserCheck,
  ShieldAlert,
  Calendar,
  Layers
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { cases, receivables, setSelectedCaseId, setActiveView } = useApp();

  const openCases = cases.filter(c => !c.isClosed);

  // 1. Top KPI Metrics (Max 4)
  const casosAbiertos = openCases.length;

  const casosVencidos = openCases.filter(c => calculateDaysDifference(c.receptionDate) > 60).length;
  const casosProximosVencer = openCases.filter(c => {
    const days = calculateDaysDifference(c.receptionDate);
    return days >= 45 && days <= 60;
  }).length;
  const porVencer = casosVencidos + casosProximosVencer;

  const enReparacion = openCases.filter(c => c.preparationStatus === 'REPARANDO').length;

  const totalPendienteCobrar = receivables.reduce((acc, r) => acc + r.pendingBalance, 0);
  const financiamientoFaunaVigente = openCases.reduce((acc, c) => acc + (c.faunaFinancing || 0), 0);
  const pendienteFinanciero = totalPendienteCobrar + financiamientoFaunaVigente;

  // 2. Preparation & Liquidation Counters
  const pendientesPreparacion = openCases.filter(c => c.preparationStatus === 'PENDIENTE').length;
  const preparadasListas = openCases.filter(c => c.preparationStatus === 'LISTA').length;

  const enPreparacionLiquidation = openCases.filter(c => c.liquidationStatus === 'EN_PREPARACION').length;
  const listasParaLiquidar = openCases.filter(c => c.liquidationStatus === 'LISTA').length;
  const emitidasLiquidation = openCases.filter(c => c.liquidationStatus === 'EMITIDA').length;

  // Faltantes de requisitos más frecuentes (Requisitos en estado PENDIENTE)
  const faltantesCounts = {
    presupuesto: 0,
    gastosComunes: 0,
    agua: 0,
    electricidad: 0,
    gas: 0
  };

  openCases.forEach(c => {
    if (c.liquidationStatus === 'EN_PREPARACION') {
      c.requirements.forEach(req => {
        if (req.status === 'PENDIENTE') {
          const lower = req.name.toLowerCase();
          if (lower.includes('presupuesto') || lower.includes('reparaci')) faltantesCounts.presupuesto++;
          else if (lower.includes('gastos comunes') || lower.includes('ggcc')) faltantesCounts.gastosComunes++;
          else if (lower.includes('agua')) faltantesCounts.agua++;
          else if (lower.includes('electricidad') || lower.includes('luz')) faltantesCounts.electricidad++;
          else if (lower.includes('gas')) faltantesCounts.gas++;
        }
      });
    }
  });

  // 3. Estado Financiero Interno
  const aportesPropietariosPendientes = openCases.reduce((acc, c) => acc + (c.ownerContribution || 0), 0);

  // Recuperado por Fauna Este Mes
  let recuperadoFaunaEsteMes = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  cases.forEach(c => {
    c.movements.forEach(m => {
      if (m.type === 'RECUPERACION_FAUNA') {
        const parts = m.date.split('/');
        if (parts.length === 3) {
          const mMonth = parseInt(parts[1], 10) - 1;
          const mYear = parseInt(parts[2], 10);
          if (mMonth === currentMonth && mYear === currentYear) {
            recuperadoFaunaEsteMes += m.amount;
          }
        }
      }
    });
  });

  // Helper date parsing (DD/MM/YYYY or YYYY-MM-DD)
  const parseDateStr = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
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
    const today = new Date();
    return d.toDateString() === today.toDateString();
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

  // 4. Prioritization for Cases Needing Attention
  // 1. Próximas gestiones vencidas
  // 2. Casos próximos al plazo máximo (>45d or >60d)
  // 3. Reparaciones atrasadas
  // 4. Casos bloqueados
  // 5. Casos abiertos sin próxima gestión
  const getAttentionCategory = (c: typeof openCases[0]) => {
    const daysOpen = calculateDaysDifference(c.receptionDate);
    const managementOverdue = c.nextManagementDate && isOverdue(c.nextManagementDate);
    const deadlineAlert = daysOpen >= 45;
    const hasDelayedRepairs = c.repairs.some(r => r.status !== 'TERMINADA' && r.commitmentDate && isOverdue(r.commitmentDate));
    const isBlocked = c.blockedBy !== 'SIN_BLOQUEO';
    const missingManagement = !c.nextManagement || !c.nextManagement.trim();

    if (managementOverdue) {
      return { priority: 1, reason: 'Próxima gestión vencida' };
    }
    if (deadlineAlert) {
      return { priority: 2, reason: daysOpen > 60 ? 'Plazo máximo superado (>60d)' : 'Próximo a plazo máximo (45d+)' };
    }
    if (hasDelayedRepairs) {
      return { priority: 3, reason: 'Reparación atrasada' };
    }
    if (isBlocked) {
      return { priority: 4, reason: `Bloqueado por ${c.blockedBy}` };
    }
    if (missingManagement) {
      return { priority: 5, reason: 'Sin próxima gestión registrada' };
    }

    return null;
  };

  const prioritizedCases = openCases
    .map(c => ({ caseObj: c, category: getAttentionCategory(c) }))
    .filter(item => item.category !== null)
    .sort((a, b) => a.category!.priority - b.category!.priority);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    setActiveView('case-detail');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* ==================================================
          1. TOP KPIS PRINCIPALES (MÁXIMO 4)
         ================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* KPI 1: Casos Abiertos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Casos Abiertos
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {casosAbiertos} <span className="text-xs font-semibold text-slate-500">casos</span>
              </span>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-xl text-[#1E382B]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Garantías en gestión operativa</p>
        </div>

        {/* KPI 2: Por Vencer */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 text-amber-950 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                Por Vencer
              </span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {porVencer} <span className="text-xs font-semibold text-amber-700">casos</span>
              </span>
            </div>
            <div className="p-2.5 bg-amber-100/90 text-amber-800 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-amber-800 font-medium mt-2">
            {casosVencidos} vencidos (&gt;60d) • {casosProximosVencer} alerta (45d+)
          </p>
        </div>

        {/* KPI 3: Reparando */}
        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 text-blue-950 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">
                Reparando
              </span>
              <span className="text-2xl font-black text-blue-950 mt-1 block">
                {enReparacion} <span className="text-xs font-semibold text-blue-700">propiedades</span>
              </span>
            </div>
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl border border-blue-200">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-blue-800 font-medium mt-2">Obras de salida en ejecución</p>
        </div>

        {/* KPI 4: Pendiente Financiero */}
        <div className="bg-emerald-900 p-4 rounded-2xl text-white shadow-md shadow-emerald-950/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
                Pendiente Financiero
              </span>
              <span className="text-xl font-black text-white mt-1 block font-mono">
                {formatCLP(pendienteFinanciero)}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-800/80 rounded-xl text-emerald-300 border border-emerald-700/50">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-200/80 font-medium mt-2">Por cobrar + financiamiento activo</p>
        </div>

      </div>


      {/* ==================================================
          2. SECCIÓN PRINCIPAL: CASOS QUE REQUIEREN ATENCIÓN
         ================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 bg-[#1E382B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Casos que Requieren Atención</h3>
              <p className="text-[11px] text-emerald-200/80 font-medium">Priorizados automáticamente por vencimientos, obras y bloqueos</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-900/90 border border-emerald-700/60 px-3 py-1 rounded-full font-bold text-emerald-200">
            {prioritizedCases.length} pendientes de acción
          </span>
        </div>

        {prioritizedCases.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <strong className="text-slate-800 text-sm block mb-0.5">¡Todo al día!</strong>
            No hay casos abiertos que requieran atención inmediata.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {prioritizedCases.map(({ caseObj, category }) => {
              const overdueMgmt = caseObj.nextManagementDate && isOverdue(caseObj.nextManagementDate);
              const formattedDate = formatShortDateStr(caseObj.nextManagementDate);

              return (
                <div 
                  key={caseObj.id} 
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* Left block: ID, Property & Attention Reason */}
                  <div className="flex items-start gap-3 min-w-[280px]">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#1E382B] shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-[#1E382B] font-extrabold text-sm">{caseObj.id}</strong>
                        <span className="text-slate-800 font-semibold">{caseObj.propertyAddress}, {caseObj.propertyUnit}</span>
                      </div>
                      
                      {/* Reason Tag */}
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-200 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          Motivo: {category?.reason}
                        </span>

                        {/* Optional Blocked Badge */}
                        {caseObj.blockedBy !== 'SIN_BLOQUEO' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                            Bloqueado: {caseObj.blockedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle block: Next Management, Date & Responsible */}
                  <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Próxima gestión</span>
                      <p className="font-semibold text-slate-800 text-xs">
                        {caseObj.nextManagement || <span className="text-rose-500 italic">Pendiente definir gestión</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-slate-600">
                      <div className="text-right sm:text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha</span>
                        <span className={`font-bold ${overdueMgmt ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                          {formattedDate}
                        </span>
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

                  {/* Right block: Button */}
                  <div className="shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleSelectCase(caseObj.id)}
                      className="px-3.5 py-2 bg-[#1E382B] hover:bg-[#14261d] text-white rounded-xl font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Ver caso</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>


      {/* ==================================================
          3. FLUJO OPERATIVO (CONTADORES CLAROS) Y ESTADO FINANCIERO
         ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Col 1: Flujo Operativo Simplificado */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1E382B]" />
                Flujo Operativo de Casos
              </h3>
              <p className="text-xs text-slate-500 font-medium">Contadores de estado y detección de cuellos de botella</p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {openCases.length} casos activos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Box PREPARACIÓN */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  PREPARACIÓN
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">Reparaciones de salida</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pendientes</span>
                  <strong className="text-base font-black text-slate-800">{pendientesPreparacion}</strong>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/80">
                  <span className="text-[10px] font-bold text-amber-800 block uppercase">Reparando</span>
                  <strong className="text-base font-black text-amber-900">{enReparacion}</strong>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase">Listas</span>
                  <strong className="text-base font-black text-emerald-900">{preparadasListas}</strong>
                </div>
              </div>
            </div>

            {/* Box LIQUIDACIÓN */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#2D8B73]" />
                  LIQUIDACIÓN
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">Proceso administrativo</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">En prep.</span>
                  <strong className="text-base font-black text-slate-800">{enPreparacionLiquidation}</strong>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-emerald-800 block uppercase">Listas</span>
                  <strong className="text-base font-black text-emerald-900">{listasParaLiquidar}</strong>
                </div>
                <div className="p-2 bg-[#1E382B] text-white rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-300 block uppercase">Emitidas</span>
                  <strong className="text-base font-black text-white">{emitidasLiquidation}</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Requisitos faltantes más frecuentes en 'En preparación' */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 space-y-2">
            <span className="text-[11px] font-bold text-amber-900 block">
              Antecedentes pendientes en Liquidación (&quot;En preparación&quot;):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-700">
              <div className="bg-white p-2 rounded-lg border border-amber-200/80 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">Presupuesto</span>
                <strong className="font-extrabold text-slate-800">{faltantesCounts.presupuesto} casos</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200/80 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">Gastos Comunes</span>
                <strong className="font-extrabold text-slate-800">{faltantesCounts.gastosComunes} casos</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200/80 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">Agua</span>
                <strong className="font-extrabold text-slate-800">{faltantesCounts.agua} casos</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200/80 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">Electricidad</span>
                <strong className="font-extrabold text-slate-800">{faltantesCounts.electricidad} casos</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-200/80 text-center">
                <span className="block text-[10px] text-slate-400 font-medium">Gas</span>
                <strong className="font-extrabold text-slate-800">{faltantesCounts.gas} casos</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Col 2: Estado Financiero Interno */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#1E382B]" />
                Estado Financiero Interno
              </h3>
              <p className="text-xs text-slate-500 font-medium">Saldos pendientes de cobrar y recuperar</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Por Cobrar a Arrendatarios
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Saldos pendientes de cobro</span>
              </div>
              <strong className="text-sm font-black text-slate-900 font-mono">
                {formatCLP(totalPendienteCobrar)}
              </strong>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider block">
                  Aportes Propietarios por Recuperar
                </span>
                <span className="text-[11px] text-blue-700 font-medium">Aportes para reparación</span>
              </div>
              <strong className="text-sm font-black text-blue-900 font-mono">
                {formatCLP(aportesPropietariosPendientes)}
              </strong>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#1E382B] uppercase tracking-wider block">
                  Financiamiento Fauna por Recuperar
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">Fondos adelantados por Fauna</span>
              </div>
              <strong className="text-sm font-black text-[#1E382B] font-mono">
                {formatCLP(financiamientoFaunaVigente)}
              </strong>
            </div>

            <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex items-center justify-between text-slate-800">
              <div>
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                  Recuperado por Fauna Este Mes
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Agosto 2026</span>
              </div>
              <strong className="text-sm font-black font-mono text-emerald-800">
                {formatCLP(recuperadoFaunaEsteMes)}
              </strong>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center font-medium pt-1">
            Métricas sincronizadas automáticamente con abonos y liquidaciones.
          </div>
        </div>

      </div>

    </div>
  );
};
