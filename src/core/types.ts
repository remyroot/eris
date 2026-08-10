export type LocationType = 'web' | 'read' | 'game' | 'sys';

export interface Location {
  name: string;
  description: string;
  type: LocationType;
  url: string | null;
  stayRange: [number, number]; // min/max ticks
  activities: string[];
}

export interface AgentState {
  location: Location | null;
  tickCount: number;
  ticksAtLocation: number;
  stayDuration: number;
  activityIndex: number;
  startedAt: number;
  lastTickAt: number;
}

export interface TickResult {
  moved: boolean;
  location: Location;
  activities: string[];
  duration: number;
}

export interface FeedEntry {
  timestamp: number;
  tag: LocationType;
  message: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
