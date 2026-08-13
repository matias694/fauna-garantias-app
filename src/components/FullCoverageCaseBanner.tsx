import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP, formatDate, getLocalDateInputValue } from '../utils/formatters';
import { Banknote, CheckCircle2, ShieldCheck, WalletCards, X } from 'lucide-react';

type OwnerPaymentMode = 'TRANSFERIDO_FAUNA' | 'PAGADO_DIRECTO';

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

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<OwnerPaymentMode>('TRANSFERIDO_FAUNA');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(getLocalDateInputValue());
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  if (activeView !== 'case-detail' || !selectedCaseId) return null;
  const guaranteeCase = cases.find(c => c.id === selectedCaseId);
  if (!guaranteeCase) return null;

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  const readiness = calculateFundingReadiness(guaranteeCase, settings);
  const damagePending = readiness.ownerRepairPendingProvision;
  const servicesPending = readiness.ownerServiceInformationalPending;
  const isFull = guaranteeCase.plan === 'FULL';

  if (fin.damageCharges <= 0 && fin.serviceCharges <= 0) return null;

  const openRepairPayment = () => {
    setPaymentMode('TRANSFERIDO_FAUNA');
    setPaymentAmount(damagePending);
    setPaymentDate(getLocalDateInputValue());
    setReference('');
    setError('');
    setPaymentOpen(true);
  };

  const registerRepairPayment = (event: React.FormEvent) => {
    event.preventDefault();
    if (paymentAmount <= 0 || paymentAmount > damagePending) {
      setError(`El monto debe ser mayor a $0 y no puede superar ${formatCLP(damagePending)}.`);
      return;
    }
    if (!paymentDate) {
      setError('Selecciona la fecha real del pago.');
      return;
    }

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
      reference: reference.trim() || `${paymentMode}-REPARACIONES-${guaranteeCase.id}-${Date.now()}`,
      observation: paymentMode === 'TRANSFERIDO_FAUNA'
        ? 'Fondos recibidos para ejecutar reparaciones.'
        : 'Reparacion pagada directamente por el propietario.'
    });

    setPaymentOpen(false);
  };

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-7xl mx-auto">
      <section className="bg-emerald-950 text-white rounded-2xl border border-emerald-900 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isFull ? <ShieldCheck className="w-5 h-5 text-emerald-300" /> : <WalletCards className="w-5 h-5 text-emerald-300" />}
            <div>
              <h3 className="font-extrabold text-sm">Como se cubre esta salida</h3>
              <p className="text-[11px] text-emerald-200">Resumen de fondos aplicados antes de confirmar la liquidacion.</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Neto cargos y abonos</span>
            <strong className="text-xl font-black font-mono">{formatCLP(fin.totalCharges)}</strong>
          </div>
        </div>

        <div className="space-y-2">
          {fin.damageCharges > 0 && (
            <div className="bg-white/10 rounded-xl border border-white/10 p-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
              <div className="lg:w-64 shrink-0">
                <span className="text-[10px] uppercase font-bold text-emerald-200 block">1. Danos y reparaciones</span>
                <strong className="text-lg font-black font-mono">{formatCLP(fin.damageCharges)}</strong>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-2 text-[11px]">
                {fin.guaranteeForDamage > 0 && <span className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10">Garantia <strong>{formatCLP(fin.guaranteeForDamage)}</strong></span>}
                {isFull && fin.fullCoverageApplied > 0 && <span className="px-2.5 py-1.5 rounded-lg bg-emerald-700/40 border border-emerald-500/30">Plan Full <strong>{formatCLP(fin.fullCoverageApplied)}</strong></span>}
                {readiness.ownerRepairFundedTotal > 0 && <span className="px-2.5 py-1.5 rounded-lg bg-blue-400/10 border border-blue-300/20">Propietario <strong>{formatCLP(readiness.ownerRepairFundedTotal)}</strong></span>}
              </div>
              <div className="lg:w-48 shrink-0 lg:text-right">
                {damagePending === 0
                  ? <span className="inline-flex items-center gap-1.5 text-emerald-200 text-xs font-extrabold"><CheckCircle2 className="w-4 h-4" /> Reparaciones cubiertas</span>
                  : <div><span className="text-[10px] uppercase font-bold text-amber-200 block">Falta para reparar</span><strong className="text-base font-black font-mono text-amber-100">{formatCLP(damagePending)}</strong></div>}
              </div>
            </div>
          )}

          {fin.serviceCharges > 0 && (
            <div className="bg-white/10 rounded-xl border border-white/10 p-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
              <div className="lg:w-64 shrink-0">
                <span className="text-[10px] uppercase font-bold text-emerald-200 block">2. Gastos comunes y servicios</span>
                <strong className="text-lg font-black font-mono">{formatCLP(fin.serviceCharges)}</strong>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-2 text-[11px]">
                {fin.guaranteeForServices > 0
                  ? <span className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10">Garantia sobrante <strong>{formatCLP(fin.guaranteeForServices)}</strong></span>
                  : <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-emerald-200">Sin garantia disponible</span>}
                {fin.creditsForServices > 0 && <span className="px-2.5 py-1.5 rounded-lg bg-cyan-400/10 border border-cyan-300/20">Abono proporcional <strong>{formatCLP(fin.creditsForServices)}</strong></span>}
              </div>
              <div className="lg:w-48 shrink-0 lg:text-right">
                {servicesPending > 0
                  ? <div><span className="text-[10px] uppercase font-bold text-amber-200 block">A cargo del propietario</span><strong className="text-base font-black font-mono text-amber-100">{formatCLP(servicesPending)}</strong></div>
                  : <span className="inline-flex items-center gap-1.5 text-emerald-200 text-xs font-extrabold"><CheckCircle2 className="w-4 h-4" /> Sin saldo</span>}
              </div>
            </div>
          )}
        </div>

        {damagePending > 0 ? (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <strong className="text-xs text-amber-100">Faltan {formatCLP(damagePending)} para cubrir las reparaciones.</strong>
            <button type="button" onClick={openRepairPayment} className="shrink-0 px-4 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emeral-50 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Banknote className="w-4 h-4" /> Registrar aporte para reparaciones
            </button>
          </div>
        ) : (
          <div className="bg-emerald-300/10 border border-emerald-300/30 rounded-xl px-3 py-2 text-[11px] text-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <strong>Las reparaciones estan cubiertas.</strong>
          </div>
        )}
      </section>

      {paymentOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Registrar aporte del propietario</h3>
                <p className="text-xs text-slate-300 mt-0.5">Reparaciones ³ {formatCLP(damagePending)}</p>
              </div>
              <button type="button" onClick={() => setPaymentOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={registerRepairPayment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Monto *</label><input type="number" min="1" max={damagePending} required value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5" /></div>
                <div><label className="block font-bold mb-1">Fecha *</label><input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5" /></div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => setPaymentMode('TRANSFERIDO_FAUNA')} className={`text-left p-3 rounded-xl border ${paymentMode === 'TRANSFERIDO_FAUNA' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}><strong>Transferido a Fauna</strong></button>
                <button type="button" onClick={() => setPaymentMode('PAGADO_DIRECTO')} className={`text-left p-3 rounded-xl border ${paymentMode === 'PAGADO_DIRECTO' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}><strong>Pagado directamente por el propietario</strong></button>
              </div>
              <div><label className="block font-semibold mb-1">Referencia / comprobante</label><input value={reference} onChange={e => setReference(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5" /></div>
              {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800">{error}</div>}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setPaymentOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-700 text-white font-bold rounded-lg">Registrar aporte</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
