import { useState, FormEvent } from 'react';
import { useStore } from '../store';
import { UserPlus, Trash2 } from 'lucide-react';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
  '#d946ef', '#f43f5e'
];

export function Sidebar() {
  const { project, addMember, removeMember } = useStore();
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
    </div>
  );
}
