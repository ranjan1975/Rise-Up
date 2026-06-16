/**
 * SoundManager - Programmatic sound generation using Web Audio API.
 * Ensures zero-latency audio, self-contained assets (no audio files to load),
 * and dynamic music changes based on Day/Night modes.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMusicPlaying = false;
    this.isNightMode = false;
    this.isUfoActive = false;
    
    // Audio elements (pre-configured paths)
    this.dayPath = 'Balloon Drift.mp3';
    this.nightPath = 'Moonlit Balloon Loop.mp3';
    this.ufoPath = 'UFO Descent.mp3';
    this.birdPaths = ['Bird1.mp3', 'Bird2.mp3', 'Bird3.mp3'];
    
    this.audioDay = null;
    this.audioNight = null;
    this.audioUfo = null;
    this.audioBirds = [];
    this.currentAudio = null;
  }

  // Initialize Audio Context on first user interaction (browser security requirement)
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    // Lazily create Audio elements on first user interaction
    if (!this.audioDay) {
      this.audioDay = new Audio(this.dayPath);
      this.audioDay.preload = 'auto';
      this.audioDay.loop = true;
      this.audioDay.volume = 0.14; // Low volume so SFX are audible
    }
    if (!this.audioNight) {
      this.audioNight = new Audio(this.nightPath);
      this.audioNight.preload = 'auto';
      this.audioNight.loop = true;
      this.audioNight.volume = 0.14; // Low volume
    }
    if (!this.audioUfo) {
      this.audioUfo = new Audio(this.ufoPath);
      this.audioUfo.preload = 'auto';
      this.audioUfo.loop = true;
      this.audioUfo.volume = 0.18; // Slightly louder but still low
    }
    if (this.audioBirds.length === 0) {
      this.birdPaths.forEach(path => {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = 0.22; // Make squawk audible over BGM
        this.audioBirds.push(audio);
      });
    }
  }

  // Create an ADSR (Attack, Decay, Sustain, Release) envelope
  createEnvelope(gainNode, startTime, duration, maxGain = 0.1) {
    const attack = 0.02;
    const decay = 0.08;
    const sustain = 0.6;
    const release = duration - attack - decay;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(maxGain, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(maxGain * sustain, startTime + attack + decay);
    gainNode.gain.setValueAtTime(maxGain * sustain, startTime + duration - release);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  }

  // Play a funny rubbery "POP" sound (deflective slide whistle pop)
  playPop() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Main balloon body deflate squeak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Frequency slide down (pop deflating sound)
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);
    
    // Gain envelope
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    
    osc.start(now);
    osc.stop(now + 0.23);

    // Sharp "click" transient for the rubber pop
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    
    clickOsc.type = 'sine';
    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    
    clickOsc.frequency.setValueAtTime(1200, now);
    clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.03);
    
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    clickOsc.start(now);
    clickOsc.stop(now + 0.04);
  }

  // Play a happy chiptune "Coin Collect" sound (arpeggiated chime)
  playCoin(denomination) {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Speed/Tone changes slightly based on denomination
    const baseFreq = denomination === 30 ? 659.25 : (denomination === 20 ? 587.33 : 523.25); // E5, D5, C5
    const pitchShift = 1.5; // Arpeggio step multiplier

    // Play rapid arpeggio (C5 -> G5)
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * pitchShift, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  // Play a dramatic transition sound when Night Mode starts
  playTransition() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Whoosh sweeping filter
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    // Deep frequency sweep up
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 1.2);
    
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 1.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.start(now);
    osc.stop(now + 1.25);
  }

  // Play a funny, strange bird squawk/honk sound
  playBirdSquawk() {
    this.init();
    
    if (this.audioBirds.length > 0) {
      // Pick a random bird squawk file
      const idx = Math.floor(Math.random() * this.audioBirds.length);
      const birdAudio = this.audioBirds[idx];
      try {
        birdAudio.currentTime = 0;
        birdAudio.play().catch(err => {
          console.warn("Autoplay blocked or audio load error for bird squawk:", err);
          this.playSynthBirdSquawk();
        });
      } catch (e) {
        console.warn("Error playing bird audio, falling back to synth:", e);
        this.playSynthBirdSquawk();
      }
    } else {
      this.playSynthBirdSquawk();
    }
  }

  // Synthesizer fallback for bird squawk sound
  playSynthBirdSquawk() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Strange modulating squawk/honk
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(650, now + 0.06);
    osc.frequency.linearRampToValueAtTime(280, now + 0.16);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  // Play a funny wet poop squish sound
  playPoopSquish() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    filter.type = 'lowpass';
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    // Deep ploppy pitch slide down
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.15);
    
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(80, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  // Play a continuous pulsating UFO spaceship hum using FM synthesis
  playUFOHum() {
    this.init();
    if (!this.ctx || this.ufoHumOsc) return;

    const now = this.ctx.currentTime;
    
    // Create base hum and LFO modulation
    this.ufoHumOsc = this.ctx.createOscillator();
    this.ufoHumLFO = this.ctx.createOscillator();
    this.ufoHumLFOVolume = this.ctx.createGain();
    this.ufoHumGain = this.ctx.createGain();

    this.ufoHumOsc.type = 'sawtooth';
    this.ufoHumOsc.frequency.setValueAtTime(65, now); // Low hum frequency (65 Hz)

    // Muffle the sawtooth wave with lowpass
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(130, now);

    // Pulsate at 5.5 Hz for flying saucer sound
    this.ufoHumLFO.frequency.setValueAtTime(5.5, now);
    this.ufoHumLFOVolume.gain.setValueAtTime(10, now); // wobble intensity

    this.ufoHumLFO.connect(this.ufoHumLFOVolume);
    this.ufoHumLFOVolume.connect(this.ufoHumOsc.frequency);

    this.ufoHumOsc.connect(lp);
    lp.connect(this.ufoHumGain);
    this.ufoHumGain.connect(this.ctx.destination);

    this.ufoHumGain.gain.setValueAtTime(0, now);
    this.ufoHumGain.gain.linearRampToValueAtTime(0.06, now + 0.6); // Fade in smoothly

    this.ufoHumOsc.start(now);
    this.ufoHumLFO.start(now);
  }

  // Fade out and stop the UFO hum
  stopUFOHum() {
    if (this.ufoHumOsc) {
      const now = this.ctx.currentTime;
      try {
        this.ufoHumGain.gain.cancelScheduledValues(now);
        this.ufoHumGain.gain.setValueAtTime(this.ufoHumGain.gain.value, now);
        this.ufoHumGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35); // Fade out
      } catch(e) {}

      // Keep reference local to prevent rapid double clicks causing conflicts
      const osc = this.ufoHumOsc;
      const lfo = this.ufoHumLFO;
      
      this.ufoHumOsc = null;
      this.ufoHumLFO = null;

      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          lfo.stop();
          lfo.disconnect();
        } catch(e) {}
      }, 400);
    }
  }

  // Play a quick synth laser firing "pew quack" sound for light bombs
  playUFOShoot() {
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Dynamic pitch slide down (pew sound)
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  // Play a repeating siren warning for the UFO
  playUFOWarning() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Two-tone warning beep
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.setValueAtTime(650, now + 0.12);
    osc.frequency.setValueAtTime(500, now + 0.24);
    
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.setValueAtTime(0.04, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Play a laser charging + discharging sound effect
  playUFOLaser() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // 1. Charge Sound (High pitch sweep up)
    const chargeOsc = this.ctx.createOscillator();
    const chargeGain = this.ctx.createGain();
    chargeOsc.type = 'sine';
    chargeOsc.connect(chargeGain);
    chargeGain.connect(this.ctx.destination);
    
    chargeOsc.frequency.setValueAtTime(150, now);
    chargeOsc.frequency.exponentialRampToValueAtTime(1300, now + 1.25);
    
    chargeGain.gain.setValueAtTime(0.01, now);
    chargeGain.gain.linearRampToValueAtTime(0.06, now + 1.25);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    
    chargeOsc.start(now);
    chargeOsc.stop(now + 1.3);
    
    // 2. Blast Sound (Deep raw synth buzz)
    const blastOsc = this.ctx.createOscillator();
    const blastGain = this.ctx.createGain();
    blastOsc.type = 'sawtooth';
    blastOsc.connect(blastGain);
    blastGain.connect(this.ctx.destination);
    
    blastOsc.frequency.setValueAtTime(75, now + 1.3);
    blastOsc.frequency.linearRampToValueAtTime(55, now + 3.0);
    
    blastGain.gain.setValueAtTime(0, now);
    blastGain.gain.setValueAtTime(0.16, now + 1.3);
    blastGain.gain.linearRampToValueAtTime(0.1, now + 2.5);
    blastGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
    
    blastOsc.start(now + 1.3);
    blastOsc.stop(now + 3.05);
  }

  // Play correct background track based on game states
  playCurrentBgm() {
    this.init();
    
    let targetAudio = this.audioDay;
    if (this.isUfoActive) {
      targetAudio = this.audioUfo;
    } else if (this.isNightMode) {
      targetAudio = this.audioNight;
    }

    // Case 1: Switching tracks
    if (this.currentAudio !== targetAudio) {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }

      this.currentAudio = targetAudio;

      if (this.isMusicPlaying && this.currentAudio) {
        if (this.currentAudio === this.audioUfo) {
          if (this.audioUfo.readyState >= 1) {
            this.audioUfo.currentTime = 30.0;
          } else {
            const onMetadata = () => {
              this.audioUfo.currentTime = 30.0;
            };
            this.audioUfo.addEventListener('loadedmetadata', onMetadata, { once: true });
          }
        }
        this.currentAudio.play().catch(err => {
          console.warn("Autoplay blocked or audio load error:", err);
        });
      }
    } else {
      // Case 2: Same track, check if we need to resume or pause it based on isMusicPlaying
      if (this.currentAudio) {
        if (this.isMusicPlaying) {
          if (this.currentAudio.paused) {
            this.currentAudio.play().catch(err => {
              console.warn("Autoplay blocked or audio load error:", err);
            });
          }
        } else {
          if (!this.currentAudio.paused) {
            this.currentAudio.pause();
          }
        }
      }
    }
  }

  startMusic() {
    this.init();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.playCurrentBgm();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  setNightMode(active) {
    this.isNightMode = active;
    if (this.isMusicPlaying) {
      this.playCurrentBgm();
    }
  }

  setUfoActive(active) {
    this.isUfoActive = active;
    if (this.isMusicPlaying) {
      this.playCurrentBgm();
    }
  }
}

// Global instance
const audioManager = new SoundManager();
window.audioManager = audioManager;
