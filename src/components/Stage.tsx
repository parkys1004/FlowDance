import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, PanInfo } from 'motion/react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { Point } from '../types';
import { LogIn, LogOut, RotateCcw, RotateCw } from 'lucide-react';

export function Stage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { project, currentFrameIndex, stageConfig, currentTime, isPlaying, removeStageMarker, updateStageMarkerPosition, updateStageMarkerLabel } = useStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  // 드래그 시작 시 커서↔멤버 중심 오프셋 (px)
  const grabOffsetRef = useRef<Record<string, { x: number; y: number }>>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [turnDeg, setTurnDeg] = useState(90); // 선택된 턴 각도

  // Handle stage resizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!project) return null;

  const currentFrame = project.frames[currentFrameIndex];
  if (!currentFrame) return null;

  const handleMarkerPan = (markerId: string, info: PanInfo) => {
    if (!containerRef.current || dimensions.width === 0) return;
    const state = useStore.getState();
    if (!state.project) return;

    const marker = state.project.stageMarkers?.find(m => m.id === markerId);
    if (!marker) return;

    const percentDx = (info.delta.x / dimensions.width) * 100;
    const percentDy = (info.delta.y / dimensions.height) * 100;

    let newX = marker.x + (state.stageConfig.mirrorMode ? -percentDx : percentDx);
    let newY = marker.y + percentDy;

    state.updateStageMarkerPosition(markerId, newX, newY);
  };

  const handlePanStart = (memberId: string, event: React.PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    setDraggingId(memberId);

    // 멤버 DOM 요소의 실제 렌더링 중심 위치를 직접 읽음 (논리 좌표 역산 오차 없음)
    const el = (event.currentTarget ?? event.target) as HTMLElement;
    const r = el.getBoundingClientRect();
    grabOffsetRef.current[memberId] = {
      x: info.point.x - (r.left + r.width  / 2),
      y: info.point.y - (r.top  + r.height / 2),
    };
  };

  const handlePan = (memberId: string, info: PanInfo) => {
    if (!containerRef.current) return;

    const state = useStore.getState();
    if (!state.project) return;

    const frame = state.project.frames[state.currentFrameIndex];
    if (!frame) return;

    const pos   = frame.positions[memberId] || { x: 50, y: 50, rotation: 0 };
    const rect  = containerRef.current.getBoundingClientRect();
    const grab  = grabOffsetRef.current[memberId] ?? { x: 0, y: 0 };

    // 목표 중심 = 커서 - grab offset
    const targetX = info.point.x - grab.x;
    const targetY = info.point.y - grab.y;

    // 스테이지 퍼센트로 변환
    let newXPct = ((targetX - rect.left) / rect.width)  * 100;
    const newYPct = ((targetY - rect.top)  / rect.height) * 100;

    if (state.stageConfig.mirrorMode) newXPct = 100 - newXPct;

    const newX = Math.max(0, Math.min(100, newXPct));
    const newY = Math.max(0, Math.min(100, newYPct));

    state.updateMemberPosition(memberId, { ...pos, x: newX, y: newY });
  };

  // 입장 오프셋 계산 (currentTime은 입장 구간 포함 전체 시간)
  const stageEntryOffset = Math.max(
    0,
    ...((project?.stageMarkers || [])
      .filter(m => m.type === 'entry')
      .map(m => m.seconds ?? 10)
      .concat([0]))
  );

  const getRenderPosition = (memberId: string): { x: number, y: number, rotation: number } => {
    if (!project || project.frames.length === 0) return { x: 50, y: 50, rotation: 0 };

    // If dragging, snap to current frame's position and ignore interpolation
    if (draggingId === memberId) {
       const pos = project.frames[currentFrameIndex]?.positions[memberId] || { x: 50, y: 50, rotation: 0 };
       return { ...pos, rotation: pos.rotation || 0 };
    }

    // 오디오 기준 시간 (음수 = 입장 구간 → 마크가 없으면 첫 프레임 유지, 마크가 있으면 보간)
    const time = currentTime - stageEntryOffset;
    const frames = project.frames;
    
    let activeIndex = 0;
    for (let i = frames.length - 1; i >= 0; i--) {
      if (frames[i].timestamp <= time) {
        activeIndex = i;
        break;
      }
    }

    // Past last frame
    if (activeIndex >= frames.length - 1) {
      const pos = frames[frames.length - 1].positions[memberId] || { x: 50, y: 50, rotation: 0 };
      return { ...pos, rotation: pos.rotation || 0 };
    }

    const prevFrame = frames[activeIndex];
    const nextFrame = frames[activeIndex + 1];

    const prevPos = prevFrame.positions[memberId] || { x: 50, y: 50, rotation: 0 };
    const nextPos = nextFrame.positions[memberId] || { x: 50, y: 50, rotation: 0 };

    const duration = nextFrame.timestamp - prevFrame.timestamp;
    if (duration <= 0) return { ...prevPos, rotation: prevPos.rotation || 0 };

    let t = (time - prevFrame.timestamp) / duration;
    
    if (nextFrame.transitionType === 'curve') {
      const easeInOut = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      t = easeInOut(Math.min(1, Math.max(0, t)));
    } else if (nextFrame.transitionType === 'jump') {
      t = t < 0.95 ? 0 : 1;
    }
    
    const x = prevPos.x + (nextPos.x - prevPos.x) * t;
    const y = prevPos.y + (nextPos.y - prevPos.y) * t;
    
    const rotStart = prevPos.rotation || 0;
    let rotEnd = nextPos.rotation || 0;
    
    if (nextFrame.transitionType === 'rotate') {
       rotEnd = rotStart + 360; 
    }
    
    const rotation = rotStart + (rotEnd - rotStart) * t;

    return { x, y, rotation };
  };

  // 16:9 aspect ratio standard for stages
  return (
    <div
      className="absolute inset-0 w-full h-full"
      ref={containerRef}
      onClick={() => setSelectedMemberId(null)}
    >
      {/* Grid Lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[1px] h-full bg-white/5" />
        <div className="w-full h-[1px] bg-white/5" />
      </div>

      <div className="absolute top-4 left-4 flex gap-2">
        <div className="bg-black/50 backdrop-blur px-3 py-1 rounded text-[10px] font-mono text-neutral-400 border border-white/5">
          {dimensions.width} x {dimensions.height}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-neutral-500 font-medium tracking-[0.2em] pointer-events-none z-0">
        FRONT {stageConfig.mirrorMode ? '(MIRROR)' : ''}
      </div>

      {/* Dancers */}
      {project.members.map((member) => {
        const logicalPos = getRenderPosition(member.id);
        
        let renderX = logicalPos.x;
        if (stageConfig.mirrorMode) {
          renderX = 100 - renderX;
        }

        return (
          <motion.div
            key={member.id}
            onPanStart={(e, info) => handlePanStart(member.id, e, info)}
            onPan={(e, info) => handlePan(member.id, info)}
            onPanEnd={() => { setDraggingId(null); delete grabOffsetRef.current[member.id]; }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMemberId(prev => prev === member.id ? null : member.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setEditingMemberId(member.id);
            }}
            initial={false}
            animate={{
              left: `calc(${renderX}% - 1.5rem)`,
              top: `calc(${logicalPos.y}% - 1.5rem)`,
            }}
            transition={{ duration: 0 }}
            style={{ position: 'absolute' }}
            className="touch-none w-12 h-12 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group z-10"
          >
            {/* 선택 링 */}
            {selectedMemberId === member.id && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none z-50"
                style={{
                  boxShadow: `0 0 0 3px white, 0 0 0 5px ${member.color}, 0 0 14px 4px ${member.color}88`,
                }}
              />
            )}

            <motion.div
              className="dancer-dot transition-transform group-hover:scale-110 relative flex items-center justify-center"
              style={{ backgroundColor: member.color }}
              animate={{ rotate: logicalPos.rotation }}
              transition={{ duration: 0 }}
            >
              {/* White outer triangle */}
              <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white z-0" />
              {/* Colored inner triangle */}
              <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent z-20" style={{ borderTopColor: member.color }} />

              <motion.span
                className="relative z-10 leading-none"
                animate={{ rotate: -logicalPos.rotation }}
                transition={{ duration: 0 }}
              >
                {member.name.substring(0, 1).toUpperCase()}
              </motion.span>
            </motion.div>

            {/* 이름 툴팁 — 선택 시 항상 표시, 아니면 호버 시 표시 */}
            <div className={cn(
              "absolute -top-6 whitespace-nowrap bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none shadow-xl transition-opacity",
              selectedMemberId === member.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              {member.name}
            </div>
          </motion.div>
        );
      })}

      {/* Stage Markers (Entry / Exit) */}
      {(project.stageMarkers || []).map((marker) => {
        let renderX = marker.x;
        if (stageConfig.mirrorMode) renderX = 100 - renderX;

        const isEntry = marker.type === 'entry';

        return (
          <motion.div
            key={marker.id}
            style={{ position: 'absolute' }}
            animate={{
              left: `calc(${renderX}% - 1.75rem)`,
              top: `calc(${marker.y}% - 1.75rem)`,
            }}
            transition={{ duration: 0 }}
            onPanStart={() => setDraggingMarkerId(marker.id)}
            onPan={(e, info) => handleMarkerPan(marker.id, info)}
            onPanEnd={() => setDraggingMarkerId(null)}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingMarkerId(marker.id); }}
            onContextMenu={(e) => e.preventDefault()}
            className="w-14 h-14 flex items-center justify-center cursor-pointer touch-none group z-20"
          >
            {/* Pulsing ring on hover */}
            <div className={cn(
              "absolute w-12 h-12 rounded-xl scale-0 group-hover:scale-100 transition-transform duration-200",
              isEntry ? "bg-emerald-400/15 border border-emerald-400/30" : "bg-orange-400/15 border border-orange-400/30"
            )} />

            <div className={cn(
              "relative w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white border-2 select-none transition-transform",
              isEntry
                ? "bg-emerald-500/80 border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                : "bg-orange-500/80 border-orange-400/70 shadow-[0_0_12px_rgba(249,115,22,0.4)]",
              draggingMarkerId === marker.id ? "scale-110" : "group-hover:scale-105"
            )}>
              {isEntry
                ? <LogIn className="w-4 h-4 mb-0.5" />
                : <LogOut className="w-4 h-4 mb-0.5" />
              }
              <span className="text-[7px] font-bold leading-none">
                {marker.label || (isEntry ? '입장' : '퇴장')}
              </span>
            </div>

            {/* Tooltip */}
            <div className="absolute -top-7 whitespace-nowrap bg-black/80 backdrop-blur border border-white/10 text-neutral-300 text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              더블클릭 → 편집
            </div>
          </motion.div>
        );
      })}

      {/* Trajectories (Path from prev frame) -> Next MVP feature, simple lines */}
      <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 opacity-30">
        {currentFrameIndex > 0 && project.members.map(member => {
            const prevFrame = project.frames[currentFrameIndex - 1];
            if (!prevFrame) return null;
            
            const prevPos = prevFrame.positions[member.id] || {x:50, y:50};
            const currPos = currentFrame.positions[member.id] || {x:50, y:50};
            
            let pX = prevPos.x;
            let cX = currPos.x;
            if (stageConfig.mirrorMode) {
              pX = 100 - pX;
              cX = 100 - cX;
            }

            // Only draw if moved significantly
            if (Math.abs(pX - cX) < 1 && Math.abs(prevPos.y - currPos.y) < 1) return null;

            return (
              <line 
                key={`line-${member.id}`}
                x1={`${pX}%`} y1={`${prevPos.y}%`}
                x2={`${cX}%`} y2={`${currPos.y}%`}
                stroke={member.color}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )
        })}
      </svg>

      {/* Stage Marker Edit Modal */}
      {editingMarkerId && project.stageMarkers?.find(m => m.id === editingMarkerId) && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          <motion.div
            drag
            dragMomentum={false}
            className="pointer-events-auto bg-[#1A1A1A]/95 border border-white/10 rounded-xl p-5 shadow-2xl w-64 flex flex-col gap-4 backdrop-blur-md"
            onPointerDown={e => e.stopPropagation()}
            onPointerMove={e => e.stopPropagation()}
          >
            {(() => {
              const marker = project.stageMarkers!.find(m => m.id === editingMarkerId)!;
              const isEntry = marker.type === 'entry';
              return (
                <>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 cursor-move">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center",
                        isEntry ? "bg-emerald-500/30 text-emerald-400" : "bg-orange-500/30 text-orange-400"
                      )}>
                        {isEntry ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                      </div>
                      <h3 className="text-neutral-200 font-medium text-sm">
                        {isEntry ? '입장' : '퇴장'} 마커 설정
                      </h3>
                    </div>
                    <button
                      onClick={() => setEditingMarkerId(null)}
                      className="text-neutral-500 hover:text-white w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                      onPointerDown={e => e.stopPropagation()}
                    >✕</button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-neutral-400">레이블 (선택)</label>
                    <input
                      type="text"
                      value={marker.label || ''}
                      onChange={(e) => updateStageMarkerLabel(editingMarkerId, e.target.value)}
                      onPointerDown={e => e.stopPropagation()}
                      placeholder={isEntry ? '입장' : '퇴장'}
                      maxLength={6}
                      className="bg-black/50 border border-white/5 rounded px-2 py-1.5 text-sm text-neutral-200 outline-none focus:border-white/20 transition-colors placeholder:text-neutral-600"
                    />
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => { removeStageMarker(editingMarkerId); setEditingMarkerId(null); }}
                      onPointerDown={e => e.stopPropagation()}
                      className="flex-1 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-xs transition-colors"
                    >삭제</button>
                    <button
                      onClick={() => setEditingMarkerId(null)}
                      onPointerDown={e => e.stopPropagation()}
                      className="flex-1 py-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                    >완료</button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </div>,
        document.body
      )}

      {/* Member Edit Modal */}
      {editingMemberId && project.members.find(m => m.id === editingMemberId) && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          <motion.div 
            drag
            dragMomentum={false}
            className="pointer-events-auto bg-[#1A1A1A]/90 border border-white/10 rounded-xl p-5 shadow-2xl w-72 flex flex-col gap-4 backdrop-blur-md" 
            onPointerDown={e => e.stopPropagation()}
            onPointerMove={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 cursor-move">
              <h3 className="text-neutral-200 font-medium text-sm">Member Properties</h3>
              <button 
                onClick={() => setEditingMemberId(null)}
                className="text-neutral-500 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10"
                onPointerDown={e => e.stopPropagation()}
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs text-neutral-400">Name</label>
                 <input 
                   type="text"
                   value={project.members.find(m => m.id === editingMemberId)?.name || ''}
                   onChange={(e) => useStore.getState().updateMember(editingMemberId, { name: e.target.value })}
                   onPointerDown={(e) => e.stopPropagation()}
                   className="bg-black/50 border border-white/5 rounded px-2 py-1.5 text-sm text-neutral-200 outline-none focus:border-white/20 transition-colors"
                 />
              </div>
              
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs text-neutral-400">Color</label>
                 <input 
                   type="color"
                   value={project.members.find(m => m.id === editingMemberId)?.color || '#ffffff'}
                   onChange={(e) => useStore.getState().updateMember(editingMemberId, { color: e.target.value })}
                   onPointerDown={(e) => e.stopPropagation()}
                   className="w-full h-8 bg-transparent border-0 rounded cursor-pointer"
                 />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-neutral-400">Rotation</label>
                  <span className="text-xs text-neutral-300 font-mono">
                    {(project.frames[currentFrameIndex]?.positions[editingMemberId]?.rotation || 0)}°
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="359" 
                  step="5"
                  value={(project.frames[currentFrameIndex]?.positions[editingMemberId]?.rotation || 0)}
                  onChange={(e) => {
                    const currentPos = project.frames[currentFrameIndex]?.positions[editingMemberId] || { x: 50, y: 50, rotation: 0 };
                    useStore.getState().updateMemberPosition(editingMemberId, { ...currentPos, rotation: parseInt(e.target.value) });
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full accent-neutral-500 cursor-ew-resize" 
                />
                
                {/* Quick angles */}
                <div className="flex justify-between mt-1">
                  {[0, 90, 180, 270].map(angle => (
                    <button
                      key={angle}
                      className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors px-1"
                      onClick={() => {
                        const currentPos = project.frames[currentFrameIndex]?.positions[editingMemberId] || { x: 50, y: 50, rotation: 0 };
                        useStore.getState().updateMemberPosition(editingMemberId, { ...currentPos, rotation: angle });
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>

              {/* 턴 회전 */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400">턴 (회전)</label>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {turnDeg >= 360 ? `${turnDeg / 360}바퀴` : `${turnDeg}°`}
                  </span>
                </div>

                {/* 턴 갯수 선택 */}
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { label: '¼', deg: 90 },
                    { label: '½', deg: 180 },
                    { label: '¾', deg: 270 },
                    { label: '1',  deg: 360 },
                    { label: '2',  deg: 720 },
                    { label: '3',  deg: 1080 },
                  ].map(({ label, deg }) => (
                    <button
                      key={deg}
                      onClick={() => setTurnDeg(deg)}
                      onPointerDown={e => e.stopPropagation()}
                      className={cn(
                        "py-1 rounded text-[10px] font-bold transition-colors",
                        turnDeg === deg
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-neutral-300"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* 좌/우 회전 버튼 */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      const pos = project.frames[currentFrameIndex]?.positions[editingMemberId] || { x: 50, y: 50, rotation: 0 };
                      const newRot = (((pos.rotation || 0) - turnDeg) % 360 + 360) % 360;
                      useStore.getState().updateMemberPosition(editingMemberId, { ...pos, rotation: newRot });
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors border border-white/5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    왼쪽
                  </button>
                  <button
                    onClick={() => {
                      const pos = project.frames[currentFrameIndex]?.positions[editingMemberId] || { x: 50, y: 50, rotation: 0 };
                      const newRot = ((pos.rotation || 0) + turnDeg) % 360;
                      useStore.getState().updateMemberPosition(editingMemberId, { ...pos, rotation: newRot });
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white text-xs font-medium transition-colors border border-white/5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    오른쪽
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 mt-1">
               <button 
                  onClick={() => {
                    useStore.getState().removeMember(editingMemberId);
                    setEditingMemberId(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded text-xs transition-colors"
                >
                  Delete Member
               </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
