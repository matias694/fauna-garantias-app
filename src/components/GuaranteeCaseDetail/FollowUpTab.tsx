import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, FollowUpArea } from '../../types';
import { MessageSquare, Clock, Filter, Plus, Calendar, User, Send } from 'lucide-react';

interface FollowUpTabProps {
  guaranteeCase: GuaranteeCase;
}

export const FollowUpTab: React.FC<FollowUpTabProps> = ({ guaranteeCase }) => {
  const { addFollowUpComment, settings, userRole } = useApp();

  const [commentText, setCommentText] = useState('');
  const [area, setArea] = useState<FollowUpArea>('Garantia');
  const [filterArea, setFilterArea] = useState<'Todos' | FollowUpArea>('Todos');

  const [hasNextManagement, setHasNextManagement] = useState(false);
  const [nextManagement, setNextManagement] = useState('');
  const [nextManagementDate, setNextManagementDate] = useState('');
  const [nextManagementResponsible, setNextManagementResponsible] = useState(guaranteeCase.responsible || settings.responsiblesList[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addFollowUpComment(guaranteeCase.id, {
      comment: commentText.trim(),
      area,
      nextManagement: hasNextManagement ? nextManagement : undefined,
      nextManagementDate: hasNextManagement ? nextManagementDate : undefined,
      nextManagementResponsible: hasNextManagement ? nextManagementResponsible : undefined
    });

    setCommentText('');
    setHasNextManagement(false);
    setNextManagement('');
    setNextManagementDate('');
  };

  const filteredComments = (guaranteeCase.followUps || []).filter(c => {
    if (filterArea === 'Todos') return true;
    return c.area === filterArea;
  });

  return (
    <div className="space-y-6">
      
      {/* ADD COMMENT FORM */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          Registrar Nuevo Comentario Interno
        </h4>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Comentario / Coordinación *</label>
              <textarea
                required
                rows={3}
                placeholder="Escribe un detalle o actualización del caso..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Área de Gestión *</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as FollowUpArea)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                >
                  <option value="Garantia">Garantía</option>
                  <option value="Reparacion">Reparación</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasNextManagement}
                    onChange={(e) => setHasNextManagement(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>¿Programar Próxima Gestión?</span>
                </label>
              </div>
            </div>
          </div>

          {/* OPTIONAL NEXT MANAGEMENT FIELDS */}
          {hasNextManagement && (
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-3">
                <span className="font-bold text-emerald-950 text-xs block mb-1">Programación de Próxima Gestión</span>
              </div>
              
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Próxima gestión</label>
                <input
                  type="text"
                  required={hasNextManagement}
                  placeholder="Ej. Confirmar término de trabajos..."
                  value={nextManagement}
                  onChange={(e) => setNextManagement(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fecha límite</label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={nextManagementDate}
                  onChange={(e) => setNextManagementDate(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Responsable</label>
                <select
                  value={nextManagementResponsible}
                  onChange={(e) => setNextManagementResponsible(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-medium"
                >
                  {settings.responsiblesList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="text-right">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar Comentario</span>
            </button>
          </div>
        </form>
      </div>

      {/* FILTER & COMMENTS THREAD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h4 className="font-bold text-xs uppercase text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Hilo Cronológico de Seguimiento ({filteredComments.length})
          </h4>

          {/* FILTER BUTTONS */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Área:
            </span>
            {(['Todos', 'Garantia', 'Reparacion', 'General'] as const).map(areaOption => (
              <button
                key={areaOption}
                onClick={() => setFilterArea(areaOption)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterArea === areaOption
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {areaOption === 'Garantia' ? 'Garantía' : areaOption === 'Reparacion' ? 'Reparación' : areaOption}
              </button>
            ))}
          </div>
        </div>

        {/* THREAD LIST */}
        {filteredComments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No hay comentarios registrados para el filtro seleccionado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComments.map(item => (
              <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      item.area === 'Garantia'
                        ? 'bg-purple-100 text-purple-900 border-purple-200'
                        : item.area === 'Reparacion'
                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                        : 'bg-blue-100 text-blue-900 border-blue-200'
                    }`}>
                      [{item.area === 'Garantia' ? 'Garantía' : item.area === 'Reparacion' ? 'Reparación' : 'General'}]
                    </span>

                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {item.user}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {item.createdAt}
                  </span>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                  “{item.comment}”
                </p>

                {item.nextManagement && (
                  <div className="mt-2 pt-2 border-t border-slate-200/80 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/60 flex items-center justify-between text-xs text-emerald-950">
                    <div>
                      <span className="font-bold text-[10px] uppercase text-emerald-800 block">Próxima gestión registrada:</span>
                      <strong>{item.nextManagement}</strong>
                    </div>
                    {item.nextManagementDate && (
                      <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-emerald-300 text-emerald-900">
                        {item.nextManagementDate} ({item.nextManagementResponsible || 'Responsable'})
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
