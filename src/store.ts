import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Member, Frame, StageConfig, Point, StageMarker, StageMarkerType } from './types';
import { generateId } from './lib/utils';

interface AppState {
  project: Project | null;
  currentFrameIndex: number;
  stageConfig: StageConfig;
  isPlaying: boolean;
  
  // Audio State
  currentTime: number;
  duration: number;
  
  // Actions
  initializeProject: (name: string) => void;
  addMember: (name: string, color: string) => void;
  updateMember: (id: string, data: Partial<Member>) => void;
  removeMember: (id: string) => void;
  
  addFrame: () => void;
  duplicateFrame: () => void;
  removeFrame: (index: number) => void;
  setCurrentFrame: (index: number) => void;
  updateMemberPosition: (memberId: string, position: Point) => void;
  updateFrameTimestamp: (index: number, timestamp: number) => void;
  setFrameTransition: (index: number, type: 'linear' | 'curve' | 'jump' | 'rotate') => void;
  
  togglePlay: () => void;
  setPlay: (play: boolean) => void;
  setStageConfig: (config: Partial<StageConfig>) => void;
  
  setAudio: (url: string, name: string) => void;
  setCurrentTime: (time: number | ((prev: number) => number)) => void;
  setDuration: (duration: number) => void;
  loadProject: (project: Project) => void;

  clearAllMembers: () => void;
  applyFormation: (positions: Record<string, Point>) => void;

  addStageMarker: (type: StageMarkerType, label?: string) => void;
  removeStageMarker: (id: string) => void;
  updateStageMarkerPosition: (id: string, x: number, y: number) => void;
  updateStageMarkerLabel: (id: string, label: string) => void;
  updateStageMarkerSeconds: (id: string, seconds: number) => void;
}

const DEFAULT_STAGE: StageConfig = {
  width: 800,
  height: 500,
  gridSize: 10,
  mirrorMode: false,
};

