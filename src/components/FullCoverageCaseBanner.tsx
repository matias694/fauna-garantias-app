import React from 'react';
import { useApp } from '../context/AppContext';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP, formatDate } from '../utils/formatters';
import { Banknote, CheckCircle2, ShieldCheck, WalletCards } from 'lucide-react';

/**
 * Resumen operativo simple para garantías insuficientes.
 * Antes de confirmar responde solo tres preguntas: cuánto cuesta la salida,
 * cuánto está cubierto y cuánto debe provisionar el propietario.
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

  const ownerProvisionApplied = Math.min(readiness.ownerProvisionedTotal, readiness.ownerRequired);
  const coveredBeforeOwner = fin.guaranteeAmount + fin.fullCoverageApplied;
  const fundsCovered = coveredBeforeOwner + ownerProvisionApplied;
  const missingFunds = readiness.ownerPendingProvision;

  const registerOwnerProvision = () => {
    if (isConfirmed || missingFunds <= 0) return;

    const today = formatDate(new Date().toISOString().split('T')[0]);
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    updateGuaranteeCase(guaranteeCase.id, {
      ownerContribution: (guaranteeCase.ownerContribution || 0) + missingFunds
    });

    addFinancialMovement(guaranteeCase.id, {
      date: today,
      time,
      type: 'APORTE_PROPIETARIO',
      description: `Provisión de fondos recibida del propietario (${guaranteeCase.ownerName})`,
      amount: missingFunds,
      user: userRole,
      reference: `PROVISION-PROP-${guaranteeCase.id}`,
      observation: 'Fondos efectivamente recibidos para completar el presupuesto de salida'
    });
  };

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-7xl mx-auto">
      <section className="bg-emerald-950 text-white rounded-2xl border border-emerald-900 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isFull ? <ShieldCheck className="w-5 h-5 text-emerald-300" /> : <WalletCards className="w-5 h-5 text-emerald-300" />}
            <div>
              <h3 className="font-extrabold text-sm">Fondos para la salida</h3>
              <p className="text-[11px] text-emerald-200">
                {isConfirmed
                  ? 'Estos son los fondos considerados en la liquidación confirmada.'
                  : 'Revisa si el presupuesto está cubierto antes de confirmar la liquidación.'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-800 border border-emerald-700">
            {isConfirmed ? 'Liquidación confirmada' : 'Antes de confirmar'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Costo total</span>
            <strong className="text-xl font-black font-mono">{formatCLP(fin.totalCharges)}</strong>
            <span className="text-[10px] text-emerald-200 block">Reparaciones y cargos registrados</span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Cubierto</span>
            <strong className="text-xl font-black font-mono">{formatCLP(fundsCovered)}</strong>
            <div className="text-[10px] text-emerald-200 mt-0.5 space-y-0.5">
              <div>Garantía: {formatCLP(fin.guaranteeAmount)}</div>
              {isFull && fin.fullCoverageApplied > 0 && (
                <div>Plan Full: {formatCLP(fin.fullCoverageApplied)}</div>
              )}
              {ownerProvisionApplied > 0 && (
                <div>Propietario: {formatCLP(ownerProvisionApplied)}</div>
              )}
            </div>
          </div>

          <div className={`rounded-xl p-3 border ${missingFunds > 0 ? 'bg-amber-300/10 border-amber-300/30' : 'bg-emerald-300/10 border-emerald-300/30'}`}>
            <span className={`text-[10px] uppercase font-bold block ${missingFunds > 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
              {missingFunds > 0 ? 'Falta cubrir' : 'Estado'}
            </span>
            {missingFunds > 0 ? (
              <strong className="text-xl font-black font-mono text-amber-100">{formatCLP(missingFunds)}</strong>
            ) : (
              <div className="flex items-center gap-1.5 mt-1 text-emerald-100 font-extrabold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Fondos cubiertos
              </div>
            )}
          </div>
        </div>

        {isFull && fin.fullCoverageApplied > 0 && (
          <p className="text-[11px] text-emerald-100">
            El Plan Full cubre automáticamente <strong>{formatCLP(fin.fullCoverageApplied)}</strong> según los daños/reparaciones registrados. No necesariamente utiliza el máximo de {formatCLP(fin.fullCoverageLimit)}.
          </p>
        )}

        {!isConfirmed && missingFunds > 0 && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-[11px] text-amber-100">
              <strong className="block text-xs">El propietario debe provisionar {formatCLP(missingFunds)} para continuar.</strong>
              <span>Si no provisiona los fondos, ajusta las reparaciones/cargos al presupuesto disponible y el sistema recalculará automáticamente.</span>
            </div>
            <button
              type="button"
              onClick={registerOwnerProvision}
              className="shrink-0 px-4 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              Registrar provisión {formatCLP(missingFunds)}
            </button>
          </div>
        )}

        {!isConfirmed && missingFunds === 0 && (
          <div className="bg-emerald-300/10 border border-emerald-300/30 rounded-xl px-3 py-2 text-[11px] text-emerald-100">
            <strong>Fondos cubiertos.</strong> Revisa los documentos y confirma la liquidación cuando los cargos sean definitivos.
          </div>
        )}
      </section>
    </div>
  );
};
