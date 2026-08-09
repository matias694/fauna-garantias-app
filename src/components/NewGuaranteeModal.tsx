import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AdministrationPlan } from '../types';
import { formatCLP, addDaysToDate } from '../utils/formatters';
import { X, ShieldCheck, DollarSign, User, Home } from 'lucide-react';

interface NewGuaranteeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGuaranteeModal: React.FC<NewGuaranteeModalProps> = ({ isOpen, onClose }) => {
  const { createGuaranteeCase, settings, setSelectedCaseId, setActiveView } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  const [address, setAddress] = useState('');
  const [comuna, setComuna] = useState('Providencia');
  const [unit, setUnit] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [ownerRut, setOwnerRut] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  const [tenantName, setTenantName] = useState('');
  const [tenantRut, setTenantRut] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');

  const [monthlyRent, setMonthlyRent] = useState<number>(550000);
  const [plan, setPlan] = useState<AdministrationPlan>('FULL');
  const [contractStartDate, setContractStartDate] = useState('2025-08-01');
  const [contractEndDate, setContractEndDate] = useState(todayStr);

  const [guaranteeAmount, setGuaranteeAmount] = useState<number>(550000);
  const [receptionDate, setReceptionDate] = useState(todayStr);
  const [responsible, setResponsible] = useState(settings.responsiblesList[0] || 'Constanza Silva');
  const [initialNotes, setInitialNotes] = useState('');

  if (!isOpen) return null;

  // Calculate deadline date automatically
  const formattedReceptionDate = receptionDate.split('-').reverse().join('/');
  const autoDeadline = addDaysToDate(formattedReceptionDate, settings.maxLiquidationDays || 60);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim() || !tenantName.trim() || !ownerName.trim()) {
      alert('Por favor complete la dirección de la propiedad, el arrendatario y el propietario.');
      return;
    }

    const created = createGuaranteeCase({
      propertyAddress: address,
      propertyComuna: comuna,
      propertyUnit: unit,
      ownerName,
      ownerRut,
      ownerEmail,
      ownerPhone,
      tenantName,
      tenantRut,
      tenantEmail,
      tenantPhone,
      monthlyRent,
      plan,
      contractStartDate: contractStartDate.split('-').reverse().join('/'),
      contractEndDate: contractEndDate.split('-').reverse().join('/'),
      guaranteeAmount,
      receptionDate: formattedReceptionDate,
      responsible,
      initialNotes,
      preparationStatus: 'PENDIENTE',
      liquidationStatus: 'EN_PREPARACION',
      blockedBy: 'SIN_BLOQUEO',
      nextManagement: 'Ingresar detalle de reparaciones iniciales',
      nextManagementDate: formattedReceptionDate,
      nextManagementResponsible: responsible
    });

    onClose();
    setSelectedCaseId(created.id);
    setActiveView('case-detail');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Registrar Nueva Garantía</h3>
              <p className="text-xs text-slate-300">Creación de caso por recepción de propiedad al terminar arriendo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          
          {/* DATOS DE LA PROPIEDAD */}
          <div className="space-y-3">
            <h4 className="font-semibold text-emerald-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
              <Home className="w-4 h-4 text-emerald-600" />
              Datos de la Propiedad
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Av. Providencia 1234"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Depto / Unidad</label>
                <input
                  type="text"
                  placeholder="Ej. Depto 502"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comuna</label>
                <select
                  value={comuna}
                  onChange={(e) => setComuna(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Providencia">Providencia</option>
                  <option value="Las Condes">Las Condes</option>
                  <option value="Santiago">Santiago</option>
                  <option value="Ñuñoa">Ñuñoa</option>
                  <option value="Vitacura">Vitacura</option>
                  <option value="La Reina">La Reina</option>
                  <option value="Macul">Macul</option>
                  <option value="San Miguel">San Miguel</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>
            </div>

            {/* Propietario info */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Propietario *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre completo"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">RUT Propietario</label>
                <input
                  type="text"
                  placeholder="Ej. 12.345.678-9"
                  value={ownerRut}
                  onChange={(e) => setOwnerRut(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="propietario@email.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="+56 9 1234 5678"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* DATOS DEL ARRENDATARIO */}
          <div className="space-y-3">
            <h4 className="font-semibold text-emerald-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              Datos del Arrendatario Saliente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">RUT Arrendatario</label>
                <input
                  type="text"
                  placeholder="Ej. 18.765.432-1"
                  value={tenantRut}
                  onChange={(e) => setTenantRut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="arrendatario@email.com"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="+56 9 8765 4321"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* DATOS DEL CONTRATO Y GARANTÍA */}
          <div className="space-y-3">
            <h4 className="font-semibold text-emerald-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Contrato, Plan y Garantía
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Canon Mensual ($ CLP)</label>
                <input
                  type="number"
                  step="5000"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">{formatCLP(monthlyRent)}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan de Administración</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as AdministrationPlan)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-emerald-800"
                >
                  <option value="ESTANDAR">Estándar</option>
                  <option value="PLUS">Plus</option>
                  <option value="FULL">Full (Incluye Cobertura Daños)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monto Garantía ($ CLP) *</label>
                <input
                  type="number"
                  step="5000"
                  required
                  value={guaranteeAmount}
                  onChange={(e) => setGuaranteeAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-emerald-900 bg-emerald-50/50"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">{formatCLP(guaranteeAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Recepción Propiedad</label>
                <input
                  type="date"
                  required
                  value={receptionDate}
                  onChange={(e) => setReceptionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plazo Máximo Liquidación</label>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs text-emerald-900 font-bold flex items-center justify-between">
                  <span>{autoDeadline}</span>
                  <span className="text-[10px] font-normal text-emerald-700">({settings.maxLiquidationDays} días)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Responsable del Caso</label>
                <select
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
                >
                  {settings.responsiblesList.map(resp => (
                    <option key={resp} value={resp}>{resp}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* OBSERVACIONES INICIALES */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones Iniciales de Recepción</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre estado inicial de entrega de la propiedad..."
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs"
            ></textarea>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              Crear Garantía
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
