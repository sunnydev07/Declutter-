import { useState, useEffect, useRef } from 'react';
import { FocusSession, LockMode } from '../types/session';
import { db } from '../utils/db';
import {
  playSessionCompleteChime,
  playPlantWiltedChime,
  playTimerPausedChime,
  playAmbientNoise,
  stopAmbientNoise
} from '../utils/sounds';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';

export const useSession = () => {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [streakCount] = useState(5); // Simulated default, will load dynamically
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state on launch
  useEffect(() => {
    const sessions = db.getSessions();
    const active = sessions.find((s) => s.status === 'completed' || s.status === 'failed' ? false : s.endedAt === undefined);
    
    // Check if there was an interrupted session (e.g. app closed)
    if (active) {
      const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
      const plannedSecs = active.plannedDurationMinutes * 60;
      
      if (elapsed < plannedSecs) {
        setActiveSession(active);
        setRemainingSeconds(plannedSecs - elapsed);
        setIsPaused(false);
        playAmbientNoise('rain'); // Default resume ambient
      } else {
        // Interrupted session finished while app was closed! Auto-complete it
        active.status = 'completed';
        active.endedAt = new Date().toISOString();
        db.saveSession(active);
      }
    }
  }, []);

  // Timer loop
  useEffect(() => {
    if (activeSession && remainingSeconds > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Fire async completion — errors are handled internally via try/catch
            void completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession, remainingSeconds, isPaused]);

  const startSession = async (durationMinutes: number, lockMode: LockMode, category = 'General Study', plantType = 'oak') => {
    // 1. Build blocklist/whitelist from the user's app rules
    const appRules = db.getAppRules();
    const blocklist = appRules
      .filter((r) => r.ruleType === 'block')
      .map((r) => r.exePath || r.appName);
    const whitelist = appRules
      .filter((r) => r.ruleType === 'allow')
      .map((r) => r.exePath || r.appName);

    // 2. Fetch the user's emergency unlock method
    const settings = db.getSettings();
    const emergencyMethod = settings.emergencyUnlockMethod || 'string';

    // 3. Ask the Tauri shell to relay StartLock to the Windows Service (best-effort).
    //    If the service or Tauri runtime isn't available (e.g. running via npm run dev),
    //    we log a warning and proceed with the local-only session.
    try {
      await invoke('start_lock_session', {
        durationMinutes,
        lockMode,       // Tauri command will parse the string to the enum
        blocklist,
        whitelist,
        emergencyMethod,
      });
    } catch (err: any) {
      console.warn('[useSession] Service IPC unavailable — running local-only session:', err);
    }

    // 4. Persist the session locally and start the UI timer
    const newSession: FocusSession = {
      id: Math.random().toString(36).substring(2, 9),
      startedAt: new Date().toISOString(),
      plannedDurationMinutes: durationMinutes,
      lockMode,
      status: 'paused', // Active/Running under mock state
      category,
      plantType,
    };

    db.saveSession(newSession);
    setActiveSession(newSession);
    setRemainingSeconds(durationMinutes * 60);
    setIsPaused(false);
    
    // Start ambient background noise based on some setting, defaults to rain
    playAmbientNoise('rain');
  };

  const pauseSession = () => {
    if (!activeSession) return;
    setIsPaused(true);
    playTimerPausedChime();
  };

  const notify = async (title: string, body: string) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body });
      }
    } catch (e) {
      console.warn("Notifications not supported in this environment");
    }
  };

  const resumeSession = () => {
    if (!activeSession) return;
    setIsPaused(false);
  };

  const completeSession = async () => {
    if (!activeSession) return;

    // Tell the Windows Service to release all OS restrictions
    try {
      await invoke('stop_lock_session');
    } catch (err) {
      console.error('[useSession] Service stop_lock_session failed:', err);
      // Still proceed to clear local state – we don't want to leave the UI stuck.
    }

    const completed: FocusSession = {
      ...activeSession,
      status: 'completed',
      endedAt: new Date().toISOString(),
      actualDurationMinutes: activeSession.plannedDurationMinutes,
      plantSurvived: true,
    };

    db.saveSession(completed);
    setActiveSession(null);
    setRemainingSeconds(0);
    setIsPaused(false);
    
    stopAmbientNoise();
    playSessionCompleteChime();
    notify("Session Complete! 🎉", "You've successfully completed your focus session and grown a new plant.");
  };

  const forceUnlock = async () => {
    if (!activeSession) return;

    // Tell the Windows Service to release all OS restrictions
    try {
      await invoke('stop_lock_session');
    } catch (err) {
      console.error('[useSession] Service stop_lock_session failed:', err);
      // Still proceed to clear local state so the user isn't stuck.
    }

    const failed: FocusSession = {
      ...activeSession,
      status: 'failed',
      endedAt: new Date().toISOString(),
      actualDurationMinutes: Math.floor((activeSession.plannedDurationMinutes * 60 - remainingSeconds) / 60),
      plantSurvived: false,
    };

    db.saveSession(failed);
    setActiveSession(null);
    setRemainingSeconds(0);
    setIsPaused(false);
    
    stopAmbientNoise();
    playPlantWiltedChime();
    notify("Session Failed", "Your plant has wilted because you abandoned your focus session.");
  };

  return {
    activeSession,
    remainingSeconds,
    isPaused,
    streakCount,
    startSession,
    pauseSession,
    resumeSession,
    forceUnlock,
  };
};
