import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, ChargeCategory, ChargeType, Charge, RepairStatus } from '../../types';
import { formatCLP, formatDate, parseFormattedDateToInput } from '../../utils/formatters';
import { calculateGuaranteeFinances } from '../../utils/calculations';
import { DollarSign, Plus, Minus, Trash2, Edit2, Paperclip, Lock, Wrench, AlertTriangle } from 'lucide-react';

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
    OTRO: 'Otro (no daño / no Full)'
  };
  return labels[normalized] || 'Otro';
};

const trackingStatusLabel = (status?: RepairStatus) => {
  if (status === 'TERMINADA') return 'Terminada';
  if (status === 'EN_EJECUCION') return 'En ejecución';
  if (status === 'CANCELADA') return 'Cancelada';
  return 'Pendiente';
};

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const ChargesTab: React.FC<ChargesTabProps> = ({ guaranteeCase }) => {
  const {
    addCharge,
    updateCharge,
    deleteCharge,
    changePreparationStatus,
    logAudit,
    settings
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const fin = calculateGuaranteeFinances(guaranteeCase, settings);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [movementKind, setMovementKind] = useState<MovementKind>('CARGO');
  const [category, setCategory] = useState<ChargeCategory>('REPARACIONES');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(100000);
  const [date, setDate] = useState(parseFormattedDateToInput(guaranteeCase.receptionDate) || todayStr);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const [repairProvider, setRepairProvider] = useState('');
  const [repairProviderPhone, setRepairProviderPhone] = useState('');
  const [repairProviderEmail, setRepairProviderEmail] = useState('');
  const [repairResponsible, setRepairResponsible] = useState(
    guaranteeCase.responsible || settings.responsiblesList[0] || ''
  );
  const [repairCommitmentDate, setRepairCommitmentDate] = useState('');

  const resetForm = (kind: MovementKind) => {
    setEditingCharge(null);
    setMovementKind(kind);
    setCategory(kind === 'ABONO' ? 'OTRO' : 'REPARACIONES');
    setDescription('');
    setAmount(100000);
    setDate(todayStr);
    setNotes('');
    setRepairProvider('');
    setRepairProviderPhone('');
    setRepairProviderEmail('');
    setRepairResponsible(guaranteeCase.responsible || settings.responsiblesList[0] || '');
    setRepairCommitmentDate('');
    setFormError('');
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
    setDate(parseFormattedDateToInput(ch.date) || todayStr);
    setNotes(ch.notes || '');
    setRepairProvider(ch.repairTracking?.provider || '');
    setRepairProviderPhone(ch.repairTracking?.providerPhone || '');
    setRepairProviderEmail(ch.repairTracking?.providerEmail || '');
    setRepairResponsible(ch.repairTracking?.responsible || guaranteeCase.responsible || settings.responsiblesList[0] || '');
    setRepairCommitmentDate(parseFormattedDateToInput(ch.repairTracking?.commitmentDate || ''));
    setFormError('');
    setIsModalOpen(true);
  };

  const syncPreparationStatus = (nextCharges: Charge[]) => {
    const repairCharges = nextCharges.filter(ch => ch.amount > 0 && ch.type === 'DAÑO_REPARACION');
    if (repairCharges.length === 0) {
      if (guaranteeCase.preparationStatus === 'REPARANDO') changePreparationStatus(guaranteeCase.id, 'LISTA');
      return;
    }

    const allFinished = repairCharges.every(ch =>
      ch.repairTracking?.status === 'TERMINADA' || ch.repairTracking?.status === 'CANCELADA'
    );
    const nextStatus = allFinished ? 'LISTA' : 'REPARANDO';
    if (guaranteeCase.preparationStatus !== nextStatus) changePreparationStatus(guaranteeCase.id, nextStatus);
  };

  const getDefaultTracking = (ch: Charge) => ({
    provider: ch.repairTracking?.provider || '',
    providerPhone: ch.repairTracking?.providerPhone || '',
    providerEmail: ch.repairTracking?.providerEmail || '',
    responsible: ch.repairTracking?.responsible || guaranteeCase.responsible || settings.responsiblesList[0] || '',
    status: ch.repairTracking?.status || ('PENDIENTE' as RepairStatus),
    commitmentDate: ch.repairTracking?.commitmentDate || '',
    notes: ch.repairTracking?.notes || ''
  });

  const handleQuickStatusChange = (ch: Charge, nextStatus: RepairStatus) => {
    if (isConfirmed) return;
    const currentTracking = getDefaultTracking(ch);
    if (currentTracking.status === nextStatus) return;

    const nextTracking = { ...currentTracking, status: nextStatus };
    updateCharge(guaranteeCase.id, ch.id, { repairTracking: nextTracking });
    const nextCharges = guaranteeCase.charges.map(item =>
      item.id === ch.id ? { ...item, repairTracking: nextTracking } : item
    );
    syncPreparationStatus(nextCharges);
    logAudit(
      guaranteeCase.id,
      'Estado de reparación actualizado',
      `“${ch.description}” cambió de ${trackingStatusLabel(currentTracking.status)} a ${trackingStatusLabel(nextStatus)}.`
    );
  };

  const handleMovementKindChange = (kind: MovementKind) => {
    if (editingCharge) return;
    setMovementKind(kind);
    setFormError('');
    if (kind === 'ABONO' && category === 'REPARACIONES') setCategory('OTRO');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (isConfirmed) return;

    if (!description.trim() || amount <= 0 || !date) {
      setFormError('Completa la descripción, el monto y la fecha antes de guardar.');
      return;
    }

    const normalizedCategory = normalizeCategory(category);
    const signedAmount = movementKind === 'ABONO' ? -Math.abs(amount) : Math.abs(amount);
    const type = inferChargeType(normalizedCategory);
    const isRepairCharge = movementKind === 'CARGO' && type === 'DAÑO_REPARACION';

    if (isRepairCharge) {
      if (!repairProvider.trim() || !repairProviderPhone.trim() || !repairProviderEmail.trim()) {
        setFormError('Para crear o editar una reparación debes indicar maestro/proveedor, teléfono y correo.');
        return;
      }
      if (!validEmail(repairProviderEmail)) {
        setFormError('Ingresa un correo válido para el maestro o proveedor.');
        return;
      }
    }

    const nextChargeData: Omit<Charge, 'id'> = {
      category: normalizedCategory,
      description: description.trim(),
      amount: signedAmount,
      date,
      type,
      notes: notes.trim(),
      repairId: editingCharge?.repairId,
      repairTracking: isRepairCharge
        ? {
            ...editingCharge?.repairTracking,
            provider: repairProvider.trim(),
            providerPhone: repairProviderPhone.trim(),
            providerEmail: repairProviderEmail.trim().toLowerCase(),
            responsible: repairResponsible,
            status: editingCharge?.repairTracking?.status || 'PENDIENTE',
            commitmentDate: repairCommitmentDate,
            notes: editingCharge?.repairTracking?.notes || ''
          }
        : undefined,
      documents: editingCharge?.documents || [],
      photos: editingCharge?.photos || []
    };

    if (editingCharge) {
      const changes: string[] = [];
      if (normalizeCategory(editingCharge.category) !== normalizedCategory) {
        changes.push(`concepto: ${conceptLabel(editingCharge.category)} → ${conceptLabel(normalizedCategory)}`);
      }
      if (editingCharge.description !== description.trim()) changes.push('descripción actualizada');
      if (editingCharge.amount !== signedAmount) {
        changes.push(`monto: ${formatCLP(Math.abs(editingCharge.amount))} → ${formatCLP(Math.abs(signedAmount))}`);
      }
      if (parseFormattedDateToInput(editingCharge.date) !== date) {
        changes.push(`fecha: ${formatDate(editingCharge.date)} → ${formatDate(date)}`);
      }
      if ((editingCharge.notes || '') !== notes.trim()) changes.push('observaciones actualizadas');
      if (isRepairCharge && (
        editingCharge.repairTracking?.provider !== repairProvider.trim()
        || editingCharge.repairTracking?.providerPhone !== repairProviderPhone.trim()
        || editingCharge.repairTracking?.providerEmail !== repairProviderEmail.trim().toLowerCase()
      )) changes.push('contacto del maestro/proveedor actualizado');
      if (isRepairCharge && (editingCharge.repairTracking?.responsible || '') !== repairResponsible) {
        changes.push('responsable de reparación actualizado');
      }
      if (isRepairCharge && parseFormattedDateToInput(editingCharge.repairTracking?.commitmentDate || '') !== repairCommitmentDate) {
        changes.push('fecha de compromiso actualizada');
      }

      if (changes.length > 0) {
        updateCharge(guaranteeCase.id, editingCharge.id, nextChargeData);
        logAudit(
          guaranteeCase.id,
          movementKind === 'ABONO' ? 'Abono actualizado' : 'Cargo actualizado',
          `“${editingCharge.description}”: ${changes.join('; ')}.`
        );
        syncPreparationStatus(guaranteeCase.charges.map(ch =>
          ch.id === editingCharge.id ? { ...ch, ...nextChargeData } : ch
        ));
      }
    } else {
      addCharge(guaranteeCase.id, nextChargeData);
      const previewCharge: Charge = { id: 'PREVIEW', ...nextChargeData };
      syncPreparationStatus([...guaranteeCase.charges, previewCharge]);

      if (movementKind === 'ABONO') {
        logAudit(
          guaranteeCase.id,
          'Abono incorporado',
          `“${description.trim()}” se registró por ${formatCLP(amount)} como fondo a favor del arrendatario${normalizedCategory !== 'OTRO' ? ` · referencia ${conceptLabel(normalizedCategory)}` : ''}.`
        );
      } else if (isRepairCharge) {
        const tracking = nextChargeData.repairTracking;
        const details = [
          tracking?.provider ? `proveedor ${tracking.provider}` : null,
          tracking?.providerPhone ? `tel. ${tracking.providerPhone}` : null,
          tracking?.providerEmail ? `correo ${tracking.providerEmail}` : null,
          tracking?.responsible ? `responsable ${tracking.responsible}` : null,
          tracking?.commitmentDate ? `compromiso inicial ${formatDate(tracking.commitmentDate)}` : null
        ].filter(Boolean).join(' · ');
        logAudit(
          guaranteeCase.id,
          'Reparación incorporada',
          `“${description.trim()}” se registró por ${formatCLP(amount)} y quedó Pendiente${details ? ` · ${details}` : ''}.`
        );
      } else {
        logAudit(
          guaranteeCase.id,
          'Cargo agregado',
          `${conceptLabel(normalizedCategory)} · “${description.trim()}” · -${formatCLP(amount)}`
        );
      }
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
          <p className="text-[11px] text-slate-500 mt-1">Registra los cargos definitivos y los abonos recibidos antes de confirmar la liquidación.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('ABONO')}
            disabled={isConfirmed}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl border flex items-center gap-1.5 ${isConfirmed ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer'}`}
          >
            <Minus className="w-4 h-4" /> Abono
          </button>
          <button
            onClick={() => handleOpenAdd('CARGO')}
            disabled={isConfirmed}
            className={`px-3.5 py-2 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 ${isConfirmed ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}
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
            <span>Los cargos y abonos del resultado original quedaron bloqueados. Los pagos posteriores se registran desde la acción correspondiente.</span>
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
                  <th className="p-3">Estado</th>
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
                  const tracking = getDefaultTracking(ch);
                  return (
                    <tr key={ch.id} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isCredit ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                          {isCredit ? 'ABONO' : 'CARGO'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-700 font-semibold">{conceptLabel(ch.category)}</td>
                      <td className="p-3 min-w-[280px]">
                        <p className="font-bold text-slate-800 text-xs">{ch.description}</p>
                        {isRepairCharge && (
                          <div className="mt-1 text-[10px] text-slate-500 space-y-0.5">
                            {(tracking.provider || tracking.responsible) && (
                              <div>
                                {tracking.provider && <span>Maestro/proveedor: {tracking.provider}</span>}
                                {tracking.provider && tracking.responsible && <span> · </span>}
                                {tracking.responsible && <span>Responsable: {tracking.responsible}</span>}
                              </div>
                            )}
                            {(tracking.providerPhone || tracking.providerEmail) && (
                              <div>
                                {tracking.providerPhone && <span>{tracking.providerPhone}</span>}
                                {tracking.providerPhone && tracking.providerEmail && <span> · </span>}
                                {tracking.providerEmail && <span>{tracking.providerEmail}</span>}
                              </div>
                            )}
                            {tracking.commitmentDate && <div>Compromiso inicial: {formatDate(tracking.commitmentDate)}</div>}
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isRepairCharge ? (
                          <select
                            value={tracking.status}
                            disabled={isConfirmed}
                            onChange={(e) => handleQuickStatusChange(ch, e.target.value as RepairStatus)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                              tracking.status === 'TERMINADA'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : tracking.status === 'EN_EJECUCION'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : tracking.status === 'CANCELADA'
                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                            } ${isConfirmed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="EN_EJECUCION">En ejecución</option>
                            <option value="TERMINADA">Terminada</option>
                            <option value="CANCELADA">Cancelada</option>
                          </select>
                        ) : <span className="text-[10px] text-slate-400">—</span>}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">{formatDate(ch.date)}</td>
                      <td className={`p-3 text-right font-mono font-bold text-sm whitespace-nowrap ${isCredit ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isCredit ? '+' : '-'}{formatCLP(Math.abs(ch.amount))}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs text-[11px]">
                        {ch.notes || '-'}
                        {ch.documents && ch.documents.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold mt-1">
                            <Paperclip className="w-3 h-3" /> {ch.documents.length} respaldo(s)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Lock className="w-3 h-3" /> Bloqueado</span>
                        ) : (
                          <>
                            <button onClick={() => handleOpenEdit(ch)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer" title="Editar cargo o abono">
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
                  <td colSpan={5} className="p-3 text-right text-xs font-bold text-slate-600">Cargos</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">-{formatCLP(fin.grossCharges)}</td>
                  <td colSpan={2}></td>
                </tr>
                {fin.tenantCredits > 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-right text-xs font-bold text-slate-600">Abonos arrendatario</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">+{formatCLP(fin.tenantCredits)}</td>
                    <td colSpan={2}></td>
                  </tr>
                )}
                <tr className="border-t border-slate-200">
                  <td colSpan={5} className="p-3 text-right text-xs font-bold text-slate-700">Neto cargos y abonos</td>
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
              {editingCharge ? 'Editar movimiento de la liquidación' : movementKind === 'ABONO' ? 'Registrar abono' : 'Registrar cargo'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={Boolean(editingCharge)} onClick={() => handleMovementKindChange('CARGO')} className={`p-2 rounded-lg border font-bold ${movementKind === 'CARGO' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white border-slate-200 text-slate-600'} ${editingCharge ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>Cargo</button>
                  <button type="button" disabled={Boolean(editingCharge)} onClick={() => handleMovementKindChange('ABONO')} className={`p-2 rounded-lg border font-bold ${movementKind === 'ABONO' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'} ${editingCharge ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>Abono</button>
                </div>
                {editingCharge && <span className="text-[10px] text-slate-400 block mt-1">Para evitar inconsistencias, el tipo de un movimiento existente no se cambia al editar.</span>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Concepto {movementKind === 'ABONO' ? '(referencia)' : '*'}</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value as ChargeCategory); setFormError(''); }}
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
                  placeholder={movementKind === 'ABONO' ? 'Ej. Proporcional gastos comunes y servicios último voucher' : 'Ej. Reparación pintura dormitorio, cuenta de agua pendiente...'}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setFormError(''); }}
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
                    onChange={(e) => { setAmount(Number(e.target.value)); setFormError(''); }}
                    className={`w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold ${movementKind === 'ABONO' ? 'text-emerald-800' : 'text-rose-800'}`}
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">{formatCLP(amount)}</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha *</label>
                  <input type="date" required value={date} onChange={(e) => { setDate(e.target.value); setFormError(''); }} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs" />
                </div>
              </div>

              {movementKind === 'CARGO' && inferChargeType(category) === 'DAÑO_REPARACION' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <Wrench className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div>
                      <strong className="text-xs text-slate-800 block">Datos del maestro / proveedor</strong>
                      <span className="text-[10px] text-slate-500">Nombre, teléfono y correo son obligatorios para que la reparación quede trazable.</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Maestro / proveedor *</label>
                      <input required value={repairProvider} onChange={(e) => { setRepairProvider(e.target.value); setFormError(''); }} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs" placeholder="Nombre del maestro o empresa" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Teléfono *</label>
                      <input type="tel" required value={repairProviderPhone} onChange={(e) => { setRepairProviderPhone(e.target.value); setFormError(''); }} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs" placeholder="+56 9 ..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Correo *</label>
                      <input type="email" required value={repairProviderEmail} onChange={(e) => { setRepairProviderEmail(e.target.value); setFormError(''); }} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs" placeholder="correo@ejemplo.cl" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Responsable interno</label>
                      <select value={repairResponsible} onChange={(e) => setRepairResponsible(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs">
                        <option value="">Sin responsable</option>
                        {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Fecha compromiso inicial</label>
                      <input type="date" value={repairCommitmentDate} onChange={(e) => setRepairCommitmentDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs" />
              </div>

              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-[11px] font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {formError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs cursor-pointer">Cancelar</button>
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
