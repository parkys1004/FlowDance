import { useEffect } from 'react';
import { useStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { project, initializeProject } = useStore();
  useTheme(); // html[data-theme] 적용

  useEffect(() => {
    // If no project exists on load, create a default one for MVP convenience
    if (!project) {
      initializeProject('New Choreography');
    }
  }, [project, initializeProject]);

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30" style={{ backgroundColor: 'var(--bg-base)' }}>
      {!project ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-zinc-500">Loading FlowDance...</div>
        </div>
      ) : (
        <Editor />
      )}
    </div>
  );
}

