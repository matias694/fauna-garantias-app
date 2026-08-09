import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, ChargeCategory, ChargeType, Charge } from '../../types';
import { formatCLP, formatDate } from '../../utils/formatters';
import { DollarSign, Plus, Trash2, Edit2, Paperclip, Lock } from 'lucide-react';

interface ChargesTabProps {
  guaranteeCase: GuaranteeCase;
}

export const ChargesTab: React.FC<ChargesTabProps> = ({ guaranteeCase }) => {
  const { addCharge, updateCharge, deleteCharge, settings } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);

  // Form state
  const [category, setCategory] = useState<ChargeCategory>('REPARACIONES');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(guaranteeCase.receptionDate);
  const [type, setType] = useState<ChargeType>('DAÑO_REPARACION');
  const [notes, setNotes] = useState('');
  const [selectedRepairId, setSelectedRepairId] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';

  const handleOpenAdd = () => {
    if (isConfirmed) return;
    setEditingCharge(null);
    setCategory('REPARACIONES');
    setDescription('');
    setAmount(100000);
    setDate(formatDate(todayStr));
    setType('DAÑO_REPARACION');
    setNotes('');
    setSelectedRepairId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ch: Charge) => {
    if (isConfirmed) return;
    setEditingCharge(ch);
    setCategory(ch.category);
    setDescription(ch.description);
    setAmount(ch.amount);
    setDate(ch.date);
    setType(ch.type);
    setNotes(ch.notes);
    setSelectedRepairId(ch.repairId || '');
    setIsModalOpen(true);
  };

  const handleRepairSelect = (repairId: string) => {
    setSelectedRepairId(repairId);
    if (!repairId) return;
    const r = guaranteeCase.repairs.find(x => x.id === repairId);
    if (r) {
      setDescription(`Reparación: ${r.description}`);
      setAmount(r.finalCost || r.estimatedCost);
      if (r.category === 'PINTURA') setCategory('PINTURA');
      else if (r.category === 'LIMPIEZA') setCategory('LIMPIEZA');
      else setCategory('REPARACIONES');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isConfirmed) {
      alert('La liquidación ya está confirmada. Los cargos que forman parte del resultado definitivo no pueden modificarse desde esta vista.');
      setIsModalOpen(false);
      return;
    }

    if (!description.trim() || amount <= 0) {
      alert('Por favor ingrese una descripción y un monto válido para el cargo.');
      return;
    }

    if (editingCharge) {
      updateCharge(guaranteeCase.id, editingCharge.id, {
        category,
        description,
        amount,
        date,
        type,
        notes,
        repairId: selectedRepairId || undefined
      });
    } else {
      addCharge(guaranteeCase.id, {
        category,
        description,
        amount,
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

  const totalChargesAmount = guaranteeCase.charges.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">Cargos Descontables de la Garantía</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total cargos registrados hasta el momento: <strong className="text-rose-700 font-mono text-sm">{formatCLP(totalChargesAmount)}</strong>
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          disabled={isConfirmed}
          className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
            isConfirmed
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
          }`}
        >
          {isConfirmed ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isConfirmed ? 'Cargos bloqueados' : '+ Agregar Cargo'}</span>
        </button>
      </div>

      {isConfirmed && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900 flex items-start gap-2.5">
          <Lock className="w-4 h-4 mt-0.5 shrink-0 text-purple-700" />
          <div>
            <strong className="block">Liquidación confirmada</strong>
            <span>Estos cargos forman parte del resultado definitivo y quedaron bloqueados para edición. La cobranza, devolución y reparaciones pueden continuar sin alterar la liquidación original.</span>
          </div>
        </div>
      )}

      {/* Charges Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {guaranteeCase.charges.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <DollarSign className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No se han registrado cargos a descontar para este caso.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Categoría / Tipo</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Fecha Registro</th>
                  <th className="p-3 text-right">Monto ($ CLP)</th>
                  <th className="p-3">Observaciones / Respaldos</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {guaranteeCase.charges.map(ch => (
                  <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 block w-fit mb-1">
                        {ch.category}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                        ch.type === 'DAÑO_REPARACION' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        ch.type === 'GASTO_COMUN' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {ch.type === 'DAÑO_REPARACION' ? 'Daño / Reparación' : ch.type === 'GASTO_COMUN' ? 'Gasto Común' : 'Servicio / Consumo'}
                      </span>
                    </td>

                    <td className="p-3">
                      <p className="font-bold text-slate-800 text-xs">{ch.description}</p>
                      {ch.repairId && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                          ✓ Vinculado a reparación de salida
                        </span>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">{formatDate(ch.date)}</td>

                    <td className="p-3 text-right font-mono font-bold text-rose-700 text-sm whitespace-nowrap">
                      {formatCLP(ch.amount)}
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
                          <button
                            onClick={() => handleOpenEdit(ch)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Editar cargo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteCharge(ch.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Eliminar cargo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Charge Modal */}
      {isModalOpen && !isConfirmed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-2">
              {editingCharge ? 'Editar Cargo' : 'Nuevo Cargo a Descontar'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              
              {/* Optional link to repair */}
              {guaranteeCase.repairs.length > 0 && (
                <div className="bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-lg">
                  <label className="block font-bold text-emerald-900 mb-1">Cargar directamente desde Reparación de Salida:</label>
                  <select
                    value={selectedRepairId}
                    onChange={(e) => handleRepairSelect(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-md p-1.5 text-xs text-slate-800 font-medium"
                  >
                    <option value="">-- No vincular (Cargo independiente) --</option>
                    {guaranteeCase.repairs.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.description} ({formatCLP(r.finalCost || r.estimatedCost)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción del Cargo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pintura living, gastos comunes pendientes, cuota agua..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ChargeCategory)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    {settings.chargeCategories.map(cat => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Cargo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ChargeType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="DAÑO_REPARACION">Daño / Reparación</option>
                    <option value="SERVICIO_CONSUMO">Servicio / Consumo (Agua/Luz/Gas)</option>
                    <option value="GASTO_COMUN">Gasto Común</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monto del Cargo ($ CLP) *</label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-rose-800"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">{formatCLP(amount)}</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Comentarios o números de boletas/cuentas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {editingCharge ? 'Guardar Cambios' : 'Agregar Cargo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
