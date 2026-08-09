import React from 'react';
import { useApp } from '../context/AppContext';
import { calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP, formatDate } from '../utils/formatters';
import { Banknote, ShieldCheck } from 'lucide-react';

/**
 * Desglose interno de Plan Full.
 * Separa lo requerido/aplicable por la liquidación de lo efectivamente
 * aportado o desembolsado, para no inflar los reportes de recuperación.
 */
export const FullCoverageCaseBanner: React.FC = () => {
  const {
    activeView,
    selectedCaseId,
    cases,
    receivables,
    settings,
    userRole,
    updateGuaranteeCase,
    addFinancialMovement
  } = useApp();

  if (activeView !== 'case-detail' || !selectedCaseId) return null;

  const guaranteeCase = cases.find(c => c.id === selectedCaseId);
  if (!guaranteeCase || guaranteeCase.plan !== 'FULL') return null;

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  if (!fin.isInsufficient) return null;

  const receivable = receivables.find(r => r.caseId === guaranteeCase.id);
  const isIssued = guaranteeCase.liquidationStatus === 'EMITIDA';

  const ownerRequired = fin.ownerContributionRequired;
  const faunaRequired = fin.faunaFinancingRequired;

  // Antes de emitir, los campos del caso son los desembolsos efectivos acumulados.
  // Después de emitir, el receivable contiene lo que aún falta recuperar.
  const ownerFunded = guaranteeCase.ownerContribution || 0;
  const faunaFunded = guaranteeCase.faunaFinancing || 0;
  const ownerToRecover = receivable ? receivable.ownerContributionToRecover : ownerFunded;
  const faunaToRecover = receivable ? receivable.faunaFinancingToRecover : faunaFunded;

  const ownerRemainingToFund = Math.max(0, ownerRequired - ownerFunded);
  const faunaRemainingToFund = Math.max(0, faunaRequired - faunaFunded);

  const registerFundingMovement = (type: 'OWNER' | 'FAUNA') => {
    if (isIssued) return;

    const amount = type === 'OWNER' ? ownerRemainingToFund : faunaRemainingToFund;
    if (amount <= 0) return;

    const today = formatDate(new Date().toISOString().split('T')[0]);
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    if (type === 'OWNER') {
      updateGuaranteeCase(guaranteeCase.id, {
        ownerContribution: ownerFunded + amount
      });
      addFinancialMovement(guaranteeCase.id, {
        date: today,
        time,
        type: 'APORTE_PROPIETARIO',
        description: `Aporte efectivo del propietario (${guaranteeCase.ownerName})`,
        amount,
        user: userRole,
        reference: `APORTE-PROP-${guaranteeCase.id}`,
        observation: 'Aporte efectivamente recibido para cubrir saldo fuera de cobertura Full'
      });
      return;
    }

    updateGuaranteeCase(guaranteeCase.id, {
      faunaFinancing: faunaFunded + amount
    });
    addFinancialMovement(guaranteeCase.id, {
      date: today,
      time,
      type: 'FINANCIAMIENTO_FAUNA',
      description: 'Desembolso efectivo de financiamiento Fauna por cobertura Full',
      amount,
      user: userRole,
      reference: `FIN-FAUNA-${guaranteeCase.id}`,
      observation: 'Fondos efectivamente desembolsados por Fauna para ejecutar la cobertura Full'
    });
  };

  const ownerFundingComplete = ownerRemainingToFund === 0;
  const faunaFundingComplete = faunaRemainingToFund === 0;

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-7xl mx-auto">
      <section className="bg-emerald-950 text-white rounded-2xl border border-emerald-900 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-extrabold text-sm">Desglose interno · Plan Full</h3>
              <p className="text-[11px] text-emerald-200">
                La liquidación calcula lo requerido; el reporte financiero solo reconoce dinero efectivamente aportado o desembolsado.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-800 border border-emerald-700">
            {isIssued ? 'Liquidación emitida' : 'Proyección antes de emitir'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Cobertura Full aplicable</span>
            <strong className="text-lg font-black font-mono">{formatCLP(fin.fullCoverageApplied)}</strong>
            <span className="text-[10px] text-emerald-200 block">Máximo aplicable a daños según la liquidación</span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Aporte propietario requerido</span>
            <strong className="text-lg font-black font-mono">{formatCLP(ownerRequired)}</strong>
            <span className="text-[10px] text-emerald-200 block">
              {isIssued
                ? `Por recuperar: ${formatCLP(ownerToRecover)}`
                : `Aportado efectivamente: ${formatCLP(ownerFunded)}`}
            </span>
            {!isIssued && ownerRequired > 0 && (
              <button
                type="button"
                onClick={() => registerFundingMovement('OWNER')}
                disabled={ownerFundingComplete}
                className={`mt-1 w-full px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  ownerFundingComplete
                    ? 'bg-emerald-800/70 text-emerald-200 cursor-default'
                    : 'bg-white text-emerald-950 hover:bg-emerald-50 cursor-pointer'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                {ownerFundingComplete ? 'Aporte registrado' : `Registrar aporte ${formatCLP(ownerRemainingToFund)}`}
              </button>
            )}
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Financiamiento Fauna requerido</span>
            <strong className="text-lg font-black font-mono">{formatCLP(faunaRequired)}</strong>
            <span className="text-[10px] text-emerald-200 block">
              {isIssued
                ? `Por recuperar: ${formatCLP(faunaToRecover)}`
                : `Desembolsado efectivamente: ${formatCLP(faunaFunded)}`}
            </span>
            {!isIssued && faunaRequired > 0 && (
              <button
                type="button"
                onClick={() => registerFundingMovement('FAUNA')}
                disabled={faunaFundingComplete}
                className={`mt-1 w-full px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  faunaFundingComplete
                    ? 'bg-emerald-800/70 text-emerald-200 cursor-default'
                    : 'bg-white text-emerald-950 hover:bg-emerald-50 cursor-pointer'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                {faunaFundingComplete ? 'Desembolso registrado' : `Registrar desembolso ${formatCLP(faunaRemainingToFund)}`}
              </button>
            )}
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Deuda arrendatario</span>
            <strong className="text-lg font-black font-mono">{formatCLP(receivable?.pendingBalance ?? fin.tenantDeficit)}</strong>
            <span className="text-[10px] text-emerald-200 block">La cobertura no extingue su deuda</span>
          </div>
        </div>

        {!isIssued && (!ownerFundingComplete || !faunaFundingComplete) && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl px-3 py-2 text-[11px] text-amber-100">
            Los montos requeridos aún no se consideran “por recuperar”. Registra solo los aportes o desembolsos que efectivamente hayan ocurrido antes de emitir la liquidación.
          </div>
        )}

        {isIssued && (ownerFunded < ownerRequired || faunaFunded < faunaRequired) && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl px-3 py-2 text-[11px] text-amber-100">
            Esta liquidación fue emitida sin registrar todos los desembolsos requeridos. Por eso el reporte de recuperación solo incluye los montos que sí fueron registrados efectivamente.
          </div>
        )}

        <p className="text-[11px] text-emerald-100">
          Si el arrendatario paga posteriormente, la recuperación se imputa primero al aporte efectivamente realizado por el propietario y luego al financiamiento efectivamente desembolsado por Fauna.
        </p>
      </section>
    </div>
  );
};
