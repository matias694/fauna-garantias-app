import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCLP } from '../utils/formatters';
import { calculateGuaranteeFinances } from '../utils/calculations';
import { Search, Plus, ChevronRight, UserCheck } from 'lucide-react';

interface GuaranteesListProps {
  onOpenNewModal: () => void;
}

export const GuaranteesList: React.FC<GuaranteesListProps> = ({ onOpenNewModal }) => {
  const { cases, setSelectedCaseId, setActiveView, settings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCaseStatus, setFilterCaseStatus] = useState<string>('ALL');
  const [filterLiquidation, setFilterLiquidation] = useState<string>('ALL');
  const [filterPreparation, setFilterPreparation] = useState<string>('ALL');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterResponsible, setFilterResponsible] = useState<string>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');

  const filteredCases = cases.filter(c => {
    if (filterCaseStatus === 'OPEN' && c.isClosed) return false;
    if (filterCaseStatus === 'CLOSED' && !c.isClosed) return false;

    const term = searchTerm.toLowerCase();
    const matchSearch =
      c.id.toLowerCase().includes(term) ||
      c.propertyAddress.toLowerCase().includes(term) ||
      c.tenantName.toLowerCase().includes(term) ||
      c.ownerName.toLowerCase().includes(term) ||
      c.tenantRut.toLowerCase().includes(term);

    if (!matchSearch) return false;
    if (filterLiquidation !== 'ALL' && c.liquidationStatus !== filterLiquidation) return false;
    if (filterPreparation !== 'ALL' && c.preparationStatus !== filterPreparation) return false;
    if (filterPlan !== 'ALL' && c.plan !== filterPlan) return false;
    if (filterResponsible !== 'ALL' && c.responsible !== filterResponsible) return false;

    if (filterOutcome !== 'ALL') {
      if (c.liquidationStatus !== 'EMITIDA') return false;
      const fin = calculateGuaranteeFinances(c, settings);
      if (filterOutcome === 'SOBRANTE' && !fin.isSurplus) return false;
      if (filterOutcome === 'EXACTO' && !fin.isExact) return false;
      if (filterOutcome === 'INSUFICIENTE' && !fin.isInsufficient) return false;
    }

    return true;
  });

  const handleSelect = (id: string) => {
    setSelectedCaseId(id);
    setActiveView('case-detail');
  };

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
      return `Vencida hace ${diffDays}d`;
    }
    return dateStr;
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID, dirección, arrendatario, propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3.5 py-2 rounded-xl text-xs focus:ring-2 focus:ring-[#1E382B]/30 focus:bg-white font-medium"
            />
          </div>

          <button
            onClick={onOpenNewModal}
            className="px-4 py-2 bg-[#1E382B] hover:bg-[#14261d] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Nueva garantía</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Estado Caso</label>
            <select value={filterCaseStatus} onChange={(e) => setFilterCaseStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold">
              <option value="ALL">Todos los Casos</option>
              <option value="OPEN">🟢 Abiertos</option>
              <option value="CLOSED">🔒 Cerrados</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Liquidación</label>
            <select value={filterLiquidation} onChange={(e) => setFilterLiquidation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium">
              <option value="ALL">Todos los Estados</option>
              <option value="EN_PREPARACION">En preparación</option>
              <option value="LISTA">Lista</option>
              <option value="EMITIDA">Confirmada</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Preparación</label>
            <select value={filterPreparation} onChange={(e) => setFilterPreparation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium">
              <option value="ALL">Todos los Estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="REPARANDO">Reparando</option>
              <option value="LISTA">Lista</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Plan</label>
            <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium">
              <option value="ALL">Todos los Planes</option>
              <option value="ESTANDAR">Estándar</option>
              <option value="PLUS">Plus</option>
              <option value="FULL">Full</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Responsable</label>
            <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium">
              <option value="ALL">Todos</option>
              {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Resultado</label>
            <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium">
              <option value="ALL">Todos</option>
              <option value="SOBRANTE">Devolver saldo</option>
              <option value="EXACTO">Sin saldo ($0)</option>
              <option value="INSUFICIENTE">Debe saldo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E382B] text-white uppercase font-extrabold text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Caso / Propiedad</th>
                <th className="p-3.5">Arrendatario</th>
                <th className="p-3.5">Preparación</th>
                <th className="p-3.5">Liquidación</th>
                <th className="p-3.5">Resultado</th>
                <th className="p-3.5">Próxima Gestión</th>
                <th className="p-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCases.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500 text-xs">No se encontraron registros de garantías con los criterios seleccionados.</td></tr>
              ) : filteredCases.map(c => {
                const fin = calculateGuaranteeFinances(c, settings);
                const overdueMgmt = !c.isClosed && Boolean(c.nextManagementDate) && isOverdue(c.nextManagementDate);
                const formattedDate = formatShortDateStr(c.nextManagementDate);
                const liquidationLabel = c.liquidationStatus === 'EN_PREPARACION'
                  ? 'EN PREPARACIÓN'
                  : c.liquidationStatus === 'EMITIDA'
                    ? 'CONFIRMADA'
                    : c.liquidationStatus;

                return (
                  <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${c.isClosed ? 'bg-slate-50/60' : ''}`}>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[#1E382B] font-extrabold">{c.id}</strong>
                        {c.isClosed && <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 font-bold text-[9px] rounded uppercase border border-slate-300">Cerrado</span>}
                      </div>
                      <span className="text-slate-800 font-semibold block text-[11px] mt-0.5">{c.propertyAddress}, {c.propertyUnit}</span>
                    </td>

                    <td className="p-3.5"><span className="text-slate-800 font-semibold block text-xs">{c.tenantName}</span></td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${c.preparationStatus === 'LISTA' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : c.preparationStatus === 'REPARANDO' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {c.preparationStatus}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                        {liquidationLabel}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {c.liquidationStatus !== 'EMITIDA' ? (
                        <span className="px-2 py-1 rounded-md text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 inline-block">Pendiente de liquidar</span>
                      ) : fin.isInsufficient ? (
                        <span className="px-2 py-1 rounded-md text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-200 inline-block font-mono">Debe {formatCLP(fin.tenantDeficit)}</span>
                      ) : fin.isSurplus ? (
                        <span className="px-2 py-1 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block font-mono">Devolver {formatCLP(fin.refundToTenant)}</span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 inline-block">Sin saldo</span>
                      )}
                    </td>

                    <td className="p-3.5 max-w-xs">
                      {c.isClosed ? (
                        <div className="space-y-1">
                          <span className="text-emerald-800 font-bold text-xs block">Caso cerrado</span>
                          <span className="text-[10px] text-slate-500 inline-flex items-center gap-0.5">
                            <UserCheck className="w-3 h-3 text-[#2D8B73]" />
                            {c.closedBy || c.responsible}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-slate-800 font-semibold text-xs block truncate">{c.nextManagement || <span className="text-rose-500 italic">Sin gestión</span>}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${overdueMgmt ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>{formattedDate}</span>
                            <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-0.5"><UserCheck className="w-3 h-3 text-[#2D8B73]" />{c.nextManagementResponsible || c.responsible}</span>
                            {c.blockedBy !== 'SIN_BLOQUEO' && <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-extrabold rounded border border-amber-200">Bloqueado: {c.blockedBy}</span>}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button onClick={() => handleSelect(c.id)} className="px-3 py-1.5 bg-[#1E382B] hover:bg-[#14261d] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs">
                        <span>Ver caso</span><ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};