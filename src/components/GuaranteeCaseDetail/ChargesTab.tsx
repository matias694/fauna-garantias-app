import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, ChargeCategory, ChargeType, Charge, RepairStatus } from '../../types';
import { formatCLP, formatDate } from '../../utils/formatters';
import { calculateGuaranteeFinances } from '../../utils/calculations';
import { DollarSign, Plus, Minus, Trash2, Edit2, Paperclip, Lock, Wrench } from 'lucide-react';

interface ChargesTabProps {
  guaranteeCase: GuaranteeCase;
}

type MovementKind = 'CARGO' | 'ABONO';

const visibleConcepts: ChargeCategory[] = [
  'REPARACIONES',
  'GASTOS_COMUNES',
  'AGUA',
  'ELECTRICIDAD',
  'GAS',
  'OTROS_SERVICIOS',
  'OTRO'
];

const normalizeCategory = (category: ChargeCategory): ChargeCategory => {
  if (['PINTURA', 'LIMPIEZA', 'DAÑOS'].includes(category)) return 'REPARACIONES';
  return category;
};

const inferChargeType = (category: ChargeCategory): ChargeType => {
  const normalized = normalizeCategory(category);
  if (normalized === 'REPARACIONES') return 'DAÑO_REPARACION';
  if (normalized === 'GASTOS_COMUNES') return 'GASTO_COMUN';
  if (['AGUA', 'ELECTRICIDAD', 'GAS', 'OTROS_SERVICIOS'].includes(normalized)) return 'SERVICIO_CONSUMO';
  return 'OTRO';
};

const conceptLabel = (category: ChargeCategory) => {
  const normalized = normalizeCategory(category);
  const labels: Partial<Record<ChargeCategory, string>> = {
    REPARACIONES: 'Daño / reparación',
    GASTOS_COMUNES: 'Gastos comunes',
    AGUA: 'Agua',
    ELECTRICIDAD: 'Electricidad',
    GAS: 'Gas',
    OTROS_SERVICIOS: 'Otros servicios',
    OTRO: 'Otro'
  };
  return labels[normalized] || 'Daño / reparación';
};

const trackingStatusLabel = (status?: RepairStatus) => {
  if (status === 'TERMINADA') return 'Terminada';
  if (status === 'EN_EJECUCION') return 'En ejecución';
  if (status === 'CANCELADA') return 'Cancelada';
  return 'Pendiente';
};

