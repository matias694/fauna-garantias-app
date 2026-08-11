import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP, formatDate } from '../utils/formatters';
import { Banknote, CheckCircle2, Clock3, ShieldCheck, WalletCards, X } from 'lucide-react';

type OwnerPaymentPurpose = 'REPARACIONES' | 'SERVICIOS';
type OwnerPaymentMode = 'TRANSFERIDO_FAUNA' | 'PAGADO_DIRECTO';

/**
 * Resumen operativo para garantías insuficientes.
 * - Garantía primero a daños.
 * - Plan Full, cuando corresponde, protege al propietario sobre el daño restante.
 * - El abono proporcional del arrendatario se imputa primero a GC/servicios.
 * - Solo su excedente puede compensar obligaciones de daño y el saldo final.
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
  const [paymentPurpose, setPaymentPurpose] = useState<OwnerPaymentPurpose>('SERVICIOS');
  const [paymentMode, setPaymentMode] = useState<OwnerPaymentMode>('TRANSFERIDO_FAUNA');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  if (activeView !== 'case-detail' || !selectedCaseId) return null;

  const guaranteeCase = cases.find(c => c.id === selectedCaseId);
  if (!guaranteeCase) return null;

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  if (!fin.isInsufficient) return null;

  const readiness = calculateFundingReadiness(guaranteeCase, settings);
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const isFull = guaranteeCase.plan === 'FULL';

  const ownerProvisionForDamage = readiness.ownerRepairFundedTotal;
  const ownerProvisionForServices = readiness.ownerServiceFundedTotal;
  const damagePending = readiness.ownerRepairPendingProvision;
  const servicesPending = readiness.ownerServicePending;
  const selectedPending = paymentPurpose === 'REPARACIONES' ? damagePending : servicesPending;

  const openOwnerPayment = (purpose: OwnerPaymentPurpose) => {
    const pending = purpose === 'REPARACIONES' ? damagePending : servicesPending;
    if (pending <= 0) return;
    setPaymentPurpose(purpose);
    setPaymentMode('TRANSFERIDO_FAUNA');
    setPaymentAmount(pending);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentError('');
    setPaymentModalOpen(true);
  };

  const changePaymentPurpose = (purpose: OwnerPaymentPurpose) => {
    const pending = purpose === 'REPARACIONES' ? damagePending : servicesPending;
    setPaymentPurpose(purpose);
    setPaymentAmount(pending);
    setPaymentError('');
  };

  const registerOwnerPayment = (event: React.FormEvent) => {
    event.preventDefault();
    const pending = paymentPurpose === 'REPARACIONES' ? damagePending : servicesPending;

    if (paymentAmount <= 0 || paymentAmount > pending) {
      setPaymentError(`El monto debe ser mayor a $0 y no puede superar el saldo pendiente de ${formatCLP(pending)}.`);
      return;
    }
    if (!paymentDate) {
      setPaymentError('Selecciona la fecha real del pago.');
      return;
    }

    const purposeLabel = paymentPurpose === 'REPARACIONES' ? 'reparaciones' : 'gastos comunes/servicios';
    const modeLabel = paymentMode === 'TRANSFERIDO_FAUNA'
      ? 'Transferido a Fauna'
      : 'Pagado directamente por el propietario';
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    updateGuaranteeCase(guaranteeCase.id, {
      // Este saldo representa lo efectivamente asumido por el propietario y todavía no recuperado.
      ownerContribution: (guaranteeCase.ownerContribution || 0) + paymentAmount
    });

    addFinancialMovement(guaranteeCase.id, {
      date: formatDate(paymentDate),
      time,
      type: 'APORTE_PROPIETARIO',
      ownerPaymentPurpose: paymentPurpose,
      ownerPaymentMode: paymentMode,
      description: paymentMode === 'TRANSFERIDO_FAUNA'
        ? `Fondos recibidos de propietario para ${purposeLabel} (${guaranteeCase.ownerName})`
        : `Pago directo realizado por propietario para ${purposeLabel} (${guaranteeCase.ownerName})`,
      amount: paymentAmount,
      user: userRole,
      reference: paymentReference.trim() || `${paymentMode}-${paymentPurpose}-${guaranteeCase.id}-${Date.now()}`,
      observation: [
        `Modalidad: ${modeLabel}`,
        `Destino: ${purposeLabel}`,
        paymentMode === 'PAGADO_DIRECTO'
          ? 'Fauna no recibió estos fondos; se registra porque el propietario ya asumió este costo y debe recuperarse si posteriormente paga el arrendatario.'
          : 'Fauna recibió estos fondos para aplicarlos al caso; el monto debe recuperarse al propietario si posteriormente paga el arrendatario.',
        paymentNotes.trim()
      ].filter(Boolean).join(' · ')
    });

    setPaymentModalOpen(false);
  };

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-7xl mx-auto">
      <section className="bg-emerald-950 text-white rounded-2xl border border-emerald-900 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isFull ? <ShieldCheck className="w-5 h-5 text-emerald-300" /> : <WalletCards className="w-5 h-5 text-emerald-300" />}
            <div>
              <h3 className="font-extrabold text-sm">Cómo se cubre esta salida</h3>
              <p className="text-[11px] text-emerald-200">
                Resumen de fondos aplicados y saldos pendientes antes de confirmar la liquidación.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Neto cargos y abonos</span>
            <strong className="text-xl font-black font-mono">{formatCLP(fin.totalCharges)}</strong>
            {fin.tenantCredits > 0 && (
              <span className="text-[10px] text-emerald-200 block">Cargos {formatCLP(fin.grossCharges)} · Abonos {formatCLP(fin.tenantCredits)}</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {fin.damageCharges > 0 && (
            <div className="bg-white/10 rounded-xl border border-white/10 p-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
              <div className="lg:w-64 shrink-0">
                <span className="text-[10px] uppercase font-bold text-emerald-200 block">1. Daños y reparaciones</span>
                <strong className="text-lg font-black font-mono">{formatCLP(fin.damageCharges)}</strong>
              </div>

              <div className="flex-1 flex flex-wrap items-center gap-2 text-[11px]">
                {fin.guaranteeForDamage > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10">Garantía <strong>{formatCLP(fin.guaranteeForDamage)}</strong></span>
                )}
                {isFull && fin.fullCoverageApplied > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-emerald-700/40 border border-emerald-500/30">Plan Full <strong>{formatCLP(fin.fullCoverageApplied)}</strong></span>
                )}
                {fin.creditsForDamage > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-cyan-400/10 border border-cyan-300/20">Excedente abono <strong>{formatCLP(fin.creditsForDamage)}</strong></span>
                )}
                {ownerProvisionForDamage > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-blue-400/10 border border-blue-300/20">Propietario <strong>{formatCLP(ownerProvisionForDamage)}</strong></span>
                )}
              </div>

              <div className="lg:w-48 shrink-0 lg:text-right">
                {damagePending === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-200 text-xs font-extrabold"><CheckCircle2 className="w-4 h-4" /> Reparaciones cubiertas</span>
                ) : (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-200 block">Falta para reparar</span>
                    <strong className="text-base font-black font-mono text-amber-100">{formatCLP(damagePending)}</strong>
                  </div>
                )}
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
                {fin.guaranteeForServices > 0 ? (
                  <span className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10">Garantía sobrante <strong>{formatCLP(fin.guaranteeForServices)}</strong></span>
                ) : (
                  <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-emerald-200">Sin garantía disponible</span>
                )}
                {fin.creditsForServices > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-cyan-400/10 border border-cyan-300/20">Abono proporcional <strong>{formatCLP(fin.creditsForServices)}</strong></span>
                )}
                {ownerProvisionForServices > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-blue-400/10 border border-blue-300/20">Pagado por propietario <strong>{formatCLP(ownerProvisionForServices)}</strong></span>
                )}
                {readiness.ownerServiceSettledFromTenant > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-emerald-700/30 border border-emerald-500/20">Cubierto posteriormente <strong>{formatCLP(readiness.ownerServiceSettledFromTenant)}</strong></span>
                )}
              </div>

              <div className="lg:w-48 shrink-0 lg:text-right">
                {servicesPending === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-200 text-xs font-extrabold"><CheckCircle2 className="w-4 h-4" /> Sin saldo pendiente</span>
                ) : (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-200 block">Pendiente propietario</span>
                    <strong className="text-base font-black font-mono text-amber-100">{formatCLP(servicesPending)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!isConfirmed && damagePending > 0 && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-[11px] text-amber-100">
              <strong className="block text-xs">Faltan {formatCLP(damagePending)} para ejecutar las reparaciones.</strong>
              <span className="block mt-0.5">Esta diferencia sí debe estar efectivamente asumida por el propietario antes de confirmar la liquidación.</span>
              <span className="block mt-1">Registra si transfirió los fondos a Fauna o si pagó directamente al proveedor.</span>
            </div>
            <button type="button" onClick={() => openOwnerPayment('REPARACIONES')} className="shrink-0 px-4 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Banknote className="w-4 h-4" /> Registrar pago propietario
            </button>
          </div>
        )}

        {servicesPending > 0 && (
          <div className="bg-sky-300/10 border border-sky-300/25 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] text-sky-50">
            <div className="flex items-start gap-2.5">
              <Clock3 className="w-4 h-4 shrink-0 mt-0.5 text-sky-200" />
              <div>
                <strong className="block text-xs">Quedan {formatCLP(servicesPending)} pendientes del propietario en gastos comunes y/o servicios.</strong>
                <span className="block mt-0.5">Este saldo no bloquea la liquidación. Registra el pago solo cuando el propietario efectivamente lo haya asumido.</span>
              </div>
            </div>
            <button type="button" onClick={() => openOwnerPayment('SERVICIOS')} className="shrink-0 px-3.5 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Banknote className="w-4 h-4" /> Registrar pago propietario
            </button>
          </div>
        )}

        {!isConfirmed && damagePending === 0 && (
          <div className="bg-emerald-300/10 border border-emerald-300/30 rounded-xl px-3 py-2 text-[11px] text-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>Las reparaciones están cubiertas y la liquidación puede continuar.</strong>
              {servicesPending > 0
                ? ' El saldo de gastos comunes/servicios quedará registrado como pendiente del propietario.'
                : ' Revisa la liquidación y confírmala cuando los cargos sean definitivos.'}
            </span>
          </div>
        )}
      </section>

      {paymentModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base">Registrar pago del propietario</h3>
                <p className="text-xs text-slate-300 mt-0.5">{guaranteeCase.ownerName} · {guaranteeCase.id}</p>
              </div>
              <button type="button" onClick={() => setPaymentModalOpen(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={registerOwnerPayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Destino *</label>
                <select
                  value={paymentPurpose}
                  onChange={e => changePaymentPurpose(e.target.value as OwnerPaymentPurpose)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                >
                  {damagePending > 0 && <option value="REPARACIONES">Reparaciones · pendiente {formatCLP(damagePending)}</option>}
                  {servicesPending > 0 && <option value="SERVICIOS">Gastos comunes y servicios · pendiente {formatCLP(servicesPending)}</option>}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Monto *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedPending}
                    step="1"
                    required
                    value={paymentAmount}
                    onChange={e => { setPaymentAmount(Number(e.target.value)); setPaymentError(''); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold font-mono text-blue-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Máximo pendiente: {formatCLP(selectedPending)}</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Fecha real del pago *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => { setPaymentDate(e.target.value); setPaymentError(''); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-2">Modalidad *</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('TRANSFERIDO_FAUNA')}
                    className={`text-left p-3 rounded-xl border ${paymentMode === 'TRANSFERIDO_FAUNA' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'} cursor-pointer`}
                  >
                    <strong className="block text-slate-900">Transferido a Fauna</strong>
                    <span className="text-[11px] text-slate-600">Fauna recibió efectivamente los fondos para aplicarlos al caso.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('PAGADO_DIRECTO')}
                    className={`text-left p-3 rounded-xl border ${paymentMode === 'PAGADO_DIRECTO' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'} cursor-pointer`}
                  >
                    <strong className="block text-slate-900">Pagado directamente por el propietario</strong>
                    <span className="text-[11px] text-slate-600">El propietario pagó al proveedor, administración u otro tercero. Fauna no recibió ese dinero.</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Referencia / comprobante</label>
                <input
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="Ej. transferencia 12345, comprobante GC, factura proveedor..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Información adicional del pago..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-950">
                <strong className="block">Este monto quedará como asumido por el propietario.</strong>
                Si posteriormente paga el arrendatario, la distribución interna lo recuperará para el propietario antes de recuperar financiamiento Fauna.
              </div>

              {paymentError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] font-semibold text-rose-800">{paymentError}</div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-semibold cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer">Registrar pago</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};