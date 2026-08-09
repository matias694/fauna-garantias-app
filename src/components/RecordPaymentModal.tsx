import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Receivable } from '../types';
import { formatCLP } from '../utils/formatters';
import { calculatePaymentDistribution } from '../utils/calculations';
import { X, DollarSign, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: Receivable | null;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, receivable }) => {
  const { recordTenantPayment } = useApp();

  const [paymentAmount, setPaymentAmount] = useState<number>(100000);
  const [notes, setNotes] = useState('');

  if (!isOpen || !receivable) return null;

  // Live calculation of Rule 17 Priority Distribution
  const dist = calculatePaymentDistribution(
    paymentAmount || 0,
    receivable.ownerContributionToRecover,
    receivable.faunaFinancingToRecover
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentAmount <= 0) {
      alert('Ingrese un monto válido.');
      return;
    }

    if (paymentAmount > receivable.pendingBalance) {
      if (!confirm(`El monto ($${paymentAmount}) supera el saldo pendiente ($${receivable.pendingBalance}). ¿Desea registrar el pago de todas formas?`)) {
        return;
      }
    }

    recordTenantPayment(receivable.id, paymentAmount, notes);
    alert('Pago registrado con éxito y fondos distribuidos automáticamente.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Registrar Pago de Arrendatario</h3>
              <p className="text-xs text-slate-300">{receivable.id} • {receivable.tenantName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Summary Box */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-slate-700">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Deuda Original</span>
              <span className="text-sm font-bold font-mono text-slate-900">{formatCLP(receivable.originalAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Pagado</span>
              <span className="text-sm font-bold font-mono text-emerald-700">{formatCLP(receivable.totalPaid)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Saldo Pendiente</span>
              <span className="text-sm font-bold font-mono text-rose-700">{formatCLP(receivable.pendingBalance)}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Monto Pagado por Arrendatario ($ CLP) *</label>
            <input
              type="number"
              step="5000"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-emerald-800 font-mono"
            />
            <span className="text-[11px] text-slate-500 block mt-0.5 font-bold">{formatCLP(paymentAmount)}</span>
          </div>

          {/* AUTOMATIC PRIORITY DISTRIBUTION PREVIEW (SECTION 17) */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-2 text-emerald-950">
            <h4 className="font-bold text-xs uppercase flex items-center gap-1 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Distribución Automática Obligatoria (Regla Fauna #17)
            </h4>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between items-center bg-white p-2 rounded border border-emerald-100">
                <span>1. Recuperar Aporte Propietario (Prioridad 1):</span>
                <strong className="font-mono text-blue-900">{formatCLP(dist.ownerRecovery)}</strong>
              </div>

              <div className="flex justify-between items-center bg-white p-2 rounded border border-emerald-100">
                <span>2. Recuperar Financiamiento Fauna (Prioridad 2):</span>
                <strong className="font-mono text-emerald-900">{formatCLP(dist.faunaRecovery)}</strong>
              </div>

              <div className="flex justify-between items-center pt-1 font-bold text-slate-800">
                <span>Nuevo Saldo Pendiente Arrendatario:</span>
                <span className="font-mono text-rose-800">{formatCLP(Math.max(0, receivable.pendingBalance - paymentAmount))}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observaciones / Método de Pago</label>
            <textarea
              rows={2}
              placeholder="Ej. Transferencia Banco de Chile, comprobante N° 88123..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
            ></textarea>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
            >
              Confirmar y Registrar Pago
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
