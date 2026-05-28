export type LockMode = 'soft' | 'app' | 'view' | 'full';
export type CoachPersona = 'male' | 'female';
export type CoachAiMode = 'off' | 'gemini_optional';
/** Known plant seeds. The 'sword' value activates Sword Mode — no manual escape. */
export type PlantType = 'oak' | 'cherry' | 'cactus' | 'crystal' | 'dragon' | 'sword' | (string & {});

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
  plantType?: PlantType;
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

export interface WebRule {
  id: string;
  domain: string;
  ruleType: 'block' | 'allow';
  createdAt: string;
}

export interface UserSettings {
  defaultLockMode: LockMode;
  emergencyUnlockMethod: 'string' | 'password' | 'cooldown';
  emergencyUnlockPenalty: 'lose_plant' | 'lose_streak' | 'time_penalty';
  coachPersona: CoachPersona;
  coachAiMode: CoachAiMode;
  coachGeminiApiKey?: string;
  allowPausing: boolean;
  maxPausesPerSession: number;
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  autoStart: boolean;
  startMinimized: boolean;
  dailyGoalMinutes: number;
}
