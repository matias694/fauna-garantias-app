import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, ChargeCategory, ChargeType, Charge, RepairStatus } from '../../types';
import { formatCLP, formatDate } from '../../utils/formatters';
import { calculateGuaranteeFinances } from '../../utils/calculations';
import {
  DollarSign,
  Plus,
  Minus,
  Trash2,
  Edit2,
  Paperclip,
  Lock,
  Wrench,
  ChevronDown,
  ChevronUp,
  Upload,
  MessageSquare
} from 'lucide-react';

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

const inferAttachmentType = (filename: string): 'PDF' | 'JPG' | 'PNG' | 'DOC' => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'JPG';
  if (extension === 'png') return 'PNG';
  if (extension === 'doc' || extension === 'docx') return 'DOC';
  return 'PDF';
};

export const ChargesTab: React.FC<ChargesTabProps> = ({ guaranteeCase }) => {
  const {
    addCharge,
    updateCharge,
    deleteCharge,
    changePreparationStatus,
    addFollowUpComment,
    addAttachment,
    logAudit,
    settings
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [movementKind, setMovementKind] = useState<MovementKind>('CARGO');
  const [category, setCategory] = useState<ChargeCategory>('REPARACIONES');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(guaranteeCase.receptionDate);
  const [notes, setNotes] = useState('');

  const [expandedRepairId, setExpandedRepairId] = useState<string | null>(null);
  const [repairProvider, setRepairProvider] = useState('');
  const [repairResponsible, setRepairResponsible] = useState(guaranteeCase.responsible || settings.responsiblesList[0] || '');
  const [repairCommitmentDate, setRepairCommitmentDate] = useState('');
  const [repairWorkDetails, setRepairWorkDetails] = useState('');
  const [repairUpdate, setRepairUpdate] = useState('');
  const [budgetFile, setBudgetFile] = useState<File | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const fin = calculateGuaranteeFinances(guaranteeCase, settings);

  const resetForm = (kind: MovementKind) => {
    setEditingCharge(null);
    setMovementKind(kind);
    setCategory('REPARACIONES');
    setDescription('');
    setAmount(100000);
    setDate(formatDate(todayStr));
    setNotes('');
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

  const getDefaultTracking = (ch: Charge) => ({
    provider: ch.repairTracking?.provider || '',
    responsible: ch.repairTracking?.responsible || guaranteeCase.responsible || settings.responsiblesList[0] || '',
    status: ch.repairTracking?.status || ('PENDIENTE' as RepairStatus),
    commitmentDate: ch.repairTracking?.commitmentDate || '',
    notes: ch.repairTracking?.notes || ''
  });

  const handleToggleRepair = (ch: Charge) => {
    if (expandedRepairId === ch.id) {
      setExpandedRepairId(null);
      return;
    }

    const tracking = getDefaultTracking(ch);
    setExpandedRepairId(ch.id);
    setRepairProvider(tracking.provider);
    setRepairResponsible(tracking.responsible);
    setRepairCommitmentDate(tracking.commitmentDate);
    setRepairWorkDetails(tracking.notes || '');
    setRepairUpdate('');
    setBudgetFile(null);
  };

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

  const handleSaveRepairManagement = (ch: Charge) => {
    if (isConfirmed) return;

    const previous = getDefaultTracking(ch);
    const nextTracking = {
      ...previous,
      provider: repairProvider.trim(),
      responsible: repairResponsible,
      commitmentDate: repairCommitmentDate,
      notes: repairWorkDetails.trim()
    };

    const nextDocuments = budgetFile && !ch.documents.includes(budgetFile.name)
      ? [...ch.documents, budgetFile.name]
      : ch.documents;

    updateCharge(guaranteeCase.id, ch.id, {
      repairTracking: nextTracking,
      documents: nextDocuments
    });

    const changes: string[] = [];
    if (previous.provider !== nextTracking.provider) {
      changes.push(`proveedor: ${previous.provider || 'sin asignar'} → ${nextTracking.provider || 'sin asignar'}`);
    }
    if (previous.responsible !== nextTracking.responsible) {
      changes.push(`responsable: ${previous.responsible || 'sin asignar'} → ${nextTracking.responsible || 'sin asignar'}`);
    }
    if (previous.commitmentDate !== nextTracking.commitmentDate) {
      changes.push(`fecha compromiso: ${previous.commitmentDate || 'sin fecha'} → ${nextTracking.commitmentDate || 'sin fecha'}`);
    }
    if ((previous.notes || '') !== (nextTracking.notes || '')) {
      changes.push('detalle de trabajos actualizado');
    }
    if (budgetFile) {
      changes.push(`presupuesto adjuntado: ${budgetFile.name}`);
      addAttachment(guaranteeCase.id, {
        name: budgetFile.name,
        type: inferAttachmentType(budgetFile.name),
        date: formatDate(todayStr),
        url: '#',
        category: 'Presupuesto reparación'
      });
    }

    if (changes.length > 0) {
      logAudit(
        guaranteeCase.id,
        'Seguimiento de reparación actualizado',
        `“${ch.description}”: ${changes.join('; ')}.`
      );
    }

    if (repairUpdate.trim()) {
      addFollowUpComment(guaranteeCase.id, {
        comment: `Reparación “${ch.description}”: ${repairUpdate.trim()}`,
        area: 'Reparacion'
      });
    }

    const nextCharges = guaranteeCase.charges.map(item =>
      item.id === ch.id
        ? { ...item, repairTracking: nextTracking, documents: nextDocuments }
        : item
    );
    syncPreparationStatus(nextCharges);

    setRepairUpdate('');
    setBudgetFile(null);
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

    const nextChargeData: Omit<Charge, 'id'> = {
      category: normalizedCategory,
      description,
      amount: signedAmount,
      date,
      type,
      notes,
      repairId: editingCharge?.repairId,
      repairTracking: isRepairCharge
        ? editingCharge?.repairTracking || {
            provider: '',
            responsible: guaranteeCase.responsible || settings.responsiblesList[0] || '',
            status: 'PENDIENTE',
            commitmentDate: '',
            notes: ''
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
      if (editingCharge.description !== description) changes.push(`descripción actualizada`);
      if (editingCharge.amount !== signedAmount) {
        changes.push(`monto: ${formatCLP(Math.abs(editingCharge.amount))} → ${formatCLP(Math.abs(signedAmount))}`);
      }
      if (editingCharge.date !== date) changes.push(`fecha: ${editingCharge.date} → ${date}`);
      if (editingCharge.notes !== notes) changes.push('observaciones actualizadas');

      updateCharge(guaranteeCase.id, editingCharge.id, nextChargeData);
      logAudit(
        guaranteeCase.id,
        movementKind === 'ABONO' ? 'Abono actualizado' : 'Cargo actualizado',
        `“${editingCharge.description}”: ${changes.join('; ') || 'movimiento guardado sin cambios visibles'}.`
      );

      const nextCharges = guaranteeCase.charges.map(ch =>
        ch.id === editingCharge.id ? { ...ch, ...nextChargeData } : ch
      );
      syncPreparationStatus(nextCharges);
    } else {
      addCharge(guaranteeCase.id, nextChargeData);
      const previewCharge: Charge = { id: 'PREVIEW', ...nextChargeData };
      syncPreparationStatus([...guaranteeCase.charges, previewCharge]);

      if (isRepairCharge) {
        logAudit(
          guaranteeCase.id,
          'Reparación incorporada',
          `“${description}” se registró por ${formatCLP(amount)} y quedó Pendiente de gestión.`
        );
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteCharge = (chargeId: string) => {
    if (isConfirmed) return;
    deleteCharge(guaranteeCase.id, chargeId);
    syncPreparationStatus(guaranteeCase.charges.filter(ch => ch.id !== chargeId));
    if (expandedRepairId === chargeId) setExpandedRepairId(null);
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
            Registra el monto que afecta la liquidación. Si es una reparación, su avance se gestiona desde la misma fila sin modificar el cargo.
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
                  const tracking = getDefaultTracking(ch);
                  const expanded = expandedRepairId === ch.id;

                  return (
                    <React.Fragment key={ch.id}>
                      <tr className="hover:bg-slate-50 transition-colors align-top">
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
                        <td className="p-3 min-w-[300px]">
                          <p className="font-bold text-slate-800 text-xs">{ch.description}</p>
                          {isRepairCharge && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
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
                              <button
                                type="button"
                                onClick={() => handleToggleRepair(ch)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-emerald-700"
                              >
                                <Wrench className="w-3 h-3" />
                                {expanded ? 'Ocultar seguimiento' : 'Gestionar reparación'}
                                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
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
                            <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold mt-1">
                              <Paperclip className="w-3 h-3" /> {ch.documents.length} respaldo(s)
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
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Editar cargo o abono"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCharge(ch.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>

                      {isRepairCharge && expanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={7} className="p-0">
                            <div className="p-4 border-t border-slate-200 space-y-4">
                              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                                <div>
                                  <strong className="text-xs text-slate-800 flex items-center gap-1.5">
                                    <Wrench className="w-4 h-4 text-emerald-600" /> Seguimiento de la reparación
                                  </strong>
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    El monto de la liquidación se edita con el lápiz. Aquí solo gestionas ejecución, responsable, respaldo y avances.
                                  </p>
                                </div>
                                {ch.documents.length > 0 && (
                                  <div className="text-[10px] text-slate-500">
                                    <strong className="text-slate-700">Respaldos:</strong> {ch.documents.join(', ')}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Proveedor / maestro</label>
                                  <input
                                    value={repairProvider}
                                    disabled={isConfirmed}
                                    onChange={(e) => setRepairProvider(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs disabled:bg-slate-100"
                                    placeholder="Ej. Maestro / empresa"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Responsable interno</label>
                                  <select
                                    value={repairResponsible}
                                    disabled={isConfirmed}
                                    onChange={(e) => setRepairResponsible(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs disabled:bg-slate-100"
                                  >
                                    <option value="">Sin responsable</option>
                                    {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Fecha compromiso</label>
                                  <input
                                    value={repairCommitmentDate}
                                    disabled={isConfirmed}
                                    onChange={(e) => setRepairCommitmentDate(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs disabled:bg-slate-100"
                                    placeholder="DD/MM/AAAA"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Detalle de trabajos (opcional)</label>
                                <textarea
                                  rows={2}
                                  value={repairWorkDetails}
                                  disabled={isConfirmed}
                                  onChange={(e) => setRepairWorkDetails(e.target.value)}
                                  placeholder="Resume los ítems principales. No es necesario copiar línea por línea el presupuesto del técnico."
                                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs disabled:bg-slate-100"
                                />
                                <span className="text-[10px] text-slate-400">Registra el total como cargo y deja el detalle completo en el presupuesto adjunto.</span>
                              </div>

                              {!isConfirmed && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                                    <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                                      <Upload className="w-3.5 h-3.5 text-emerald-600" /> Adjuntar presupuesto técnico
                                    </label>
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={(e) => setBudgetFile(e.target.files?.[0] || null)}
                                      className="block w-full text-[10px] text-slate-500"
                                    />
                                  </div>
                                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                                    <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Agregar actualización al seguimiento
                                    </label>
                                    <input
                                      value={repairUpdate}
                                      onChange={(e) => setRepairUpdate(e.target.value)}
                                      placeholder="Ej. Maestro confirma visita para mañana a las 10:00"
                                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                                    />
                                  </div>
                                </div>
                              )}

                              {!isConfirmed && (
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRepairManagement(ch)}
                                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                                  >
                                    Guardar seguimiento
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
              {editingCharge ? 'Editar movimiento de la liquidación' : movementKind === 'ABONO' ? 'Registrar abono' : 'Registrar cargo'}
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
                  placeholder={movementKind === 'ABONO' ? 'Ej. Abono proporcional de gastos comunes' : 'Ej. Reparaciones según presupuesto técnico, cuenta de agua pendiente...'}
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
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900">
                  <strong className="block">El seguimiento se gestiona después desde la fila de la reparación.</strong>
                  Registra aquí el monto total que afecta la liquidación. No necesitas copiar cada línea del presupuesto técnico.
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
