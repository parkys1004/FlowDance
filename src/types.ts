export type Point = { x: number; y: number; rotation?: number };

export interface Member {
  id: string;
  name: string;
  color: string;
}

export type TransitionType = 'linear' | 'curve' | 'jump' | 'rotate';

export interface Frame {
  id: string;
  positions: Record<string, Point>; // key: member.id
  timestamp: number; // Time in seconds
  transitionType?: TransitionType;
}

export type StageMarkerType = 'entry' | 'exit';

export interface StageMarker {
  id: string;
  type: StageMarkerType;
  x: number; // 0-100 percent
  y: number; // 0-100 percent
  label?: string;
}

export interface Project {
  id: string;
  name: string;
  members: Member[];
  frames: Frame[];
  audioUrl?: string;
  audioName?: string;
  stageMarkers?: StageMarker[];
}

export interface StageConfig {
  width: number;
  height: number;
  gridSize: number;
  mirrorMode: boolean;
}

