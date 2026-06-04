import { useRef, useState, useCallback } from 'react';
import { useStore } from '../store';
import { Project, Frame, StageMarker } from '../types';

export type ExportFormat = 'mp4' | 'webm';
export type ExportRatio  = '16:9' | '9:16';

export interface ExportOptions {
  format: ExportFormat;
  ratio:  ExportRatio;
}

const DIMS: Record<ExportRatio, { w: number; h: number }> = {
  '16:9': { w: 1280, h: 720  },
  '9:16': { w: 720,  h: 1280 },
};

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

function drawStage(
  ctx: CanvasRenderingContext2D,
  time: number,
  project: Project,
  mirror: boolean,
  W: number,
  H: number,
) {
  const { entry } = getOffsets(project.stageMarkers);

  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#262626';
  for (let x = 40; x < W; x += 40) {
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = 'rgba(113,113,122,0.5)';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`FRONT${mirror ? ' (MIRROR)' : ''}`, W / 2, H - 10);
  ctx.restore();

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

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = member.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-6, r + 1);
    ctx.lineTo(6, r + 1);
    ctx.lineTo(0, r + 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = member.color;
    ctx.beginPath();
    ctx.moveTo(-4, r + 3);
    ctx.lineTo(4, r + 3);
    ctx.lineTo(0, r + 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(member.name[0].toUpperCase(), cx, cy);
    ctx.restore();

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

function resolveMime(format: ExportFormat): string {
  if (format === 'mp4') {
    const candidates = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
  }
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
  return 'video/webm';
}

export function useVideoExport() {
  const { project, stageConfig, duration } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress]       = useState(0);
  const rafRef      = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelledRef = useRef(false);

  const startExport = useCallback(async (options: ExportOptions) => {
    if (!project || isRecording) return;

    const { format, ratio } = options;
    const { w: W, h: H } = DIMS[ratio];

    const { entry, exit } = getOffsets(project.stageMarkers);
    const audioDur = duration || 30;
    const totalDur = entry + audioDur + exit;

    setIsRecording(true);
    setProgress(0);
    cancelledRef.current = false;

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    let audioCtx: AudioContext | null = null;
    let audioStreamTracks: MediaStreamTrack[] = [];

    if (project.audioUrl) {
      try {
        audioCtx = new AudioContext();
        const res = await fetch(project.audioUrl);
        const buf = await audioCtx.decodeAudioData(await res.arrayBuffer());
        const dest = audioCtx.createMediaStreamDestination();
        const src  = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(dest);
        src.start(audioCtx.currentTime + entry);
        audioStreamTracks = dest.stream.getAudioTracks();
      } catch (e) {
        console.warn('[VideoExport] 오디오 설정 실패:', e);
      }
    }

    const mime = resolveMime(format);
    const ext  = mime.startsWith('video/mp4') ? 'mp4' : 'webm';

    const videoStream = canvas.captureStream(30);
    const combined    = new MediaStream([...videoStream.getTracks(), ...audioStreamTracks]);
    const recorder    = new MediaRecorder(combined, { mimeType: mime });
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
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${project.name || 'formation'}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setProgress(0);
    };

    recorder.start(200);

    const startWall = performance.now();
    let lastProgressUpdate = 0;

    const loop = () => {
      if (cancelledRef.current) return;

      const elapsed = (performance.now() - startWall) / 1000;
      const t = Math.min(elapsed, totalDur);

      drawStage(ctx, t, project, stageConfig.mirrorMode, W, H);

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
