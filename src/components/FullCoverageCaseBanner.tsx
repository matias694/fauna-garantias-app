import React from 'react';
import { useApp } from '../context/AppContext';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP, formatDate } from '../utils/formatters';
import { Banknote, ShieldCheck, WalletCards } from 'lucide-react';

/**
 * Bloque operativo para garantías insuficientes.
 * Distingue claramente cálculo, provisión efectiva del propietario y ejecución
 * real de la cobertura Full. Una aprobación sin fondos no habilita gastos.
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
  if (!guaranteeCase) return null;

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  if (!fin.isInsufficient) return null;

  const readiness = calculateFundingReadiness(guaranteeCase, settings);
  const receivable = receivables.find(r => r.caseId === guaranteeCase.id);
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const isFull = guaranteeCase.plan === 'FULL';

  const ownerCurrentBalance = guaranteeCase.ownerContribution || 0;
  const faunaCurrentBalance = guaranteeCase.faunaFinancing || 0;
  const ownerToRecover = receivable ? receivable.ownerContributionToRecover : ownerCurrentBalance;
  const faunaToRecover = receivable ? receivable.faunaFinancingToRecover : faunaCurrentBalance;

  const registerFundingMovement = (type: 'OWNER' | 'FULL') => {
    if (isConfirmed) return;

    const amount = type === 'OWNER'
      ? readiness.ownerPendingProvision
      : readiness.fullCoveragePendingExecution;
    if (amount <= 0) return;

    const today = formatDate(new Date().toISOString().split('T')[0]);
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    if (type === 'OWNER') {
      updateGuaranteeCase(guaranteeCase.id, {
        ownerContribution: ownerCurrentBalance + amount
      });
      addFinancialMovement(guaranteeCase.id, {
        date: today,
        time,
        type: 'APORTE_PROPIETARIO',
        description: `Provisión de fondos recibida del propietario (${guaranteeCase.ownerName})`,
        amount,
        user: userRole,
        reference: `PROVISION-PROP-${guaranteeCase.id}`,
        observation: 'Fondos efectivamente recibidos del propietario antes de ejecutar gastos fuera del presupuesto disponible'
      });
      return;
    }

    updateGuaranteeCase(guaranteeCase.id, {
      faunaFinancing: faunaCurrentBalance + amount
    });
    addFinancialMovement(guaranteeCase.id, {
      date: today,
      time,
      type: 'FINANCIAMIENTO_FAUNA',
      description: 'Ejecución efectiva de cobertura Plan Full por Fauna',
      amount,
      user: userRole,
      reference: `COBERTURA-FULL-${guaranteeCase.id}`,
      observation: 'Cobertura Plan Full efectivamente desembolsada para cubrir daños de salida'
    });
  };

  const ownerProvisionComplete = readiness.ownerPendingProvision === 0;
  const fullCoverageComplete = readiness.fullCoveragePendingExecution === 0;

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-7xl mx-auto">
      <section className="bg-emerald-950 text-white rounded-2xl border border-emerald-900 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isFull ? <ShieldCheck className="w-5 h-5 text-emerald-300" /> : <WalletCards className="w-5 h-5 text-emerald-300" />}
            <div>
              <h3 className="font-extrabold text-sm">
                {isFull ? 'Fondos de salida · Plan Full' : 'Fondos para completar la salida'}
              </h3>
              <p className="text-[11px] text-emerald-200">
                El cálculo determina cuánto falta; solo se considera disponible el dinero que efectivamente fue recibido o desembolsado.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-800 border border-emerald-700">
            {isConfirmed ? 'Liquidación confirmada' : 'Proyección antes de confirmar'}
          </span>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isFull ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-2`}>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Garantía disponible</span>
            <strong className="text-lg font-black font-mono">{formatCLP(fin.guaranteeAmount)}</strong>
            <span className="text-[10px] text-emerald-200 block">Presupuesto base disponible para la salida</span>
          </div>

          {isFull && (
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Cobertura Plan Full</span>
              <strong className="text-lg font-black font-mono">{formatCLP(readiness.fullCoverageRequired)}</strong>
              <span className="text-[10px] text-emerald-200 block">
                {isConfirmed
                  ? `Por recuperar: ${formatCLP(faunaToRecover)}`
                  : `Ejecutada efectivamente: ${formatCLP(readiness.fullCoverageExecutedTotal)}`}
              </span>
              {!isConfirmed && readiness.fullCoverageRequired > 0 && (
                <button
                  type="button"
                  onClick={() => registerFundingMovement('FULL')}
                  disabled={fullCoverageComplete}
                  className={`mt-1 w-full px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    fullCoverageComplete
                      ? 'bg-emerald-800/70 text-emerald-200 cursor-default'
                      : 'bg-white text-emerald-950 hover:bg-emerald-50 cursor-pointer'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  {fullCoverageComplete
                    ? 'Cobertura ejecutada'
                    : `Registrar ejecución ${formatCLP(readiness.fullCoveragePendingExecution)}`}
                </button>
              )}
            </div>
          )}

          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Diferencia a cargo del propietario</span>
            <strong className="text-lg font-black font-mono">{formatCLP(readiness.ownerRequired)}</strong>
            <span className="text-[10px] text-emerald-200 block">
              {isConfirmed
                ? `Por devolver al propietario: ${formatCLP(ownerToRecover)}`
                : `Fondos provisionados: ${formatCLP(readiness.ownerProvisionedTotal)}`}
            </span>
            {!isConfirmed && readiness.ownerRequired > 0 && (
              <button
                type="button"
                onClick={() => registerFundingMovement('OWNER')}
                disabled={ownerProvisionComplete}
                className={`mt-1 w-full px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  ownerProvisionComplete
                    ? 'bg-emerald-800/70 text-emerald-200 cursor-default'
                    : 'bg-white text-emerald-950 hover:bg-emerald-50 cursor-pointer'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                {ownerProvisionComplete
                  ? 'Provisión registrada'
                  : `Registrar provisión ${formatCLP(readiness.ownerPendingProvision)}`}
              </button>
            )}
          </div>

          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Deuda arrendatario</span>
            <strong className="text-lg font-black font-mono">{formatCLP(receivable?.pendingBalance ?? fin.tenantDeficit)}</strong>
            <span className="text-[10px] text-emerald-200 block">
              {isFull ? 'La cobertura Full no extingue su deuda' : 'La diferencia sigue siendo deuda del arrendatario'}
            </span>
          </div>
        </div>

        {!isConfirmed && readiness.ownerPendingProvision > 0 && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl px-3 py-2 text-[11px] text-amber-100">
            <strong>Pendiente de provisión del propietario: {formatCLP(readiness.ownerPendingProvision)}.</strong>{' '}
            Fauna no debe financiar esta diferencia. Si el propietario no provisiona los fondos, ajusta las reparaciones y cargos al presupuesto efectivamente disponible antes de confirmar la liquidación.
          </div>
        )}

        {!isConfirmed && isFull && readiness.ownerPendingProvision === 0 && readiness.fullCoveragePendingExecution > 0 && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl px-3 py-2 text-[11px] text-amber-100">
            Falta registrar la ejecución efectiva de la cobertura Plan Full por {formatCLP(readiness.fullCoveragePendingExecution)} antes de dar por completados los fondos de esta salida.
          </div>
        )}

        {!isConfirmed && readiness.readyToConfirm && (
          <div className="bg-emerald-300/10 border border-emerald-300/30 rounded-xl px-3 py-2 text-[11px] text-emerald-100">
            <strong>Fondos necesarios registrados.</strong> Revisa los documentos y, si los cargos son definitivos, confirma la liquidación.
          </div>
        )}

        {isConfirmed && !readiness.readyToConfirm && (
          <div className="bg-amber-300/10 border border-amber-300/30 rounded-xl px-3 py-2 text-[11px] text-amber-100">
            Este caso histórico fue confirmado sin que todos los fondos requeridos quedaran registrados. El reporte solo reconoce movimientos que efectivamente ocurrieron.
          </div>
        )}

        <p className="text-[11px] text-emerald-100">
          Si el arrendatario paga posteriormente, la recuperación se imputa primero a la provisión efectivamente recibida del propietario y luego a la cobertura Full efectivamente desembolsada por Fauna cuando corresponda.
        </p>
      </section>
    </div>
  );
};
