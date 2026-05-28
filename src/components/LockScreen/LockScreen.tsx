import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { CoachAiMode, CoachPersona, LockMode } from '../../types/session';
import {
  buildCoachIntervention,
  requestGeminiCoachCopy,
  type CoachIntervention,
  type CoachSessionContext,
  type CoachStage,
} from '../../utils/coachEngine';
import {
  playChallengeErrorCue,
  playCoachQuitWarning,
  playEmergencyCodeRevealCue,
  playReturnToFocusCue,
} from '../../utils/sounds';
import './LockScreen.css';

interface LockScreenProps {
  remainingSeconds: number;
  lockMode: LockMode;
  plantType?: string;
  sessionId: string;
  plannedDurationMinutes: number;
  category?: string;
  coachPersona: CoachPersona;
  coachAiMode: CoachAiMode;
  coachGeminiApiKey?: string;
  allowEmergencyUnlock: boolean;
  quitRequestId: number;
  onUnlock: () => void;
}

const SWORD_ICON = '\u2694\uFE0F';
const SPROUT_ICON = '\u{1F331}';
const LOCK_ICON = '\u{1F512}';

const LockScreen = ({
  remainingSeconds,
  lockMode,
  plantType,
  sessionId,
  plannedDurationMinutes,
  category,
  coachPersona,
  coachAiMode,
  coachGeminiApiKey,
  allowEmergencyUnlock,
  quitRequestId,
  onUnlock,
}: LockScreenProps) => {
  const [challengeText, setChallengeText] = useState('');
  const [showChallenge, setShowChallenge] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [coachAttemptCount, setCoachAttemptCount] = useState(0);
  const [coachStage, setCoachStage] = useState<CoachStage | null>(null);
  const [coachContext, setCoachContext] = useState<CoachSessionContext | null>(null);
  const [personalizedCopy, setPersonalizedCopy] = useState<Pick<CoachIntervention, 'message' | 'quote'> | null>(null);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [coachImageFailed, setCoachImageFailed] = useState(false);
  const lastQuitRequestId = useRef(quitRequestId);

  // Generate a random 15-character string challenge to break the lock.
  const [targetChallenge] = useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    return Array.from({ length: 15 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  });

  const isSword = plantType === 'sword';

  const liveCoachContext = useMemo<CoachSessionContext>(() => ({
    sessionId,
    remainingSeconds,
    plannedDurationMinutes,
    lockMode,
    category,
    plantType,
  }), [category, lockMode, plannedDurationMinutes, plantType, remainingSeconds, sessionId]);

  const localCoachIntervention = useMemo(() => {
    if (!coachStage || !coachContext) return null;
    return buildCoachIntervention(coachStage, coachPersona, coachContext);
  }, [coachContext, coachPersona, coachStage]);

  const coachIntervention = useMemo<CoachIntervention | null>(() => {
    if (!localCoachIntervention) return null;

    return {
      ...localCoachIntervention,
      ...(personalizedCopy ?? {}),
      source: personalizedCopy ? 'gemini' : 'local',
    };
  }, [localCoachIntervention, personalizedCopy]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const resetCoachPanel = () => {
    setCoachStage(null);
    setCoachContext(null);
    setPersonalizedCopy(null);
    setIsPersonalizing(false);
    setCoachImageFailed(false);
  };

  const openCoachGate = useCallback(() => {
    if (isSword || !allowEmergencyUnlock) return;

    const nextStage = Math.min(coachAttemptCount + 1, 3) as CoachStage;
    playCoachQuitWarning(nextStage, coachPersona);
    setCoachAttemptCount(nextStage);
    setCoachContext(liveCoachContext);
    setCoachStage(nextStage);
    setShowChallenge(false);
    setChallengeText('');
    setErrorMsg('');
    setPersonalizedCopy(null);
    setIsPersonalizing(false);
  }, [allowEmergencyUnlock, coachAttemptCount, coachPersona, isSword, liveCoachContext]);

  useEffect(() => {
    if (lastQuitRequestId.current === quitRequestId) return;

    lastQuitRequestId.current = quitRequestId;
    openCoachGate();
  }, [openCoachGate, quitRequestId]);

  useEffect(() => {
    setCoachAttemptCount(0);
    setShowChallenge(false);
    setChallengeText('');
    setErrorMsg('');
    resetCoachPanel();
    lastQuitRequestId.current = quitRequestId;
  }, [sessionId]);

  useEffect(() => {
    setCoachImageFailed(false);
  }, [coachIntervention?.gifPath]);

  useEffect(() => {
    if (
      !localCoachIntervention ||
      !coachContext ||
      coachAiMode !== 'gemini_optional' ||
      !coachGeminiApiKey?.trim()
    ) {
      setPersonalizedCopy(null);
      setIsPersonalizing(false);
      return;
    }

    let isCurrent = true;
    setPersonalizedCopy(null);
    setIsPersonalizing(true);

    requestGeminiCoachCopy(localCoachIntervention, coachContext, coachGeminiApiKey)
      .then((copy) => {
        if (isCurrent && copy) {
          setPersonalizedCopy(copy);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsPersonalizing(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [coachAiMode, coachContext, coachGeminiApiKey, localCoachIntervention]);

  const handleChallengeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (challengeText === targetChallenge) {
      onUnlock();
    } else {
      playChallengeErrorCue();
      setErrorMsg('Incorrect challenge text. Attempt failed.');
      setChallengeText('');
    }
  };

  const handleReturnToFocus = () => {
    playReturnToFocusCue();
    resetCoachPanel();
  };

  const handleShowChallenge = () => {
    playEmergencyCodeRevealCue();
    resetCoachPanel();
    setShowChallenge(true);
  };

  const handleStillQuitting = () => {
    if (coachStage === 3) {
      handleShowChallenge();
      return;
    }

    openCoachGate();
  };

  return createPortal(
    <div className={`lockscreen-overlay lock-mode-${lockMode} ${isSword ? 'lock-mode-sword' : ''}`}>
      <div className="lockscreen-glow"></div>

      <div className={`lockscreen-content flex-center flex-col ${coachIntervention ? 'coach-active' : ''}`}>
        {coachIntervention ? (
          <div className="coach-panel animate-fade-in-up">
            <div className="coach-visual-shell" aria-hidden="true">
              {!coachImageFailed ? (
                <img
                  className="coach-gif"
                  src={coachIntervention.gifPath}
                  alt=""
                  onError={() => setCoachImageFailed(true)}
                />
              ) : (
                <div className="coach-emoji-fallback">{coachIntervention.personaEmoji}</div>
              )}
            </div>

            <div className="coach-copy">
              <div className="coach-kicker">
                <span>{coachIntervention.coachName}</span>
                <span>{coachIntervention.intensity}</span>
                <span>Stage {coachIntervention.stage}/3</span>
              </div>

              <h2 className="coach-headline">{coachIntervention.headline}</h2>
              <p className="coach-message">{coachIntervention.message}</p>
              <blockquote className="coach-quote">{coachIntervention.quote}</blockquote>

              <div className="coach-context-strip">
                <span>{formatTime(remainingSeconds)} left</span>
                <span>{lockMode.toUpperCase()} lock</span>
                <span>{category || 'Focus session'}</span>
              </div>

              <div className="coach-actions">
                <button type="button" className="btn btn-primary" onClick={handleReturnToFocus}>
                  Return to Focus
                </button>
                <button type="button" className="btn btn-secondary btn-danger-glow" onClick={handleStillQuitting}>
                  {coachIntervention.stage === 3 ? 'Show Emergency Code' : 'Still quitting'}
                </button>
              </div>

              {isPersonalizing && (
                <p className="coach-personalizing">Personalizing coach copy...</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="sprout-icon">{isSword ? SWORD_ICON : SPROUT_ICON}</div>

            <h2 className="lockscreen-status">
              {isSword ? 'Sword Mode - No Escape' : 'Focus Lock Engaged'}
            </h2>
            <p className="lockscreen-mode-tag">
              {isSword ? `${SWORD_ICON} TOTAL COMMITMENT` : `Intensity: ${lockMode.toUpperCase()}`}
            </p>

            <div className="lockscreen-timer">
              {formatTime(remainingSeconds)}
            </div>

            <p className="lockscreen-quote">
              {isSword
                ? '"A warrior who retreats is no warrior at all. Hold the line."'
                : '"The successful warrior is the average person with laser-like focus."'
              }
            </p>

            {isSword ? (
              <div className="sword-commitment-badge">
                <span>{LOCK_ICON}</span> Emergency unlock disabled - you chose Sword.
              </div>
            ) : allowEmergencyUnlock ? (
              !showChallenge ? (
                <button
                  type="button"
                  className="btn btn-secondary emergency-trigger-btn"
                  onClick={openCoachGate}
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
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default LockScreen;
