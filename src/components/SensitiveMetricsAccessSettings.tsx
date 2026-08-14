import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldCheck, LockKeyhole } from 'lucide-react';

const roleOptions: Array<{ role: UserRole; label: string; description: string }> = [
  { role: 'ADMINISTRADOR', label: 'Administrador', description: 'Siempre tiene acceso a métricas sensibles.' },
  { role: 'ADMINISTRACION', label: 'Administración', description: 'Puede habilitarse si necesita revisar riesgo y recuperación.' },
  { role: 'OPERACIONES', label: 'Operaciones', description: 'Por defecto no necesita información del core financiero.' }
];

export const SensitiveMetricsAccessSettings: React.FC = () => {
  const { settings, updateSettings, userRole } = useApp();

  if (userRole !== 'ADMINISTRADOR') return null;

  const allowedRoles = settings.sensitiveMetricsRoles?.length
    ? settings.sensitiveMetricsRoles
    : ['ADMINISTRADOR'];

  const toggleRole = (role: UserRole) => {
    if (role === 'ADMINISTRADOR') return;

    const next = allowedRoles.includes(role)
      ? allowedRoles.filter(item => item !== role)
      : [...allowedRoles, role];

    updateSettings({
      ...settings,
      sensitiveMetricsRoles: Array.from(new Set<UserRole>(['ADMINISTRADOR', ...next]))
    });
  };

  return (
    <div className="px-6 pb-8 max-w-5xl mx-auto text-xs">
      <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
          <div className="p-2 bg-slate-900 rounded-xl text-white"><LockKeyhole className="w-4 h-4" /></div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Acceso a métricas sensibles</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Define qué roles pueden ver el bloque “Riesgo Plan Full” del Dashboard.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {roleOptions.map(({ role, label, description }) => {
            const checked = allowedRoles.includes(role) || role === 'ADMINISTRADOR';
            const locked = role === 'ADMINISTRADOR';
            return (
              <label key={role} className={`p-4 rounded-xl border flex items-start gap-3 ${checked ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'} ${locked ? 'cursor-default' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggleRole(role)}
                  className="mt-0.5"
                />
                <div>
                  <strong className="text-slate-900 block">{label}</strong>
                  <span className="text-[10px] text-slate-600 block mt-1 leading-relaxed">{description}</span>
                  {locked && <span className="text-[9px] text-emerald-700 font-bold inline-flex items-center gap-1 mt-2"><ShieldCheck className="w-3 h-3" /> Acceso permanente</span>}
                </div>
              </label>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
          Este prototipo controla acceso por rol. Cuando la aplicación use usuarios autenticados, este mismo permiso podrá asignarse por persona y deberá validarse también en backend.
        </p>
      </section>
    </div>
  );
};
