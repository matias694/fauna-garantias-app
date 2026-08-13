import React from 'react';
import { GuaranteeCase } from '../../types';
import { formatCLP } from '../../utils/formatters';
import { Banknote, CheckCircle2 } from 'lucide-react';

interface FinancialTracePanelProps {
  guaranteeCase: GuaranteeCase;
}

const maskLongNumbers = (value: string) => value.replace(/\d{6,}/g, raw => {
  const last4 = raw.slice(-4);
  return `${'•'.repeat(Math.max(4, raw.length - 4))}${last4}`;
});

export const FinancialTracePanel: React.FC<FinancialTracePanelProps> = ({ guaranteeCase }) => {
  const payments = (guaranteeCase.movements || []).filter(m => m.type === 'PAGO_ARRENDATARIO');
  const refundMovement = [...(guaranteeCase.movements || [])].reverse().find(m => m.type === 'DEVOLUCION_ARRENDATARIO');
  const refund = guaranteeCase.refund;

  if (payments.length === 0 && refund?.status !== 'TRANSFERIDA') return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      <div>
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-600" /> Movimientos financieros
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Detalle de devoluciones y pagos registrados en este caso.</p>
      </div>

      {refund?.status === 'TRANSFERIDA' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <CheckCircle2 className="w-4 h-4" /> Devolución registrada · {formatCLP(refund.amount)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 text-emerald-950">
            <span><strong>Fecha:</strong> {refund.date || refundMovement?.date || 'Sin fecha'}</span>
            <span><strong>Registrado por:</strong> {refund.user || refundMovement?.user || 'Sin registro'}</span>
            <span><strong>Cuenta destino:</strong> {refund.destinationAccount ? maskLongNumbers(refund.destinationAccount) : 'No registrada'}</span>
            <span><strong>Referencia:</strong> {refund.voucherName || refundMovement?.reference || 'No registrada'}</span>
          </div>
          {refund.notes && <p className="text-emerald-900"><strong>Observaciones:</strong> {refund.notes}</p>}
        </div>
      )}

      {payments.map(payment => (
        <div key={payment.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
          <strong className="text-slate-900 block">Pago de arrendatario · {formatCLP(Math.abs(payment.amount))}</strong>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 text-slate-700">
            <span><strong>Fecha:</strong> {payment.date} {payment.time}</span>
            <span><strong>Registrado por:</strong> {payment.user}</span>
          </div>
          {payment.observation && <p className="text-slate-700 whitespace-pre-line"><strong>Detalle:</strong> {maskLongNumbers(payment.observation)}</p>}
        </div>
      ))}
    </div>
  );
};
