import React, { useState } from 'react';
import { useSession } from '../../hooks/useSession';
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

  const [duration, setDuration] = useState(25);
  const [lockMode, setLockMode] = useState<LockMode>('soft');
  const [category, setCategory] = useState('General Study');
  const [selectedPlantId, setSelectedPlantId] = useState('oak');

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startSession(duration, lockMode, category, selectedPlantId);
  };

  // Calculate circular SVG progress ring offset
  const plannedSeconds = duration * 60;
  const progressRatio = activeSession ? remainingSeconds / plannedSeconds : 1;
  const strokeDashoffset = 880 * (1 - progressRatio); // 880 is the circumference (2 * pi * 140)

  return (
    <div className="timer-container animate-fade-in-up">
      {/* If there is an active session, mount the fullscreen lock overlay */}
      {activeSession && (
        <LockScreen
          remainingSeconds={remainingSeconds}
          lockMode={activeSession.lockMode}
          plantType={selectedPlantId}
          allowEmergencyUnlock={selectedPlantId !== 'sword'}
          onUnlock={forceUnlock}
        />
      )}

      <div className="timer-header">
        <h1>Distraction-Free Study</h1>
        <p>Set your timer, select your lock strength, and begin focusing.</p>
      </div>

      <div className="timer-grid">
        {/* Left Side: Circular Countdown Ring */}
        <div className="glass-card timer-main flex-center flex-col">
          <div className="ring-glow-halo">
            <div className="svg-ring-container flex-center">
              <svg className="progress-ring" width="320" height="320">
                <circle
                  className="progress-ring-bg"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="12"
                  fill="transparent"
                  r="140"
                  cx="160"
                  cy="160"
                />
                <circle
                  className="progress-ring-bar"
                  stroke="var(--accent-primary)"
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
                🚀 Launch Focus Session
              </button>
            ) : (
              <div className="flex-center gap-md" style={{ width: '100%' }}>
                {selectedPlantId !== 'sword' && (
                  isPaused ? (
                    <button className="btn btn-primary flex-1" onClick={resumeSession}>
                      ▶️ Resume Study
                    </button>
                  ) : (
                    <button className="btn btn-secondary flex-1" onClick={pauseSession}>
                      ⏸️ Pause Session
                    </button>
                  )
                )}
                {selectedPlantId !== 'sword' && (
                  <button className="btn btn-secondary btn-danger-glow flex-1" onClick={forceUnlock}>
                    🛑 Quit Focus
                  </button>
                )}
                {selectedPlantId === 'sword' && (
                  <div className="sword-active-tag">⚔️ Sword Mode — No Exit</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Preset study durations and Lock parameters */}
        <div className="timer-sidebar flex-col gap-lg">
          <div className="glass-card flex-col gap-md">
            <h3>Focus Target Duration</h3>
            <div className="presets-row">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  className={`preset-btn btn ${duration === p ? 'active' : 'btn-secondary'}`}
                  onClick={() => !activeSession && setDuration(p)}
                  disabled={activeSession !== null}
                >
                  {p}m
                </button>
              ))}
            </div>

            <div className="flex-center gap-md custom-input-container">
              <span className="setting-desc">Custom Duration:</span>
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
          </div>

          <div className="glass-card flex-col gap-md">
            <h3>Focus Configuration</h3>
            
            <div className="flex-col gap-xs">
              <span className="setting-desc">Study Category:</span>
              <select
                className="setting-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={activeSession !== null}
                style={{ width: '100%' }}
              >
                <option value="General Study">📚 General Study</option>
                <option value="Online Lectures">📹 Online Lectures</option>
                <option value="Coding & Tech">💻 Coding & Tech</option>
                <option value="Reading & Research">📖 Reading & Research</option>
              </select>
            </div>

            <PlantSelector
              selectedPlantId={selectedPlantId}
              onSelectPlant={setSelectedPlantId}
              disabled={activeSession !== null}
            />

            <div className="flex-col gap-xs">
              <span className="setting-desc">Lock Security Strength:</span>
              <select
                className="setting-select"
                value={lockMode}
                onChange={(e) => setLockMode(e.target.value as LockMode)}
                disabled={activeSession !== null}
                style={{ width: '100%' }}
              >
                <option value="soft">Soft Lock (Warning Banners)</option>
                <option value="app">App Lock (Block list Only)</option>
                <option value="view">View Lock (Blocks keystrokes, allows mouse)</option>
                <option value="full">Full Lock (Kiosk overlay, full systems lock)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
