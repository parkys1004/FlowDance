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
  seconds: number;     // entry: 인디케이터 앞쪽 버퍼(5-20s) / exit: 음악 후 연장(5-20s)
  timestamp?: number;  // entry 마커가 연결된 타임라인 시점
}

export interface Project {
  id: string;
  name: string;
  members: Member[];
  frames: Frame[];
  audioUrl?: string;
  audioName?: string;
  audioDuration?: number;
  stageMarkers?: StageMarker[];
}

export interface CustomFormation {
  id: string;
  name: string;
  positions: Array<{ x: number; y: number }>;
  memberCount: number;
  createdAt: number;
}

export interface StageConfig {
  width: number;
  height: number;
  gridSize: number;
  mirrorMode: boolean;
}

