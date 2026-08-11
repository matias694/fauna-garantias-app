import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, FollowUpArea, FollowUpComment } from '../../types';
import { formatDate } from '../../utils/formatters';
import { MessageSquare, Clock, Filter, Calendar, User, Send, Pencil, X, Save } from 'lucide-react';

interface FollowUpTabProps {
  guaranteeCase: GuaranteeCase;
}

const areaLabel = (area: FollowUpArea) => area === 'Garantia'
  ? 'Garantía'
  : area === 'Reparacion'
    ? 'Reparación'
    : 'General';

export const FollowUpTab: React.FC<FollowUpTabProps> = ({ guaranteeCase }) => {
  const { addFollowUpComment, settings, userRole, updateGuaranteeCase, logAudit } = useApp();

  const [commentText, setCommentText] = useState('');
  const [area, setArea] = useState<FollowUpArea>('Garantia');
  const [filterArea, setFilterArea] = useState<'Todos' | FollowUpArea>('Todos');
  const [hasNextManagement, setHasNextManagement] = useState(false);
  const [nextManagement, setNextManagement] = useState('');
  const [nextManagementDate, setNextManagementDate] = useState('');
  const [nextManagementResponsible, setNextManagementResponsible] = useState(
    guaranteeCase.responsible || settings.responsiblesList[0] || ''
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editArea, setEditArea] = useState<FollowUpArea>('Garantia');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (hasNextManagement && (!nextManagement.trim() || !nextManagementDate)) return;

    addFollowUpComment(guaranteeCase.id, {
      comment: commentText.trim(),
      area,
      nextManagement: hasNextManagement ? nextManagement.trim() : undefined,
      nextManagementDate: hasNextManagement ? nextManagementDate : undefined,
      nextManagementResponsible: hasNextManagement ? nextManagementResponsible : undefined
    });

    setCommentText('');
    setHasNextManagement(false);
    setNextManagement('');
    setNextManagementDate('');
  };

  const startEdit = (item: FollowUpComment) => {
    setEditingId(item.id);
    setEditComment(item.comment);
    setEditArea(item.area);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditComment('');
    setEditArea('Garantia');
  };

  const saveEdit = (item: FollowUpComment) => {
    const nextComment = editComment.trim();
    if (!nextComment) return;

    const commentChanged = nextComment !== item.comment;
    const areaChanged = editArea !== item.area;
    if (!commentChanged && !areaChanged) {
      cancelEdit();
      return;
    }

    const editedAt = new Date().toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const updatedFollowUps = (guaranteeCase.followUps || []).map(followUp => {
      if (followUp.id !== item.id) return followUp;
      return {
        ...followUp,
        originalComment: followUp.originalComment || followUp.comment,
        originalArea: followUp.originalArea || followUp.area,
        comment: nextComment,
        area: editArea,
        editedAt,
        editedBy: userRole
      };
    });

    updateGuaranteeCase(guaranteeCase.id, { followUps: updatedFollowUps });

    const changes = [
      areaChanged ? `Área: ${areaLabel(item.area)} → ${areaLabel(editArea)}` : null,
      commentChanged ? `Texto: “${item.comment}” → “${nextComment}”` : null
    ].filter(Boolean).join(' · ');

    logAudit(
      guaranteeCase.id,
      'Comentario editado',
      `${changes}. Comentario original creado el ${item.createdAt}.`
    );
    cancelEdit();
  };

  const filteredComments = (guaranteeCase.followUps || []).filter(c =>
    filterArea === 'Todos' || c.area === filterArea
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" /> Registrar Nuevo Comentario Interno
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
                <select value={area} onChange={(e) => setArea(e.target.value as FollowUpArea)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900">
                  <option value="Garantia">Garantía</option>
                  <option value="Reparacion">Reparación</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={hasNextManagement} onChange={(e) => setHasNextManagement(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                  <span>¿Programar Próxima Gestión?</span>
                </label>
              </div>
            </div>
          </div>

          {hasNextManagement && (
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-3">
                <span className="font-bold text-emerald-950 text-xs block mb-1">Programación de Próxima Gestión</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Próxima gestión</label>
                <input type="text" required placeholder="Ej. Confirmar término de trabajos..." value={nextManagement} onChange={(e) => setNextManagement(e.target.value)} className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fecha límite</label>
                <input type="date" required value={nextManagementDate} onChange={(e) => setNextManagementDate(e.target.value)} className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Responsable</label>
                <select value={nextManagementResponsible} onChange={(e) => setNextManagementResponsible(e.target.value)} className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-medium">
                  {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="text-right">
            <button type="submit" className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all">
              <Send className="w-3.5 h-3.5" /> <span>Publicar Comentario</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h4 className="font-bold text-xs uppercase text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" /> Hilo Cronológico de Seguimiento ({filteredComments.length})
          </h4>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Área:</span>
            {(['Todos', 'Garantia', 'Reparacion', 'General'] as const).map(areaOption => (
              <button key={areaOption} onClick={() => setFilterArea(areaOption)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterArea === areaOption ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {areaOption === 'Todos' ? 'Todos' : areaLabel(areaOption)}
              </button>
            ))}
          </div>
        </div>

        {filteredComments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No hay comentarios registrados para el filtro seleccionado.</div>
        ) : (
          <div className="space-y-3">
            {filteredComments.map(item => {
              const editing = editingId === item.id;
              return (
                <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${item.area === 'Garantia' ? 'bg-purple-100 text-purple-900 border-purple-200' : item.area === 'Reparacion' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-blue-100 text-blue-900 border-blue-200'}`}>[{areaLabel(item.area)}]</span>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" />{item.userName || item.user}</span>
                      {item.editedAt && <span className="text-[10px] text-slate-400 font-medium">Editado</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" />{item.createdAt}</span>
                      {!guaranteeCase.isClosed && !editing && (
                        <button type="button" onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer" title="Editar comentario"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>

                  {editing ? (
                    <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Área</label>
                        <select value={editArea} onChange={(e) => setEditArea(e.target.value as FollowUpArea)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold">
                          <option value="Garantia">Garantía</option><option value="Reparacion">Reparación</option><option value="General">General</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Comentario</label>
                        <textarea rows={3} value={editComment} onChange={(e) => setEditComment(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={cancelEdit} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 inline-flex items-center gap-1 cursor-pointer"><X className="w-3.5 h-3.5" /> Cancelar</button>
                        <button type="button" disabled={!editComment.trim()} onClick={() => saveEdit(item)} className="px-3 py-1.5 bg-slate-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"><Save className="w-3.5 h-3.5" /> Guardar cambios</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">“{item.comment}”</p>
                  )}

                  {item.editedAt && !editing && <span className="text-[10px] text-slate-400 block">Última edición: {item.editedAt} · {item.editedBy || 'Usuario'}</span>}

                  {item.nextManagement && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/60 flex items-center justify-between text-xs text-emerald-950">
                      <div>
                        <span className="font-bold text-[10px] uppercase text-emerald-800 block">Próxima gestión registrada:</span>
                        <strong>{item.nextManagement}</strong>
                      </div>
                      {item.nextManagementDate && (
                        <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-emerald-300 text-emerald-900">{formatDate(item.nextManagementDate)} ({item.nextManagementResponsible || 'Responsable'})</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
