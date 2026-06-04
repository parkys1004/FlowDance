import { useRef, useState, useCallback } from 'react';
import { useStore } from '../store';
import { Project, Frame, StageMarker } from '../types';

const W = 1280;
const H = 720;

function getOffsets(markers?: StageMarker[]) {
  const entry = markers?.filter(m => m.type === 'entry').reduce((max, m) => Math.max(max, m.seconds ?? 10), 0) ?? 0;
  const exit  = markers?.filter(m => m.type === 'exit' ).reduce((max, m) => Math.max(max, m.seconds ?? 10), 0) ?? 0;
  return { entry, exit };
}

function interpolatePos(memberId: string, time: number, entryOffset: number, frames: Frame[]) {
  if (!frames.length) return { x: 50, y: 50, rotation: 0 };

  const t = time - entryOffset;
  let ai = 0;
  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i].timestamp <= t) { ai = i; break; }
  }

  if (ai >= frames.length - 1) {
    const p = frames[frames.length - 1].positions[memberId] ?? { x: 50, y: 50, rotation: 0 };
    return { x: p.x, y: p.y, rotation: p.rotation ?? 0 };
  }

  const prev = frames[ai], next = frames[ai + 1];
  const pp = prev.positions[memberId] ?? { x: 50, y: 50, rotation: 0 };
  const np = next.positions[memberId] ?? { x: 50, y: 50, rotation: 0 };
  const dur = next.timestamp - prev.timestamp;
  if (dur <= 0) return { x: pp.x, y: pp.y, rotation: pp.rotation ?? 0 };

  let f = (t - prev.timestamp) / dur;
  if (next.transitionType === 'curve') {
    f = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
  } else if (next.transitionType === 'jump') {
    f = f < 0.95 ? 0 : 1;
  }
  f = Math.max(0, Math.min(1, f));

  const rotStart = pp.rotation ?? 0;
  const rotEnd = next.transitionType === 'rotate' ? rotStart + 360 : (np.rotation ?? 0);

  return {
    x: pp.x + (np.x - pp.x) * f,
    y: pp.y + (np.y - pp.y) * f,
    rotation: rotStart + (rotEnd - rotStart) * f,
  };
}

function drawStage(ctx: CanvasRenderingContext2D, time: number, project: Project, mirror: boolean) {
  const { entry } = getOffsets(project.stageMarkers);

  // 배경
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, W, H);

  // 점 격자
  ctx.fillStyle = '#262626';
  for (let x = 40; x < W; x += 40) {
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 중심선
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
  ctx.stroke();

  // FRONT 레이블
  ctx.save();
  ctx.fillStyle = 'rgba(113,113,122,0.5)';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`FRONT${mirror ? ' (MIRROR)' : ''}`, W / 2, H - 10);
  ctx.restore();

  // 멤버 렌더링
  project.members.forEach((member) => {
    const pos = interpolatePos(member.id, time, entry, project.frames);
    let rx = pos.x;
    if (mirror) rx = 100 - rx;

    const cx = (rx / 100) * W;
    const cy = (pos.y / 100) * H;
    const r = 16;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((pos.rotation * Math.PI) / 180);

    // 원
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = member.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 방향 흰 삼각형 (아래)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-6, r + 1);
    ctx.lineTo(6, r + 1);
    ctx.lineTo(0, r + 9);
    ctx.closePath();
    ctx.fill();

    // 방향 색 삼각형 (위에 겹침)
    ctx.fillStyle = member.color;
    ctx.beginPath();
    ctx.moveTo(-4, r + 3);
    ctx.lineTo(4, r + 3);
    ctx.lineTo(0, r + 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 이니셜 (회전 없이 항상 정방향)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(member.name[0].toUpperCase(), cx, cy);
    ctx.restore();

    // 이름 레이블
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lw = ctx.measureText(member.name).width;
    const lx = cx - lw / 2 - 5;
    const ly = cy - r - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(lx, ly, lw + 10, 16, 3);
    } else {
      ctx.rect(lx, ly, lw + 10, 16);
    }
    ctx.fill();
    ctx.fillStyle = '#e4e4e7';
    ctx.fillText(member.name, cx, ly + 8);
    ctx.restore();
  });
}

export function useVideoExport() {
  const { project, stageConfig, duration } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelledRef = useRef(false);

  const startExport = useCallback(async () => {
    if (!project || isRecording) return;

    const { entry, exit } = getOffsets(project.stageMarkers);
    const audioDur = duration || 30;
    const totalDur = entry + audioDur + exit;

    setIsRecording(true);
    setProgress(0);
    cancelledRef.current = false;

    // 캔버스 생성
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 오디오 스트림 설정
    let audioCtx: AudioContext | null = null;
    let audioStreamTracks: MediaStreamTrack[] = [];

    if (project.audioUrl) {
      try {
        audioCtx = new AudioContext();
        const res = await fetch(project.audioUrl);
        const buf = await audioCtx.decodeAudioData(await res.arrayBuffer());
        const dest = audioCtx.createMediaStreamDestination();
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(dest);
        // entry 오프셋 이후 오디오 시작
        src.start(audioCtx.currentTime + entry);
        audioStreamTracks = dest.stream.getAudioTracks();
      } catch (e) {
        console.warn('[VideoExport] 오디오 설정 실패:', e);
      }
    }

    // 비디오+오디오 스트림 합성
    const videoStream = canvas.captureStream(30);
    const combined = new MediaStream([...videoStream.getTracks(), ...audioStreamTracks]);

    const mime =
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' :
      MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' :
      'video/webm';

    const recorder = new MediaRecorder(combined, { mimeType: mime });
    recorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      audioCtx?.close();
      recorderRef.current = null;

      if (cancelledRef.current) {
        setIsRecording(false);
        setProgress(0);
        return;
      }

      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'formation'}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setProgress(0);
    };

    recorder.start(200);

    // 렌더 루프 (실시간 재생과 동일한 속도)
    const startWall = performance.now();
    let lastProgressUpdate = 0;

    const loop = () => {
      if (cancelledRef.current) return;

      const elapsed = (performance.now() - startWall) / 1000;
      const t = Math.min(elapsed, totalDur);

      drawStage(ctx, t, project, stageConfig.mirrorMode);

      const now = performance.now();
      if (now - lastProgressUpdate > 80) {
        setProgress(t / totalDur);
        lastProgressUpdate = now;
      }

      if (t < totalDur) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        recorder.stop();
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [project, stageConfig.mirrorMode, duration, isRecording]);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      setIsRecording(false);
      setProgress(0);
    }
  }, []);

  return { startExport, isRecording, progress, cancelExport };
}
