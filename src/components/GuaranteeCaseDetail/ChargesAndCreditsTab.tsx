import React, { useState } from 'react';
import { GuaranteeCase, FinancialMovementType } from '../../types';
import { ChargesTab } from './ChargesTab';
import { RepairsTab } from './RepairsTab';
import { formatCLP } from '../../utils/formatters';
import { DollarSign, Wrench, ArrowDownToLine } from 'lucide-react';

interface ChargesAndCreditsTabProps {
  guaranteeCase: GuaranteeCase;
}

const movementLabel = (type: FinancialMovementType) => {
  const labels: Partial<Record<FinancialMovementType, string>> = {
    APORTE_PROPIETARIO: 'Provisión propietario',
    FINANCIAMIENTO_FAUNA: 'Cobertura Plan Full',
    PAGO_ARRENDATARIO: 'Pago arrendatario',
    RECUPERACION_PROPIETARIO: 'Devolución provisión propietario',
    RECUPERACION_FAUNA: 'Recuperación cobertura Full',
    DEVOLUCION_ARRENDATARIO: 'Devolución arrendatario',
    COBERTURA_FULL: 'Cobertura Full',
    SALDO_PAGO_ARRENDATARIO: 'Saldo pago arrendatario',
    AJUSTE: 'Ajuste'
  };

  return labels[type] || type.replace(/_/g, ' ');
};

export const ChargesAndCreditsTab: React.FC<ChargesAndCreditsTabProps> = ({ guaranteeCase }) => {
  const [section, setSection] = useState<'financials' | 'repairs'>('financials');

  const credits = guaranteeCase.movements.filter(
    movement => movement.type !== 'GARANTIA' && movement.type !== 'CARGO'
  );

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-2 inline-flex gap-1 shadow-xs">
        <button
          type="button"
          onClick={() => setSection('financials')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
            section === 'financials' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Cargos y abonos
        </button>
        <button
          type="button"
          onClick={() => setSection('repairs')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
            section === 'repairs' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Reparaciones ({guaranteeCase.repairs.length})
        </button>
      </div>

      {section === 'financials' ? (
        <div className="space-y-5">
          <ChargesTab guaranteeCase={guaranteeCase} />

          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-900">Abonos y movimientos asociados</h4>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Se registran desde la acción correspondiente del caso; aquí se muestran como referencia.
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                {credits.length} registros
              </span>
            </div>

            {credits.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No hay abonos ni otros movimientos registrados todavía.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...credits].reverse().map(movement => (
                  <div key={movement.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <strong className="text-slate-800 block">{movementLabel(movement.type)}</strong>
                      <span className="text-slate-500 block truncate">{movement.description}</span>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <strong className={`font-mono ${movement.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {movement.amount >= 0 ? '+' : '-'}{formatCLP(Math.abs(movement.amount))}
                      </strong>
                      <span className="text-[10px] text-slate-400 block">{movement.date} · {movement.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <RepairsTab guaranteeCase={guaranteeCase} />
      )}
    </div>
  );
};
