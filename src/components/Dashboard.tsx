import { useStore } from '../store';
import { Plus } from 'lucide-react';

export function Dashboard() {
  const { initializeProject } = useStore();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">FlowDance</h1>
        <p className="text-zinc-400">Choreography Formation Planner.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <button
          onClick={() => initializeProject('Untitled Project')}
          className="h-48 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 hover:bg-zinc-900/50 transition-all group"
        >
          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">New Project</span>
        </button>
      </div>
    </div>
  );
}
