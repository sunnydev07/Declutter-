// Sound Management Utility for Declutter

// We use Web Audio API for simple chimes to avoid needing external assets,
// and HTML5 Audio for looping ambient backgrounds.

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

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
