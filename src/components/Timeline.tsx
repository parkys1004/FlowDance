import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { Play, Pause, Copy, Plus, Trash2, Upload, Music, LogIn, LogOut, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
    setFrameTransition,
    updateMemberPosition,
  } = useStore();

  const markers = project?.stageMarkers || [];
  const entryOffset = Math.max(0, ...markers.filter(m => m.type === 'entry').map(m => m.seconds ?? 10).concat([0]));
  const exitOffset  = Math.max(0, ...markers.filter(m => m.type === 'exit' ).map(m => m.seconds ?? 10).concat([0]));
  const audioDuration = duration || 30;
  // 전체 타임라인: [입장 준비] + [오디오] + [퇴장]
  const effectiveDuration = entryOffset + audioDuration + exitOffset;

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 루프 내 stale 클로저 방지용 refs
  const entryOffsetRef = useRef(entryOffset);
  const effectiveDurationRef = useRef(effectiveDuration);
  useEffect(() => { entryOffsetRef.current = entryOffset; }, [entryOffset]);
  useEffect(() => { effectiveDurationRef.current = effectiveDuration; }, [effectiveDuration]);

  const [peaks, setPeaks] = useState<number[]>([]);

  // 키보드 단축키: 스페이스(재생/정지), ←→(인디케이터 이동)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1; // Shift+방향키: 5초, 일반: 1초
        const dir  = e.code === 'ArrowLeft' ? -1 : 1;
        const { currentTime: ct, setCurrentTime: setCT } = useStore.getState();
        const ed   = effectiveDurationRef.current;
        const eo   = entryOffsetRef.current;
        const next = Math.max(0, Math.min(ed, ct + dir * step));
        setCT(next);
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, Math.min(next - eo, audioDuration));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, audioDuration]);
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

    const aDur = duration || 30;
    const mks  = project?.stageMarkers || [];
    const entOff = Math.max(0, ...mks.filter(m => m.type === 'entry').map(m => m.seconds ?? 10).concat([0]));
    const extOff = Math.max(0, ...mks.filter(m => m.type === 'exit' ).map(m => m.seconds ?? 10).concat([0]));
    const total  = entOff + aDur + extOff;

    // 픽셀 경계
    const entryEndX  = (entOff / total) * trackWidth;
    const exitStartX = ((entOff + aDur) / total) * trackWidth;
    const progressX  = (currentTime / total) * trackWidth;

    // ── 입장 존 (초록) ──────────────────────────────────
    if (entOff > 0) {
      ctx.fillStyle = 'rgba(16,185,129,0.12)';
      ctx.fillRect(0, 0, entryEndX, height);
      ctx.strokeStyle = 'rgba(16,185,129,0.55)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(entryEndX, 0); ctx.lineTo(entryEndX, height); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(16,185,129,0.75)';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${entOff}s`, 4, height / 2 + 3);
    }

    // ── 파형 (오디오 구간) ─────────────────────────────
    if (peaks.length === 0) {
      ctx.strokeStyle = '#333';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(entryEndX, height / 2);
      ctx.lineTo(exitStartX, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const waveWidth = exitStartX - entryEndX;
      const barWidth  = waveWidth / peaks.length;
      const gap       = barWidth * 0.2;
      const drawWidth = Math.max(1, barWidth - gap);
      peaks.forEach((peak, i) => {
        const barHeight = Math.max(2, peak * height);
        const x = entryEndX + i * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillStyle = x <= progressX ? '#3B82F6' : '#3F3F46';
        ctx.beginPath();
        ctx.roundRect(x + gap / 2, y, drawWidth, barHeight, 2);
        ctx.fill();
      });
    }

    // ── 퇴장 존 (주황) ──────────────────────────────────
    if (extOff > 0) {
      ctx.fillStyle = 'rgba(249,115,22,0.12)';
      ctx.fillRect(exitStartX, 0, trackWidth - exitStartX, height);
      ctx.strokeStyle = 'rgba(249,115,22,0.55)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(exitStartX, 0); ctx.lineTo(exitStartX, height); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(249,115,22,0.75)';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`+${extOff}s`, exitStartX + 4, height / 2 + 3);
    }

  }, [peaks, currentTime, duration, trackWidth, project?.stageMarkers]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: DOMHighResTimeStamp) => {
      if (!useStore.getState().isPlaying) return;

      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const ct = useStore.getState().currentTime;
      const eo = entryOffsetRef.current;
      const ed = effectiveDurationRef.current;

      if (ct < eo) {
        // ① 입장 구간: 타이머만 진행, eo 도달 시 오디오 시작
        const next = ct + dt;
        if (next >= eo && audioRef.current && audioRef.current.paused) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => useStore.getState().setPlay(false));
        }
        useStore.getState().setCurrentTime(Math.min(next, ed));
      } else if (audioRef.current && !audioRef.current.ended) {
        // ② 오디오 구간: 오디오 시간과 동기
        useStore.getState().setCurrentTime(eo + audioRef.current.currentTime);
      } else {
        // ③ 퇴장 구간: 타이머 진행 후 종료
        const next = ct + dt;
        if (next >= ed) {
          useStore.getState().setPlay(false);
          useStore.getState().setCurrentTime(ed);
        } else {
          useStore.getState().setCurrentTime(next);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      lastTime = performance.now();

      const ct = useStore.getState().currentTime;
      const eo = entryOffsetRef.current;

      // 입장 구간이 끝난 상태에서 재개하면 바로 오디오 시작
      if (ct >= eo && audioRef.current) {
        audioRef.current.currentTime = Math.max(0, ct - eo);
        audioRef.current.play().catch(e => {
          console.error("Audio playback error:", e);
          setPlay(false);
        });
      }

      animationFrameId = requestAnimationFrame(loop);
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
      // 입장 구간이면 오디오를 0으로, 오디오 구간이면 해당 위치로 seek
      const audioSeek = Math.max(0, clickTime - entryOffset);
      audioRef.current.currentTime = Math.min(audioSeek, audioDuration);
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

  // ── 인디케이터 이동 헬퍼 ─────────────────────────────
  const seekTo = (absTime: number) => {
    if (isPlaying) setPlay(false);
    const clamped = Math.max(0, Math.min(effectiveDuration, absTime));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(clamped - entryOffset, audioDuration));
    }
  };

  const goToStart = () => seekTo(0);
  const goToEnd   = () => seekTo(effectiveDuration);

  const goToPrevMark = () => {
    if (!project.frames.length) return;
    // 프레임 timestamp → 절대시간 정렬
    const times = project.frames
      .map(f => entryOffset + f.timestamp)
      .sort((a, b) => a - b);
    // 현재 시간보다 충분히 앞에 있는 마지막 마크
    const prev = [...times].reverse().find(t => t < currentTime - 0.05);
    seekTo(prev ?? times[0]);
  };

  const goToNextMark = () => {
    if (!project.frames.length) return;
    const times = project.frames
      .map(f => entryOffset + f.timestamp)
      .sort((a, b) => a - b);
    const next = times.find(t => t > currentTime + 0.05);
    seekTo(next ?? times[times.length - 1]);
  };

  // 모든 멤버를 입장/퇴장 마커 위치로 이동
  const moveAllMembersTo = (type: 'entry' | 'exit') => {
    if (!project || editingFrameIndex === null) return;

    const typeMarkers = (project.stageMarkers || []).filter(m => m.type === type);
    const members = project.members;
    if (members.length === 0) return;

    // currentFrameIndex를 즉시 동기화 (updateMemberPosition이 이를 참조)
    useStore.getState().setCurrentFrame(editingFrameIndex);

    // 각 멤버의 목표 위치 계산
    const targets: Array<{ x: number; y: number }> = [];

    if (typeMarkers.length === 0) {
      // 마커 없음 → 기본 포메이션 (입장=하단, 퇴장=상단)
      const defaultY = type === 'entry' ? 85 : 15;
      members.forEach((_, i) => {
        targets.push({ x: (i + 1) * 100 / (members.length + 1), y: defaultY });
      });
    } else if (typeMarkers.length >= members.length) {
      // 마커 수 ≥ 멤버 수 → 1:1 배정
      members.forEach((_, i) => {
        targets.push({ x: typeMarkers[i].x, y: typeMarkers[i].y });
      });
    } else {
      // 마커 수 < 멤버 수 → 마커 주변에 분산 배치
      const step = 5; // 멤버 간 간격(%)
      members.forEach((_, i) => {
        const mIdx = Math.round(i * (typeMarkers.length - 1) / Math.max(members.length - 1, 1));
        const base = typeMarkers[mIdx];
        const groupSize = Math.ceil(members.length / typeMarkers.length);
        const offset = (i % groupSize - Math.floor(groupSize / 2)) * step;
        targets.push({
          x: Math.max(3, Math.min(97, base.x + offset)),
          y: base.y,
        });
      });
    }

    // Zustand getState()로 최신 state에서 직접 업데이트
    members.forEach((member, i) => {
      const state = useStore.getState();
      const curPos = state.project!.frames[editingFrameIndex]?.positions[member.id]
        || { x: 50, y: 50, rotation: 0 };
      state.updateMemberPosition(member.id, { ...curPos, x: targets[i].x, y: targets[i].y });
    });
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
          onEnded={() => {
            // 퇴장 구간이 없으면 즉시 중지, 있으면 루프가 타이머로 계속 진행
            if (exitOffset <= 0) setPlay(false);
          }}
        />
      )}

      {/* Controls Header — 3열 그리드: 좌(시간/업로드) | 중앙(이동/재생) | 우(추가/복제) */}
      <div className="grid grid-cols-3 items-center gap-2 mb-2 sm:mb-4">

        {/* 좌: 시간 + 오디오명 + 업로드 */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-mono shrink-0">
            <span className="text-blue-500">{formatTime(currentTime)}</span>
            <span className="text-neutral-600 ml-1">/ {formatTime(duration || 0)}</span>
          </div>
          {project.audioName && (
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 bg-blue-600/10 text-blue-400 rounded text-[10px] border border-blue-500/20 max-w-[100px] truncate shrink-0">
              <Music className="w-3 h-3 shrink-0" />
              <span className="truncate">{project.audioName}</span>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] text-neutral-400 border border-white/5 hover:bg-white/10 hover:text-white transition shrink-0"
            title="음악 업로드"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>음악 업로드</span>
          </button>
        </div>

        {/* 중앙: 맨앞 / 이전마크 / 재생 / 다음마크 / 맨뒤 */}
        <div className="flex items-center justify-center gap-0.5">
          <button onClick={goToStart} title="맨 앞으로"
            className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={goToPrevMark} title="이전 마크"
            disabled={!project.frames.length}
            className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            className={cn(
              "p-1.5 rounded-full flex items-center justify-center transition-colors border mx-1",
              isPlaying
                ? "bg-blue-600/20 text-blue-400 border-blue-600/30"
                : "bg-white/5 text-neutral-400 border-white/5 hover:text-white"
            )}
          >
            {isPlaying
              ? <Pause className="w-3.5 h-3.5 fill-current" />
              : <Play  className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
          <button onClick={goToNextMark} title="다음 마크"
            disabled={!project.frames.length}
            className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={goToEnd} title="맨 뒤로"
            className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 우: 추가 / 복제 */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={addFrame}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded text-[10px] text-neutral-400 border border-white/5 hover:bg-white/10 transition"
            title="마크 추가"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">추가</span>
          </button>
          <button
            onClick={duplicateFrame}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-[10px] font-bold border border-blue-600/30 hover:bg-blue-600/30 transition"
            title="마크 복제"
          >
            <Copy className="w-3 h-3" />
            <span className="hidden sm:inline">복제</span>
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
          const isActive  = currentFrameIndex === index;
          const leftPct   = ((entryOffset + frame.timestamp) / effectiveDuration) * 100;

          return (
            <div
              key={frame.id}
              className={cn(
                "absolute top-0 bottom-0 w-5 -translate-x-1/2 cursor-pointer",
                isActive ? "z-30" : "z-10 hover:z-30"
              )}
              style={{ left: `calc(${Math.min(100, Math.max(0, leftPct))}% + 0.5rem)` }}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentFrame(index);
                const absTime = entryOffset + frame.timestamp;
                setCurrentTime(absTime);
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, frame.timestamp);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingFrameIndex(index);
              }}
            >
              {/* 가이드 라인 */}
              <div className={cn(
                "absolute left-1/2 -translate-x-1/2 w-px top-0 bottom-0",
                isActive ? "bg-blue-400/50" : "bg-neutral-500/25"
              )} />

              {/* 마커 점 — 항상 상단 +4px */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-black/60 transition-transform z-40",
                  isActive
                    ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] scale-125"
                    : "bg-neutral-300 hover:bg-neutral-100 hover:scale-110"
                )}
                style={{ top: '-20px' }}
              />
            </div>
          );
        })}

        {/* Playhead Line */}
        <div 
          className="absolute top-0 bottom-0 z-40 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ 
            left: `calc(${Math.min(100, (currentTime / effectiveDuration) * 100)}% + 0.5rem)`,
            transition: 'none'
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
          {exitOffset > 0 && <span className="text-orange-500/60">+{exitOffset}s</span>}
          {entryOffset > 0 && <span className="text-emerald-500/60">{entryOffset}s↑</span>}
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

            {/* 무대 이동 버튼 */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs text-neutral-400">무대 이동</label>
              <button
                onClick={() => moveAllMembersTo('entry')}
                onPointerDown={e => e.stopPropagation()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                모든 멤버 입장위치로 이동
              </button>
              <button
                onClick={() => moveAllMembersTo('exit')}
                onPointerDown={e => e.stopPropagation()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-xs font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                모든 멤버 퇴장위치로 이동
              </button>
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
