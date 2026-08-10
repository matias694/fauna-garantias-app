import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, ChargeCategory, ChargeType, Charge } from '../../types';
import { formatCLP, formatDate } from '../../utils/formatters';
import { calculateGuaranteeFinances } from '../../utils/calculations';
import { DollarSign, Plus, Minus, Trash2, Edit2, Paperclip, Lock } from 'lucide-react';

interface ChargesTabProps {
  guaranteeCase: GuaranteeCase;
}

type MovementKind = 'CARGO' | 'ABONO';

const inferChargeType = (category: ChargeCategory): ChargeType => {
  if (['REPARACIONES', 'PINTURA', 'LIMPIEZA', 'DAÑOS'].includes(category)) return 'DAÑO_REPARACION';
  if (category === 'GASTOS_COMUNES') return 'GASTO_COMUN';
  if (['AGUA', 'ELECTRICIDAD', 'GAS', 'OTROS_SERVICIOS'].includes(category)) return 'SERVICIO_CONSUMO';
  return 'OTRO';
};

const conceptLabel = (category: ChargeCategory) => {
  const labels: Record<ChargeCategory, string> = {
    REPARACIONES: 'Daño / reparación',
    PINTURA: 'Pintura',
    LIMPIEZA: 'Limpieza',
    DAÑOS: 'Daños',
    GASTOS_COMUNES: 'Gastos comunes',
    AGUA: 'Agua',
    ELECTRICIDAD: 'Electricidad',
    GAS: 'Gas',
    OTROS_SERVICIOS: 'Otros servicios',
    OTRO: 'Otro'
  };
  return labels[category];
};

