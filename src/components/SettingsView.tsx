import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings as SettingsIcon, Save, Users, ShieldCheck, Clock, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, userRole, setUserRole } = useApp();

  const [maxLiquidationDays, setMaxLiquidationDays] = useState(settings.maxLiquidationDays);
  const [alertDay, setAlertDay] = useState(settings.alertDay);
  const [newRespName, setNewRespName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (alertDay > maxLiquidationDays) {
      setFeedback({ type: 'error', text: 'El día de alerta no puede ser posterior al plazo máximo de liquidación.' });
      return;
    }
    updateSettings({
      ...settings,
      maxLiquidationDays,
      alertDay
    });
    setFeedback({ type: 'success', text: 'Configuración guardada correctamente.' });
  };

  const handleAddResponsible = () => {
    const name = newRespName.trim();
    if (!name) return;
    if (settings.responsiblesList.includes(name)) {
      setFeedback({ type: 'error', text: 'Este responsable ya existe.' });
      return;
    }

    updateSettings({
      ...settings,
      responsiblesList: [...settings.responsiblesList, name]
    });
    setNewRespName('');
    setFeedback({ type: 'success', text: `Responsable “${name}” agregado.` });
  };

  const handleRemoveResponsible = (name: string) => {
    updateSettings({
      ...settings,
      responsiblesList: settings.responsiblesList.filter(r => r !== name)
    });
    setFeedback({ type: 'success', text: `Responsable “${name}” eliminado de las opciones futuras.` });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto text-xs">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-600" />
            Configuración del sistema
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Plazos operativos, regla de cobertura Full y responsables del prototipo.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Rol activo: <strong>{userRole}</strong></span>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-xl border p-3 flex items-start gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Plazos de liquidación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Días máximos para liquidación</label>
              <input
                type="number"
                min="1"
                required
                value={maxLiquidationDays}
                onChange={(e) => { setMaxLiquidationDays(Number(e.target.value)); setFeedback(null); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Día de alerta preventiva</label>
              <input
                type="number"
                min="1"
                required
                value={alertDay}
                onChange={(e) => { setAlertDay(Number(e.target.value)); setFeedback(null); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                El dashboard comienza a advertir el caso desde este día.
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            Cobertura Plan Full
          </h3>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-purple-950">
            <strong className="block text-sm">Cobertura adicional máxima = 100% del monto de la garantía</strong>
            <p className="text-xs mt-1 leading-relaxed">
              La cobertura Full se calcula automáticamente para cada contrato y se aplica únicamente a daños o reparaciones cubiertas.
            </p>
          </div>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Responsables operativos
          </h3>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Agregar responsable..."
              value={newRespName}
              onChange={(e) => { setNewRespName(e.target.value); setFeedback(null); }}
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

          <div className="flex flex-wrap gap-2">
            {settings.responsiblesList.map(resp => (
              <span key={resp} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold flex items-center gap-2">
                {resp}
                <button
                  type="button"
                  onClick={() => handleRemoveResponsible(resp)}
                  className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                  aria-label={`Eliminar ${resp}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Simulación de rol
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ['ADMINISTRADOR', 'Acceso total del prototipo.'],
              ['ADMINISTRACION', 'Gestión administrativa y liquidación.'],
              ['OPERACIONES', 'Gestión de preparación y reparaciones de salida.']
            ] as const).map(([role, description]) => (
              <button
                key={role}
                type="button"
                onClick={() => setUserRole(role)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  userRole === role
                    ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <strong className="font-bold text-slate-900 block text-xs">{role}</strong>
                <span className="text-[11px] text-slate-600 mt-1 block">{description}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="text-right">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar configuración
          </button>
        </div>
      </form>
    </div>
  );
};
