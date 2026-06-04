import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Video, ChevronLeft, X, BookOpen } from 'lucide-react';
import { useVideoExport } from '../hooks/useVideoExport';
import { ExportModal } from './ExportModal';
import { ManualModal } from './ManualModal';

export function Header() {
  const { project, stageConfig, setStageConfig } = useStore();
  const { startExport, isRecording, progress, cancelExport } = useVideoExport();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showManual,      setShowManual]      = useState(false);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExportModal(false);
        setShowManual(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!project) return null;

  return (
    <>
      <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 border-b border-neutral-800 bg-[#0f0f0f] shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <button className="text-neutral-400 hover:text-white transition-colors" title="Back to Dashboard">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded flex items-center justify-center font-black text-white italic text-xs md:text-base">F</div>
            <h1 className="text-base md:text-lg font-semibold tracking-tight">
              <span className="hidden sm:inline">FlowDance</span>
              <span className="text-neutral-500 font-normal ml-0 sm:ml-2 text-sm sm:text-base">
                <span className="hidden sm:inline">/ </span>{project.name}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setStageConfig({ mirrorMode: !stageConfig.mirrorMode })}
            className={`px-2 md:px-3 py-1.5 text-[10px] sm:text-xs rounded-md transition border whitespace-nowrap ${
              stageConfig.mirrorMode
                ? 'bg-blue-600/20 text-blue-400 border-blue-600/30 font-bold'
                : 'bg-neutral-800 hover:bg-neutral-700 border-transparent text-neutral-300'
            }`}
          >
            <span className="hidden sm:inline">Mirror Mode</span>
            <span className="inline sm:hidden">Mirror</span>
          </button>

          {/* 매뉴얼 버튼 */}
          <button
            onClick={() => setShowManual(true)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition"
            title="사용 가이드"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {isRecording ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-600/30 rounded-md">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-100"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-red-400 font-mono w-8 shrink-0">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <button
                onClick={cancelExport}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition"
                title="취소"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-2 md:px-3 py-1.5 text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium flex items-center gap-1.5 md:gap-2 whitespace-nowrap"
            >
              <Video className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Export MP4</span>
              <span className="inline sm:hidden">Export</span>
            </button>
          )}
        </div>
      </header>

      {showExportModal && (
        <ExportModal
          onExport={(format, ratio) => startExport({ format, ratio })}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showManual && (
        <ManualModal onClose={() => setShowManual(false)} />
      )}
    </>
  );
}
