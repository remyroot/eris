export type ObjectiveStatus = 'active' | 'queued' | 'complete';

export interface Objective {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ObjectiveStatus;
  progress: number;
  target: number;
  triggers: string[];    // location names that advance this objective
  createdAt: number;
  completedAt: number | null;
}

export interface ObjectiveUpdate {
  objectiveId: string;
  previousProgress: number;
  newProgress: number;
  completed: boolean;
}
