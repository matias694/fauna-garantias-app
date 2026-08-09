import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Receivable } from '../types';
import { formatCLP } from '../utils/formatters';
import { RecordPaymentModal } from './RecordPaymentModal';
import { Receipt, Search, DollarSign, UserCheck, AlertTriangle } from 'lucide-react';

export const ReceivablesList: React.FC = () => {
  const { receivables, cases, setSelectedCaseId, setActiveView } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

  const totalPorCobrar = receivables.reduce((sum, r) => sum + r.pendingBalance, 0);

  // La gestión operativa vive en el caso. La cuenta por cobrar conserva datos históricos,
  // pero para alertas y pantalla usamos la próxima gestión vigente del caso como fuente de verdad.
  const totalVencido = receivables
    .filter(r => {
      const correspondingCase = cases.find(c => c.id === r.caseId);
      const operationalDate = correspondingCase?.nextManagementDate || r.nextManagementDate;
      return r.pendingBalance > 0 && isOverdue(operationalDate);
    })
    .reduce((sum, r) => sum + r.pendingBalance, 0);

  // Solo se suma el dinero efectivamente recibido del arrendatario.
  // Las recuperaciones de propietario/Fauna son distribución del mismo pago y no deben sumarse otra vez.
  let recuperadoEsteMes = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  cases.forEach(c => {
    c.movements.forEach(m => {
      if (m.type === 'PAGO_ARRENDATARIO') {
        const parts = m.date.split('/');
        if (parts.length === 3) {
          const mMonth = parseInt(parts[1], 10) - 1;
          const mYear = parseInt(parts[2], 10);
          if (mMonth === currentMonth && mYear === currentYear) {
            recuperadoEsteMes += m.amount;
          }
        }
      }
    });
  });

  const filtered = receivables.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      r.id.toLowerCase().includes(term) ||
      r.caseId.toLowerCase().includes(term) ||
      r.tenantName.toLowerCase().includes(term) ||
      r.tenantRut.toLowerCase().includes(term) ||
      r.propertyAddress.toLowerCase().includes(term)
    );
  });

  const handleOpenPayment = (r: Receivable) => {
    setSelectedReceivable(r);
    setIsPaymentModalOpen(true);
  };

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveView('case-detail');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Por Cobrar</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">{formatCLP(totalPorCobrar)}</span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-700 border border-rose-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Saldo pendiente de liquidaciones</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Vencido</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block font-mono">{formatCLP(totalVencido)}</span>
            </div>
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-amber-800 font-medium mt-2">Saldo con próxima gestión vencida</p>
        </div>

        <div className="bg-emerald-900 p-4 rounded-2xl text-white shadow-md shadow-emerald-950/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">Cobrado Este Mes</span>
              <span className="text-2xl font-black text-white mt-1 block font-mono">{formatCLP(recuperadoEsteMes)}</span>
            </div>
            <div className="p-2.5 bg-emerald-800/80 rounded-xl text-emerald-300 border border-emerald-700/50">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-200/80 font-medium mt-2">Pagos recibidos de arrendatarios durante el mes</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID, caso, arrendatario o propiedad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3.5 py-2 rounded-xl text-xs focus:ring-2 focus:ring-[#1E382B]/30 focus:bg-white font-medium"
          />
        </div>
        <span className="text-xs font-bold text-slate-600">{filtered.length} cuentas por cobrar</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No existen cuentas por cobrar registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E382B] text-white uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Arrendatario / Caso</th>
                  <th className="p-3.5">Propiedad</th>
                  <th className="p-3.5 font-mono text-right">Monto Original</th>
                  <th className="p-3.5 font-mono text-right">Pagado</th>
                  <th className="p-3.5 font-mono text-right">Pendiente</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5">Próxima Gestión</th>
                  <th className="p-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(r => {
                  const correspondingCase = cases.find(c => c.id === r.caseId);
                  const responsibleName = correspondingCase?.nextManagementResponsible || correspondingCase?.responsible || 'Sin responsable';
                  const operationalNextManagement = correspondingCase?.nextManagement || r.nextManagement;
                  const operationalNextDate = correspondingCase?.nextManagementDate || r.nextManagementDate;
                  const overdueMgmt = operationalNextDate && isOverdue(operationalNextDate);
                  const formattedDate = formatShortDateStr(operationalNextDate);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 block text-xs">{r.tenantName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            onClick={() => handleViewCase(r.caseId)}
                            className="text-emerald-700 font-bold text-[11px] hover:underline cursor-pointer"
                          >
                            Caso {r.caseId}
                          </button>
                          <span className="text-slate-400 font-mono text-[10px]">({r.id})</span>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs text-slate-800 font-semibold truncate text-[11px]">{r.propertyAddress}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 text-xs">{formatCLP(r.originalAmount)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 text-xs">{formatCLP(r.totalPaid)}</td>
                      <td className="p-3.5 text-right font-mono font-black text-rose-700 text-sm whitespace-nowrap">{formatCLP(r.pendingBalance)}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] border ${
                          r.status === 'PAGADA' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          r.status === 'PAGO_PARCIAL' ? 'bg-blue-100 text-blue-900 border-blue-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                        }`}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="space-y-1">
                          <span className="text-slate-800 font-semibold text-xs block truncate">
                            {operationalNextManagement || <span className="text-rose-500 italic">Sin gestión</span>}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              overdueMgmt ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {formattedDate}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-0.5">
                              <UserCheck className="w-3 h-3 text-[#2D8B73]" />
                              {responsibleName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        {r.pendingBalance > 0 && (
                          <button
                            onClick={() => handleOpenPayment(r)}
                            className="px-3 py-1.5 bg-[#1E382B] hover:bg-[#14261d] text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-2xs transition-all"
                          >
                            Registrar Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        receivable={selectedReceivable}
      />
    </div>
  );
};
