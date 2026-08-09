import React from 'react';
import { useApp } from '../context/AppContext';
import { calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP } from '../utils/formatters';
import { ShieldCheck } from 'lucide-react';

/**
 * Compact internal breakdown for insufficient Plan Full cases.
 * Keeps coverage, owner advance and tenant debt visibly separated.
 */
export const FullCoverageCaseBanner: React.FC = () => {
  const { activeView, selectedCaseId, cases, settings } = useApp();

  if (activeView !== 'case-detail' || !selectedCaseId) return null;

  const guaranteeCase = cases.find(c => c.id === selectedCaseId);
  if (!guaranteeCase || guaranteeCase.plan !== 'FULL') return null;

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  if (!fin.isInsufficient) return null;

  const coverage = fin.fullCoverageApplied;
  const ownerAdvance = guaranteeCase.ownerContribution || Math.max(0, fin.tenantDeficit - coverage);
  const faunaAdvance = guaranteeCase.faunaFinancing || coverage;
  const isIssued = guaranteeCase.liquidationStatus === 'EMITIDA';

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-7xl mx-auto">
      <section className="bg-emerald-950 text-white rounded-2xl border border-emerald-900 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-extrabold text-sm">Desglose interno · Plan Full</h3>
              <p className="text-[11px] text-emerald-200">La cobertura adicional máxima equivale al 100% de la garantía y se aplica únicamente a daños.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-800 border border-emerald-700">
            {isIssued ? 'Liquidación emitida' : 'Proyección antes de emitir'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Cobertura Full</span>
            <strong className="text-lg font-black font-mono">{formatCLP(coverage)}</strong>
            <span className="text-[10px] text-emerald-200 block">Daños cubiertos por Fauna</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Aporte propietario</span>
            <strong className="text-lg font-black font-mono">{formatCLP(ownerAdvance)}</strong>
            <span className="text-[10px] text-emerald-200 block">Fuera de cobertura Full</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Financiamiento Fauna</span>
            <strong className="text-lg font-black font-mono">{formatCLP(faunaAdvance)}</strong>
            <span className="text-[10px] text-emerald-200 block">A recuperar si paga arrendatario</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Deuda arrendatario</span>
            <strong className="text-lg font-black font-mono">{formatCLP(fin.tenantDeficit)}</strong>
            <span className="text-[10px] text-emerald-200 block">La cobertura no extingue su deuda</span>
          </div>
        </div>

        <p className="text-[11px] text-emerald-100">
          Si el arrendatario paga posteriormente, la recuperación se imputa primero al aporte del propietario y luego al financiamiento de Fauna.
        </p>
      </section>
    </div>
  );
};