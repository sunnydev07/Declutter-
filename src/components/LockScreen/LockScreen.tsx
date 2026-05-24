import React, { useState } from 'react';
import './LockScreen.css';

interface LockScreenProps {
  remainingSeconds: number;
  lockMode: string;
  plantType?: string;
  allowEmergencyUnlock: boolean;
  onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ remainingSeconds, lockMode, plantType, allowEmergencyUnlock, onUnlock }) => {
  const [challengeText, setChallengeText] = useState('');
  const [showChallenge, setShowChallenge] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Generate a random 15-character string challenge to break the lock
  const [targetChallenge] = useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    return Array.from({ length: 15 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  });

  const isSword = plantType === 'sword';

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (challengeText === targetChallenge) {
      onUnlock();
    } else {
      setErrorMsg('Incorrect challenge text. Attempt failed.');
      setChallengeText('');
    }
  };

  return (
    <div className={`lockscreen-overlay lock-mode-${lockMode} ${isSword ? 'lock-mode-sword' : ''}`}>
      <div className="lockscreen-glow"></div>
      
      <div className="lockscreen-content flex-center flex-col">
        <div className="sprout-icon">{isSword ? '⚔️' : '🌱'}</div>
        
        <h2 className="lockscreen-status">
          {isSword ? 'Sword Mode — No Escape' : 'Focus Lock Engaged'}
        </h2>
        <p className="lockscreen-mode-tag">
          {isSword ? '⚔️ TOTAL COMMITMENT' : `Intensity: ${lockMode.toUpperCase()}`}
        </p>
        
        <div className="lockscreen-timer">
          {formatTime(remainingSeconds)}
        </div>

        <p className="lockscreen-quote">
          {isSword 
            ? '"A warrior who retreats is no warrior at all. Hold the line."'
            : '"The successful warrior is the average man, with laser-like focus."'
          }
        </p>

        {/* Sword mode: NO emergency unlock at all */}
        {isSword ? (
          <div className="sword-commitment-badge">
            <span>🔒</span> Emergency unlock disabled — you chose Sword.
          </div>
        ) : allowEmergencyUnlock ? (
          /* Normal mode: show emergency unlock */
          !showChallenge ? (
            <button 
              className="btn btn-secondary emergency-trigger-btn"
              onClick={() => setShowChallenge(true)}
            >
              Emergency Break Lock
            </button>
          ) : (
            <form className="challenge-form flex-center flex-col animate-fade-in-up" onSubmit={handleChallengeSubmit}>
              <p className="challenge-instructions">
                To emergency unlock, you must type this string exactly.
                <br />
                <strong className="challenge-code">{targetChallenge}</strong>
              </p>
              
              <input
                type="text"
                className="setting-input challenge-input"
                value={challengeText}
                onChange={(e) => {
                  setChallengeText(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Type the code here..."
                autoFocus
              />

              {errorMsg && <p className="challenge-error">{errorMsg}</p>}
              
              <div className="challenge-actions gap-md">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowChallenge(false);
                    setChallengeText('');
                    setErrorMsg('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-danger-glow">
                  Submit & Break Lock
                </button>
              </div>
            </form>
          )
        ) : null}
      </div>
    </div>
  );
};

export default LockScreen;

