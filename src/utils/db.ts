import { FocusSession, DailyStats, AppRule, UserSettings } from '../types/session';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Default User Settings
const DEFAULT_SETTINGS: UserSettings = {
  defaultLockMode: 'soft',
  emergencyUnlockMethod: 'string',
  emergencyUnlockPenalty: 'lose_plant',
  coachPersona: 'male',
  coachAiMode: 'off',
  coachGeminiApiKey: '',
  allowPausing: true,
  maxPausesPerSession: 2,
  theme: 'dark',
  accentColor: '#10b981',
  autoStart: false,
  startMinimized: false,
  dailyGoalMinutes: 60,
};

const mergeSettings = (settings: Partial<UserSettings> = {}): UserSettings => ({
  ...DEFAULT_SETTINGS,
  ...settings,
});

// Database Key Constants
const KEYS = {
  SETTINGS: 'declutter_settings',
  SESSIONS: 'declutter_sessions',
  APP_RULES: 'declutter_app_rules',
  STATS: 'declutter_stats',
};

// Initialize DB structure if not present
const initDb = () => {
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem(KEYS.SESSIONS)) {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.APP_RULES)) {
    // Some default distracting apps to block
    const defaultRules: AppRule[] = [
      { id: '1', appName: 'Steam', exePath: 'steam.exe', ruleType: 'block', createdAt: new Date().toISOString() },
      { id: '2', appName: 'Discord', exePath: 'discord.exe', ruleType: 'block', createdAt: new Date().toISOString() },
      { id: '3', appName: 'Chrome', exePath: 'chrome.exe', ruleType: 'allow', createdAt: new Date().toISOString() }, // Whitelisted
    ];
    localStorage.setItem(KEYS.APP_RULES, JSON.stringify(defaultRules));
  }
  if (!localStorage.getItem(KEYS.STATS)) {
    localStorage.setItem(KEYS.STATS, JSON.stringify({}));
  }
};

// Auto-run initialization
initDb();

export const db = {
  // --- Settings ---
  getSettings(): UserSettings {
    const settings = localStorage.getItem(KEYS.SETTINGS);
    if (!settings) return DEFAULT_SETTINGS;

    try {
      const parsed = JSON.parse(settings) as Partial<UserSettings>;
      const merged = mergeSettings(parsed);
      const serialized = JSON.stringify(merged);

      if (serialized !== settings) {
        localStorage.setItem(KEYS.SETTINGS, serialized);
      }

      return merged;
    } catch {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- Sessions ---
  getSessions(): FocusSession[] {
    const sessions = localStorage.getItem(KEYS.SESSIONS);
    return sessions ? JSON.parse(sessions) : [];
  },

  saveSession(session: FocusSession): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index !== -1) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    
    // After saving, let's update aggregates
    if (session.status === 'completed' || session.status === 'failed' || session.status === 'emergency_unlocked') {
      this.updateDailyStats(session);
    }
  },

  // --- App Rules ---
  getAppRules(): AppRule[] {
    const rules = localStorage.getItem(KEYS.APP_RULES);
    return rules ? JSON.parse(rules) : [];
  },

  addAppRule(appName: string, ruleType: 'block' | 'allow', exePath?: string): AppRule {
    const rules = this.getAppRules();
    const newRule: AppRule = {
      id: generateId(),
      appName,
      exePath: exePath || `${appName.toLowerCase().replace(/\s+/g, '')}.exe`,
      ruleType,
      createdAt: new Date().toISOString(),
    };
    rules.push(newRule);
    localStorage.setItem(KEYS.APP_RULES, JSON.stringify(rules));
    return newRule;
  },

  deleteAppRule(id: string): void {
    const rules = this.getAppRules();
    const updated = rules.filter((r) => r.id !== id);
    localStorage.setItem(KEYS.APP_RULES, JSON.stringify(updated));
  },

  // --- Statistics & Aggregations ---
  getDailyStats(): Record<string, DailyStats> {
    const stats = localStorage.getItem(KEYS.STATS);
    return stats ? JSON.parse(stats) : {};
  },

  updateDailyStats(session: FocusSession): void {
    const stats = this.getDailyStats();
    const dateStr = session.startedAt.split('T')[0]; // YYYY-MM-DD
    
    if (!stats[dateStr]) {
      stats[dateStr] = {
        date: dateStr,
        totalFocusMinutes: 0,
        sessionsCompleted: 0,
        sessionsFailed: 0,
        longestSessionMinutes: 0,
        plantsGrown: 0,
        plantsWilted: 0,
      };
    }

    const day = stats[dateStr];
    const duration = session.actualDurationMinutes || session.plannedDurationMinutes;

    if (session.status === 'completed') {
      day.totalFocusMinutes += duration;
      day.sessionsCompleted += 1;
      day.plantsGrown += 1;
      day.longestSessionMinutes = Math.max(day.longestSessionMinutes, duration);
    } else {
      day.sessionsFailed += 1;
      day.plantsWilted += 1;
    }

    localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  },
};
