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
import { getCurrentWindow } from '@tauri-apps/api/window';

export const useSession = () => {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [streakCount] = useState(5); // Simulated default, will load dynamically
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullLockFocusRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state on launch
  useEffect(() => {
    const sessions = db.getSessions();
    const active = sessions.find((s) =>
      s.status === 'completed' || s.status === 'failed' ? false : s.endedAt === undefined
    );

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
        // Interrupted session finished while app was closed; auto-complete it.
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

  const startSession = async (
    durationMinutes: number,
    lockMode: LockMode,
    category = 'General Study',
    plantType = 'oak'
  ) => {
    const appRules = db.getAppRules();
    const blocklist = appRules
      .filter((r) => r.ruleType === 'block')
      .map((r) => r.exePath || r.appName);
    const whitelist = appRules
      .filter((r) => r.ruleType === 'allow')
      .map((r) => r.exePath || r.appName);

    const webRules = db.getWebRules();
    const websiteBlocklist = webRules
      .filter((r) => r.ruleType === 'block')
      .map((r) => r.domain);

    const settings = db.getSettings();
    const emergencyMethod = settings.emergencyUnlockMethod || 'string';
    const isSwordMode = plantType === 'sword';

    const activateFullLockWindow = async () => {
      const appWindow = getCurrentWindow();

      await appWindow.show();
      await appWindow.unminimize();
      await appWindow.setResizable(false);
      await appWindow.setMaximizable(false);
      await appWindow.setMinimizable(false);
      await appWindow.setClosable(false);
      await appWindow.setAlwaysOnTop(true);
      await appWindow.setFullscreen(true);
      await appWindow.setFocus();

      if (fullLockFocusRef.current) {
        clearInterval(fullLockFocusRef.current);
      }

      fullLockFocusRef.current = setInterval(() => {
        const currentWindow = getCurrentWindow();
        void currentWindow.show();
        void currentWindow.unminimize();
        void currentWindow.setAlwaysOnTop(true);
        void currentWindow.setFullscreen(true);
        void currentWindow.setFocus();
      }, 750);
    };

    // Non-soft locks must not fall back to a fake local-only timer.
    if (lockMode !== 'soft') {
      try {
        await invoke('start_lock_session', {
          durationMinutes,
          lockMode,
          blocklist,
          whitelist,
          emergencyMethod,
          websiteBlocklist,
          isSwordMode,
        });
      } catch (err: any) {
        const details = typeof err === 'string' ? err : err?.message || String(err);
        throw new Error(`Declutter service could not start enforcement: ${details}`);
      }

      if (lockMode === 'full') {
        try {
          await activateFullLockWindow();
        } catch (windowErr: any) {
          try {
            await invoke('stop_lock_session');
          } catch (stopErr) {
            console.error('[useSession] Failed to stop service after Full Lock window setup failed:', stopErr);
          }
          const details = typeof windowErr === 'string' ? windowErr : windowErr?.message || String(windowErr);
          throw new Error(`Declutter window could not enter Full Lock kiosk mode: ${details}`);
        }
      }
    }

    const newSession: FocusSession = {
      id: Math.random().toString(36).substring(2, 9),
      startedAt: new Date().toISOString(),
      plannedDurationMinutes: durationMinutes,
      lockMode,
      status: 'paused', // Active/running under the current local session model
      category,
      plantType,
    };

    db.saveSession(newSession);
    setActiveSession(newSession);
    setRemainingSeconds(durationMinutes * 60);
    setIsPaused(false);

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
    } catch {
      console.warn('Notifications not supported in this environment');
    }
  };

  const resumeSession = () => {
    if (!activeSession) return;
    setIsPaused(false);
  };

  const stopServiceLock = async () => {
    if (!activeSession || activeSession.lockMode === 'soft') return;

    if (fullLockFocusRef.current) {
      clearInterval(fullLockFocusRef.current);
      fullLockFocusRef.current = null;
    }

    try {
      await invoke('stop_lock_session');
    } catch (err) {
      console.error('[useSession] Service stop_lock_session failed:', err);
    }

    if (activeSession.lockMode === 'full') {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.setFullscreen(false);
        await appWindow.setAlwaysOnTop(false);
        await appWindow.setClosable(true);
        await appWindow.setMinimizable(true);
        await appWindow.setMaximizable(true);
        await appWindow.setResizable(true);
      } catch (err) {
        console.error('[useSession] Failed to restore window after Full Lock:', err);
      }
    }
  };

  const completeSession = async () => {
    if (!activeSession) return;

    await stopServiceLock();

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
    notify('Session Complete!', "You've successfully completed your focus session and grown a new plant.");
  };

  const forceUnlock = async () => {
    if (!activeSession) return;

    // Sword Mode: no manual escape is permitted, not even from the frontend.
    if (activeSession.plantType === 'sword') {
      console.warn('[useSession] forceUnlock blocked - Sword Mode is active.');
      notify('The Sword binds you.', 'No escape. Hold the line until the timer expires.');
      return;
    }

    await stopServiceLock();

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
    notify('Session Failed', 'Your plant has wilted because you abandoned your focus session.');
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
