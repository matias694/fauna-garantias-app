import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateFundingReadiness, calculateGuaranteeFinances, canConfirmGuaranteeLiquidation } from '../utils/calculations';
import { formatCLP, formatDate, getLocalDateInputValue } from '../utils/formatters';
import { FinancialTransactionFields } from './FinancialTransactionFields';
import { registerFinancialReceiptLink, uploadFinancialReceipt } from '../services/financialReceiptStorage';
import { Banknote, CheckCircle2, Clock3, ShieldCheck, X } from 'lucide-react';

type OwnerPaymentMode = 'TRANSFERIDO_FAUNA' | 'PAGADO_DIRECTO';

/**
 * Resumen operativo de una salida con garantía insuficiente.
 * Regla central:
 * - Si Fauna no desembolsó dinero, el monto se informa y la garantía puede cerrar.
 * - Si faltan fondos para ejecutar reparaciones, sí debe registrarse el aporte correspondiente.
 * - Si Fauna desembolsó por Plan Full, la recuperación se controla desde la cobranza al arrendatario.
 */
export const FullCoverageCaseBanner: React.FC = () => {
  const {
    activeView,
    selectedCaseId,
    cases,
    settings,
    userRole,
    updateGuaranteeCase,
    addFinancialMovement
  } = useApp();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<OwnerPaymentMode>('TRANSFERIDO_FAUNA');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(getLocalDateInputValue());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (activeView !== 'case-detail' || !selectedCaseId) return null;

  const guaranteeCase = cases.find(c => c.id === selectedCaseId);
  if (!guaranteeCase) return null;

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  if (!fin.isInsufficient) return null;

  const readiness = calculateFundingReadiness(guaranteeCase, settings);
  const damagePending = readiness.ownerRepairPendingProvision;
  const servicesPending = guaranteeCase.liquidationSnapshot?.financials.ownerServicePendingAtIssue ?? readiness.ownerServicePending;
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const canConfirm = canConfirmGuaranteeLiquidation(guaranteeCase, settings);

  const openRepairPayment = () => {
    if (damagePending <= 0 || isConfirmed) return;
    setPaymentMode('TRANSFERIDO_FAUNA');
    setPaymentAmount(damagePending);
    setPaymentDate(getLocalDateInputValue());
    setReceiptFile(null);
    setPaymentNotes('');
    setPaymentError('');
    setIsSaving(false);
    setPaymentModalOpen(true);
  };

  const registerRepairPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setPaymentError('');

    if (paymentAmount <= 0 || paymentAmount > damagePending) {
      setPaymentError(`El monto debe ser mayor a $0 y no puede superar ${formatCLP(damagePending)}.`);
      return;
    }
    if (!paymentDate) {
      setPaymentError('Selecciona la fecha real del pago.');
      return;
    }
    if (!receiptFile) {
      setPaymentError('Adjunta el comprobante antes de registrar el aporte.');
      return;
    }

    const modeLabel = paymentMode === 'TRANSFERIDO_FAUNA'
      ? 'Transferido a Fauna'
      : 'Pagado directamente por el propietario';

    setIsSaving(true);
    try {
      const receipt = await uploadFinancialReceipt(receiptFile, {
        caseId: guaranteeCase.id,
        movementKind: 'APORTE_PROPIETARIO'
      });

      updateGuaranteeCase(guaranteeCase.id, {
        ownerContribution: (guaranteeCase.ownerContribution || 0) + paymentAmount
      });

      addFinancialMovement(guaranteeCase.id, {
        date: formatDate(paymentDate),
        time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        type: 'APORTE_PROPIETARIO',
        ownerPaymentPurpose: 'REPARACIONES',
        ownerPaymentMode: paymentMode,
        description: paymentMode === 'TRANSFERIDO_FAUNA'
          ? `Fondos recibidos de propietario para reparaciones (${guaranteeCase.ownerName})`
          : `Pago directo realizado por propietario para reparaciones (${guaranteeCase.ownerName})`,
        amount: paymentAmount,
        user: userRole,
        reference: `APORTE-${guaranteeCase.id}-${Date.now()}`,
        observation: [
          `Modalidad: ${modeLabel}`,
          'Destino: reparaciones',
          'Monto sujeto a recuperación si posteriormente paga el arrendatario.',
          paymentNotes.trim()
        ].filter(Boolean).join(' · '),
        receipt
      });

      await registerFinancialReceiptLink({
        caseId: guaranteeCase.id,
        movementKind: 'APORTE_PROPIETARIO',
        amount: paymentAmount,
        paymentDate,
        relatedEntityId: guaranteeCase.id,
        receipt,
        notes: [`Modalidad: ${modeLabel}`, paymentNotes.trim()].filter(Boolean).join(' · ')
      });

      setPaymentModalOpen(false);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'No se pudo guardar el comprobante.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-emerald-950 text-white rounded-2xl border border-emerald-800 shadow-sm p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-base">Cómo se cubre esta salida</h3>
            <p className="text-xs text-emerald-200 mt-0.5">Resumen de fondos aplicados antes de confirmar la liquidación.</p>
          </div>
        </div>
        <div className="md:text-right">
          <span className="text-[10px] uppercase tracking-wide font-bold text-emerald-300 block">Neto cargos y abonos</span>
          <strong className="text-xl font-mono">{formatCLP(fin.totalCharges)}</strong>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white/10 border border-white/10 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] lg:items-center gap-3">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-emerald-200 block">1. Daños y reparaciones</span>
            <strong className="font-mono text-lg">{formatCLP(fin.damageCharges)}</strong>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {fin.guaranteeForDamage > 0 && (
              <span className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Garantía <strong>{formatCLP(fin.guaranteeForDamage)}</strong></span>
            )}
            {fin.fullCoverageApplied > 0 && (
              <span className="px-3 py-2 rounded-lg bg-emerald-800 border border-emerald-600">Plan Full <strong>{formatCLP(fin.fullCoverageApplied)}</strong></span>
            )}
            {readiness.ownerRepairFundedTotal > 0 && (
              <span className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Propietario <strong>{formatCLP(readiness.ownerRepairFundedTotal)}</strong></span>
            )}
          </div>

          <div className="lg:text-right">
            {damagePending > 0 ? (
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Falta aporte propietario</span>
                  <strong className="font-mono text-lg text-amber-200">{formatCLP(damagePending)}</strong>
                </div>
                {!isConfirmed && (
                  <button onClick={openRepairPayment} className="px-3.5 py-2 bg-white text-emerald-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer">
                    <Banknote className="w-4 h-4" /> Registrar aporte
                  </button>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold text-emerald-200 inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Reparaciones cubiertas</span>
            )}
          </div>
        </div>

        {fin.serviceCharges > 0 && (
          <div className="bg-white/10 border border-white/10 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] lg:items-center gap-3">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-emerald-200 block">2. Gastos comunes y servicios</span>
              <strong className="font-mono text-lg">{formatCLP(fin.serviceCharges)}</strong>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {fin.guaranteeForServices > 0 && (
                <span className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Garantía <strong>{formatCLP(fin.guaranteeForServices)}</strong></span>
              )}
              {fin.creditsForServices > 0 && (
                <span className="px-3 py-2 rounded-lg bg-white/10 border border-white/10">Abonos <strong>{formatCLP(fin.creditsForServices)}</strong></span>
              )}
              {fin.guaranteeForServices === 0 && fin.creditsForServices === 0 && (
                <span className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-emerald-200">Sin garantía disponible</span>
              )}
            </div>

            <div className="lg:text-right">
              {servicesPending > 0 ? (
                <>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">A cargo del propietario</span>
                  <strong className="font-mono text-lg text-amber-200">{formatCLP(servicesPending)}</strong>
                </>
              ) : (
                <span className="text-sm font-bold text-emerald-200 inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Cubiertos</span>
              )}
            </div>
          </div>
        )}
      </div>

      {damagePending > 0 ? (
        <div className="border border-amber-400/40 bg-amber-300/10 rounded-xl p-3 text-xs text-amber-100 flex items-start gap-2">
          <Clock3 className="w-4 h-4 mt-0.5 shrink-0" />
          <span><strong>Falta financiar reparaciones.</strong> Registra el aporte del propietario para poder confirmar.</span>
        </div>
      ) : (
        <div className="border border-emerald-500/50 bg-emerald-900/50 rounded-xl p-3 text-xs text-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <strong>{canConfirm ? 'Reparaciones cubiertas. Liquidación lista para confirmar.' : 'Reparaciones cubiertas.'}</strong>
        </div>
      )}

      {paymentModalOpen && damagePending > 0 && !isConfirmed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-slate-900">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-sm">Registrar aporte para reparaciones</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">Pendiente: {formatCLP(damagePending)}</p>
              </div>
              <button type="button" onClick={() => setPaymentModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={registerRepairPayment} className="p-5 space-y-4 text-xs">
              <FinancialTransactionFields
                amount={paymentAmount}
                onAmountChange={setPaymentAmount}
                amountMin={1}
                amountMax={damagePending}
                date={paymentDate}
                onDateChange={setPaymentDate}
                receiptFile={receiptFile}
                onReceiptFileChange={setReceiptFile}
                notes={paymentNotes}
                onNotesChange={setPaymentNotes}
                receiptLabel="Comprobante de pago"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modalidad *</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as OwnerPaymentMode)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5">
                    <option value="TRANSFERIDO_FAUNA">Transferido a Fauna</option>
                    <option value="PAGADO_DIRECTO">Pagado directamente por el propietario</option>
                  </select>
                </div>
              </FinancialTransactionFields>

              {paymentError && <p className="text-rose-700 font-semibold">{paymentError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={isSaving} onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer disabled:opacity-60">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl cursor-pointer">
                  {isSaving ? 'Guardando…' : 'Registrar aporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
