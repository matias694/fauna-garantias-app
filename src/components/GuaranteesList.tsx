import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCLP, parseLocalDate } from '../utils/formatters';
import { calculateGuaranteeFinances } from '../utils/calculations';
import { getSettlementState } from '../utils/settlementState';
import { Search, Plus, ChevronRight, UserCheck } from 'lucide-react';

interface GuaranteesListProps {
  onOpenNewModal: () => void;
}

type CaseStatusFilter = 'OPEN' | 'CLOSED' | 'ALL';

export const GuaranteesList: React.FC<GuaranteesListProps> = ({ onOpenNewModal }) => {
  const { cases, receivables, setSelectedCaseId, setActiveView, settings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCaseStatus, setFilterCaseStatus] = useState<CaseStatusFilter>('OPEN');
  const [filterResponsible, setFilterResponsible] = useState('ALL');

  const filteredCases = cases.filter(c => {
    if (filterCaseStatus === 'OPEN' && c.isClosed) return false;
    if (filterCaseStatus === 'CLOSED' && !c.isClosed) return false;

    const term = searchTerm.trim().toLowerCase();
    const matchSearch = !term ||
      c.id.toLowerCase().includes(term) ||
      c.propertyAddress.toLowerCase().includes(term) ||
      c.tenantName.toLowerCase().includes(term) ||
      c.ownerName.toLowerCase().includes(term) ||
      c.tenantRut.toLowerCase().includes(term);

    if (!matchSearch) return false;

    const currentResponsible = c.nextManagementResponsible || c.responsible || '';
    if (filterResponsible !== 'ALL' && currentResponsible !== filterResponsible) return false;

    return true;
  });

  const handleSelect = (id: string) => {
    setSelectedCaseId(id);
    setActiveView('case-detail');
  };

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
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const formatShortDateStr = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha';
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

  const filterLabels: Array<[CaseStatusFilter, string]> = [
    ['OPEN', 'Abiertas'],
    ['CLOSED', 'Cerradas'],
    ['ALL', 'Todas']
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID, dirección, arrendatario o propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#1E382B]/30 focus:bg-white font-medium outline-none"
            />
          </div>

          <button
            onClick={onOpenNewModal}
            className="px-4 py-2.5 bg-[#1E382B] hover:bg-[#14261d] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Nueva garantía</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">Mostrar</span>
            <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
              {filterLabels.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilterCaseStatus(value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterCaseStatus === value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-56">
            <label className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">Responsable</label>
            <select
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium"
            >
              <option value="ALL">Todos</option>
              {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#1E382B] text-white uppercase font-extrabold text-[11px] tracking-wide">
              <tr>
                <th className="p-3.5">Caso / Propiedad</th>
                <th className="p-3.5">Arrendatario</th>
                <th className="p-3.5">Preparación</th>
                <th className="p-3.5">Liquidación</th>
                <th className="p-3.5">Resultado actual</th>
                <th className="p-3.5">Próxima gestión</th>
                <th className="p-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 text-sm">
                    No se encontraron garantías con esos criterios.
                  </td>
                </tr>
              ) : filteredCases.map(c => {
                const fin = calculateGuaranteeFinances(c, settings);
                const receivable = receivables.find(r => r.caseId === c.id);
                const settlement = getSettlementState(c, receivable, settings);
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-[#1E382B] font-extrabold text-sm">{c.id}</strong>
                        {c.isClosed && (
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-bold text-[11px] rounded uppercase border border-slate-300">
                            Cerrado
                          </span>
                        )}
                      </div>
                      <span className="text-slate-800 font-semibold block text-xs mt-0.5">{c.propertyAddress}, {c.propertyUnit}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="text-slate-800 font-semibold block text-[13px]">{c.tenantName}</span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md font-extrabold text-[11px] ${
                        c.preparationStatus === 'LISTA'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : c.preparationStatus === 'REPARANDO'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {c.preparationStatus}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                        {liquidationLabel}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {c.liquidationStatus !== 'EMITIDA' ? (
                        <span className="px-2 py-1 rounded-md text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 inline-block">Pendiente de liquidar</span>
                      ) : settlement.kind === 'RECEIVABLE_PAID' ? (
                        <span className="px-2 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">Cobranza pagada</span>
                      ) : settlement.kind === 'RECEIVABLE_UNCOLLECTIBLE' ? (
                        <span className="px-2 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-700 border border-slate-300 inline-block font-mono">Incobrable {formatCLP(settlement.pendingAmount)}</span>
                      ) : settlement.kind === 'RECEIVABLE_PENDING' || settlement.kind === 'RECEIVABLE_PARTIAL' ? (
                        <span className="px-2 py-1 rounded-md text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 inline-block font-mono">Por cobrar {formatCLP(settlement.pendingAmount)}</span>
                      ) : settlement.kind === 'REFUND_TRANSFERRED' ? (
                        <span className="px-2 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">Devolución transferida</span>
                      ) : settlement.kind === 'REFUND_PENDING' ? (
                        <span className="px-2 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block font-mono">Devolver {formatCLP(settlement.pendingAmount)}</span>
                      ) : fin.isExact ? (
                        <span className="px-2 py-1 rounded-md text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 inline-block">Sin saldo</span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 inline-block">Sin acción pendiente</span>
                      )}
                    </td>

                    <td className="p-3.5 max-w-xs">
                      {c.isClosed ? (
                        <div className="space-y-1">
                          <span className="text-emerald-800 font-bold text-[13px] block">Caso cerrado</span>
                          <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-[#2D8B73]" />
                            {c.closedBy || c.responsible}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-slate-800 font-semibold text-[13px] block truncate">
                            {c.nextManagement || <span className="text-rose-500 italic">Sin gestión</span>}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${overdueMgmt ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                              {formattedDate}
                            </span>
                            <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-[#2D8B73]" />
                              {c.nextManagementResponsible || c.responsible}
                            </span>
                            {c.blockedBy !== 'SIN_BLOQUEO' && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-extrabold rounded border border-amber-200">
                                Bloqueado: {c.blockedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleSelect(c.id)}
                        className="px-3.5 py-2 bg-[#1E382B] hover:bg-[#14261d] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <span>Ver caso</span>
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
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
