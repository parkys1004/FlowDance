import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { Play, Pause, Copy, Plus, Trash2, Upload, Music } from 'lucide-react';
import { cn } from '../lib/utils';

export function Timeline() {
  const {
    project,
    currentFrameIndex,
    setCurrentFrame,
    addFrame,
    duplicateFrame,
    removeFrame,
    isPlaying,
    togglePlay,
    setAudio,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    setPlay,
    setFrameTransition
  } = useStore();

  // 퇴장 마커 중 최대 seconds → 음악 후 추가 재생 시간
  const exitOffset = Math.max(
    0,
    ...((project?.stageMarkers || [])
      .filter(m => m.type === 'exit')
      .map(m => m.seconds ?? 10))
  );
  const effectiveDuration = (duration || 30) + exitOffset;

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [peaks, setPeaks] = useState<number[]>([]);
  const [trackWidth, setTrackWidth] = useState(800);
  const [editingFrameIndex, setEditingFrameIndex] = useState<number | null>(null);

  // Resize observer for track width
  useEffect(() => {
    if (!trackRef.current) return;
    const obs = new ResizeObserver((entries) => {
      if (entries[0]) setTrackWidth(entries[0].contentRect.width);
    });
    obs.observe(trackRef.current);
    return () => obs.disconnect();
  }, []);

  // Audio Peak Decode
  useEffect(() => {
    if (!project?.audioUrl) {
      setPeaks([]);
      return;
    }
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    fetch(project.audioUrl)
      .then(res => res.arrayBuffer())
      .then(buf => audioCtx.decodeAudioData(buf))
      .then(audioBuf => {
        const raw = audioBuf.getChannelData(0);
        const bins = 150;
        const blockSize = Math.floor(raw.length / bins);
        const p = [];
        for (let i = 0; i < bins; i++) {
          let max = 0;
          let start = i * blockSize;
          for (let j = 0; j < Math.min(blockSize, raw.length - start); j++) {
            const v = Math.abs(raw[start + j]);
            if (v > max) max = v;
          }
          p.push(max);
        }
        const m = Math.max(...p);
        setPeaks(p.map(x => (m === 0 ? 0 : x / m)));
      })
      .catch(err => console.error("Audio decoding error:", err))
      .finally(() => {
         if (audioCtx.state !== 'closed') audioCtx.close();
      });
  }, [project?.audioUrl]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trackWidth === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const height = 48; // match h-12 (48px)
    
    canvas.width = trackWidth * dpr;
    canvas.height = height * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, trackWidth, height);

    const audioDur = duration || 30;
    const exitOff = Math.max(
      0,
      ...((project?.stageMarkers || [])
        .filter(m => m.type === 'exit')
        .map(m => m.seconds ?? 10))
    );
    const totalDur = audioDur + exitOff;
    const audioPortion = audioDur / totalDur; // 웨이브폼이 차지하는 비율
    const progress = Math.min(currentTime / totalDur, 1);

    // Draw Waveform or empty dashed line (audio portion only)
    if (peaks.length === 0) {
      ctx.strokeStyle = '#333';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(trackWidth * audioPortion, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const waveWidth = trackWidth * audioPortion;
      const barWidth = waveWidth / peaks.length;
      const gap = barWidth * 0.2;
      const drawWidth = Math.max(1, barWidth - gap);

      peaks.forEach((peak, i) => {
        const barHeight = Math.max(2, peak * height);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillStyle = (x / trackWidth) <= progress ? '#3B82F6' : '#3F3F46';
        ctx.beginPath();
        ctx.roundRect(x + gap / 2, y, drawWidth, barHeight, 2);
        ctx.fill();
      });
    }

    // Draw exit zone (orange) after audio
    if (exitOff > 0) {
      const exitStart = trackWidth * audioPortion;
      ctx.fillStyle = 'rgba(249,115,22,0.12)';
      ctx.fillRect(exitStart, 0, trackWidth - exitStart, height);
      // Divider line
      ctx.strokeStyle = 'rgba(249,115,22,0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(exitStart, 0);
      ctx.lineTo(exitStart, height);
      ctx.stroke();
      ctx.setLineDash([]);
      // "퇴장" label
      ctx.fillStyle = 'rgba(249,115,22,0.7)';
      ctx.font = `bold 9px sans-serif`;
      ctx.fillText(`+${exitOff}s`, exitStart + 4, height / 2 + 3);
    }

    // Draw entry zones (green) for each entry marker
    const entryMarkers = (project?.stageMarkers || []).filter(
      m => m.type === 'entry' && m.timestamp !== undefined
    );
    entryMarkers.forEach(marker => {
      const ts = marker.timestamp!;
      const sec = marker.seconds ?? 10;
      const zoneStart = Math.max(0, (ts - sec) / totalDur) * trackWidth;
      const zoneEnd = (ts / totalDur) * trackWidth;
      ctx.fillStyle = 'rgba(16,185,129,0.15)';
      ctx.fillRect(zoneStart, 0, zoneEnd - zoneStart, height);
      ctx.strokeStyle = 'rgba(16,185,129,0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(zoneStart, 0);
      ctx.lineTo(zoneStart, height);
      ctx.stroke();
      ctx.setLineDash([]);
    });

  }, [peaks, currentTime, duration, trackWidth, project?.stageMarkers]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: DOMHighResTimeStamp) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        // 오디오가 끝나지 않았으면 오디오 시간 동기화, 끝났으면 타이머 모드
        if (audioRef.current && !audioRef.current.ended) {
          setCurrentTime(audioRef.current.currentTime);
        } else {
          setCurrentTime((prev) => {
            const next = prev + dt;
            if (next >= effectiveDuration) {
              setPlay(false);
              return effectiveDuration;
            }
            return next;
          });
        }
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);

      if (audioRef.current) {
        audioRef.current.play().catch(e => {
          console.error("Audio playback error:", e);
          setPlay(false);
        });
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, effectiveDuration]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudio(url, file.name);
    setPlay(false);
  };

  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const pointerDownRef = useRef<{ x: number; active: boolean } | null>(null);
  const DRAG_THRESHOLD = 4;

  const updatePlayheadPosition = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clickTime = Math.max(0, Math.min(effectiveDuration, (x / rect.width) * effectiveDuration));

    setCurrentTime(clickTime);
    if (audioRef.current) {
      // 오디오 범위 내에서만 seek
      audioRef.current.currentTime = Math.min(clickTime, duration || 30);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    pointerDownRef.current = { x: e.clientX, active: true };
    if (isPlaying) setPlay(false);
    updatePlayheadPosition(e.clientX); // transition 있는 상태로 클릭 위치로 이동
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current?.active) return;
    const dx = Math.abs(e.clientX - pointerDownRef.current.x);
    if (!isDraggingPlayhead && dx > DRAG_THRESHOLD) {
      setIsDraggingPlayhead(true); // 드래그 감지 시 transition 제거
    }
    if (isDraggingPlayhead || dx > DRAG_THRESHOLD) {
      updatePlayheadPosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = null;
    setIsDraggingPlayhead(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  if (!project) return null;


  return (
    <div className="flex flex-col h-full relative">
      <input 
        type="file" 
        accept="audio/*" 
        ref={fileInputRef} 
        onChange={handleAudioUpload} 
        className="hidden" 
      />
      {project.audioUrl && (
        <audio 
          ref={audioRef}
          src={project.audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => { if (exitOffset <= 0) setPlay(false); }}
        />
      )}

      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-4">
        <div className="flex items-center justify-between sm:justify-start gap-4 text-xs font-mono">
          <div>
            <span className="text-blue-500">{formatTime(currentTime)}</span>
            <span className="text-neutral-600 ml-2">/ {formatTime(duration || 0)}</span>
          </div>
          {/* Audio name on mobile can go here or show/hide */}
          {project.audioName && (
            <div className="md:hidden flex items-center gap-1.5 px-2 py-1 bg-blue-600/10 text-blue-400 rounded text-[10px] border border-blue-500/20 max-w-[100px] truncate shrink-0">
              <Music className="w-3 h-3 shrink-0" />
              <span className="truncate">{project.audioName}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar scrollbar-hide w-full sm:w-auto">
          {project.audioName && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 mr-2 bg-blue-600/10 text-blue-400 rounded text-[10px] border border-blue-500/20 max-w-[120px] truncate shrink-0">
              <Music className="w-3 h-3 shrink-0" />
              <span className="truncate">{project.audioName}</span>
            </div>
          )}
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] text-neutral-400 border border-white/5 hover:bg-white/10 hover:text-white transition"
            title="Upload Music"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          
          <div className="w-px h-4 bg-white/10 mx-1" />

          <button
            onClick={togglePlay}
            className={cn(
              "p-1.5 rounded-full flex items-center justify-center transition-colors border",
              isPlaying 
                ? "bg-blue-600/20 text-blue-400 border-blue-600/30" 
                : "bg-white/5 text-neutral-400 border-white/5 hover:text-white"
            )}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
          
          <button
            onClick={addFrame}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded text-[10px] text-neutral-400 border border-white/5 hover:bg-white/10 transition ml-2"
            title="Add Empty Frame"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            onClick={duplicateFrame}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-[10px] font-bold border border-blue-600/30 hover:bg-blue-600/30 transition"
            title="Duplicate Current Frame"
          >
            <Copy className="w-3 h-3" />
            <span className="hidden sm:inline">Dup</span>
          </button>
        </div>
      </div>

      {/* Frame Track (Waveform & Overlay) */}
      <div 
        className="flex-1 relative mt-2 px-2 h-12 flex items-center cursor-pointer group touch-none" 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        ref={trackRef}
      >
        {/* Waveform Canvas */}
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '48px' }}
          className="absolute inset-x-2 pointer-events-none"
        />

        {/* Frames Overlay */}
        {project.frames.map((frame, index) => {
          const isActive = currentFrameIndex === index;
          const leftPercent = (frame.timestamp / effectiveDuration) * 100;

          return (
            <div 
              key={frame.id}
              className={cn(
                "absolute top-0 bottom-0 flex flex-col justify-start items-center transform -translate-x-1/2 transition-colors cursor-pointer",
                isActive ? "z-30" : "z-10 hover:z-30"
              )}
              style={{ left: `calc(${Math.min(100, Math.max(0, leftPercent))}% + 0.5rem)` }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentFrame(index);
                setCurrentTime(frame.timestamp);
                if (audioRef.current) {
                  audioRef.current.currentTime = frame.timestamp;
                }
                setEditingFrameIndex(index);
              }}
            >
              {/* Marker Dot */}
              <div className={cn(
                "w-2.5 h-2.5 rounded-full mt-1.5 border border-black transition-all relative z-40",
                isActive 
                  ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] scale-125" 
                  : "bg-neutral-300 hover:bg-neutral-100 hover:scale-110"
              )} />
            </div>
          );
        })}

        {/* Playhead Line */}
        <div 
          className="absolute top-0 bottom-0 z-40 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ 
            left: `calc(${Math.min(100, (currentTime / effectiveDuration) * 100)}% + 0.5rem)`,
            transition: isDraggingPlayhead ? 'none' : 'left 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          <div className={cn(
            "w-4 h-4 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] flex items-center justify-center transition-transform",
            isDraggingPlayhead ? "bg-red-400 scale-125" : "bg-red-500 group-hover:scale-110"
          )}>
             <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
          </div>
          <div className={cn(
            "w-[2px] flex-1 shadow-[0_0_5px_rgba(239,68,68,0.3)] transition-colors rounded-full",
            isDraggingPlayhead ? "bg-red-400" : "bg-red-500"
          )} />
        </div>
      </div>
      
      <div className="flex justify-between text-[8px] text-neutral-600 font-mono mt-1 uppercase tracking-widest px-2">
        <span>Start</span>
        <div className="flex items-center gap-1">
          {exitOffset > 0 && (
            <span className="text-orange-500/60">+{exitOffset}s</span>
          )}
          <span>{duration ? formatTime(effectiveDuration) : '30:00.00'.substring(0, 5)}</span>
        </div>
      </div>

      {/* Frame Edit Modal */}
      {editingFrameIndex !== null && project.frames[editingFrameIndex] && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          <motion.div 
            drag
            dragMomentum={false}
            className="pointer-events-auto bg-[#1A1A1A]/90 border border-white/10 rounded-xl p-5 shadow-2xl w-72 flex flex-col gap-4 backdrop-blur-md" 
            onPointerDown={e => e.stopPropagation()}
            onPointerMove={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 cursor-move">
              <h3 className="text-neutral-200 font-medium text-sm">Frame {editingFrameIndex + 1} Settings</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">
                  {formatTime(project.frames[editingFrameIndex].timestamp).substring(0, 5)}
                </span>
                <button 
                  onClick={() => setEditingFrameIndex(null)}
                  className="text-neutral-500 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10"
                  onPointerDown={e => e.stopPropagation()}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-neutral-400">Transition Method</label>
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
                <button 
                  onClick={() => setFrameTransition(editingFrameIndex, 'linear')}
                  onPointerDown={e => e.stopPropagation()}
                  className={cn("py-2 rounded border transition-colors", (!project.frames[editingFrameIndex].transitionType || project.frames[editingFrameIndex].transitionType === 'linear') ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-white/5 border-transparent hover:bg-white/10")}
                >Linear (직선)</button>
                <button 
                  onClick={() => setFrameTransition(editingFrameIndex, 'curve')}
                  onPointerDown={e => e.stopPropagation()}
                  className={cn("py-2 rounded border transition-colors", project.frames[editingFrameIndex].transitionType === 'curve' ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-white/5 border-transparent hover:bg-white/10")}
                >Curve (곡선)</button>
                <button 
                  onClick={() => setFrameTransition(editingFrameIndex, 'jump')}
                  onPointerDown={e => e.stopPropagation()}
                  className={cn("py-2 rounded border transition-colors", project.frames[editingFrameIndex].transitionType === 'jump' ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-white/5 border-transparent hover:bg-white/10")}
                >Jump (점프)</button>
                <button 
                  onClick={() => setFrameTransition(editingFrameIndex, 'rotate')}
                  onPointerDown={e => e.stopPropagation()}
                  className={cn("py-2 rounded border transition-colors", project.frames[editingFrameIndex].transitionType === 'rotate' ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-white/5 border-transparent hover:bg-white/10")}
                >Rotate (회전)</button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between mt-2">
              <button 
                onClick={() => {
                  removeFrame(editingFrameIndex);
                  setEditingFrameIndex(null);
                }}
                onPointerDown={e => e.stopPropagation()}
                disabled={project.frames.length <= 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              
              <button 
                onClick={() => setEditingFrameIndex(null)}
                onPointerDown={e => e.stopPropagation()}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
