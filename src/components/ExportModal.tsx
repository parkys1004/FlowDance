import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Video, X, Download } from 'lucide-react';
import { ExportFormat, ExportRatio } from '../hooks/useVideoExport';
import { cn } from '../lib/utils';

interface Props {
  onExport: (format: ExportFormat, ratio: ExportRatio) => void;
  onClose: () => void;
}

export function ExportModal({ onExport, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [ratio,  setRatio ] = useState<ExportRatio>('16:9');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 w-80 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-200">영상 내보내기</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 파일 형식 */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-neutral-400 font-medium">파일 형식</span>
          <div className="grid grid-cols-2 gap-2">
            {(['mp4', 'webm'] as ExportFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  format === f
                    ? 'bg-blue-600/25 border-blue-500/60 text-blue-300'
                    : 'bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
                )}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {format === 'mp4' && (
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              브라우저가 MP4 인코딩을 지원하지 않으면 자동으로 WEBM으로 저장됩니다.
            </p>
          )}
        </div>

        {/* 화면 비율 */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-neutral-400 font-medium">화면 비율</span>
          <div className="grid grid-cols-2 gap-2">
            {/* 16:9 */}
            <button
              onClick={() => setRatio('16:9')}
              className={cn(
                'py-3 rounded-xl border transition-all flex flex-col items-center gap-2',
                ratio === '16:9'
                  ? 'bg-blue-600/25 border-blue-500/60'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              )}
            >
              <div className={cn(
                'w-10 h-[22px] rounded border-2',
                ratio === '16:9' ? 'border-blue-400 bg-blue-500/20' : 'border-neutral-500 bg-white/5'
              )} />
              <span className={cn(
                'text-xs font-semibold',
                ratio === '16:9' ? 'text-blue-300' : 'text-neutral-400'
              )}>16 : 9</span>
            </button>

            {/* 9:16 */}
            <button
              onClick={() => setRatio('9:16')}
              className={cn(
                'py-3 rounded-xl border transition-all flex flex-col items-center gap-2',
                ratio === '9:16'
                  ? 'bg-blue-600/25 border-blue-500/60'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              )}
            >
              <div className={cn(
                'w-[22px] h-10 rounded border-2',
                ratio === '9:16' ? 'border-blue-400 bg-blue-500/20' : 'border-neutral-500 bg-white/5'
              )} />
              <span className={cn(
                'text-xs font-semibold',
                ratio === '9:16' ? 'text-blue-300' : 'text-neutral-400'
              )}>9 : 16</span>
            </button>
          </div>
        </div>

        {/* 해상도 안내 */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5">
          <span className="text-[11px] text-neutral-500">해상도</span>
          <span className="text-[11px] text-neutral-300 font-mono">
            {ratio === '16:9' ? '1280 × 720' : '720 × 1280'}
          </span>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-neutral-400 border border-white/10 hover:bg-white/5 hover:text-neutral-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => { onExport(format, ratio); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            내보내기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
