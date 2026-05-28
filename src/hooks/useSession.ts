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
            completeSession();
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

  const startSession = (durationMinutes: number, lockMode: LockMode, category = 'General Study', plantType = 'oak') => {
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

  const completeSession = () => {
    if (!activeSession) return;

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

  const forceUnlock = () => {
    if (!activeSession) return;

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
