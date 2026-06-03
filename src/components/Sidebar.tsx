import { useState, FormEvent } from 'react';
import { useStore } from '../store';
import { UserPlus, Trash2, LogIn, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
  '#d946ef', '#f43f5e'
];

export function Sidebar() {
  const { project, addMember, removeMember, addStageMarker, removeStageMarker, updateStageMarkerSeconds } = useStore();
  const [newMemberName, setNewMemberName] = useState('');

  if (!project) return null;

  const handleAddMember = (e: FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    
    // Pick a random color
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    addMember(newMemberName.trim(), color);
    setNewMemberName('');
  };

  return (
    <div className="glass-card rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
      <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">
        Team Members ({project.members.length})
      </h3>

      <div className="space-y-2 overflow-y-auto pr-2 flex-1">
        {project.members.map((member) => (
          <div 
            key={member.id} 
            className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition group"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm"
                style={{ backgroundColor: member.color }}
              >
                {member.name.substring(0, 2)}
              </div>
              <span className="font-medium text-sm text-neutral-200">{member.name}</span>
            </div>
            <button 
              onClick={() => removeMember(member.id)}
              className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {project.members.length === 0 && (
          <div className="text-center p-6 text-neutral-500 text-xs">
            No dancers yet.
          </div>
        )}
      </div>

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

      {/* Stage Markers */}
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
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-4 h-4 rounded flex items-center justify-center",
                        isEntry ? "text-emerald-400" : "text-orange-400"
                      )}>
                        {isEntry ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                      </div>
                      <span className={cn("text-[11px] font-medium", isEntry ? "text-emerald-400" : "text-orange-400")}>
                        {marker.label || (isEntry ? '입장' : '퇴장')}{typeIndex > 1 ? ` ${typeIndex}` : ''}
                      </span>
                      <span className="text-[10px] text-neutral-600">
                        {isEntry ? `(${seconds}초 전)` : `(${seconds}초 후)`}
                      </span>
                    </div>
                    <button
                      onClick={() => removeStageMarker(marker.id)}
                      className="text-neutral-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Seconds selector */}
                  <div className="flex gap-1">
                    {[5, 10, 15, 20].map(s => (
                      <button
                        key={s}
                        onClick={() => updateStageMarkerSeconds(marker.id, s)}
                        className={cn(
                          "flex-1 py-0.5 rounded text-[10px] font-bold transition-colors",
                          seconds === s
                            ? isEntry
                              ? "bg-emerald-500 text-white"
                              : "bg-orange-500 text-white"
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