export const useStore = create<AppState>()(persist((set, get) => ({
  project: null,
  currentFrameIndex: 0,
  stageConfig: DEFAULT_STAGE,
  isPlaying: false,
  currentTime: 0,
  duration: 0,

  initializeProject: (name) => {
    const frameId = generateId();
    const defaultMembers = [
      { id: generateId(), name: 'Minji', color: '#3b82f6' }, // Blue
      { id: generateId(), name: 'Hanni', color: '#f43f5e' }, // Pink
      { id: generateId(), name: 'Danielle', color: '#f59e0b' }, // Amber
      { id: generateId(), name: 'Haerin', color: '#8b5cf6' }, // Purple
      { id: generateId(), name: 'Hyein', color: '#10b981' }, // Emerald
    ];
    
    // Default formation positions
    const initialPositions = {
      [defaultMembers[0].id]: { x: 50, y: 50 },  // Center
      [defaultMembers[1].id]: { x: 35, y: 40 },  
      [defaultMembers[2].id]: { x: 65, y: 40 },
      [defaultMembers[3].id]: { x: 25, y: 65 },
      [defaultMembers[4].id]: { x: 75, y: 65 },
    };

    set({
      project: {
        id: generateId(),
        name,
        members: defaultMembers,
        frames: [{ id: frameId, positions: initialPositions, timestamp: 0 }],
      },
      currentFrameIndex: 0,
      isPlaying: false,
      currentTime: 0,
    });
  },

  addMember: (name, color) => {
    set((state) => {
      if (!state.project) return state;
      const newMember = { id: generateId(), name, color };
      // Assign default position in all existing frames
      const updatedFrames = state.project.frames.map((frame) => ({
        ...frame,
        positions: {
          ...frame.positions,
          [newMember.id]: { x: 50, y: 50 }, // Default center: 50%, 50%
        },
      }));
      return {
        project: {
          ...state.project,
          members: [...state.project.members, newMember],
          frames: updatedFrames,
        },
      };
    });
  },

  updateMember: (id, data) => {
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          members: state.project.members.map((m) => (m.id === id ? { ...m, ...data } : m)),
        },
      };
    });
  },

  removeMember: (id) => {
    set((state) => {
      if (!state.project) return state;
      const updatedFrames = state.project.frames.map((frame) => {
        const newPositions = { ...frame.positions };
        delete newPositions[id];
        return { ...frame, positions: newPositions };
      });
      return {
        project: {
          ...state.project,
          members: state.project.members.filter((m) => m.id !== id),
          frames: updatedFrames,
        },
      };
    });
  },

  addFrame: () => {
    set((state) => {
      if (!state.project) return state;

      const entryOff = Math.max(
        0,
        ...((state.project.stageMarkers || [])
          .filter(m => m.type === 'entry')
          .map(m => m.seconds ?? 10)
          .concat([0]))
      );
      const currentPositions = state.project.frames[state.currentFrameIndex]?.positions || {};
      // 입장 오프셋을 제거한 오디오 기준 시간 (음수 = 입장 구간, 양수 초과 = 퇴장 구간)
      const baseTime = state.currentTime - entryOff;

      const newFrame: Frame = {
        id: generateId(),
        positions: { ...currentPositions },
        timestamp: baseTime,
      };
      
      const newFrames = [...state.project.frames, newFrame].sort((a, b) => a.timestamp - b.timestamp);
      const newIdx = newFrames.findIndex(f => f.id === newFrame.id);
      
      return {
        project: {
          ...state.project,
          frames: newFrames,
        },
        currentFrameIndex: newIdx,
      };
    });
  },
  
  duplicateFrame: () => {
    set((state) => {
      if (!state.project) return state;
      const currentFrame = state.project.frames[state.currentFrameIndex];
      if (!currentFrame) return state;

      const entryOff = Math.max(
        0,
        ...((state.project.stageMarkers || [])
          .filter(m => m.type === 'entry')
          .map(m => m.seconds ?? 10)
          .concat([0]))
      );
      const newFrame: Frame = {
        id: generateId(),
        positions: { ...currentFrame.positions },
        timestamp: state.currentTime - entryOff,
      };
      
      const newFrames = [...state.project.frames, newFrame].sort((a, b) => a.timestamp - b.timestamp);
      const newIdx = newFrames.findIndex(f => f.id === newFrame.id);
      
      return {
        project: {
          ...state.project,
          frames: newFrames,
        },
        currentFrameIndex: newIdx,
      };
    });
  },

  removeFrame: (index) => {
    set((state) => {
      if (!state.project || state.project.frames.length <= 1) return state;
      const newFrames = state.project.frames.filter((_, i) => i !== index);
      const newIndex = Math.min(state.currentFrameIndex, newFrames.length - 1);
      return {
        project: {
          ...state.project,
          frames: newFrames,
        },
        currentFrameIndex: newIndex,
      };
    });
  },

  setCurrentFrame: (index) => {
    set({ currentFrameIndex: index });
  },

  updateMemberPosition: (memberId, position) => {
    set((state) => {
      if (!state.project) return state;
      
      const frames = [...state.project.frames];
      const currentFrame = frames[state.currentFrameIndex];
      
      if (!currentFrame) return state;
      
      // Update just the current frame
      frames[state.currentFrameIndex] = {
        ...currentFrame,
        positions: {
          ...currentFrame.positions,
          [memberId]: position, // { x, y } in percentage
        },
      };
      
      return {
        project: {
          ...state.project,
          frames,
        },
      };
    });
  },
  
  updateFrameTimestamp: (index, timestamp) => {
    set((state) => {
      if (!state.project) return state;
      const frames = [...state.project.frames];
      if (frames[index]) {
        frames[index] = { ...frames[index], timestamp };
        frames.sort((a, b) => a.timestamp - b.timestamp);
      }
      return { project: { ...state.project, frames }, currentFrameIndex: frames.findIndex(f => f.id === state.project?.frames[index]?.id) };
    });
  },

  setFrameTransition: (index, transitionType) => {
    set((state) => {
      if (!state.project) return state;
      const frames = [...state.project.frames];
      if (frames[index]) {
        frames[index] = { ...frames[index], transitionType };
      }
      return { project: { ...state.project, frames } };
    });
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },
  
  setPlay: (play) => {
    set({ isPlaying: play });
  },
  
  setStageConfig: (config) => {
    set((state) => ({ stageConfig: { ...state.stageConfig, ...config } }));
  },

  setAudio: (url, name) => {
    set((state) => {
      if (!state.project) return state;
      return { project: { ...state.project, audioUrl: url, audioName: name }, currentTime: 0 };
    });
  },

  setCurrentTime: (timeOrUpdater) => {
    set((state) => {
      if (!state.project) return state;
      const newTime = typeof timeOrUpdater === 'function' ? timeOrUpdater(state.currentTime) : timeOrUpdater;

      // 입장 오프셋 제거 후 오디오 기준 시간으로 프레임 인덱스 계산 (클램핑 없음 → 입장/퇴장 구간 마크 지원)
      const entryOff = Math.max(
        0,
        ...((state.project.stageMarkers || [])
          .filter(m => m.type === 'entry')
          .map(m => m.seconds ?? 10)
          .concat([0]))
      );
      const audioTime = newTime - entryOff;

      const frames = state.project.frames;
      let activeIndex = 0;
      for (let i = frames.length - 1; i >= 0; i--) {
        if (frames[i].timestamp <= audioTime) {
          activeIndex = i;
          break;
        }
      }
      return { currentTime: newTime, currentFrameIndex: activeIndex };
    });
  },

  setDuration: (duration) => {
    set((state) => ({
      duration,
      project: state.project ? { ...state.project, audioDuration: duration } : null,
    }));
  },

  applyFormation: (positions) => {
    set((state) => {
      if (!state.project) return state;
      const frames = [...state.project.frames];
      const frame = frames[state.currentFrameIndex];
      if (!frame) return state;
      frames[state.currentFrameIndex] = {
        ...frame,
        positions: { ...frame.positions, ...positions },
      };
      return { project: { ...state.project, frames } };
    });
  },

  clearAllMembers: () => {
    set((state) => {
      if (!state.project) return state;
      const updatedFrames = state.project.frames.map(frame => ({
        ...frame,
        positions: {},
      }));
      return {
        project: {
          ...state.project,
          members: [],
          frames: updatedFrames,
        },
      };
    });
  },

  addStageMarker: (type, label) => {
    set((state) => {
      if (!state.project) return state;
      const newMarker: StageMarker = {
        id: generateId(),
        type,
        x: 50,
        y: type === 'entry' ? 82 : 18,
        label,
        seconds: 10,
        timestamp: type === 'entry' ? state.currentTime : undefined,
      };
      return {
        project: {
          ...state.project,
          stageMarkers: [...(state.project.stageMarkers || []), newMarker],
        },
      };
    });
  },

  removeStageMarker: (id) => {
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          stageMarkers: (state.project.stageMarkers || []).filter(m => m.id !== id),
        },
      };
    });
  },

  updateStageMarkerPosition: (id, x, y) => {
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          stageMarkers: (state.project.stageMarkers || []).map(m =>
            m.id === id ? { ...m, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : m
          ),
        },
      };
    });
  },

  updateStageMarkerLabel: (id, label) => {
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          stageMarkers: (state.project.stageMarkers || []).map(m =>
            m.id === id ? { ...m, label } : m
          ),
        },
      };
    });
  },

  updateStageMarkerSeconds: (id, seconds) => {
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          stageMarkers: (state.project.stageMarkers || []).map(m =>
            m.id === id ? { ...m, seconds: Math.max(0, Math.min(20, seconds)) } : m
          ),
        },
      };
    });
  },

  loadProject: (project) => {
    set({
      project: { ...project, audioUrl: undefined },
      currentFrameIndex: 0,
      currentTime: 0,
      isPlaying: false,
      duration: project.audioDuration || 0,
    });
  },
}), {
  name: 'flowdance-storage',
  partialize: (state) => ({
    project: state.project ? { ...state.project, audioUrl: undefined } : null,
    stageConfig: state.stageConfig,
  }),
}));
