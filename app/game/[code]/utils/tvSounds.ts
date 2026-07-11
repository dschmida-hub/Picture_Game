// Small synthesized sound effects for TV Mode (Web Audio API oscillators,
// no audio files to host or license). Browsers block audio playback until
// a user gesture unlocks it, so unlockTvAudio() must be called from a real
// click - everything else silently no-ops until that happens.

type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext ||
    null
  );
}

export function unlockTvAudio() {
  const Ctor = getAudioContextConstructor();
  if (!Ctor) return;

  if (!audioContext) {
    audioContext = new Ctor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function getRunningContext(): AudioContext | null {
  return audioContext && audioContext.state === "running" ? audioContext : null;
}

// A rising pitch sweep timed to match the "and the winner is..." suspense
// beat before the image pops in.
export function playAnticipationRiser(durationSeconds = 2.2) {
  const ctx = getRunningContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(160, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + durationSeconds);

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + durationSeconds * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + durationSeconds + 0.05);
}

// A short rising four-note chime for the actual reveal moment.
export function playRevealChime() {
  const ctx = getRunningContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + index * 0.09;

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.55);
  });
}
