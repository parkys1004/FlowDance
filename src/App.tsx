import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Editor } from './components/Editor';
import { AuthGate } from './components/AuthGate';
import { getSavedCode, verifyCode, clearCode } from './lib/accessCode';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { project, initializeProject } = useStore();
  const [authorized,  setAuthorized]  = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useTheme();

  // 저장된 코드 검증
  useEffect(() => {
    const saved = getSavedCode();
    if (!saved) {
      setAuthLoading(false);
      return;
    }

    verifyCode(saved).then(valid => {
      if (valid) {
        setAuthorized(true);
      } else {
        clearCode(); // 무효화된 코드 제거
      }
      setAuthLoading(false);
    });
  }, []);

  // 프로젝트 초기화
  useEffect(() => {
    if (authorized && !project) {
      initializeProject('New Choreography');
    }
  }, [authorized, project, initializeProject]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#080b14' }}>
        <div className="flex flex-col items-center gap-3">
          <img
            src="/icon.png"
            alt="FlowDance"
            className="w-12 h-12 rounded-xl opacity-80 animate-pulse"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="text-sm text-neutral-600">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!authorized) return <AuthGate />;

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="animate-pulse text-zinc-500 text-sm">Loading FlowDance...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Editor />
    </div>
  );
}
