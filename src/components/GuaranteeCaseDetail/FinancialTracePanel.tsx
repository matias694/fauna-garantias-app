import React, { useEffect, useState } from 'react';
import { GuaranteeCase } from '../../types';
import { formatCLP } from '../../utils/formatters';
import {
  FinancialReceiptLink,
  getFinancialReceiptLinksForCase,
  openFinancialReceipt
} from '../../services/financialReceiptStorage';
import { Banknote, CheckCircle2, FileText, ExternalLink, UserRound } from 'lucide-react';

interface FinancialTracePanelProps {
  guaranteeCase: GuaranteeCase;
}

const movementLabel = (kind: 'DEVOLUCION_ARRENDATARIO' | 'PAGO_ARRENDATARIO' | 'APORTE_PROPIETARIO') => {
  if (kind === 'DEVOLUCION_ARRENDATARIO') return 'Devolución al arrendatario';
  if (kind === 'PAGO_ARRENDATARIO') return 'Pago de arrendatario';
  return 'Aporte del propietario';
};

export const FinancialTracePanel: React.FC<FinancialTracePanelProps> = ({ guaranteeCase }) => {
  const [openError, setOpenError] = useState('');
  const [receiptLinks, setReceiptLinks] = useState<FinancialReceiptLink[]>([]);

  const payments = (guaranteeCase.movements || []).filter(m => m.type === 'PAGO_ARRENDATARIO');
  const ownerContributions = (guaranteeCase.movements || []).filter(m => m.type === 'APORTE_PROPIETARIO');
  const refundMovement = [...(guaranteeCase.movements || [])].reverse().find(m => m.type === 'DEVOLUCION_ARRENDATARIO');
  const refund = guaranteeCase.refund;

  useEffect(() => {
    let cancelled = false;
    setOpenError('');

    void getFinancialReceiptLinksForCase(guaranteeCase.id)
      .then(links => {
        if (cancelled) return;
        setReceiptLinks([...links].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch(error => {
        if (cancelled) return;
        setReceiptLinks([]);
        setOpenError(error instanceof Error ? error.message : 'No se pudieron cargar los comprobantes.');
      });

    return () => { cancelled = true; };
  }, [guaranteeCase.id, guaranteeCase.movements.length, guaranteeCase.refund?.status]);

  if (payments.length === 0 && ownerContributions.length === 0 && refund?.status !== 'TRANSFERIDA' && receiptLinks.length === 0) return null;

  const handleOpenReceipt = async (receipt: FinancialReceiptLink['receipt']) => {
    setOpenError('');
    try {
      await openFinancialReceipt(receipt);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : 'No se pudo abrir el comprobante.');
    }
  };

  return (
    <div className="space-y-4">
      {receiptLinks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Comprobantes financieros
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Respaldos asociados a movimientos reales de dinero.</p>
          </div>

          <div className="space-y-2">
            {receiptLinks.map(link => (
              <div key={link.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <strong className="text-slate-900 block">{movementLabel(link.movementKind)} · {formatCLP(link.amount)}</strong>
                  <span className="text-[10px] text-slate-500 block">Fecha: {link.paymentDate}</span>
                  <span className="text-[10px] text-slate-600 block truncate">Archivo: {link.receipt.fileName}</span>
                  {link.notes && <span className="text-[10px] text-slate-500 block mt-0.5">{link.notes}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenReceipt(link.receipt)}
                  className="shrink-0 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver comprobante
                </button>
              </div>
            ))}
          </div>

          {openError && <p className="text-[10px] font-semibold text-rose-700">{openError}</p>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" /> Movimientos financieros
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Detalle de devoluciones, pagos y aportes registrados en este caso.</p>
        </div>

        {refund?.status === 'TRANSFERIDA' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <CheckCircle2 className="w-4 h-4" /> Devolución registrada · {formatCLP(refund.amount)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 text-emerald-950">
              <span><strong>Fecha:</strong> {refund.date || refundMovement?.date || 'Sin fecha'}</span>
              <span><strong>Registrado por:</strong> {refund.user || refundMovement?.user || 'Sin registro'}</span>
              <span><strong>Cuenta destino:</strong> {refund.destinationAccount || 'No registrada'}</span>
              <span><strong>Comprobante:</strong> {receiptLinks.find(link => link.movementKind === 'DEVOLUCION_ARRENDATARIO')?.receipt.fileName || refund.voucherName || 'No registrado'}</span>
            </div>
            {refund.notes && <p className="text-emerald-900"><strong>Observaciones:</strong> {refund.notes}</p>}
          </div>
        )}

        {ownerContributions.map(payment => (
          <div key={payment.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs space-y-1.5">
            <strong className="text-blue-950 block flex items-center gap-1.5"><UserRound className="w-4 h-4" /> Aporte del propietario · {formatCLP(Math.abs(payment.amount))}</strong>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 text-blue-900">
              <span><strong>Fecha:</strong> {payment.date} {payment.time}</span>
              <span><strong>Registrado por:</strong> {payment.user}</span>
            </div>
            {payment.observation && <p className="text-blue-900 whitespace-pre-line"><strong>Detalle:</strong> {payment.observation}</p>}
          </div>
        ))}

        {payments.map(payment => (
          <div key={payment.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
            <strong className="text-slate-900 block">Pago de arrendatario · {formatCLP(Math.abs(payment.amount))}</strong>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 text-slate-700">
              <span><strong>Fecha:</strong> {payment.date} {payment.time}</span>
              <span><strong>Registrado por:</strong> {payment.user}</span>
            </div>
            {payment.observation && <p className="text-slate-700 whitespace-pre-line"><strong>Detalle:</strong> {payment.observation}</p>}
          </div>
        ))}

        {openError && receiptLinks.length === 0 && (
          <p className="text-[10px] font-semibold text-rose-700">{openError}</p>
        )}
      </div>
    </div>
  );
};
