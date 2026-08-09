import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, FinancialMovementType } from '../../types';
import { formatCLP, formatDate } from '../../utils/formatters';
import { Plus, FileSpreadsheet } from 'lucide-react';

interface MovementsTabProps {
  guaranteeCase: GuaranteeCase;
}

const movementLabel = (type: FinancialMovementType) => {
  const labels: Partial<Record<FinancialMovementType, string>> = {
    APORTE_PROPIETARIO: 'PROVISIÓN PROPIETARIO',
    FINANCIAMIENTO_FAUNA: 'EJECUCIÓN COBERTURA FULL',
    RECUPERACION_PROPIETARIO: 'DEVOLUCIÓN PROVISIÓN PROPIETARIO',
    RECUPERACION_FAUNA: 'RECUPERACIÓN COBERTURA FULL',
    DEVOLUCION_ARRENDATARIO: 'DEVOLUCIÓN ARRENDATARIO',
    PAGO_ARRENDATARIO: 'PAGO ARRENDATARIO',
    COBERTURA_FULL: 'COBERTURA FULL'
  };

  return labels[type] || type.replace(/_/g, ' ');
};

export const MovementsTab: React.FC<MovementsTabProps> = ({ guaranteeCase }) => {
  const { addFinancialMovement, userRole } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<FinancialMovementType>('AJUSTE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState('');
  const [observation, setObservation] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || amount === 0) {
      alert('Por favor ingrese descripción y monto válido.');
      return;
    }

    addFinancialMovement(guaranteeCase.id, {
      date: formatDate(todayStr),
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      type,
      description,
      amount,
      user: userRole,
      reference,
      observation
    });

    setIsModalOpen(false);
    setDescription('');
    setAmount(0);
    setReference('');
    setObservation('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">Cuenta Corriente del Caso (Libro de Movimientos)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historial de auditoría contable y movimientos financieros correlativos.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>+ Movimiento Manual</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {guaranteeCase.movements.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No hay movimientos financieros registrados en la cuenta corriente de este caso.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Fecha / Hora</th>
                  <th className="p-3">Tipo Movimiento</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Referencia</th>
                  <th className="p-3 text-right">Monto ($ CLP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {guaranteeCase.movements.map(mov => {
                  const isPositive = mov.amount > 0;

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        <div>{formatDate(mov.date)}</div>
                        <div className="text-[10px] text-slate-400">{mov.time}</div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          mov.type === 'GARANTIA' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          mov.type === 'CARGO' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          mov.type === 'PAGO_ARRENDATARIO' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          mov.type === 'RECUPERACION_PROPIETARIO' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          mov.type === 'RECUPERACION_FAUNA' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {movementLabel(mov.type)}
                        </span>
                      </td>

                      <td className="p-3">
                        <p className="font-semibold text-slate-800 text-xs">{mov.description}</p>
                        {mov.observation && <p className="text-[10px] text-slate-500 italic mt-0.5">{mov.observation}</p>}
                      </td>

                      <td className="p-3 text-slate-600 whitespace-nowrap text-[11px]">{mov.user}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{mov.reference || '-'}</td>

                      <td className="p-3 text-right font-mono font-bold text-sm whitespace-nowrap">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatCLP(mov.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-2">
              Registrar Movimiento en Cuenta Corriente
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Movimiento</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as FinancialMovementType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="GARANTIA">Garantía</option>
                  <option value="CARGO">Cargo</option>
                  <option value="DEVOLUCION_ARRENDATARIO">Devolución Arrendatario</option>
                  <option value="APORTE_PROPIETARIO">Provisión Propietario</option>
                  <option value="COBERTURA_FULL">Cobertura Full</option>
                  <option value="FINANCIAMIENTO_FAUNA">Ejecución Cobertura Full</option>
                  <option value="PAGO_ARRENDATARIO">Pago Arrendatario</option>
                  <option value="RECUPERACION_PROPIETARIO">Devolución Provisión Propietario</option>
                  <option value="RECUPERACION_FAUNA">Recuperación Cobertura Full</option>
                  <option value="AJUSTE">Ajuste Contable</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción del Movimiento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Transferencia de devolución, provisión recibida..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monto ($ CLP) *</label>
                <input
                  type="number"
                  step="1000"
                  required
                  placeholder="Positivo (+) o Negativo (-)"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">{formatCLP(amount)}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Referencia N° / Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej. TRF-994120"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observación</label>
                <textarea
                  rows={2}
                  placeholder="Notas internas..."
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
