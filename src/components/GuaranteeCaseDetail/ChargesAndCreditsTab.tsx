import React from 'react';
import { GuaranteeCase } from '../../types';
import { ChargesTab } from './ChargesTab';
import { Info } from 'lucide-react';

interface ChargesAndCreditsTabProps {
  guaranteeCase: GuaranteeCase;
}

export const ChargesAndCreditsTab: React.FC<ChargesAndCreditsTabProps> = ({ guaranteeCase }) => {
  const cancelledRepairs = guaranteeCase.charges.filter(ch =>
    ch.amount > 0 && ch.type === 'DAÑO_REPARACION' && ch.repairTracking?.status === 'CANCELADA'
  ).length;

  return (
    <div className="space-y-3">
      {(cancelledRepairs > 0 || guaranteeCase.charges.some(ch => ch.category === 'OTRO' && ch.amount > 0)) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[11px] text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {cancelledRepairs > 0 && (
              <p><strong className="text-slate-800">Reparaciones canceladas:</strong> permanecen visibles para trazabilidad, pero no se cobran ni aparecen en la liquidación. Si corresponde una indemnización, regístrala como un cargo vigente de Daño / reparación.</p>
            )}
            {guaranteeCase.charges.some(ch => ch.category === 'OTRO' && ch.amount > 0) && (
              <p><strong className="text-slate-800">Concepto Otro:</strong> se considera un cargo no asociado a daños y no recibe cobertura Plan Full. Los daños deben registrarse como Daño / reparación.</p>
            )}
          </div>
        </div>
      )}
      <ChargesTab guaranteeCase={guaranteeCase} />
    </div>
  );
};
