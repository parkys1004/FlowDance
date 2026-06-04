import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { FORMATIONS } from '../lib/formations';
import { useStore } from '../store';
import { CustomFormation, Point } from '../types';
import { cn } from '../lib/utils';

type Tab = 'default' | 'custom';

function Dots({ positions, color }: { positions: Array<{ x: number; y: number }>; color: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {positions.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={6.5} fill={color} opacity={0.9} />
      ))}
    </svg>
  );
}

interface Props { onClose: () => void }

export function FormationModal({ onClose }: Props) {
  const {
    project, applyFormation,
    customFormations, saveCustomFormation, deleteCustomFormation,
  } = useStore();

  const [tab,        setTab]        = useState<Tab>('default');
  const [naming,     setNaming]     = useState(false);
  const [nameVal,    setNameVal]    = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (naming) nameRef.current?.focus(); }, [naming]);

  if (!project) return null;
  const memberCount = project.members.length;

  const applyDefault = (formation: typeof FORMATIONS[0]) => {
    if (!memberCount) return;
    const pts = formation.getPositions(memberCount);
    const pos: Record<string, Point> = {};
    project.members.forEach((m, i) => {
      pos[m.id] = { x: Math.max(2, Math.min(98, pts[i]?.x ?? 50)), y: Math.max(2, Math.min(98, pts[i]?.y ?? 50)), rotation: 0 };
    });
    applyFormation(pos);
    onClose();
  };

  const applyCustom = (cf: CustomFormation) => {
    if (!memberCount) return;
    const pos: Record<string, Point> = {};
    project.members.forEach((m, i) => {
      const pt = cf.positions[i] || { x: 50, y: 50 };
      pos[m.id] = { x: Math.max(2, Math.min(98, pt.x)), y: Math.max(2, Math.min(98, pt.y)), rotation: 0 };
    });
    applyFormation(pos);
    onClose();
  };

  const commitSave = () => {
    if (!nameVal.trim()) return;
    saveCustomFormation(nameVal.trim());
    setNameVal('');
    setNaming(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-bold text-neutral-100 tracking-tight">대형 선택</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1.5 px-5 pt-4 shrink-0">
          {(['default', 'custom'] as Tab[]).map((t) => {
            const label = t === 'default' ? '기본 대형' : '커스텀 대형';
            const badge = t === 'custom' && customFormations.length > 0 ? customFormations.length : null;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  tab === t
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
                )}
              >
                {label}
                {badge !== null && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                    tab === t ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-neutral-500'
                  )}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto flex-1 px-5 py-4 scrollbar-hide">

          {/* ── 기본 대형 ── */}
          {tab === 'default' && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {FORMATIONS.map((f) => {
                const preview = f.getPositions(Math.max(memberCount, 5));
                return (
                  <button
                    key={f.id}
                    onClick={() => applyDefault(f)}
                    disabled={!memberCount}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.04] hover:bg-blue-500/15 border border-white/[0.06] hover:border-blue-500/40 transition-all disabled:opacity-30"
                  >
                    <div className="w-10 h-10">
                      <Dots
                        positions={preview}
                        color="currentColor"
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 group-hover:text-neutral-200 font-semibold transition-colors leading-tight text-center">
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── 커스텀 대형 ── */}
          {tab === 'custom' && (
            <div className="flex flex-col gap-4">

              {/* 저장 입력창 / 버튼 */}
              {naming ? (
                <div className="flex gap-2">
                  <input
                    ref={nameRef}
                    type="text"
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitSave();
                      if (e.key === 'Escape') { setNaming(false); setNameVal(''); }
                    }}
                    placeholder="대형 이름 입력..."
                    maxLength={20}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-500/50 placeholder:text-neutral-600"
                  />
                  <button
                    onClick={commitSave}
                    disabled={!nameVal.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setNaming(false); setNameVal(''); }}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-neutral-400 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setNaming(true)}
                  disabled={!memberCount}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-white/15 hover:border-blue-500/40 text-neutral-500 hover:text-blue-400 hover:bg-blue-500/5 transition-all text-sm font-medium disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                  현재 포지션을 커스텀 대형으로 저장
                </button>
              )}

              {/* 목록 */}
              {customFormations.length === 0 ? (
                <div className="text-center py-14 flex flex-col items-center gap-2 text-neutral-600">
                  <span className="text-3xl">🗂️</span>
                  <p className="text-sm">저장된 커스텀 대형이 없습니다</p>
                  <p className="text-xs">스테이지에서 포지션을 잡은 뒤 위 버튼으로 저장해보세요</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {customFormations.map((cf) => (
                    <div
                      key={cf.id}
                      className="group relative flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/10 transition-all cursor-pointer"
                      onClick={() => applyCustom(cf)}
                    >
                      <div className="w-12 h-12">
                        <Dots positions={cf.positions} color="#3b82f6" />
                      </div>
                      <span className="text-xs text-neutral-300 font-semibold text-center leading-tight break-all line-clamp-2">
                        {cf.name}
                      </span>
                      <span className="text-[9px] text-neutral-600">{cf.memberCount}명 기준</span>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={e => { e.stopPropagation(); deleteCustomFormation(cf.id); }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md text-neutral-600 hover:text-red-400 hover:bg-red-500/15 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-white/10 shrink-0">
          <p className="text-xs text-neutral-600 text-center">
            {!memberCount ? '멤버를 먼저 추가해주세요' : '대형 카드를 클릭하면 현재 프레임에 즉시 적용됩니다'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
