import { create } from 'zustand';
import { Project, Member, Frame, StageConfig, Point } from './types';
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
}

const DEFAULT_STAGE: StageConfig = {
  width: 800,
  height: 500,
  gridSize: 10,
  mirrorMode: false,
};

export const useStore = create<AppState>((set, get) => ({
  project: null,
  currentFrameIndex: 0,
  stageConfig: DEFAULT_STAGE,
  isPlaying: false,

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
      
      const currentPositions = state.project.frames[state.currentFrameIndex]?.positions || {};
      const baseTime = state.currentTime;
      
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
      
      const newFrame: Frame = {
        id: generateId(),
        positions: { ...currentFrame.positions },
        timestamp: state.currentTime,
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

      // Also update frame index based on time
      const frames = state.project.frames;
      let activeIndex = 0;
      for (let i = frames.length - 1; i >= 0; i--) {
        if (frames[i].timestamp <= newTime) {
          activeIndex = i;
          break;
        }
      }
      return { currentTime: newTime, currentFrameIndex: activeIndex };
    });
  },

  setDuration: (duration) => {
    set({ duration });
  }
}));
