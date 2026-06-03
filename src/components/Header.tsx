import { useStore } from '../store';
import { Settings, Play, Download, ChevronLeft } from 'lucide-react';

export function Header() {
  const { project, stageConfig, setStageConfig } = useStore();

  if (!project) return null;

  return (
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
        <button className="px-2 md:px-3 py-1.5 text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Export Formation</span>
          <span className="inline sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
}
