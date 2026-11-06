// Real-time Web Audio Synthesizer for Party Sound Effects
// 100% serverless, zero asset dependencies, zero latency

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAirhorn() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Classic DJ Airhorn Chord: G4, C5, F5, G5
  const freqs = [392.0, 523.25, 698.46, 783.99];

  // 3 rhythmic blasts: blast, blast, long blast
  const blasts = [
    { start: 0, dur: 0.12 },
    { start: 0.18, dur: 0.12 },
    { start: 0.36, dur: 0.38 },
  ];

  blasts.forEach(({ start, dur }) => {
    const blastTime = now + start;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, blastTime);
      // Slight pitch bend up at start, down at tail
      osc.frequency.linearRampToValueAtTime(freq * 1.03, blastTime + 0.03);
      osc.frequency.linearRampToValueAtTime(freq * 0.98, blastTime + dur);

      gain.gain.setValueAtTime(0, blastTime);
      gain.gain.linearRampToValueAtTime(0.08, blastTime + 0.01);
      gain.gain.setValueAtTime(0.08, blastTime + dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, blastTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(blastTime);
      osc.stop(blastTime + dur);
    });
  });
}

export function playScratch() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // DJ Vinyl Scratch
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.22);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.setValueAtTime(0.18, now + 0.25);
  gain.gain.linearRampToValueAtTime(0, now + 0.32);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.33);
}

export function playBassDrop() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // 808 Sub Boom Pitch Drop
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.9);

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 1.25);
}

export function playCheer() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Synthesized Crowd Applause Burst
  const bufferSize = ctx.sampleRate * 0.8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.Q.setValueAtTime(1.5, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.85);
}

export function playPartySound(type: 'airhorn' | 'scratch' | 'bassdrop' | 'cheer') {
  try {
    switch (type) {
      case 'airhorn':
        playAirhorn();
        break;
      case 'scratch':
        playScratch();
        break;
      case 'bassdrop':
        playBassDrop();
        break;
      case 'cheer':
        playCheer();
        break;
    }
  } catch (err) {
    console.warn('Sound effect playback failed:', err);
  }
}
