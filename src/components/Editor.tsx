import { Stage } from './Stage';
import { Timeline } from './Timeline';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Editor() {
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#0A0A0A] text-neutral-200">
      <Header />
      
      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-3 md:p-4">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 md:gap-4 h-full">
          {/* Stage and Timeline (Priority on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-9 xl:col-span-10 flex flex-col gap-3 md:gap-4 lg:overflow-hidden shrink-0 lg:flex-1 h-[65vh] lg:h-auto">
            <div className="flex-1 glass-card rounded-2xl relative overflow-hidden stage-grid">
              <Stage />
            </div>
            <div className="glass-card h-[130px] md:h-40 rounded-2xl p-3 md:p-6 flex flex-col justify-between shrink-0">
              <Timeline />
            </div>
          </div>

          {/* Left Sidebar (Below stage on mobile) */}
          <div className="order-2 lg:order-1 lg:col-span-3 xl:col-span-2 flex flex-col gap-3 md:gap-4 lg:overflow-hidden shrink-0 h-[350px] lg:h-auto">
            <Sidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
