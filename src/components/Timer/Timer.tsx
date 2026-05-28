import React, { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { useSettings } from '../../hooks/useSettings';
import { LockMode } from '../../types/session';
import LockScreen from '../LockScreen/LockScreen';
import PlantSelector from '../Gamification/PlantSelector';
import './Timer.css';

const PRESETS = [25, 45, 60, 120];

const Timer: React.FC = () => {
  const {
    activeSession,
    remainingSeconds,
    isPaused,
    startSession,
    pauseSession,
    resumeSession,
    forceUnlock,
  } = useSession();
  const { settings } = useSettings();

  const [duration, setDuration] = useState(25);
  const [lockMode, setLockMode] = useState<LockMode>('soft');
  const [category, setCategory] = useState('General Study');
  const [selectedPlantId, setSelectedPlantId] = useState('oak');
  const [quitRequestId, setQuitRequestId] = useState(0);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startSession(duration, lockMode, category, selectedPlantId);
  };

  const requestQuit = () => {
    setQuitRequestId((requestId) => requestId + 1);
  };

  const activePlantId = activeSession?.plantType ?? selectedPlantId;
  const plannedSeconds = activeSession ? activeSession.plannedDurationMinutes * 60 : duration * 60;
  const progressRatio = activeSession ? remainingSeconds / plannedSeconds : 1;
  const strokeDashoffset = 880 * (1 - progressRatio);

  return (
    <div className="timer-container animate-fade-in-up">
      {activeSession && (
        <LockScreen
          remainingSeconds={remainingSeconds}
          lockMode={activeSession.lockMode}
          plantType={activePlantId}
          sessionId={activeSession.id}
          plannedDurationMinutes={activeSession.plannedDurationMinutes}
          category={activeSession.category}
          coachPersona={settings.coachPersona}
          coachAiMode={settings.coachAiMode}
          coachGeminiApiKey={settings.coachGeminiApiKey}
          allowEmergencyUnlock={activePlantId !== 'sword'}
          quitRequestId={quitRequestId}
          onUnlock={forceUnlock}
        />
      )}

      <div className="timer-header">
        <h1>Focus Timer</h1>
        <p>Choose a duration, plant, and lock mode before launching.</p>
      </div>

      <div className="timer-grid">
        <div className="timer-main flex-center flex-col">
          <div className="ring-glow-halo">
            <div className="svg-ring-container flex-center">
              <svg className="progress-ring" width="460" height="460" viewBox="0 0 320 320">
                <defs>
                  <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5af2ad" />
                    <stop offset="100%" stopColor="#15b982" />
                  </linearGradient>
                </defs>
                <circle
                  className="progress-ring-bg"
                  strokeWidth="12"
                  fill="transparent"
                  r="140"
                  cx="160"
                  cy="160"
                />
                <circle
                  className="progress-ring-bar"
                  strokeWidth="12"
                  fill="transparent"
                  r="140"
                  cx="160"
                  cy="160"
                  style={{
                    strokeDasharray: '880',
                    strokeDashoffset: strokeDashoffset.toString(),
                  }}
                />
              </svg>
              <div className="time-display-large">
                {activeSession ? formatTime(remainingSeconds) : `${duration.toString().padStart(2, '0')}:00`}
              </div>
            </div>
          </div>

          <div className="session-configs flex-col gap-sm">
            {!activeSession ? (
              <button className="btn btn-primary start-btn flex-center" onClick={handleStart}>
                Launch Focus Session
              </button>
            ) : (
              <div className="timer-active-actions flex-center gap-md">
                {activePlantId !== 'sword' && (
                  isPaused ? (
                    <button className="btn btn-primary flex-1" onClick={resumeSession}>
                      Resume Study
                    </button>
                  ) : (
                    <button className="btn btn-secondary flex-1" onClick={pauseSession}>
                      Pause Session
                    </button>
                  )
                )}
                {activePlantId !== 'sword' && (
                  <button className="btn btn-secondary btn-danger-glow flex-1" onClick={requestQuit}>
                    Quit Focus
                  </button>
                )}
                {activePlantId === 'sword' && (
                  <div className="sword-active-tag">Sword Mode - No Exit</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="timer-sidebar flex-col">
          <div className="glass-card timer-control-panel flex-col gap-lg">
            <section className="timer-control-section flex-col gap-md">
              <h3>Duration</h3>
              <div className="presets-row">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    className={`preset-btn btn ${duration === preset ? 'active' : 'btn-secondary'}`}
                    onClick={() => !activeSession && setDuration(preset)}
                    disabled={activeSession !== null}
                  >
                    {preset}m
                  </button>
                ))}
              </div>

              <div className="custom-input-container">
                <span className="setting-desc">Custom Duration</span>
                <input
                  type="number"
                  className="setting-input duration-custom"
                  value={duration}
                  onChange={(e) => !activeSession && setDuration(parseInt(e.target.value) || 1)}
                  disabled={activeSession !== null}
                  min="1"
                  max="360"
                />
                <span className="setting-desc">minutes</span>
              </div>
            </section>

            <section className="timer-control-section flex-col gap-md">
              <h3>Study Category</h3>
              <select
                className="setting-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={activeSession !== null}
              >
                <option value="General Study">General Study</option>
                <option value="Online Lectures">Online Lectures</option>
                <option value="Coding & Tech">Coding & Tech</option>
                <option value="Reading & Research">Reading & Research</option>
              </select>
            </section>

            <section className="timer-control-section flex-col gap-md">
              <h3>Plant Seed</h3>
              <PlantSelector
                selectedPlantId={selectedPlantId}
                onSelectPlant={setSelectedPlantId}
                disabled={activeSession !== null}
              />
            </section>

            <section className="timer-control-section flex-col gap-md">
              <h3>Lock Mode</h3>
              <select
                className="setting-select"
                value={lockMode}
                onChange={(e) => setLockMode(e.target.value as LockMode)}
                disabled={activeSession !== null}
              >
                <option value="soft">Soft Lock</option>
                <option value="app">App Lock</option>
                <option value="view">View Lock</option>
                <option value="full">Full Lock</option>
              </select>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
