import { useEffect } from 'react';
import { useStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';

export default function App() {
  const { project, initializeProject } = useStore();

  useEffect(() => {
    // If no project exists on load, create a default one for MVP convenience
    if (!project) {
      initializeProject('New Choreography');
    }
  }, [project, initializeProject]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-200 font-sans selection:bg-blue-500/30">
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

