import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useStore } from '../store';
import { Video, ChevronLeft, X, BookOpen, Save, FolderOpen, Pencil, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useVideoExport } from '../hooks/useVideoExport';
import { ExportModal } from './ExportModal';
import { ManualModal } from './ManualModal';
import { exportProjectFile, importProjectFile } from '../lib/projectIO';

type ToastType = { msg: string; ok: boolean } | null;

export function Header() {
  const { project, stageConfig, setStageConfig, loadProject, renameProject } = useStore();
  const { theme, toggle: toggleTheme } = useTheme();
  const { startExport, isRecording, progress, cancelExport } = useVideoExport();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showManual,      setShowManual]      = useState(false);
  const [toast,           setToast]           = useState<ToastType>(null);
  const [editingName,     setEditingName]     = useState(false);
  const [nameValue,       setNameValue]       = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNameEdit = () => {
    setNameValue(project?.name ?? '');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitNameEdit = () => {
    if (nameValue.trim()) renameProject(nameValue.trim());
    setEditingName(false);
  };

  const cancelNameEdit = () => setEditingName(false);

  const showToast = (msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

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

  const handleSave = () => {
    if (!project) return;
    exportProjectFile(project);
    showToast('파일로 저장됨', true);
  };

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const loaded = await importProjectFile(file);
      loadProject(loaded);
      showToast(`"${loaded.name}" 불러옴`, true);
    } catch (err: any) {
      showToast(err?.message || '불러오기 실패', false);
    }
  };

  if (!project) return null;

  return (
    <>
      <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 border-b border-neutral-800 shrink-0 relative" style={{ backgroundColor: 'var(--bg-panel)' }}>
        {/* 중앙 버튼 그룹 */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1">
          <a
            href="https://dancehive.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition-all"
          >
            <span className="text-sm">🐝</span>
            댄스하이브
          </a>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            사용자 가이드
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button className="text-neutral-400 hover:text-white transition-colors" title="Back to Dashboard">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 rounded flex items-center justify-center font-black text-white italic text-xs md:text-base">F</div>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline text-base md:text-lg font-semibold tracking-tight">FlowDance</span>
              <span className="hidden sm:inline text-neutral-600">/</span>

              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={commitNameEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitNameEdit(); }
                    if (e.key === 'Escape') cancelNameEdit();
                  }}
                  className="bg-white/10 border border-blue-500/60 rounded-md px-2 py-0.5 text-sm text-neutral-100 font-medium outline-none w-36 md:w-48"
                  maxLength={40}
                />
              ) : (
                <button
                  onClick={startNameEdit}
                  title="클릭하여 이름 변경"
                  className="group flex items-center gap-1 text-sm sm:text-base text-neutral-400 font-normal hover:text-neutral-100 transition-colors rounded px-1 -ml-1"
                >
                  <span>{project.name}</span>
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
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

          {/* 다크/라이트 토글 */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition"
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark'
              ? <Sun  className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
          </button>

          {/* 구분선 */}
          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* 저장 */}
          <button
            onClick={handleSave}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition"
            title="파일로 저장 (.flowdance)"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* 불러오기 */}
          <button
            onClick={handleLoadClick}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition"
            title="파일 불러오기 (.flowdance)"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".flowdance,.json"
            onChange={handleFileChange}
            className="hidden"
          />

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

      {/* 토스트 알림 */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 rounded-xl text-xs font-medium shadow-2xl border flex items-center gap-2 transition-all ${
          toast.ok
            ? 'bg-emerald-950 border-emerald-700/60 text-emerald-300'
            : 'bg-red-950 border-red-700/60 text-red-300'
        }`}>
          <span>{toast.ok ? '✓' : '✗'}</span>
          {toast.msg}
        </div>
      )}

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