export const ChargesTab: React.FC<ChargesTabProps> = ({ guaranteeCase }) => {
  const { addCharge, updateCharge, deleteCharge, changePreparationStatus, settings } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [movementKind, setMovementKind] = useState<MovementKind>('CARGO');
  const [category, setCategory] = useState<ChargeCategory>('REPARACIONES');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(guaranteeCase.receptionDate);
  const [notes, setNotes] = useState('');

  const [repairProvider, setRepairProvider] = useState('');
  const [repairResponsible, setRepairResponsible] = useState(guaranteeCase.responsible || settings.responsiblesList[0] || '');
  const [repairStatus, setRepairStatus] = useState<RepairStatus>('PENDIENTE');
  const [repairCommitmentDate, setRepairCommitmentDate] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const fin = calculateGuaranteeFinances(guaranteeCase, settings);

  const resetTracking = () => {
    setRepairProvider('');
    setRepairResponsible(guaranteeCase.responsible || settings.responsiblesList[0] || '');
    setRepairStatus('PENDIENTE');
    setRepairCommitmentDate('');
  };

  const resetForm = (kind: MovementKind) => {
    setEditingCharge(null);
    setMovementKind(kind);
    setCategory('REPARACIONES');
    setDescription('');
    setAmount(100000);
    setDate(formatDate(todayStr));
    setNotes('');
    resetTracking();
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
    setCategory(normalizeCategory(ch.category));
    setDescription(ch.description);
    setAmount(Math.abs(ch.amount));
    setDate(ch.date);
    setNotes(ch.notes);
    setRepairProvider(ch.repairTracking?.provider || '');
    setRepairResponsible(ch.repairTracking?.responsible || guaranteeCase.responsible || settings.responsiblesList[0] || '');
    setRepairStatus(ch.repairTracking?.status || 'PENDIENTE');
    setRepairCommitmentDate(ch.repairTracking?.commitmentDate || '');
    setIsModalOpen(true);
  };

  const syncPreparationStatus = (nextCharges: Charge[]) => {
    const repairCharges = nextCharges.filter(ch => ch.amount > 0 && ch.type === 'DAÑO_REPARACION');
    if (repairCharges.length === 0) {
      if (guaranteeCase.preparationStatus === 'REPARANDO') {
        changePreparationStatus(guaranteeCase.id, 'LISTA');
      }
      return;
    }

    const allFinished = repairCharges.every(ch =>
      ch.repairTracking?.status === 'TERMINADA' || ch.repairTracking?.status === 'CANCELADA'
    );
    const nextStatus = allFinished ? 'LISTA' : 'REPARANDO';
    if (guaranteeCase.preparationStatus !== nextStatus) {
      changePreparationStatus(guaranteeCase.id, nextStatus);
    }
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

    const normalizedCategory = normalizeCategory(category);

    if (movementKind === 'ABONO') {
      const availableForCredit = guaranteeCase.charges
        .filter(ch => ch.id !== editingCharge?.id && normalizeCategory(ch.category) === normalizedCategory)
        .reduce((sum, ch) => sum + ch.amount, 0);

      if (availableForCredit <= 0) {
        alert(`No existe un cargo pendiente en ${conceptLabel(normalizedCategory)} al cual aplicar este abono.`);
        return;
      }

      if (amount > availableForCredit) {
        alert(`El abono no puede superar el saldo del concepto (${formatCLP(availableForCredit)}).`);
        return;
      }
    }

    const signedAmount = movementKind === 'ABONO' ? -Math.abs(amount) : Math.abs(amount);
    const type = inferChargeType(normalizedCategory);
    const isRepairCharge = movementKind === 'CARGO' && type === 'DAÑO_REPARACION';
    const repairTracking = isRepairCharge
      ? {
          provider: repairProvider,
          responsible: repairResponsible,
          status: repairStatus,
          commitmentDate: repairCommitmentDate
        }
      : undefined;

    const nextChargeData: Omit<Charge, 'id'> = {
      category: normalizedCategory,
      description,
      amount: signedAmount,
      date,
      type,
      notes,
      repairId: editingCharge?.repairId,
      repairTracking,
      documents: editingCharge?.documents || [],
      photos: editingCharge?.photos || []
    };

    if (editingCharge) {
      updateCharge(guaranteeCase.id, editingCharge.id, nextChargeData);
      const nextCharges = guaranteeCase.charges.map(ch => ch.id === editingCharge.id ? { ...ch, ...nextChargeData } : ch);
      syncPreparationStatus(nextCharges);
    } else {
      addCharge(guaranteeCase.id, nextChargeData);
      syncPreparationStatus([...guaranteeCase.charges, { id: 'PREVIEW', ...nextChargeData }]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteCharge = (chargeId: string) => {
    if (isConfirmed) return;
    deleteCharge(guaranteeCase.id, chargeId);
    syncPreparationStatus(guaranteeCase.charges.filter(ch => ch.id !== chargeId));
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">Cargos y abonos</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Los daños y reparaciones incorporan su seguimiento operativo en el mismo registro.
          </p>
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
                  <th className="p-3">Descripción / seguimiento</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3">Observaciones</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {guaranteeCase.charges.map(ch => {
                  const isCredit = ch.amount < 0;
                  const isRepairCharge = !isCredit && ch.type === 'DAÑO_REPARACION';
                  const tracking = ch.repairTracking;
                  return (
                    <tr key={ch.id} className="hover:bg-slate-50 transition-colors align-top">
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
                      <td className="p-3 min-w-[240px]">
                        <p className="font-bold text-slate-800 text-xs">{ch.description}</p>
                        {isRepairCharge && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold ${
                              tracking?.status === 'TERMINADA'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : tracking?.status === 'EN_EJECUCION'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : tracking?.status === 'CANCELADA'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              <Wrench className="w-3 h-3" /> {trackingStatusLabel(tracking?.status)}
                            </span>
                            {tracking?.provider && <span className="text-slate-500">Proveedor: {tracking.provider}</span>}
                            {tracking?.commitmentDate && <span className="text-slate-500">· Compromiso: {formatDate(tracking.commitmentDate)}</span>}
                            {!tracking && <span className="text-amber-700">Edita el cargo para completar el seguimiento.</span>}
                          </div>
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
                            <button onClick={() => handleOpenEdit(ch)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer" title={isRepairCharge ? 'Editar cargo y seguimiento' : 'Editar'}>
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
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="p-3 text-right text-xs font-bold text-slate-600">Neto aplicado a la liquidación</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">{formatCLP(fin.totalCharges)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && !isConfirmed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100 my-4">
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
                    onClick={() => setMovementKind('ABONO')}
                    className={`p-2 rounded-lg border font-bold ${movementKind === 'ABONO' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >Abono</button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Concepto *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ChargeCategory)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  {visibleConcepts.map(cat => <option key={cat} value={cat}>{conceptLabel(cat)}</option>)}
                </select>
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

              {movementKind === 'CARGO' && inferChargeType(category) === 'DAÑO_REPARACION' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <div>
                      <strong className="text-xs text-slate-800 block">Seguimiento de la reparación</strong>
                      <span className="text-[10px] text-slate-500">El costo es el mismo cargo de arriba; aquí solo se controla la ejecución.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Proveedor / maestro</label>
                      <input value={repairProvider} onChange={(e) => setRepairProvider(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Responsable</label>
                      <select value={repairResponsible} onChange={(e) => setRepairResponsible(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs">
                        <option value="">Sin responsable</option>
                        {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Estado</label>
                      <select value={repairStatus} onChange={(e) => setRepairStatus(e.target.value as RepairStatus)} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs">
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_EJECUCION">En ejecución</option>
                        <option value="TERMINADA">Terminada</option>
                        <option value="CANCELADA">Cancelada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Fecha compromiso</label>
                      <input type="text" placeholder="DD/MM/AAAA" value={repairCommitmentDate} onChange={(e) => setRepairCommitmentDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                </div>
              )}

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
