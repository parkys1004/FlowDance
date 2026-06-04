import { useState, FormEvent, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { UserPlus, Trash2, LogIn, LogOut, Pencil, Check, AlertTriangle, LayoutGrid, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { FormationModal } from './FormationModal';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#d946ef', '#f43f5e'
];

// ── 확인 모달 ────────────────────────────────────────────
interface ConfirmState {
  message: string;
  subMessage?: string;
  onConfirm: () => void;
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 shadow-2xl w-72 flex flex-col gap-4 cursor-move select-none"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-200">{state.message}</p>
            {state.subMessage && (
              <p className="text-xs text-neutral-500 mt-1">{state.subMessage}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-1 pointer-events-auto">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            onPointerDown={e => e.stopPropagation()}
          >
            취소
          </button>
          <button
            onClick={() => { state.onConfirm(); onClose(); }}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors cursor-pointer"
            onPointerDown={e => e.stopPropagation()}
          >
            삭제
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ── Sidebar ──────────────────────────────────────────────
export function Sidebar() {
  const {
    project,
    addMember,
    removeMember,
    updateMember,
    clearAllMembers,
    addStageMarker,
    removeStageMarker,
    updateStageMarkerSeconds,
  } = useStore();

  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  if (!project) return null;

  const handleAddMember = (e: FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    addMember(newMemberName.trim(), color);
    setNewMemberName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const commitEdit = () => {
    if (editingId && editingName.trim()) {
      updateMember(editingId, { name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName('');
  };

  const askDeleteMember = (id: string, name: string) => {
    setConfirm({
      message: `'${name}'을(를) 삭제할까요?`,
      subMessage: '모든 프레임에서 해당 멤버가 제거됩니다.',
      onConfirm: () => removeMember(id),
    });
  };

  const askClearAll = () => {
    setConfirm({
      message: '모든 멤버를 삭제할까요?',
      subMessage: `총 ${project.members.length}명이 모든 프레임에서 제거됩니다.`,
      onConfirm: clearAllMembers,
    });
  };

  return (
    <div className="glass-card rounded-xl p-4 flex-1 flex flex-col overflow-hidden">

      {/* 확인 모달 */}
      {confirm && <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />}

      {/* 헤더 + 전체 삭제 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
          Team Members ({project.members.length})
        </h3>
        <button
          onClick={askClearAll}
          disabled={project.members.length === 0}
          title="모든 멤버 삭제"
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-red-500/70 border border-red-500/20 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-3 h-3" />
          전체 삭제
        </button>
      </div>

      {/* 멤버 목록 */}
      <div className="space-y-1 overflow-y-auto pr-1 flex-1">
        {project.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 rounded-lg transition group"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <label
                className="relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white uppercase shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-white/40 hover:ring-offset-1 hover:ring-offset-black transition-all"
                style={{ backgroundColor: member.color }}
                title="클릭하여 색상 변경"
              >
                {member.name.substring(0, 2)}
                <input
                  type="color"
                  value={member.color}
                  onChange={e => updateMember(member.id, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>

              {editingId === member.id ? (
                <input
                  ref={editInputRef}
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 bg-neutral-800 border border-blue-500/50 rounded px-1.5 py-0.5 text-xs text-neutral-200 outline-none min-w-0"
                />
              ) : (
                <span className="text-sm font-medium text-neutral-200 truncate">{member.name}</span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId === member.id ? (
                <button onClick={commitEdit} className="text-blue-400 hover:text-blue-300 p-0.5">
                  <Check className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => startEdit(member.id, member.name)}
                  className="text-neutral-500 hover:text-neutral-300 p-0.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => askDeleteMember(member.id, member.name)}
                className="text-neutral-500 hover:text-red-400 p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {project.members.length === 0 && (
          <div className="text-center p-6 text-neutral-500 text-xs">No dancers yet.</div>
        )}
      </div>

      {/* 멤버 추가 폼 */}
      <div className="pt-4 border-t border-white/5 mt-4">
        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Dancer name..."
            className="flex-1 bg-neutral-800/50 border border-white/5 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 placeholder:text-neutral-600 text-neutral-200"
          />
          <button
            type="submit"
            disabled={!newMemberName.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md px-3 py-2 transition-colors flex items-center justify-center"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 대형 선택 */}
      <div className="pt-4 border-t border-white/5 mt-3">
        <button
          onClick={() => setShowFormationModal(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group"
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-400 transition-colors" />
            <span className="text-xs text-neutral-300 font-semibold group-hover:text-white transition-colors">대형 선택</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
        </button>
      </div>

      {showFormationModal && (
        <FormationModal onClose={() => setShowFormationModal(false)} />
      )}

      {/* 무대 입퇴장 */}
      <div className="pt-4 border-t border-white/5 mt-3">
        <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3">
          무대 입퇴장
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => addStageMarker('entry')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600/15 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-600/30 hover:bg-emerald-600/25 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            입장
          </button>
          <button
            onClick={() => addStageMarker('exit')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-600/15 text-orange-400 rounded-lg text-xs font-bold border border-orange-600/30 hover:bg-orange-600/25 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            퇴장
          </button>
        </div>

        {(project.stageMarkers || []).length > 0 && (
          <div className="mt-2 space-y-2">
            {(project.stageMarkers || []).map((marker) => {
              const isEntry = marker.type === 'entry';
              const sameType = (project.stageMarkers || []).filter(m => m.type === marker.type);
              const typeIndex = sameType.findIndex(m => m.id === marker.id) + 1;
              const seconds = marker.seconds ?? 10;
              return (
                <div key={marker.id} className={cn(
                  "rounded-lg p-2 border",
                  isEntry ? "bg-emerald-500/5 border-emerald-500/20" : "bg-orange-500/5 border-orange-500/20"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-4 h-4 rounded flex items-center justify-center",
                        isEntry ? "text-emerald-400" : "text-orange-400")}>
                        {isEntry ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                      </div>
                      <span className={cn("text-[11px] font-medium",
                        isEntry ? "text-emerald-400" : "text-orange-400")}>
                        {marker.label || (isEntry ? '입장' : '퇴장')}{typeIndex > 1 ? ` ${typeIndex}` : ''}
                      </span>
                      <span className="text-[10px] text-neutral-600">
                        {isEntry ? `(${seconds}초 전)` : `(${seconds}초 후)`}
                      </span>
                    </div>
                    <button onClick={() => removeStageMarker(marker.id)}
                      className="text-neutral-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[0, 5, 10, 15, 20].map(s => (
                      <button
                        key={s}
                        onClick={() => updateStageMarkerSeconds(marker.id, s)}
                        className={cn(
                          "flex-1 py-0.5 rounded text-[10px] font-bold transition-colors",
                          seconds === s
                            ? isEntry ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                            : "bg-white/5 text-neutral-500 hover:text-neutral-300 hover:bg-white/10"
                        )}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
