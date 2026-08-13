import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Receivable } from '../types';
import { formatCLP, getLocalDateInputValue } from '../utils/formatters';
import { calculatePaymentDistribution } from '../utils/calculations';
import { X, DollarSign, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: Receivable | null;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, receivable }) => {
  const { recordTenantPayment, addFollowUpComment, cases, settings } = useApp();

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [nextManagement, setNextManagement] = useState('');
  const [nextManagementDate, setNextManagementDate] = useState('');
  const [nextManagementResponsible, setNextManagementResponsible] = useState('');
  const [showDistribution, setShowDistribution] = useState(false);

  useEffect(() => {
    if (!isOpen || !receivable) return;
    const guaranteeCase = cases.find(c => c.id === receivable.caseId);
    setPaymentAmount(Math.min(100000, receivable.pendingBalance));
    setPaymentDate(getLocalDateInputValue());
    setPaymentReference('');
    setNotes('');
    setNextManagement('Gestionar saldo pendiente con arrendatario');
    setNextManagementDate('');
    setNextManagementResponsible(guaranteeCase?.nextManagementResponsible || guaranteeCase?.responsible || '');
    setShowDistribution(false);
  }, [isOpen, receivable?.id]);

  if (!isOpen || !receivable) return null;

  const guaranteeCase = cases.find(c => c.id === receivable.caseId);
  // El caso es la fuente vigente de los montos efectivamente pendientes de recuperar.
  // Los campos de la cuenta por cobrar se usan solo como fallback para datos antiguos
  // en los que el caso ya no esté disponible.
  const ownerToRecover = guaranteeCase
    ? Math.max(0, guaranteeCase.ownerContribution || 0)
    : Math.max(0, receivable.ownerContributionToRecover);
  const faunaToRecover = guaranteeCase
    ? Math.max(0, guaranteeCase.faunaFinancing || 0)
    : Math.max(0, receivable.faunaFinancingToRecover);
  const newPending = Math.max(0, receivable.pendingBalance - (paymentAmount || 0));
  const isPartialPayment = newPending > 0;

  const dist = calculatePaymentDistribution(
    paymentAmount || 0,
    ownerToRecover,
    faunaToRecover
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentAmount <= 0 || paymentAmount > receivable.pendingBalance || !paymentDate) return;
    if (isPartialPayment && (!nextManagement.trim() || !nextManagementDate)) return;

    const paymentNotes = [paymentReference.trim() ? `Método/referencia: ${paymentReference.trim()}` : '', notes.trim()]
      .filter(Boolean)
      .join(' · ');

    recordTenantPayment(receivable.id, paymentAmount, paymentNotes, paymentDate);

    if (isPartialPayment) {
      addFollowUpComment(receivable.caseId, {
        comment: `Pago parcial recibido por ${formatCLP(paymentAmount)}. Saldo pendiente: ${formatCLP(newPending)}.${notes.trim() ? ` ${notes.trim()}` : ''}`,
        area: 'Garantia',
        nextManagement: nextManagement.trim(),
        nextManagementDate,
        nextManagementResponsible
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Registrar pago de arrendatario</h3>
              <p className="text-xs text-slate-300">{receivable.id} · {receivable.tenantName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-slate-700">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Deuda original</span>
              <span className="text-sm font-bold font-mono text-slate-900">{formatCLP(receivable.originalAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Pagado</span>
              <span className="text-sm font-bold font-mono text-emerald-700">{formatCLP(receivable.totalPaid)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Saldo</span>
              <span className="text-sm font-bold font-mono text-rose-700">{formatCLP(receivable.pendingBalance)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Monto pagado *</label>
              <input
                type="number"
                min="1"
                max={receivable.pendingBalance}
                step="1"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-emerald-800 font-mono"
              />
              <span className="text-[11px] text-slate-500 block mt-0.5 font-bold">{formatCLP(paymentAmount)}</span>
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Fecha real del pago *</label>
              <input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Método / referencia</label>
            <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Ej. Transferencia Banco Chile · comprobante 12345" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5" />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Información adicional del pago..." className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5" />
          </div>

          <div className="border border-emerald-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowDistribution(v => !v)} className="w-full bg-emerald-50/70 px-4 py-3 flex items-center justify-between text-emerald-950">
              <span className="font-bold text-xs uppercase flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Distribución interna automática</span>
              {showDistribution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showDistribution && (
              <div className="p-3 space-y-1.5 text-xs bg-white">
                <div className="flex justify-between"><span>1. Recuperar monto asumido por propietario</span><strong className="font-mono text-blue-900">{formatCLP(dist.ownerRecovery)}</strong></div>
                <div className="flex justify-between"><span>2. Recuperar financiamiento Fauna</span><strong className="font-mono text-emerald-900">{formatCLP(dist.faunaRecovery)}</strong></div>
                <div className="flex justify-between pt-2 border-t border-slate-100 font-bold"><span>Nuevo saldo arrendatario</span><span className="font-mono text-rose-800">{formatCLP(newPending)}</span></div>
              </div>
            )}
          </div>

          {isPartialPayment && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div>
                <strong className="text-amber-950 block">El pago es parcial.</strong>
                <span className="text-amber-800">Define ahora cuándo y cómo se gestionará el saldo de {formatCLP(newPending)}.</span>
              </div>
              <div>
                <label className="block font-bold text-amber-950 mb-1">Próxima gestión *</label>
                <input required value={nextManagement} onChange={e => setNextManagement(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg p-2.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">Fecha *</label>
                  <input required type="date" value={nextManagementDate} onChange={e => setNextManagementDate(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block font-bold text-amber-950 mb-1">Responsable</label>
                  <select value={nextManagementResponsible} onChange={e => setNextManagementResponsible(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg p-2.5">
                    <option value="">Sin responsable</option>
                    {settings.responsiblesList.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg">Confirmar pago</button>
          </div>
        </form>
      </div>
    </div>
  );
};