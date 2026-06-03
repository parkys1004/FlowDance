import { useRef, useEffect, useState } from 'react';
import { motion, PanInfo } from 'motion/react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { Point } from '../types';

export function Stage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { project, currentFrameIndex, stageConfig } = useStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);

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

  const handlePan = (memberId: string, info: PanInfo) => {
    if (!containerRef.current || dimensions.width === 0) return;
    
    const state = useStore.getState();
    if (!state.project) return;
    
    const frame = state.project.frames[state.currentFrameIndex];
    if (!frame) return;

    const pos = frame.positions[memberId] || { x: 50, y: 50 };
    
    const percentDx = (info.delta.x / dimensions.width) * 100;
    const percentDy = (info.delta.y / dimensions.height) * 100;

    let newX = pos.x + (state.stageConfig.mirrorMode ? -percentDx : percentDx);
    let newY = pos.y + percentDy;

    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    // Call state action via the static getState to prevent stale closures
    state.updateMemberPosition(memberId, { x: newX, y: newY });
  };

  // 16:9 aspect ratio standard for stages
  return (
    <div 
      className="absolute inset-0 w-full h-full"
      ref={containerRef}
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
        let pos = currentFrame.positions[member.id] || { x: 50, y: 50 };
        
        // Render mirror visually
        let renderX = pos.x;
        if (stageConfig.mirrorMode) {
          renderX = 100 - renderX;
        }

        let transitionConfig: any = { type: "spring", stiffness: 300, damping: 30 };
        if (currentFrame.transitionType === 'linear') {
          transitionConfig = { type: 'tween', ease: 'linear', duration: 0.5 };
        } else if (currentFrame.transitionType === 'curve') {
          transitionConfig = { type: 'tween', ease: 'easeInOut', duration: 0.6 };
        } else if (currentFrame.transitionType === 'jump') {
          transitionConfig = { type: 'tween', duration: 0.1 };
        } else if (currentFrame.transitionType === 'rotate') {
          transitionConfig = { type: 'spring', stiffness: 200, damping: 20 };
        }

        return (
          <motion.div
            key={member.id}
            onPanStart={() => setDraggingId(member.id)}
            onPan={(e, info) => handlePan(member.id, info)}
            onPanEnd={() => setDraggingId(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              const state = useStore.getState();
              const currentRot = pos.rotation || 0;
              state.updateMemberPosition(member.id, { ...pos, rotation: (currentRot + 45) % 360 });
            }}
            initial={false}
            animate={{
              left: `calc(${renderX}% - 1.5rem)`,
              top: `calc(${pos.y}% - 1.5rem)`,
            }}
            transition={
              draggingId === member.id
                ? { duration: 0 }
                : transitionConfig
            }
            style={{ position: 'absolute' }}
            className="touch-none w-12 h-12 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group z-10"
          >
            <motion.div 
              className="dancer-dot transition-transform group-hover:scale-110 relative flex items-center justify-center"
              style={{ backgroundColor: member.color }}
              animate={{ rotate: (currentFrame.transitionType === 'rotate' ? currentFrameIndex * 360 : 0) + (pos.rotation || 0) }}
            >
              {/* White outer triangle */}
              <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white z-0" />
              {/* Colored inner triangle */}
              <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent z-20" style={{ borderTopColor: member.color }} />
              
              <span className="relative z-10 leading-none" style={{ rotate: `-${(currentFrame.transitionType === 'rotate' ? currentFrameIndex * 360 : 0) + (pos.rotation || 0)}deg` }}>{member.name.substring(0, 1).toUpperCase()}</span>
            </motion.div>
            {/* Tooltip Name */}
            <div className="absolute -top-6 whitespace-nowrap bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
              {member.name}
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
    </div>
  );
}
