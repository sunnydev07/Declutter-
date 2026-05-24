export type LockMode = 'soft' | 'app' | 'view' | 'full';

export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  plannedDurationMinutes: number;
  actualDurationMinutes?: number;
  lockMode: LockMode;
  status: 'completed' | 'failed' | 'emergency_unlocked' | 'paused';
  category?: string;
  notes?: string;
  plantType?: string;
  plantSurvived?: boolean;
}

export interface DailyStats {
  date: string;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  sessionsFailed: number;
  longestSessionMinutes: number;
  plantsGrown: number;
  plantsWilted: number;
}

export interface AppRule {
  id: string;
  appName: string;
  exePath?: string;
  ruleType: 'block' | 'allow';
  createdAt: string;
}

export interface UserSettings {
  defaultLockMode: LockMode;
  emergencyUnlockMethod: 'string' | 'password' | 'cooldown';
  emergencyUnlockPenalty: 'lose_plant' | 'lose_streak' | 'time_penalty';
  allowPausing: boolean;
  maxPausesPerSession: number;
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  autoStart: boolean;
  startMinimized: boolean;
  dailyGoalMinutes: number;
}
