import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Receivable } from '../types';
import { formatCLP, parseLocalDate } from '../utils/formatters';
import { RecordPaymentModal } from './RecordPaymentModal';
import { Receipt, Search, DollarSign, UserCheck, AlertTriangle, ClipboardPen, X } from 'lucide-react';

type ReceivableTab = 'PENDIENTES' | 'PAGADAS' | 'INCOBRABLES';

export const ReceivablesList: React.FC = () => {
  const {
    receivables,
    cases,
    settings,
    setSelectedCaseId,
    setActiveView,
    addFollowUpComment,
    markReceivableUncollectible
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ReceivableTab>('PENDIENTES');
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [managementReceivable, setManagementReceivable] = useState<Receivable | null>(null);
  const [managementComment, setManagementComment] = useState('');
  const [nextManagement, setNextManagement] = useState('');
  const [nextManagementDate, setNextManagementDate] = useState('');
  const [nextManagementResponsible, setNextManagementResponsible] = useState('');
  const [showUncollectible, setShowUncollectible] = useState(false);
  const [uncollectibleReason, setUncollectibleReason] = useState('');

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

  const activeReceivables = receivables.filter(r => r.status === 'PENDIENTE' || r.status === 'PAGO_PARCIAL');
  const totalPorCobrar = activeReceivables.reduce((sum, r) => sum + r.pendingBalance, 0);
  const gestionesVencidas = activeReceivables.filter(r => {
    const correspondingCase = cases.find(c => c.id === r.caseId);
    return isOverdue(correspondingCase?.nextManagementDate || r.nextManagementDate);
  }).length;

  const filtered = receivables.filter(r => {
    const matchesTab =
      activeTab === 'PENDIENTES'
        ? r.status === 'PENDIENTE' || r.status === 'PAGO_PARCIAL'
        : activeTab === 'PAGADAS'
          ? r.status === 'PAGADA'
          : r.status === 'INCOBRABLE';

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term ||
      r.id.toLowerCase().includes(term) ||
      r.caseId.toLowerCase().includes(term) ||
      r.tenantName.toLowerCase().includes(term) ||
      r.tenantRut.toLowerCase().includes(term) ||
      r.propertyAddress.toLowerCase().includes(term);

    return matchesTab && matchesSearch;
  });

  const handleOpenPayment = (r: Receivable) => {
    setSelectedReceivable(r);
    setIsPaymentModalOpen(true);
  };

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveView('case-detail');
  };

  const handleOpenManagement = (r: Receivable) => {
    const c = cases.find(item => item.id === r.caseId);
    setManagementReceivable(r);
    setManagementComment('');
    setNextManagement(c?.nextManagement || r.nextManagement || '');
    setNextManagementDate(c?.nextManagementDate || r.nextManagementDate || '');
    setNextManagementResponsible(c?.nextManagementResponsible || c?.responsible || '');
    setShowUncollectible(false);
    setUncollectibleReason('');
  };

  const closeManagement = () => {
    setManagementReceivable(null);
    setManagementComment('');
    setShowUncollectible(false);
    setUncollectibleReason('');
  };

  const handleSaveManagement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managementReceivable || !managementComment.trim() || !nextManagement.trim() || !nextManagementDate) return;

    addFollowUpComment(managementReceivable.caseId, {
      comment: managementComment.trim(),
      area: 'Garantia',
      nextManagement: nextManagement.trim(),
      nextManagementDate,
      nextManagementResponsible
    });
    closeManagement();
  };

  const handleMarkUncollectible = () => {
    if (!managementReceivable || !uncollectibleReason.trim()) return;
    markReceivableUncollectible(managementReceivable.id, uncollectibleReason.trim());
    closeManagement();
  };

  const tabCounts = {
    PENDIENTES: receivables.filter(r => r.status === 'PENDIENTE' || r.status === 'PAGO_PARCIAL').length,
    PAGADAS: receivables.filter(r => r.status === 'PAGADA').length,
    INCOBRABLES: receivables.filter(r => r.status === 'INCOBRABLE').length
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Por cobrar</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block font-mono">{formatCLP(totalPorCobrar)}</span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-700 border border-rose-100"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-2">Saldo vigente de arrendatarios</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Cuentas pendientes</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{activeReceivables.length}</span>
          <p className="text-xs text-slate-500 font-medium mt-2">Pendientes y pagos parciales</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider block">Gestiones vencidas</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">{gestionesVencidas}</span>
            </div>
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-200"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <p className="text-xs text-amber-800 font-medium mt-2">Cuentas cuya próxima gestión ya venció</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {(['PENDIENTES', 'PAGADAS', 'INCOBRABLES'] as ReceivableTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tab === 'PENDIENTES' ? 'Pendientes' : tab === 'PAGADAS' ? 'Pagadas' : 'Incobrables'} ({tabCounts[tab]})
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por caso, arrendatario o propiedad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#1E382B]/30 focus:bg-white font-medium outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No hay cuentas en esta vista.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#1E382B] text-white uppercase font-extrabold text-[11px] tracking-wide border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Arrendatario / Caso</th>
                  <th className="p-3.5">Propiedad</th>
                  <th className="p-3.5 font-mono text-right">Deuda original</th>
                  <th className="p-3.5 font-mono text-right">Pagado</th>
                  <th className="p-3.5 font-mono text-right">Saldo</th>
                  <th className="p-3.5">Próxima gestión</th>
                  <th className="p-3.5">Responsable</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map(r => {
                  const correspondingCase = cases.find(c => c.id === r.caseId);
                  const responsibleName = correspondingCase?.nextManagementResponsible || correspondingCase?.responsible || 'Sin responsable';
                  const operationalNextManagement = correspondingCase?.nextManagement || r.nextManagement;
                  const operationalNextDate = correspondingCase?.nextManagementDate || r.nextManagementDate;
                  const overdueMgmt = (r.status === 'PENDIENTE' || r.status === 'PAGO_PARCIAL') && !!operationalNextDate && isOverdue(operationalNextDate);
                  const isActive = r.status === 'PENDIENTE' || r.status === 'PAGO_PARCIAL';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 block text-[13px]">{r.tenantName}</span>
                        <button onClick={() => handleViewCase(r.caseId)} className="text-emerald-700 font-bold text-xs hover:underline cursor-pointer mt-1">Caso {r.caseId}</button>
                        <span className="text-slate-400 font-mono text-[11px] ml-1.5">{r.id}</span>
                      </td>
                      <td className="p-3.5 max-w-xs text-slate-700 font-semibold text-xs">{r.propertyAddress}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 whitespace-nowrap">{formatCLP(r.originalAmount)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">{formatCLP(r.totalPaid)}</td>
                      <td className="p-3.5 text-right font-mono font-black text-rose-700 text-sm whitespace-nowrap">{formatCLP(r.pendingBalance)}</td>
                      <td className="p-3.5 max-w-xs">
                        {isActive ? (
                          <div className="space-y-1.5">
                            <span className="text-slate-800 font-semibold text-[13px] block">{operationalNextManagement || <span className="text-rose-500 italic">Sin gestión</span>}</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${overdueMgmt ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>{formatShortDateStr(operationalNextDate)}</span>
                          </div>
                        ) : r.status === 'INCOBRABLE' ? (
                          <span className="text-xs text-slate-600">{r.uncollectibleReason || 'Sin motivo registrado'}</span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700">Cobranza finalizada</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="text-xs text-slate-600 font-medium inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#2D8B73]" />
                          {responsibleName}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isActive && (
                            <>
                              <button onClick={() => handleOpenManagement(r)} className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5">
                                <ClipboardPen className="w-3.5 h-3.5" /> Gestionar
                              </button>
                              <button onClick={() => handleOpenPayment(r)} className="px-3 py-2 bg-[#1E382B] hover:bg-[#14261d] text-white font-bold rounded-lg text-xs cursor-pointer">
                                Registrar pago
                              </button>
                            </>
                          )}
                          {!isActive && (
                            <button onClick={() => handleViewCase(r.caseId)} className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer">
                              Ver caso
                            </button>
                          )}
                        </div>
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

      {managementReceivable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{showUncollectible ? 'Marcar cobranza como incobrable' : 'Registrar gestión de cobranza'}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{managementReceivable.tenantName} · {managementReceivable.caseId} · saldo {formatCLP(managementReceivable.pendingBalance)}</p>
              </div>
              <button onClick={closeManagement} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={showUncollectible ? (e) => e.preventDefault() : handleSaveManagement} className="p-6 space-y-4 text-sm">
              {showUncollectible ? (
                <>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-rose-700 block">Saldo no recuperado</span>
                    <strong className="text-xl font-mono text-rose-900 block mt-1">{formatCLP(managementReceivable.pendingBalance)}</strong>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">Motivo para marcar incobrable *</label>
                    <textarea
                      required
                      rows={4}
                      value={uncollectibleReason}
                      onChange={e => setUncollectibleReason(e.target.value)}
                      placeholder="Ej. Sin respuesta después de múltiples intentos de cobro; acuerdo de pago incumplido."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">El sistema registrará automáticamente la fecha y el usuario que cierre la cobranza.</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowUncollectible(false); setUncollectibleReason(''); }}
                      className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      disabled={!uncollectibleReason.trim()}
                      onClick={handleMarkUncollectible}
                      className="px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:bg-rose-300 text-white font-extrabold cursor-pointer"
                    >
                      Confirmar incobrable
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Resultado de la gestión *</label>
                    <textarea required rows={3} value={managementComment} onChange={e => setManagementComment(e.target.value)} placeholder="Ej. Se contactó al arrendatario; se compromete a transferir el viernes." className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Próxima gestión *</label>
                    <input required value={nextManagement} onChange={e => setNextManagement(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm" placeholder="Ej. Verificar transferencia" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Fecha *</label>
                      <input required type="date" value={nextManagementDate.includes('/') ? '' : nextManagementDate} onChange={e => setNextManagementDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Responsable</label>
                      <select value={nextManagementResponsible} onChange={e => setNextManagementResponsible(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm">
                        <option value="">Sin responsable</option>
                        {settings.responsiblesList.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setShowUncollectible(true)} className="text-rose-700 font-bold text-xs hover:underline cursor-pointer">Marcar incobrable</button>
                    <div className="flex gap-2">
                      <button type="button" onClick={closeManagement} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold cursor-pointer">Cancelar</button>
                      <button type="submit" className="px-5 py-2 bg-[#1E382B] hover:bg-[#14261d] text-white font-bold rounded-lg cursor-pointer">Guardar gestión</button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
