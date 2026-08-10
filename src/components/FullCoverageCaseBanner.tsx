import React from 'react';
import { useApp } from '../context/AppContext';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP, formatDate } from '../utils/formatters';
import { Banknote, CheckCircle2, Clock3, ShieldCheck, WalletCards } from 'lucide-react';

/**
 * Resumen operativo para garantías insuficientes.
 * - Una diferencia en reparaciones debe resolverse antes de confirmar.
 * - GC/servicios pendientes del propietario no bloquean la liquidación, pero sí
 *   permanecen como obligación vigente hasta quedar cubiertos.
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

  const registerOwnerFunds = (amount: number, purpose: 'REPARACIONES' | 'SERVICIOS') => {
    if (amount <= 0) return;

    const today = formatDate(new Date().toISOString().split('T')[0]);
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const isRepair = purpose === 'REPARACIONES';

    updateGuaranteeCase(guaranteeCase.id, {
      ownerContribution: (guaranteeCase.ownerContribution || 0) + amount
    });

    addFinancialMovement(guaranteeCase.id, {
      date: today,
      time,
      type: 'APORTE_PROPIETARIO',
      description: isRepair
        ? `Provisión para reparaciones recibida del propietario (${guaranteeCase.ownerName})`
        : `Pago de gastos comunes/servicios recibido del propietario (${guaranteeCase.ownerName})`,
      amount,
      user: userRole,
      reference: `${isRepair ? 'PROVISION-REPARACIONES' : 'PAGO-SERVICIOS'}-${guaranteeCase.id}`,
      observation: isRepair
        ? 'Fondos efectivamente recibidos para cubrir la diferencia de daños/reparaciones'
        : 'Fondos efectivamente recibidos para regularizar gastos comunes y/o servicios pendientes'
    });
  };

  const registerRepairProvision = () => {
    if (isConfirmed || damagePending <= 0) return;
    registerOwnerFunds(damagePending, 'REPARACIONES');
  };

  const registerServicePayment = () => {
    if (servicesPending <= 0) return;
    registerOwnerFunds(servicesPending, 'SERVICIOS');
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
                Primero se usa la garantía en daños y reparaciones; {isFull ? 'si no alcanza, Plan Full cubre solo el daño restante. ' : ''}Después se consideran gastos comunes y servicios.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Presupuesto total</span>
            <strong className="text-xl font-black font-mono">{formatCLP(fin.totalCharges)}</strong>
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

        {isFull && fin.fullCoverageApplied > 0 && (
          <p className="text-[11px] text-emerald-100">
            Plan Full está usando <strong>{formatCLP(fin.fullCoverageApplied)}</strong> de un máximo disponible de {formatCLP(fin.fullCoverageLimit)}. La cobertura se ajusta automáticamente al daño registrado.
          </p>
        )}

        {!isConfirmed && damagePending > 0 && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-[11px] text-amber-100">
              <strong className="block text-xs">Faltan {formatCLP(damagePending)} para ejecutar las reparaciones.</strong>
              <span className="block mt-0.5">Esta diferencia sí debe estar provisionada por el propietario antes de confirmar la liquidación.</span>
              <span className="block mt-1">Si no provisiona, ajusta el alcance de las reparaciones al presupuesto efectivamente disponible.</span>
            </div>
            <button type="button" onClick={registerRepairProvision} className="shrink-0 px-4 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Banknote className="w-4 h-4" /> Registrar provisión {formatCLP(damagePending)}
            </button>
          </div>
        )}

        {servicesPending > 0 && (
          <div className="bg-sky-300/10 border border-sky-300/25 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] text-sky-50">
            <div className="flex items-start gap-2.5">
              <Clock3 className="w-4 h-4 shrink-0 mt-0.5 text-sky-200" />
              <div>
                <strong className="block text-xs">Quedan {formatCLP(servicesPending)} pendientes del propietario en gastos comunes y/o servicios.</strong>
                <span className="block mt-0.5">Este saldo no bloquea la liquidación. Se mantiene vigente hasta que el propietario lo pague o se cubra posteriormente con fondos disponibles.</span>
              </div>
            </div>
            <button type="button" onClick={registerServicePayment} className="shrink-0 px-3.5 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer">
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
    </div>
  );
};
