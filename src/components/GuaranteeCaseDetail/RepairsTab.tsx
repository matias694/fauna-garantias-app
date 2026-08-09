import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, RepairCategory, RepairStatus, ExitRepair } from '../../types';
import { formatCLP, formatDate } from '../../utils/formatters';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  DollarSign
} from 'lucide-react';

interface RepairsTabProps {
  guaranteeCase: GuaranteeCase;
}

export const RepairsTab: React.FC<RepairsTabProps> = ({ guaranteeCase }) => {
  const {
    addExitRepair,
    updateExitRepair,
    deleteExitRepair,
    addCharge,
    changePreparationStatus,
    settings
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<ExitRepair | null>(null);

  // Modal Form state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RepairCategory>('PINTURA');
  const [responsible, setResponsible] = useState(guaranteeCase.responsible);
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState<RepairStatus>('PENDIENTE');
  const [detectionDate, setDetectionDate] = useState(guaranteeCase.receptionDate);
  const [commitmentDate, setCommitmentDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [finalCost, setFinalCost] = useState<number>(0);
  const [chargeToTenant, setChargeToTenant] = useState(true);
  const [notes, setNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleOpenAdd = () => {
    setEditingRepair(null);
    setDescription('');
    setCategory('PINTURA');
    setResponsible(guaranteeCase.responsible);
    setProvider('');
    setStatus('PENDIENTE');
    setDetectionDate(guaranteeCase.receptionDate);
    setCommitmentDate('');
    setEstimatedCost(150000);
    setFinalCost(150000);
    setChargeToTenant(true);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (repair: ExitRepair) => {
    setEditingRepair(repair);
    setDescription(repair.description);
    setCategory(repair.category);
    setResponsible(repair.responsible);
    setProvider(repair.provider);
    setStatus(repair.status);
    setDetectionDate(repair.detectionDate);
    setCommitmentDate(repair.commitmentDate);
    setEstimatedCost(repair.estimatedCost);
    setFinalCost(repair.finalCost);
    setChargeToTenant(repair.chargeToTenant);
    setNotes(repair.notes);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Por favor ingrese la descripción de la reparación.');
      return;
    }

    if (editingRepair) {
      updateExitRepair(guaranteeCase.id, editingRepair.id, {
        description,
        category,
        responsible,
        provider,
        status,
        detectionDate,
        commitmentDate,
        estimatedCost,
        finalCost,
        chargeToTenant,
        notes
      });
    } else {
      addExitRepair(guaranteeCase.id, {
        description,
        category,
        responsible,
        provider,
        status,
        detectionDate,
        commitmentDate,
        estimatedCost,
        finalCost,
        chargeToTenant,
        notes,
        photos: [],
        documents: []
      });

      // Auto create charge if chargeToTenant is checked and cost > 0
      if (chargeToTenant && finalCost > 0) {
        addCharge(guaranteeCase.id, {
          category: category === 'PINTURA' ? 'PINTURA' : category === 'LIMPIEZA' ? 'LIMPIEZA' : 'REPARACIONES',
          description: `Reparación salida: ${description}`,
          amount: finalCost,
          date: formatDate(todayStr),
          type: 'DAÑO_REPARACION',
          notes: `Cargado automáticamente desde reparación de salida (Proveedor: ${provider || 'N/A'})`,
          documents: [],
          photos: []
        });
      }
    }

    setIsModalOpen(false);
  };

  const handleStatusChange = (repairId: string, newStatus: RepairStatus) => {
    updateExitRepair(guaranteeCase.id, repairId, { status: newStatus });
  };

  const handleCreateChargeFromRepair = (repair: ExitRepair) => {
    const cost = repair.finalCost || repair.estimatedCost;
    if (cost <= 0) {
      alert('La reparación debe tener un costo mayor a $0 para generar un cargo.');
      return;
    }

    addCharge(guaranteeCase.id, {
      category: repair.category === 'PINTURA' ? 'PINTURA' : repair.category === 'LIMPIEZA' ? 'LIMPIEZA' : 'REPARACIONES',
      description: `Reparación salida: ${repair.description}`,
      amount: cost,
      date: formatDate(todayStr),
      type: 'DAÑO_REPARACION',
      notes: `Cargado desde sección reparaciones. Maestro: ${repair.provider}`,
      repairId: repair.id,
      documents: [],
      photos: []
    });

    updateExitRepair(guaranteeCase.id, repair.id, { linkedChargeId: 'LINKED' });
    alert('Cargo de garantía creado automáticamente por ' + formatCLP(cost));
  };

  const allRepairsFinished = guaranteeCase.repairs.length > 0 && guaranteeCase.repairs.every(r => r.status === 'TERMINADA');

  return (
    <div className="space-y-6">
      
      {/* Header & Warning */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">Reparaciones de Salida de la Propiedad</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Registrar únicamente trabajos derivados de la devolución de la propiedad tras término del arriendo. 
            No incluir mantenciones periódicas o tickets de administración activa.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>+ Registrar Reparación</span>
        </button>
      </div>

      {/* PROMPT WHEN ALL REPAIRS ARE TERMINADA */}
      {allRepairsFinished && guaranteeCase.preparationStatus !== 'LISTA' && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between text-emerald-950 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <strong className="font-bold text-sm block">Reparaciones concluidas</strong>
              <span className="text-xs text-emerald-800">Todas las reparaciones han finalizado. La preparación física de la propiedad puede marcarse como <strong>LISTA</strong>.</span>
            </div>
          </div>
          <button
            onClick={() => changePreparationStatus(guaranteeCase.id, 'LISTA')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Marcar Preparación LISTA →
          </button>
        </div>
      )}

      {/* Repairs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {guaranteeCase.repairs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No se han registrado reparaciones de salida para este caso.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Categoría / Descripción</th>
                  <th className="p-3">Proveedor / Maestro</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Estado Trabajos</th>
                  <th className="p-3">Fechas (Compromiso)</th>
                  <th className="p-3 text-right">Costo Final</th>
                  <th className="p-3 text-center">¿Carga Arrendatario?</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {guaranteeCase.repairs.map(repair => (
                  <tr key={repair.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase border border-slate-200 inline-block mb-1">
                        {repair.category}
                      </span>
                      <p className="font-semibold text-slate-800 text-xs">{repair.description}</p>
                      {repair.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">{repair.notes}</p>}
                    </td>

                    <td className="p-3 text-slate-700">{repair.provider || 'Sin asignar'}</td>
                    <td className="p-3 text-slate-600">{repair.responsible}</td>

                    <td className="p-3 whitespace-nowrap">
                      <select
                        value={repair.status}
                        onChange={(e) => handleStatusChange(repair.id, e.target.value as RepairStatus)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                          repair.status === 'TERMINADA'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : repair.status === 'EN_EJECUCION'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_EJECUCION">En Ejecución</option>
                        <option value="TERMINADA">Terminada</option>
                      </select>
                    </td>

                    <td className="p-3 whitespace-nowrap text-slate-600 text-[11px]">
                      <div>Detección: {formatDate(repair.detectionDate)}</div>
                      <div className="font-semibold text-slate-800">Compromiso: {formatDate(repair.commitmentDate)}</div>
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-xs">
                      {formatCLP(repair.finalCost || repair.estimatedCost)}
                    </td>

                    <td className="p-3 text-center">
                      {repair.chargeToTenant ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                          SÍ (Cargar)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                          NO (Gasto)
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      {repair.chargeToTenant && !repair.linkedChargeId && (
                        <button
                          onClick={() => handleCreateChargeFromRepair(repair)}
                          title="Generar Cargo de Garantía"
                          className="p-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>+ Cargo</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(repair)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Editar reparación"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteExitRepair(guaranteeCase.id, repair.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Eliminar reparación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Repair Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-2">
              {editingRepair ? 'Editar Reparación de Salida' : 'Nueva Reparación de Salida'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción del Trabajo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pintura living y dormitorio..."
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
                    onChange={(e) => setCategory(e.target.value as RepairCategory)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="PINTURA">Pintura</option>
                    <option value="REPARACION">Reparación</option>
                    <option value="LIMPIEZA">Limpieza</option>
                    <option value="DAÑO">Daño</option>
                    <option value="CERRAJERIA">Cerrajería</option>
                    <option value="GASFITERIA">Gasfitería</option>
                    <option value="ELECTRICIDAD">Electricidad</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado Trabajos</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RepairStatus)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_EJECUCION">En Ejecución</option>
                    <option value="TERMINADA">Terminada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Proveedor / Maestro</label>
                  <input
                    type="text"
                    placeholder="Ej. Pinturas Don José SpA"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsable Interno</label>
                  <select
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    {settings.responsiblesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Costo Estimado ($ CLP)</label>
                  <input
                    type="number"
                    step="5000"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Costo Final ($ CLP)</label>
                  <input
                    type="number"
                    step="5000"
                    value={finalCost}
                    onChange={(e) => setFinalCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha Compromiso</label>
                  <input
                    type="date"
                    value={commitmentDate}
                    onChange={(e) => setCommitmentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chargeToTenant}
                      onChange={(e) => setChargeToTenant(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>¿Cargar a Arrendatario?</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre avance o materiales..."
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
                  {editingRepair ? 'Guardar Cambios' : 'Registrar Reparación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
