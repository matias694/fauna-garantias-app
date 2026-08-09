import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SystemSettings, UserRole } from '../types';
import { Settings as SettingsIcon, Save, Users, ShieldCheck, Clock, ListPlus, ShieldAlert } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, userRole, setUserRole } = useApp();

  const [maxLiquidationDays, setMaxLiquidationDays] = useState(settings.maxLiquidationDays);
  const [warningLiquidationDays, setWarningLiquidationDays] = useState(settings.warningLiquidationDays);
  const [fullPlanCoverageLimit, setFullPlanCoverageLimit] = useState(settings.fullPlanCoverageLimit);
  const [newRespName, setNewRespName] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      maxLiquidationDays,
      warningLiquidationDays,
      fullPlanCoverageLimit
    });
    alert('Configuración guardada correctamente.');
  };

  const handleAddResponsible = () => {
    if (!newRespName.trim()) return;
    if (settings.responsiblesList.includes(newRespName.trim())) {
      alert('Este responsable ya existe.');
      return;
    }
    updateSettings({
      responsiblesList: [...settings.responsiblesList, newRespName.trim()]
    });
    setNewRespName('');
  };

  const handleRemoveResponsible = (name: string) => {
    updateSettings({
      responsiblesList: settings.responsiblesList.filter(r => r !== name)
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-xs">
      
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-600" />
            Configuración Parámetros del Sistema
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajustes de plazos, límites de cobertura, lista de responsables y permisos de rol.
          </p>
        </div>

        {/* Current Active Role Indicator */}
        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Rol Activo: <strong>{userRole}</strong></span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Plazos de Liquidación */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Plazos Legales y Control de Tiempos de Liquidación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Días Máximos para Liquidación *</label>
              <input
                type="number"
                required
                value={maxLiquidationDays}
                onChange={(e) => setMaxLiquidationDays(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Plazo legal máximo para cerrar y liquidar la garantía (def: 60 días).</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Días para Alerta Preventiva de Vencimiento *</label>
              <input
                type="number"
                required
                value={warningLiquidationDays}
                onChange={(e) => setWarningLiquidationDays(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Días transcurridos a partir de los cuales se activa alerta en el Dashboard (def: 45 días).</span>
            </div>
          </div>
        </div>

        {/* Reglas Plan Full */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            Límite de Cobertura - Plan Full
          </h3>

          <div className="max-w-md">
            <label className="block font-semibold text-slate-700 mb-1">Monto Máximo de Cobertura Full por Garantía ($ CLP) *</label>
            <input
              type="number"
              step="50000"
              required
              value={fullPlanCoverageLimit}
              onChange={(e) => setFullPlanCoverageLimit(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold font-mono text-purple-900"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Monto máximo que Fauna absorbe para cubrir reparaciones de daño bajo el Plan Full.</span>
          </div>
        </div>

        {/* Responsables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Nómina de Responsables Operativos
          </h3>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Nombre nuevo responsable..."
              value={newRespName}
              onChange={(e) => setNewRespName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
            />
            <button
              type="button"
              onClick={handleAddResponsible}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
            >
              + Agregar
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {settings.responsiblesList.map(resp => (
              <span key={resp} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold flex items-center gap-2">
                {resp}
                <button
                  type="button"
                  onClick={() => handleRemoveResponsible(resp)}
                  className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Roles y Permisos Switcher */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Roles y Simulación de Permisos de Usuario
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setUserRole('OPERATIVO')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                userRole === 'OPERATIVO'
                  ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
            >
              <strong className="font-bold text-slate-900 block text-xs">Rol: OPERATIVO</strong>
              <p className="text-[11px] text-slate-600 mt-1">
                Puede ingresar casos, gestionar reparaciones, crear cargos y generar liquidaciones. No puede eliminar registros ni reabrir casos cerrados.
              </p>
            </div>

            <div
              onClick={() => setUserRole('ADMINISTRADOR')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                userRole === 'ADMINISTRADOR'
                  ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 opacity-70'
              }`}
            >
              <strong className="font-bold text-slate-900 block text-xs">Rol: ADMINISTRADOR</strong>
              <p className="text-[11px] text-slate-600 mt-1">
                Acceso total. Puede reabrir casos cerrados, modificar parámetros del sistema, eliminar registros y administrar responsables.
              </p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar Configuración
          </button>
        </div>

      </form>

    </div>
  );
};
