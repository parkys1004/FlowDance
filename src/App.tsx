import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useStore } from './store';
import { Editor } from './components/Editor';
import { AuthGate } from './components/AuthGate';
import { supabase } from './lib/supabase';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { project, initializeProject } = useStore();
  const [session,     setSession]     = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useTheme();

  // 세션 확인 및 변화 구독
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 프로젝트 초기화 (로그인 후)
  useEffect(() => {
    if (session && !project) {
      initializeProject('New Choreography');
    }
  }, [session, project, initializeProject]);

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: '#080b14' }}
      >
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

  // 미인증 → 로그인 화면
  if (!session) return <AuthGate />;

  // 프로젝트 초기화 중
  if (!project) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
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
