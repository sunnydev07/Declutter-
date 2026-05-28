// Sound Management Utility for Declutter

// We use Web Audio API for simple chimes to avoid needing external assets,
// and HTML5 Audio for looping ambient backgrounds.

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
type CoachQuitStage = 1 | 2 | 3;
type CoachPersona = 'male' | 'female';

const motivationalWarnings: Record<CoachQuitStage, string[]> = {
  1: [
    'Stay with it. The urge will pass.',
    'One clean minute. Return to focus.',
    'Do not trade progress for a mood.',
    'Hold the line. You already started.',
  ],
  2: [
    'Second warning. Close the exit and continue.',
    'Resistance is loud. Your plan is stronger.',
    'You are training focus right now.',
    'Do the next step before deciding again.',
  ],
  3: [
    'Final warning. Choose deliberately.',
    'This exit has a cost. Breathe first.',
    'If it is not an emergency, go back.',
    'Your future self is watching this choice.',
  ],
};

let lastSpokenWarning = '';

function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoiseBurst(duration = 0.12, vol = 0.08) {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }

  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  filter.type = 'highpass';
  filter.frequency.setValueAtTime(700, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  source.stop(audioCtx.currentTime + duration);
}

function pickWarning(stage: CoachQuitStage) {
  const bank = motivationalWarnings[stage];
  let warning = bank[Math.floor(Math.random() * bank.length)];

  if (bank.length > 1 && warning === lastSpokenWarning) {
    warning = bank[(bank.indexOf(warning) + 1) % bank.length];
  }

  lastSpokenWarning = warning;
  return warning;
}

function maybeSpeakMotivation(stage: CoachQuitStage, persona: CoachPersona) {
  if (!('speechSynthesis' in window) || Math.random() > 0.55) return;

  const utterance = new SpeechSynthesisUtterance(pickWarning(stage));
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) => {
    const name = voice.name.toLowerCase();
    return persona === 'female'
      ? name.includes('female') || name.includes('zira') || name.includes('aria') || name.includes('jenny')
      : name.includes('male') || name.includes('david') || name.includes('guy') || name.includes('mark');
  });

  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.rate = stage === 1 ? 1.02 : stage === 2 ? 1.08 : 0.96;
  utterance.pitch = persona === 'female' ? 1.08 : 0.82;
  utterance.volume = stage === 3 ? 1 : 0.82;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export const playSessionCompleteChime = () => {
  // A pleasant, uplifting major chord arpeggio
  playTone(440, 'sine', 1.0, 0.2); // A4
  setTimeout(() => playTone(554.37, 'sine', 1.0, 0.2), 150); // C#5
  setTimeout(() => playTone(659.25, 'sine', 1.5, 0.2), 300); // E5
  setTimeout(() => playTone(880, 'sine', 2.0, 0.2), 450); // A5
};

export const playPlantWiltedChime = () => {
  // A sad, descending minor tone
  playTone(349.23, 'triangle', 0.5, 0.2); // F4
  setTimeout(() => playTone(329.63, 'triangle', 0.5, 0.2), 300); // E4
  setTimeout(() => playTone(311.13, 'triangle', 1.5, 0.2), 600); // Eb4
};

export const playTimerPausedChime = () => {
  // Short, neutral double blip
  playTone(600, 'square', 0.1, 0.05);
  setTimeout(() => playTone(600, 'square', 0.1, 0.05), 150);
};

export const playCoachQuitWarning = (stage: CoachQuitStage, persona: CoachPersona) => {
  if (stage === 1) {
    playTone(392, 'triangle', 0.18, 0.11);
    setTimeout(() => playTone(523.25, 'triangle', 0.14, 0.09), 140);
  } else if (stage === 2) {
    playNoiseBurst(0.08, 0.05);
    playTone(220, 'sawtooth', 0.2, 0.09);
    setTimeout(() => playTone(196, 'sawtooth', 0.18, 0.1), 180);
    setTimeout(() => playTone(440, 'square', 0.1, 0.05), 360);
  } else {
    playNoiseBurst(0.16, 0.07);
    playTone(146.83, 'sawtooth', 0.35, 0.11);
    setTimeout(() => playTone(174.61, 'sawtooth', 0.28, 0.11), 240);
    setTimeout(() => playTone(110, 'triangle', 0.55, 0.13), 520);
  }

  maybeSpeakMotivation(stage, persona);
};

export const playReturnToFocusCue = () => {
  window.speechSynthesis?.cancel();
  playTone(329.63, 'sine', 0.16, 0.08);
  setTimeout(() => playTone(440, 'sine', 0.2, 0.08), 120);
  setTimeout(() => playTone(659.25, 'sine', 0.28, 0.08), 260);
};

export const playEmergencyCodeRevealCue = () => {
  window.speechSynthesis?.cancel();
  playTone(164.81, 'triangle', 0.3, 0.1);
  setTimeout(() => playTone(123.47, 'triangle', 0.5, 0.12), 220);
};

export const playChallengeErrorCue = () => {
  playNoiseBurst(0.08, 0.06);
  playTone(90, 'square', 0.08, 0.05);
  setTimeout(() => playTone(90, 'square', 0.08, 0.05), 110);
};

// Ambient Background Audio
let currentAmbient: HTMLAudioElement | null = null;

export const playAmbientNoise = (type: 'rain' | 'cafe' | 'forest' | 'white-noise') => {
  stopAmbientNoise();
  
  // These should point to local files in /public/sounds/
  // For the sake of the prototype, if they don't exist, we just log.
  const path = `/sounds/${type}.mp3`;
  currentAmbient = new Audio(path);
  currentAmbient.loop = true;
  currentAmbient.volume = 0.3;
  
  currentAmbient.play().catch(e => {
    console.warn(`Could not play ambient noise ${type}. Ensure ${path} exists in the public directory.`, e);
  });
};

export const stopAmbientNoise = () => {
  if (currentAmbient) {
    currentAmbient.pause();
    currentAmbient.currentTime = 0;
    currentAmbient = null;
  }
};