export const ChargesTab: React.FC<ChargesTabProps> = ({ guaranteeCase }) => {
  const { addCharge, updateCharge, deleteCharge, settings } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [movementKind, setMovementKind] = useState<MovementKind>('CARGO');
  const [category, setCategory] = useState<ChargeCategory>('REPARACIONES');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(guaranteeCase.receptionDate);
  const [notes, setNotes] = useState('');
  const [selectedRepairId, setSelectedRepairId] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const fin = calculateGuaranteeFinances(guaranteeCase, settings);

  const cargoTotal = guaranteeCase.charges
    .filter(ch => ch.amount > 0)
    .reduce((sum, ch) => sum + ch.amount, 0);
  const creditTotal = guaranteeCase.charges
    .filter(ch => ch.amount < 0)
    .reduce((sum, ch) => sum + Math.abs(ch.amount), 0);

  const resetForm = (kind: MovementKind) => {
    setEditingCharge(null);
    setMovementKind(kind);
    setCategory('REPARACIONES');
    setDescription('');
    setAmount(100000);
    setDate(formatDate(todayStr));
    setNotes('');
    setSelectedRepairId('');
  };

  const handleOpenAdd = (kind: MovementKind) => {
    if (isConfirmed) return;
    resetForm(kind);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ch: Charge) => {
    if (isConfirmed) return;
    setEditingCharge(ch);
    setMovementKind(ch.amount < 0 ? 'ABONO' : 'CARGO');
    setCategory(ch.category);
    setDescription(ch.description);
    setAmount(Math.abs(ch.amount));
    setDate(ch.date);
    setNotes(ch.notes);
    setSelectedRepairId(ch.repairId || '');
    setIsModalOpen(true);
  };

  const handleRepairSelect = (repairId: string) => {
    setSelectedRepairId(repairId);
    if (!repairId) return;
    const r = guaranteeCase.repairs.find(x => x.id === repairId);
    if (!r) return;

    setMovementKind('CARGO');
    setDescription(`Reparación: ${r.description}`);
    setAmount(r.finalCost || r.estimatedCost);
    if (r.category === 'PINTURA') setCategory('PINTURA');
    else if (r.category === 'LIMPIEZA') setCategory('LIMPIEZA');
    else setCategory('REPARACIONES');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isConfirmed) {
      alert('La liquidación ya está confirmada. Los cargos y abonos del resultado definitivo no pueden modificarse.');
      setIsModalOpen(false);
      return;
    }

    if (!description.trim() || amount <= 0) {
      alert('Ingresa una descripción y un monto válido.');
      return;
    }

    const signedAmount = movementKind === 'ABONO' ? -Math.abs(amount) : Math.abs(amount);
    const type = inferChargeType(category);

    if (editingCharge) {
      updateCharge(guaranteeCase.id, editingCharge.id, {
        category,
        description,
        amount: signedAmount,
        date,
        type,
        notes,
        repairId: selectedRepairId || undefined
      });
    } else {
      addCharge(guaranteeCase.id, {
        category,
        description,
        amount: signedAmount,
        date,
        type,
        notes,
        repairId: selectedRepairId || undefined,
        documents: [],
        photos: []
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteCharge = (chargeId: string) => {
    if (isConfirmed) return;
    deleteCharge(guaranteeCase.id, chargeId);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">Cargos y abonos de la liquidación</h3>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1">
            <span>Cargos <strong className="text-rose-700 font-mono">{formatCLP(cargoTotal)}</strong></span>
            <span>Abonos <strong className="text-emerald-700 font-mono">{formatCLP(creditTotal)}</strong></span>
            <span>Neto <strong className="text-slate-900 font-mono">{formatCLP(fin.totalCharges)}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('ABONO')}
            disabled={isConfirmed}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl border flex items-center gap-1.5 ${
              isConfirmed
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer'
            }`}
          >
            <Minus className="w-4 h-4" /> Abono
          </button>
          <button
            onClick={() => handleOpenAdd('CARGO')}
            disabled={isConfirmed}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 ${
              isConfirmed
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            {isConfirmed ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isConfirmed ? 'Bloqueado' : 'Cargo'}</span>
          </button>
        </div>
      </div>

      {isConfirmed && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900 flex items-start gap-2.5">
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-purple-700" />
          <div>
            <strong className="block">Liquidación confirmada</strong>
            <span>Los cargos y abonos que forman el resultado original quedaron bloqueados. Los pagos posteriores se registran desde la cobranza o la acción correspondiente.</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {guaranteeCase.charges.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <DollarSign className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No hay cargos ni abonos registrados todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Movimiento</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3">Observaciones</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {guaranteeCase.charges.map(ch => {
                  const isCredit = ch.amount < 0;
                  return (
                    <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isCredit
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {isCredit ? 'ABONO' : 'CARGO'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-700 font-semibold">{conceptLabel(ch.category)}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-800 text-xs">{ch.description}</p>
                        {ch.repairId && (
                          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Vinculado a reparación</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">{formatDate(ch.date)}</td>
                      <td className={`p-3 text-right font-mono font-bold text-sm whitespace-nowrap ${isCredit ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isCredit ? '+' : '-'}{formatCLP(Math.abs(ch.amount))}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs text-[11px]">
                        {ch.notes || '-'}
                        {ch.documents && ch.documents.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold mt-0.5">
                            <Paperclip className="w-3 h-3" /> {ch.documents.length} documento(s)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Lock className="w-3 h-3" /> Bloqueado
                          </span>
                        ) : (
                          <>
                            <button onClick={() => handleOpenEdit(ch)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteCharge(ch.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && !isConfirmed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-2">
              {editingCharge ? 'Editar movimiento' : movementKind === 'ABONO' ? 'Registrar abono' : 'Registrar cargo'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementKind('CARGO')}
                    className={`p-2 rounded-lg border font-bold ${movementKind === 'CARGO' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Cargo</button>
                  <button
                    type="button"
                    onClick={() => { setMovementKind('ABONO'); setSelectedRepairId(''); }}
                    className={`p-2 rounded-lg border font-bold ${movementKind === 'ABONO' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Abono</button>
                </div>
              </div>

              {movementKind === 'CARGO' && guaranteeCase.repairs.length > 0 && (
                <div className="bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-lg">
                  <label className="block font-bold text-emerald-900 mb-1">Vincular a una reparación existente</label>
                  <select value={selectedRepairId} onChange={(e) => handleRepairSelect(e.target.value)} className="w-full bg-white border border-emerald-300 rounded-md p-1.5 text-xs text-slate-800 font-medium">
                    <option value="">No vincular</option>
                    {guaranteeCase.repairs.map(r => (
                      <option key={r.id} value={r.id}>{r.description} ({formatCLP(r.finalCost || r.estimatedCost)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Concepto *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ChargeCategory)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  {settings.chargeCategories.map(cat => <option key={cat} value={cat}>{conceptLabel(cat)}</option>)}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">El sistema clasifica automáticamente el concepto para los cálculos de cobertura.</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder={movementKind === 'ABONO' ? 'Ej. Abono proporcional de gastos comunes' : 'Ej. Pintura living, cuenta de agua pendiente...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monto ($ CLP) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className={`w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold ${movementKind === 'ABONO' ? 'text-emerald-800' : 'text-rose-800'}`}
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">{formatCLP(amount)}</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
                  <input type="text" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs" />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer">
                  {editingCharge ? 'Guardar cambios' : movementKind === 'ABONO' ? 'Registrar abono' : 'Registrar cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
