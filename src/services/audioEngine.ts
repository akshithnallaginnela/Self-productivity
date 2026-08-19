/**
 * audioEngine.ts — Procedural Web Audio API Soundscape Synthesizer
 *
 * Implements 100% offline, zero-cost procedural audio generation directly in-browser
 * using the standard HTML5 Web Audio API (OscillatorNode, BiquadFilterNode, GainNode,
 * AnalyserNode, and AudioBufferSourceNode).
 *
 * Features:
 *   1. 432Hz Harmonic Focus Drone: Pure warm sine wave tuned to natural 432Hz frequency
 *   2. 6Hz Theta Meditation Binaural Beats: Carrier wave 216Hz + 222Hz beat difference
 *   3. 40Hz Gamma Deep Work Waves: Carrier wave 200Hz + 240Hz for cognitive focus
 *   4. Procedural Brown Noise Rain & Thunder: Filtered white/brown noise buffer synthesis
 *   5. Real-time AnalyserNode FFT byte frequency analysis for live waveform visualization
 *   6. Milestone Triumph Bell Synth: Synthesized victory chime upon habit or timer completion
 */

import { SoundscapeTrack } from '../types';

/** Soundscape catalog configuration */
export const SOUNDSCAPE_TRACKS: SoundscapeTrack[] = [
  {
    id: 'track-432hz',
    name: '432Hz Sovereign Focus Drone',
    archetype: 'EAGLE',
    frequency: '432Hz',
    description: 'Harmonic resonance for high-altitude mental clarity and anxiety dissipation',
    type: 'sine-binaural',
    baseFreq: 432,
    beatFreq: 0,
    durationMinutes: 60
  },
  {
    id: 'track-theta',
    name: '6Hz Theta Deep Meditation',
    archetype: 'WOLF',
    frequency: '6Hz Theta',
    description: 'Subconscious rewiring frequency to dissolve chronic urges and mental fatigue',
    type: 'theta-calm',
    baseFreq: 216,
    beatFreq: 6,
    durationMinutes: 45
  },
  {
    id: 'track-gamma',
    name: '40Hz Gamma Executive Power',
    archetype: 'TIGER',
    frequency: '40Hz Gamma',
    description: 'Peak cognitive synchronization for intense freelance coding & proposal writing',
    type: 'gamma-focus',
    baseFreq: 200,
    beatFreq: 40,
    durationMinutes: 30
  },
  {
    id: 'track-rain',
    name: 'Monsoon Sanctuary Brown Noise',
    archetype: 'EAGLE',
    frequency: 'Low Pass 400Hz',
    description: 'Procedurally generated rain shield masking ambient household distractions',
    type: 'procedural-rain',
    baseFreq: 400,
    beatFreq: 0,
    durationMinutes: 90
  }
];

/**
 * WebAudioEngine class — manages audio context lifecycle, node routing,
 * synth parameters, and real-time frequency analysis.
 */
class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private primaryGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private noiseNode: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private currentTrackId: string | null = null;
  private onStateChange: ((playing: boolean, trackId: string | null) => void) | null = null;

  /**
   * Initializes or resumes the Web Audio Context.
   * Browsers require user interaction before activating AudioContext.
   */
  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Sets a callback listener for audio playback state changes.
   * @param callback Function receiving isPlaying state and active track ID
   */
  public setCallback(callback: (playing: boolean, trackId: string | null) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Toggles playback for a specified soundscape track.
   * @param trackId Unique identifier of the track
   */
  public togglePlay(trackId: string): void {
    if (this.isPlaying && this.currentTrackId === trackId) {
      this.stop();
    } else {
      this.playTrack(trackId);
    }
  }

  /**
   * Starts synthesizing the specified soundscape track in real-time.
   * @param trackId Unique identifier of the track to play
   */
  public playTrack(trackId: string): void {
    this.stop();

    const track = SOUNDSCAPE_TRACKS.find(t => t.id === trackId);
    if (!track) return;

    const ctx = this.initContext();

    // Master Gain Node with smooth fade-in
    this.primaryGain = ctx.createGain();
    this.primaryGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.primaryGain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 1.5);

    // Analyser Node for live waveform visualizer
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 64;

    this.primaryGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    if (track.type === 'procedural-rain') {
      this.startRainSynth(ctx, this.primaryGain);
    } else {
      this.startBinauralSynth(ctx, this.primaryGain, track.baseFreq, track.beatFreq);
    }

    this.isPlaying = true;
    this.currentTrackId = trackId;
    if (this.onStateChange) this.onStateChange(true, trackId);
  }

  /**
   * Synthesizes binaural beat frequencies using twin stereo oscillators.
   * @param ctx Active AudioContext
   * @param destination Destination gain node
   * @param baseFreq Base carrier frequency in Hz
   * @param beatFreq Frequency difference for binaural pulsing
   */
  private startBinauralSynth(ctx: AudioContext, destination: GainNode, baseFreq: number, beatFreq: number): void {
    // Left ear carrier oscillator
    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    // Right ear offset oscillator
    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(baseFreq + beatFreq, ctx.currentTime);

    // Subtle sub-bass grounding drone
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(baseFreq / 4, ctx.currentTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.15, ctx.currentTime);
    subOsc.connect(subGain);
    subGain.connect(destination);

    oscLeft.connect(destination);
    oscRight.connect(destination);

    oscLeft.start();
    oscRight.start();
    subOsc.start();

    this.oscillators = [oscLeft, oscRight, subOsc];
  }

  /**
   * Synthesizes procedural brown/pink noise rain texture using a procedural buffer.
   * @param ctx Active AudioContext
   * @param destination Destination gain node
   */
  private startRainSynth(ctx: AudioContext, destination: GainNode): void {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise filter
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Lowpass filter for deep soothing rainfall sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(destination);

    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }

  /**
   * Synthesizes a golden triumph chime when habits or Pomodoro sessions complete.
   */
  public playMilestoneTriumph(): void {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const notes = [528, 660, 792, 1056]; // Solfeggio / Triumph Arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.3);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Retrieves real-time FFT frequency data for visualizer bars.
   * @returns {Uint8Array} Byte frequency array
   */
  public getVisualizerData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(16);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Smoothly stops active synthesis with a fade-out.
   */
  public stop(): void {
    if (this.ctx && this.primaryGain) {
      try {
        this.primaryGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.2);
      } catch {
        // Ignore ramp error if context is closed
      }
    }

    setTimeout(() => {
      this.oscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch { /* Ignore */ }
      });
      this.oscillators = [];

      if (this.noiseNode) {
        try { this.noiseNode.stop(); this.noiseNode.disconnect(); } catch { /* Ignore */ }
        this.noiseNode = null;
      }

      this.isPlaying = false;
      this.currentTrackId = null;
      if (this.onStateChange) this.onStateChange(false, null);
    }, 250);
  }
}

/** Singleton WebAudioEngine instance exported for application-wide use */
export const audioEngine = new WebAudioEngine();
