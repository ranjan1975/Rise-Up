/**
 * Sky Shield: Balloon Ascent
 * Core Game Engine
 */

class GameEngine {
  constructor() {
    this.setViewportHeight();
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // UI Elements
    this.hud = document.getElementById('hud');
    this.scoreVal = document.getElementById('score-val');
    this.coinVal = document.getElementById('coin-val');
    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.startBtn = document.getElementById('start-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.finalScore = document.getElementById('final-score');
    this.finalCoins = document.getElementById('final-coins');
    this.highScoreVal = document.getElementById('high-score-val');
    this.mobileControls = document.getElementById('mobile-controls');
    this.mobileSwapBtn = document.getElementById('mobile-swap-btn');
    this.activeIndicator = document.getElementById('active-indicator');
    this.activeBalloonName = document.getElementById('active-balloon-name');
    
    // Pause UI Elements
    this.pauseBtn = document.getElementById('pause-btn');
    this.pauseScreen = document.getElementById('pause-screen');
    this.resumeBtn = document.getElementById('resume-btn');
    this.pauseRestartBtn = document.getElementById('pause-restart-btn');
    this.muteBtn = document.getElementById('mute-btn');
    this.muteIcon = document.getElementById('mute-icon');
    
    // Game State
    this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
    this.score = 0;
    this.coins = 0;
    this.scorePenalty = 0;
    this.highScore = parseInt(localStorage.getItem('sky_shield_highscore') || '0');
    this.isNightMode = false;
    this.nightModeTimer = 0;
    this.dayModeTimer = 0;
    this.nightModeUnlocked = false;
    this.distance = 0; // Simulated altitude
    
    // Game Entities
    this.balloons = [];
    this.activeBalloonIdx = 0;
    this.clouds = [];
    this.hazards = [];
    this.coinBags = [];
    this.particles = [];
    this.stars = []; // For night mode
    this.birds = [];
    
    // UFO Boss parameters
    this.ufo = null;
    this.ufoTimer = 0;
    this.ufoWarningActive = false;
    this.ufoWarningTimer = 0;
    this.ufoWarningSirenTimer = 0;
    
    // Game Settings & Tuning
    this.scrollSpeed = 120; // Px per second
    this.spawnTimers = { cloud: 0, hazard: 0, coin: 0 };
    this.level = 1; // Level 1: 1 balloon, Level 2: 2 balloons
    
    // Input Handling State
    this.keys = {};
    this.touchStart = null;
    this.joystickInput = { x: 0, y: 0 };
    this.isTouchDevice = false;
    this.isDragging = false;
    this.dragStartTouchX = 0;
    this.dragStartTouchY = 0;
    this.dragStartBalloonX = 0;
    this.dragStartBalloonY = 0;
    
    // Event listeners
    this.initEventListeners();
    this.resizeCanvas();
    this.setupStars();
    
    // High Score display
    this.highScoreVal.innerText = this.highScore;
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    window.audioManager.stopMusic();
    window.audioManager.stopUFOHum();
    this.pauseScreen.classList.remove('hidden');
    this.mobileControls.classList.add('hidden');
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    window.audioManager.startMusic();
    if (this.ufo) {
      window.audioManager.playUFOHum();
    }
    this.pauseScreen.classList.add('hidden');
    if (this.isTouchDevice) {
      this.mobileControls.classList.remove('hidden');
    }
    this.lastTime = performance.now(); // Reset lastTime to prevent dt jump
  }

  updateMuteIcon(isMuted) {
    if (!this.muteIcon) return;
    if (isMuted) {
      // Draw speaker with an 'X' (muted state)
      this.muteIcon.innerHTML = `
        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      `;
    } else {
      // Draw speaker with sound waves (unmuted state)
      this.muteIcon.innerHTML = `
        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
        <path id="sound-waves" d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      `;
    }
  }

  // Set up stars once for Night Mode
  setupStars() {
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * 450,
        y: Math.random() * 850,
        size: Math.random() * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI
      });
    }
  }

  setViewportHeight() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  initEventListeners() {
    // Resize & Viewport updates
    const onResize = () => {
      this.setViewportHeight();
      this.resizeCanvas();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.swapBalloons();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
      }
    });
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);

    // Click/Touch Actions
    this.startBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.startGame());
    this.mobileSwapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.swapBalloons();
    });
    this.pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.pauseGame();
    });
    this.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = window.audioManager.toggleMute();
      this.updateMuteIcon(isMuted);
    });
    this.resumeBtn.addEventListener('click', () => this.resumeGame());
    this.pauseRestartBtn.addEventListener('click', () => {
      this.resumeGame();
      this.startGame();
    });

    // Touch events for Direct Canvas Dragging
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.state !== 'PLAYING') return;
      this.isTouchDevice = true;
      this.mobileControls.classList.remove('hidden');
      
      const touch = e.targetTouches[0];
      const activeBalloon = this.balloons[this.activeBalloonIdx];
      if (activeBalloon && activeBalloon.alive && !activeBalloon.popping) {
        this.isDragging = true;
        this.dragStartTouchX = touch.clientX;
        this.dragStartTouchY = touch.clientY;
        this.dragStartBalloonX = activeBalloon.x;
        this.dragStartBalloonY = activeBalloon.y;
        e.preventDefault(); // Stop page scrolling/bouncing
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.state !== 'PLAYING') return;
      
      if (this.isDragging) {
        e.preventDefault(); // Stop browser scrolling/panning
        
        const touch = e.targetTouches[0];
        const activeBalloon = this.balloons[this.activeBalloonIdx];
        if (activeBalloon && activeBalloon.alive && !activeBalloon.popping) {
          const deltaX_css = touch.clientX - this.dragStartTouchX;
          const deltaY_css = touch.clientY - this.dragStartTouchY;
          
          // Convert CSS delta to virtual coordinate delta
          const deltaX_virtual = deltaX_css / this.scaleX;
          const deltaY_virtual = deltaY_css / this.scaleY;
          
          activeBalloon.x = this.dragStartBalloonX + deltaX_virtual;
          activeBalloon.y = this.dragStartBalloonY + deltaY_virtual;
          
          // Clamp position to virtual screen bounds
          activeBalloon.x = Math.max(activeBalloon.radius, Math.min(this.virtualWidth - activeBalloon.radius, activeBalloon.x));
          activeBalloon.y = Math.max(activeBalloon.radius, Math.min(this.virtualHeight - activeBalloon.radius, activeBalloon.y));
        }
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
    window.addEventListener('touchcancel', () => {
      this.isDragging = false;
    });

    // Fallback detection for touch pointer type to show mobile overlays
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.isTouchDevice = true;
        if (this.state === 'PLAYING') {
          this.mobileControls.classList.remove('hidden');
        }
      }
    });
  }

  resizeCanvas() {
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    
    // Set internal resolution based on device pixel ratio for crisp text and rendering
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // Virtual coordinates: 450x850 coordinate mapping
    this.virtualWidth = 450;
    this.virtualHeight = 850;
    
    // Scale drawings accordingly
    this.scaleX = rect.width / this.virtualWidth;
    this.scaleY = rect.height / this.virtualHeight;
    
    // Reset transform, then scale to dpr AND scale to fit virtual coordinates
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    this.ctx.scale(dpr * this.scaleX, dpr * this.scaleY);
  }

  startGame() {
    // Initialize Audio
    window.audioManager.init();
    window.audioManager.stopMusic();
    window.audioManager.stopUFOHum();
    window.audioManager.setNightMode(false);
    window.audioManager.setUfoActive(false);
    window.audioManager.startMusic();
    
    // Reset Game parameters
    this.score = 0;
    this.coins = 0;
    this.scorePenalty = 0;
    this.isNightMode = false;
    this.nightModeTimer = 0;
    this.dayModeTimer = 0;
    this.nightModeUnlocked = false;
    this.distance = 0;
    this.level = 1;
    this.balloons = [];
    this.hazards = [];
    this.coinBags = [];
    this.particles = [];
    this.clouds = [];
    this.birds = [];
    this.activeBalloonIdx = 0;
    
    // Reset UFO boss
    this.ufo = null;
    this.ufoTimer = 0;
    this.ufoWarningActive = false;
    this.ufoWarningTimer = 0;
    this.ufoWarningSirenTimer = 0;
    
    // Reset Day Styling on HTML Elements
    document.getElementById('game-container').classList.remove('night-mode');
    document.body.classList.remove('night-mode');
    this.activeBalloonName.style.color = '#ff5252';
    this.activeBalloonName.innerText = 'Red';
    
    // Initialize standard single balloon
    this.balloons.push({
      x: this.virtualWidth / 2,
      y: this.virtualHeight - 150,
      radius: 26,
      color: '#ff5252',
      glowColor: 'rgba(255, 82, 82, 0.4)',
      name: 'Red',
      alive: true,
      floatOffset: 0,
      floatSpeed: 1.5,
      popping: false,
      popTime: 0
    });

    // Populate initial clouds
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * this.virtualWidth,
        y: Math.random() * this.virtualHeight,
        speed: 30 + Math.random() * 20,
        scale: 0.6 + Math.random() * 0.8,
        opacity: 0.3 + Math.random() * 0.4
      });
    }

    // Hide overlays & show gameplay
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
    
    if (this.isTouchDevice) {
      this.mobileControls.classList.remove('hidden');
    }
    this.activeIndicator.classList.add('hidden');
    
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    
    // Kickstart game animation loop
    requestAnimationFrame((t) => this.loop(t));
  }

  swapBalloons() {
    if (this.state !== 'PLAYING' || this.balloons.length < 2) return;
    
    // Cycle index of active balloon
    let nextIdx = (this.activeBalloonIdx + 1) % this.balloons.length;
    
    // Ensure the swapped-to balloon is alive
    if (this.balloons[nextIdx].alive) {
      this.activeBalloonIdx = nextIdx;
      
      // Update HUD/indicator overlay
      this.activeBalloonName.innerText = this.balloons[nextIdx].name;
      this.activeBalloonName.style.color = this.balloons[nextIdx].color;
      
      // Play a quick soft squeak sound on swap
      window.audioManager.init();
      const now = window.audioManager.ctx.currentTime;
      const osc = window.audioManager.ctx.createOscillator();
      const gain = window.audioManager.ctx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(window.audioManager.ctx.destination);
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  // Trigger level 2 (Introduction of second balloon)
  enableSecondBalloon() {
    if (this.balloons.length >= 2) return;
    
    // Add blue helium balloon alongside the first one
    const mainBalloon = this.balloons[0];
    this.balloons.push({
      x: mainBalloon.x - 60 > 50 ? mainBalloon.x - 60 : mainBalloon.x + 60,
      y: mainBalloon.y,
      radius: 26,
      color: '#00f0ff',
      glowColor: 'rgba(0, 240, 255, 0.5)',
      name: 'Cyan',
      alive: true,
      floatOffset: Math.PI, // Out-of-phase floating drift
      floatSpeed: 2.0,
      popping: false,
      popTime: 0
    });
    
    // Show swap overlay indicator
    this.activeIndicator.classList.remove('hidden');
  }

  // Trigger transition into Night Mode (Darkness & glowing elements)
  enterNightMode() {
    if (this.isNightMode) return;
    this.isNightMode = true;
    this.nightModeTimer = 0;
    this.dayModeTimer = 0;
    
    // Play transition sound effect and swap background audio
    window.audioManager.playTransition();
    window.audioManager.setNightMode(true);
    
    // Toggle DOM elements
    document.getElementById('game-container').classList.add('night-mode');
    document.body.classList.add('night-mode');
    
    // Level up directly to multi-balloon gameplay
    this.level = 2;
    this.enableSecondBalloon();
    
    // Increase general speed slightly for higher difficulty
    this.scrollSpeed = 160;
  }

  // Revert back to Day Mode (Light sky & single red balloon)
  revertToDayMode() {
    if (!this.isNightMode) return;
    this.isNightMode = false;
    this.nightModeTimer = 0;
    this.dayModeTimer = 0;
    
    // Play transition sound effect and swap background audio back to day
    window.audioManager.playTransition();
    window.audioManager.setNightMode(false);
    
    // Toggle DOM elements
    document.getElementById('game-container').classList.remove('night-mode');
    document.body.classList.remove('night-mode');
    
    // Revert level and scroll speed to daytime values
    this.level = 1;
    this.scrollSpeed = 120;
    
    // Keep only the first (red) balloon, revive it if popped, and control it
    if (this.balloons.length > 1) {
      this.balloons = [this.balloons[0]];
    }
    if (this.balloons[0]) {
      this.balloons[0].alive = true;
      this.balloons[0].popping = false;
      this.balloons[0].popTime = 0;
    }
    this.activeBalloonIdx = 0;
    
    // Reset active balloon indicator text
    this.activeBalloonName.style.color = '#ff5252';
    this.activeBalloonName.innerText = 'Red';
    this.activeIndicator.classList.add('hidden');
  }

  // Game Loop
  loop(time) {
    if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;
    
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    if (this.state === 'PLAYING') {
      this.update(dt);
    }
    this.draw();
    
    requestAnimationFrame((t) => this.loop(t));
  }

  // Update Game Logic
  update(dt) {
    // 1. Update Altitudes & Distance Score (minus any poop penalties)
    this.distance += this.scrollSpeed * dt;
    this.score = Math.max(0, Math.floor(this.distance / 10) + this.coins * 5 - this.scorePenalty);
    
    // Update Score Board UI
    this.scoreVal.innerText = this.score;
    this.coinVal.innerText = this.coins;

    // Handle Day/Night Mode cycles
    if (this.isNightMode) {
      this.nightModeTimer += dt;
      if (this.nightModeTimer >= 120.0) { // Revert back to day mode after 2 minutes
        this.revertToDayMode();
      }
    } else {
      if (!this.nightModeUnlocked) {
        if (this.score >= 1000) {
          this.nightModeUnlocked = true;
          this.enterNightMode();
        }
      } else {
        this.dayModeTimer += dt;
        if (this.dayModeTimer >= 120.0) { // Enter night mode again after 2 minutes
          this.enterNightMode();
        }
      }
    }

    // 2. Update Balloons position
    this.balloons.forEach((balloon, idx) => {
      if (!balloon.alive) return;
      
      // Update pop state animations
      if (balloon.popping) {
        balloon.popTime += dt;
        if (balloon.popTime >= 0.15) {
          balloon.alive = false;
          // Check if game over (all balloons dead)
          if (this.balloons.every(b => !b.alive)) {
            this.triggerGameOver();
          }
        }
        return;
      }
      
      if (idx === this.activeBalloonIdx) {
        // Handle Active keyboard / joystick inputs
        let moveSpeed = 260; // Px per second
        let dx = 0;
        let dy = 0;

        if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx = -1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) dx = 1;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) dy = -1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) dy = 1;

        // Overlay touch/joystick vector if keyboard is empty
        if (dx === 0 && dy === 0) {
          dx = this.joystickInput.x;
          dy = this.joystickInput.y;
        }

        balloon.x += dx * moveSpeed * dt;
        balloon.y += dy * moveSpeed * dt;

        // Keep active balloon inside virtual screen limits
        balloon.x = Math.max(balloon.radius, Math.min(this.virtualWidth - balloon.radius, balloon.x));
        balloon.y = Math.max(balloon.radius + 100, Math.min(this.virtualHeight - balloon.radius - 50, balloon.y));
      } else {
        // Inactive balloon drifts naturally upwards and sideways (drifting)
        balloon.floatOffset += balloon.floatSpeed * dt;
        balloon.x += Math.sin(balloon.floatOffset) * 40 * dt; // Sinusoidal sway
        
        // Float upwards slightly relative to scroll, keeping it visible
        balloon.y -= 15 * dt;
        
        // Push balloon down gently if it goes too high automatically
        if (balloon.y < 200) balloon.y = 200;
        if (balloon.y > this.virtualHeight - 150) balloon.y = this.virtualHeight - 150;
        
        // Clamp bounds
        balloon.x = Math.max(balloon.radius + 10, Math.min(this.virtualWidth - balloon.radius - 10, balloon.x));
      }
    });

    // 3. Spawners
    // Spawn Clouds
    this.spawnTimers.cloud += dt;
    if (this.spawnTimers.cloud > 2.5) {
      this.spawnTimers.cloud = 0;
      this.clouds.push({
        x: Math.random() * this.virtualWidth,
        y: -100,
        speed: 20 + Math.random() * 20,
        scale: 0.5 + Math.random() * 0.8,
        opacity: 0.2 + Math.random() * 0.3
      });
    }

    // Spawn Coin Bags
    this.spawnTimers.coin += dt;
    // Higher chances of coin spawn as you climb
    const coinSpawnInterval = this.isNightMode ? 1.4 : 1.8;
    if (this.spawnTimers.coin > coinSpawnInterval) {
      this.spawnTimers.coin = 0;
      
      // Select Denomination based on weighted luck (10: 60%, 20: 30%, 30: 10%)
      const rand = Math.random();
      let value = 10;
      let vy = 160; // Speed (30s drop fastest)
      
      if (rand > 0.9) {
        value = 30;
        vy = 280;
      } else if (rand > 0.6) {
        value = 20;
        vy = 210;
      }

      this.coinBags.push({
        x: 40 + Math.random() * (this.virtualWidth - 80),
        y: -50,
        vy: vy,
        value: value,
        size: value === 30 ? 18 : (value === 20 ? 15 : 12)
      });
    }

    // Spawn Hazards (Poop, Debris, Asteroids) - Disabled when UFO is present
    this.spawnTimers.hazard += dt;
    const hazardSpawnInterval = this.isNightMode ? 0.9 : 1.5; // Faster spawning at night
    if (this.spawnTimers.hazard > hazardSpawnInterval) {
      this.spawnTimers.hazard = 0;
      
      // Stop regular hazard spawning when UFO is active or warning is active
      if (this.ufo === null && !this.ufoWarningActive) {
        const randType = Math.random();
        let type = 'poop';
        let vy = 150;
        let vx = 0;
        
        // Difficulty splits
        if (this.isNightMode) {
          if (randType > 0.6) {
            type = 'asteroid';
            vy = 380;
            vx = (Math.random() > 0.5 ? 1 : -1) * (100 + Math.random() * 100);
          } else if (randType > 0.3) {
            type = 'debris';
            vy = 260;
          }
        } else {
          if (randType > 0.8) {
            type = 'asteroid';
            vy = 300;
            vx = (Math.random() > 0.5 ? 1 : -1) * 80;
          } else if (randType > 0.5) {
            type = 'debris';
            vy = 200;
          }
        }

        if (type === 'poop') {
          const direction = Math.random() > 0.5 ? 1 : -1;
          const startX = direction > 0 ? -40 : this.virtualWidth + 40;
          const targetY = 60 + Math.random() * 120;
          this.birds.push({
            x: startX,
            y: targetY,
            vx: direction * (130 + Math.random() * 60),
            direction: direction,
            dropX: 60 + Math.random() * (this.virtualWidth - 120),
            hasPooped: false,
            elapsedTime: 0
          });
        } else {
          this.hazards.push({
            type: type,
            x: type === 'asteroid' ? (vx > 0 ? -20 : this.virtualWidth + 20) : (30 + Math.random() * (this.virtualWidth - 60)),
            y: -40,
            vx: vx,
            vy: vy,
            size: type === 'debris' ? 18 : 22,
            waveOffset: Math.random() * Math.PI * 2,
            angle: 0
          });
        }
      }
    }

    // 4. Update Clouds
    this.clouds.forEach(c => c.y += (this.scrollSpeed + c.speed) * dt);
    this.clouds = this.clouds.filter(c => c.y < this.virtualHeight + 100);

    // 5. Update Coin Bags
    this.coinBags.forEach(bag => bag.y += bag.vy * dt);
    
    // Check Coin Collisions
    this.coinBags.forEach((bag, bagIdx) => {
      this.balloons.forEach(balloon => {
        if (!balloon.alive || balloon.popping) return;
        
        // Simple circle collision
        const dist = Math.hypot(balloon.x - bag.x, balloon.y - bag.y);
        if (dist < balloon.radius + bag.size) {
          // Collect!
          this.coins += bag.value;
          window.audioManager.playCoin(bag.value);
          
          // Spawn coin grab text/chime effect
          this.spawnCoinSpark(bag.x, bag.y, `+${bag.value}`, balloon.color);
          
          this.coinBags.splice(bagIdx, 1);
        }
      });
    });
    this.coinBags = this.coinBags.filter(b => b.y < this.virtualHeight + 50);

    // 5.5 Update Birds
    this.birds.forEach(bird => {
      bird.x += bird.vx * dt;
      bird.elapsedTime += dt;
      
      const passedDropX = bird.direction > 0 ? (bird.x >= bird.dropX) : (bird.x <= bird.dropX);
      if (!bird.hasPooped && passedDropX) {
        bird.hasPooped = true;
        window.audioManager.playBirdSquawk();
        this.hazards.push({
          type: 'poop',
          x: bird.x,
          y: bird.y + 8,
          vx: 0,
          vy: 160,
          size: 14,
          waveOffset: Math.random() * Math.PI * 2,
          angle: 0
        });
      }
    });
    this.birds = this.birds.filter(b => b.direction > 0 ? b.x < this.virtualWidth + 60 : b.x > -60);

    // 6. Update Hazards
    this.hazards.forEach(h => {
      if (h.type === 'poop') {
        // Zig-zag wave motion
        h.waveOffset += 4 * dt;
        h.x += Math.sin(h.waveOffset) * 70 * dt;
      }
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.angle += 2 * dt; // Rotate asteroids and debris
    });

    // Check Hazard Collisions
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hazard = this.hazards[i];
      let hazardRemoved = false;

      for (let j = 0; j < this.balloons.length; j++) {
        const balloon = this.balloons[j];
        if (!balloon.alive || balloon.popping) continue;

        const dist = Math.hypot(balloon.x - hazard.x, balloon.y - hazard.y);
        const collisionThreshold = (balloon.radius + hazard.size) * 0.85;

        if (dist < collisionThreshold) {
          if (hazard.type === 'poop') {
            // Poop reduces score by 10, plays squish, displays -10 text, and is removed
            this.scorePenalty += 10;
            window.audioManager.playPoopSquish();
            this.spawnCoinSpark(hazard.x, hazard.y, '-10', '#ef4444');
            this.hazards.splice(i, 1);
            hazardRemoved = true;
            break;
          } else {
            // Asteroids and debris pop the balloon
            this.popBalloon(balloon);
          }
        }
      }
      if (hazardRemoved) continue;
    }
    // Filter out off-screen hazards
    this.hazards = this.hazards.filter(h => h.y < this.virtualHeight + 50 && h.x > -50 && h.x < this.virtualWidth + 50);

    // 7. Update Particles
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    // 6.5 Update UFO Boss
    if (this.ufo === null && !this.ufoWarningActive) {
      this.ufoTimer += dt;
      if (this.ufoTimer >= 60.0) {
        this.ufoWarningActive = true;
        this.ufoWarningTimer = 0;
        this.ufoWarningSirenTimer = 0;
      }
    }

    if (this.ufoWarningActive) {
      this.ufoWarningTimer += dt;
      this.ufoWarningSirenTimer += dt;
      // Alarm siren sound triggers every 0.6 seconds
      if (this.ufoWarningSirenTimer >= 0.6) {
        this.ufoWarningSirenTimer = 0;
        window.audioManager.playUFOWarning();
      }
      
      if (this.ufoWarningTimer >= 3.0) {
        this.ufoWarningActive = false;
        // Spawn UFO
        this.ufo = {
          x: this.virtualWidth / 2,
          y: -80,
          targetY: 150,
          state: 'ENTERING', // ENTERING, ATTACKING, LEAVING
          stateTimer: 0,
          shootTimer: 0
        };
        // Switch BGM to UFO music and trigger spaceship hum
        window.audioManager.setUfoActive(true);
        window.audioManager.playUFOHum();
      }
    }

    if (this.ufo !== null) {
      const u = this.ufo;
      u.stateTimer += dt;

      if (u.state === 'ENTERING') {
        u.y += 120 * dt;
        if (u.y >= u.targetY) {
          u.y = u.targetY;
          u.state = 'ATTACKING';
          u.stateTimer = 0;
          u.shootTimer = 0;
        }
      } 
      else if (u.state === 'ATTACKING') {
        // Slow horizontal target tracking towards active balloon
        const activeBalloon = this.balloons[this.activeBalloonIdx];
        if (activeBalloon && activeBalloon.alive) {
          const dx = activeBalloon.x - u.x;
          u.x += dx * 1.5 * dt;
        }
        
        // Spurt out random light bombs
        u.shootTimer += dt;
        if (u.shootTimer >= 0.4) { // Spawn rate: every 0.4 seconds
          u.shootTimer = 0;
          window.audioManager.playUFOShoot();
          
          this.hazards.push({
            type: 'ufo_bomb',
            x: u.x + (Math.random() - 0.5) * 16,
            y: u.y + 12,
            vx: (Math.random() - 0.5) * 100, // Slight horizontal spread
            vy: 220 + Math.random() * 80, // Downward velocity
            size: 10,
            angle: 0
          });
        }

        // UFO stays on screen for exactly 11 seconds of attacking (+2s entering, +2s leaving = 15 seconds)
        if (u.stateTimer >= 11.0) {
          u.state = 'LEAVING';
          u.stateTimer = 0;
        }
      } 
      else if (u.state === 'LEAVING') {
        u.y -= 250 * dt;
        if (u.y < -100) {
          this.ufo = null;
          this.ufoTimer = 0;
          // Revert BGM and stop hum
          window.audioManager.setUfoActive(false);
          window.audioManager.stopUFOHum();
        }
      }
    }
  }

  // Trigger balloon pop animation/particle spawn
  popBalloon(balloon) {
    balloon.popping = true;
    balloon.popTime = 0;
    
    // Play rubber pop audio
    window.audioManager.playPop();
    
    // Spawn 15-20 shred particles
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        type: 'shred',
        x: balloon.x,
        y: balloon.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: balloon.color,
        alpha: 1.0,
        decay: 1.5 + Math.random() * 2.0
      });
    }
  }

  // Visual text sparks when collecting coins
  spawnCoinSpark(x, y, text, color) {
    this.particles.push({
      type: 'text',
      x: x,
      y: y,
      vx: 0,
      vy: -50,
      text: text,
      color: color,
      alpha: 1.0,
      decay: 1.5
    });
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    window.audioManager.stopMusic();
    window.audioManager.stopUFOHum();
    
    // Save high score to storage
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('sky_shield_highscore', this.highScore.toString());
      this.highScoreVal.innerText = this.highScore;
    }
    
    // Set UI Screen Stats
    this.finalScore.innerText = this.score;
    this.finalCoins.innerText = this.coins;
    
    // Show GameOver Screen
    this.hud.classList.add('hidden');
    this.mobileControls.classList.add('hidden');
    this.gameOverScreen.classList.remove('hidden');
  }

  // Canvas Drawing Routine
  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);
    
    // 1. Draw Starfield (Only if Night Mode is active)
    if (this.isNightMode) {
      this.stars.forEach(star => {
        // Sine wave twinkle cycle
        const twinkle = Math.sin(performance.now() / 1000 * star.twinkleSpeed + star.phase);
        const opacity = 0.3 + (twinkle + 1) * 0.35; // 0.15 to 0.85
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    // 2. Draw Clouds (Background Layer)
    this.ctx.fillStyle = this.isNightMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.65)';
    this.clouds.forEach(c => {
      this.ctx.save();
      this.ctx.translate(c.x, c.y);
      this.ctx.scale(c.scale, c.scale);
      this.ctx.globalAlpha = c.opacity;
      
      // Draw layered clouds (overlapping circles)
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
      this.ctx.arc(25, -10, 35, 0, Math.PI * 2);
      this.ctx.arc(55, 0, 30, 0, Math.PI * 2);
      this.ctx.arc(27, 15, 25, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });

    // 3. Draw Coin Bags
    this.coinBags.forEach(bag => {
      this.ctx.save();
      this.ctx.translate(bag.x, bag.y);
      
      // Draw a cute bag shape
      const color = bag.value === 30 ? '#fbbf24' : (bag.value === 20 ? '#a7f3d0' : '#bae6fd'); // Gold, Green, Blue
      this.ctx.fillStyle = color;
      
      if (this.isNightMode) {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
      }
      
      this.ctx.beginPath();
      // Bag body
      this.ctx.arc(0, 5, bag.size, 0, Math.PI * 2);
      // Bag tie neck
      this.ctx.ellipse(0, -bag.size + 4, bag.size * 0.7, bag.size * 0.3, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Ribbon tie
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(-bag.size * 0.4, -bag.size + 3, bag.size * 0.8, 3);
      
      // Draw Coin Denomination value and Dollar sign (e.g. 10$)
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = `bold ${bag.size * 0.72}px var(--font-family)`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${bag.value}$`, 0, 5);
      
      this.ctx.restore();
    });

    // 3.5 Draw Birds
    this.birds.forEach(bird => {
      this.ctx.save();
      this.ctx.translate(bird.x, bird.y);
      this.ctx.scale(bird.direction, 1); // Flip depending on flight direction

      if (this.isNightMode) {
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#f59e0b';
      }

      // Bird body
      this.ctx.fillStyle = this.isNightMode ? '#1e293b' : '#38bdf8';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Head
      this.ctx.beginPath();
      this.ctx.arc(12, -4, 9, 0, Math.PI * 2);
      this.ctx.fill();

      // Yellow beak
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.beginPath();
      this.ctx.moveTo(18, -7);
      this.ctx.lineTo(26, -4);
      this.ctx.lineTo(17, 0);
      this.ctx.closePath();
      this.ctx.fill();

      // Eye
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(13, -6, 1.8, 0, Math.PI * 2);
      this.ctx.fill();

      // Flapping Wing
      const flap = Math.sin(bird.elapsedTime * 18) * 11;
      this.ctx.fillStyle = this.isNightMode ? '#0f172a' : '#0284c7';
      this.ctx.beginPath();
      this.ctx.moveTo(-4, -2);
      this.ctx.quadraticCurveTo(-12, -2 + flap, -8, -12 + flap);
      this.ctx.quadraticCurveTo(0, -6 + flap, -4, -2);
      this.ctx.fill();

      // Tail
      this.ctx.fillStyle = this.isNightMode ? '#0f172a' : '#0284c7';
      this.ctx.beginPath();
      this.ctx.moveTo(-16, -2);
      this.ctx.lineTo(-23, -8);
      this.ctx.lineTo(-19, 4);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    });

    // 4. Draw Hazards
    this.hazards.forEach(h => {
      this.ctx.save();
      this.ctx.translate(h.x, h.y);
      this.ctx.rotate(h.angle);

      if (h.type === 'poop') {
        // Splatty bird poop!
        this.ctx.fillStyle = '#f8fafc';
        
        // Draw splat drops
        this.ctx.beginPath();
        this.ctx.arc(0, 0, h.size, 0, Math.PI * 2);
        this.ctx.arc(h.size * 0.6, h.size * 0.4, h.size * 0.5, 0, Math.PI * 2);
        this.ctx.arc(-h.size * 0.5, -h.size * 0.3, h.size * 0.6, 0, Math.PI * 2);
        this.ctx.arc(0, -h.size * 0.8, h.size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw a streak pointing upwards (indicating falling direction)
        this.ctx.beginPath();
        this.ctx.moveTo(-h.size * 0.4, -h.size);
        this.ctx.lineTo(0, -h.size * 2.0);
        this.ctx.lineTo(h.size * 0.4, -h.size);
        this.ctx.closePath();
        this.ctx.fill();

        // Greenish-brown core splat
        this.ctx.fillStyle = '#4d7c0f';
        this.ctx.beginPath();
        this.ctx.arc(h.size * 0.1, -h.size * 0.1, h.size * 0.45, 0, Math.PI * 2);
        this.ctx.fill();
        
      } else if (h.type === 'ufo_bomb') {
        // Glowing cyan/yellow sphere projectile of light
        const color = this.isNightMode ? '#00f0ff' : '#fbbf24';
        
        // Radial gradient for glowing energy sphere
        const radGrd = this.ctx.createRadialGradient(
          -h.size * 0.2, -h.size * 0.2, 1,
          0, 0, h.size
        );
        radGrd.addColorStop(0, '#ffffff');
        radGrd.addColorStop(0.3, color);
        radGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = radGrd;
        
        if (this.isNightMode) {
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = color;
        }

        this.ctx.beginPath();
        this.ctx.arc(0, 0, h.size, 0, Math.PI * 2);
        this.ctx.fill();
        
      } else if (h.type === 'debris') {
        // Airplane Debris (a grey metallic sheet rivet cargo box)
        this.ctx.fillStyle = '#64748b';
        if (this.isNightMode) {
          this.ctx.shadowBlur = 8;
          this.ctx.shadowColor = '#00f0ff';
          this.ctx.strokeStyle = '#00f0ff';
        } else {
          this.ctx.strokeStyle = '#334155';
        }
        this.ctx.lineWidth = 2;
        
        // Draw box with a diagonal stripe
        this.ctx.beginPath();
        this.ctx.rect(-h.size, -h.size, h.size * 2, h.size * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(-h.size, -h.size);
        this.ctx.lineTo(h.size, h.size);
        this.ctx.stroke();
        
      } else if (h.type === 'asteroid') {
        // Asteroid (Rocky textured sphere with glowing fire trail)
        const radGrd = this.ctx.createRadialGradient(-3, -3, 2, 0, 0, h.size);
        radGrd.addColorStop(0, '#f97316'); // Light orange core
        radGrd.addColorStop(0.7, '#b91c1c'); // Deep red crust
        radGrd.addColorStop(1, '#450a0a'); // Dark rock border
        
        this.ctx.fillStyle = radGrd;
        
        if (this.isNightMode) {
          this.ctx.shadowBlur = 15;
          this.ctx.shadowColor = '#ef4444';
        }
        
        // Base rock
        this.ctx.beginPath();
        this.ctx.arc(0, 0, h.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add craters on asteroid
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.beginPath();
        this.ctx.arc(-h.size * 0.4, h.size * 0.2, h.size * 0.2, 0, Math.PI * 2);
        this.ctx.arc(h.size * 0.3, -h.size * 0.3, h.size * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
      
      // Draw tail behind asteroid or ufo_bomb (destination-over)
      if (h.type === 'asteroid') {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-over';
        
        // Tail is drawn opposite to the direction of velocity (vx, vy)
        const tailLen = h.size * 2.2;
        const angleVel = Math.atan2(h.vy, h.vx);
        
        const tailGrd = this.ctx.createLinearGradient(
          h.x, h.y,
          h.x - Math.cos(angleVel) * tailLen, h.y - Math.sin(angleVel) * tailLen
        );
        tailGrd.addColorStop(0, 'rgba(239, 68, 68, 0.7)'); // Red fire
        tailGrd.addColorStop(0.4, 'rgba(249, 115, 22, 0.4)'); // Orange glow
        tailGrd.addColorStop(1, 'rgba(253, 224, 71, 0)'); // Faded yellow
        
        this.ctx.strokeStyle = tailGrd;
        this.ctx.lineWidth = h.size * 1.5;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(h.x, h.y);
        this.ctx.lineTo(h.x - Math.cos(angleVel) * tailLen, h.y - Math.sin(angleVel) * tailLen);
        this.ctx.stroke();
        this.ctx.restore();
      } 
      else if (h.type === 'ufo_bomb') {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-over';
        
        const tailLen = h.size * 2.5;
        const color = this.isNightMode ? '#00f0ff' : '#fbbf24';
        const tailGrd = this.ctx.createLinearGradient(h.x, h.y, h.x, h.y - tailLen);
        tailGrd.addColorStop(0, color + '99'); // 60% opacity
        tailGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.strokeStyle = tailGrd;
        this.ctx.lineWidth = h.size * 1.2;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(h.x, h.y);
        this.ctx.lineTo(h.x, h.y - tailLen);
        this.ctx.stroke();
        this.ctx.restore();
      }
    });

    // 4.5 Draw UFO Boss & Laser Beam
    if (this.ufo !== null) {
      const u = this.ufo;

      // Draw glowing weapon emitter at base when attacking
      if (u.state === 'ATTACKING') {
        this.ctx.save();
        const color = this.isNightMode ? '#00f0ff' : '#fbbf24';
        const pulse = Math.sin(performance.now() / 80) * 3.5;
        this.ctx.fillStyle = color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        this.ctx.beginPath();
        this.ctx.arc(u.x, u.y + 10, 6 + pulse, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Draw UFO ship saucer
      this.ctx.save();
      this.ctx.translate(u.x, u.y);

      if (this.isNightMode) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00f0ff';
      }

      // Cockpit bubble dome
      this.ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
      this.ctx.beginPath();
      this.ctx.arc(0, -5, 14, Math.PI, 0);
      this.ctx.fill();

      // Little green alien head
      this.ctx.fillStyle = '#22c55e';
      this.ctx.beginPath();
      this.ctx.arc(0, -6, 5, 0, Math.PI * 2);
      this.ctx.fill();

      // Saucer metal base
      const saucerGrd = this.ctx.createLinearGradient(-35, 0, 35, 0);
      saucerGrd.addColorStop(0, '#475569');
      saucerGrd.addColorStop(0.5, '#cbd5e1');
      saucerGrd.addColorStop(1, '#475569');
      
      this.ctx.fillStyle = saucerGrd;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 5, 35, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Blinking rim lights
      const blink = Math.floor(performance.now() / 150) % 3;
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI + (i + 1) * (Math.PI / 6);
        const lx = Math.cos(angle) * 30;
        const ly = 5 + Math.sin(angle) * 5;
        
        this.ctx.fillStyle = (i % 3 === blink) ? '#f43f5e' : '#10b981';
        this.ctx.beginPath();
        this.ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    // 4.6 Draw Flashing UFO incoming alert box
    if (this.ufoWarningActive) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'; // transparent red banner
      this.ctx.fillRect(0, 240, this.virtualWidth, 75);

      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 240);
      this.ctx.lineTo(this.virtualWidth, 240);
      this.ctx.moveTo(0, 315);
      this.ctx.lineTo(this.virtualWidth, 315);
      this.ctx.stroke();

      const flash = Math.floor(performance.now() / 200) % 2;
      this.ctx.fillStyle = flash === 0 ? '#ffffff' : '#ef4444';
      this.ctx.font = 'extrabold 22px var(--font-family)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('⚠️ WARNING: UFO APPROACHING ⚠️', this.virtualWidth / 2, 277);
      this.ctx.restore();
    }

    // 5. Draw Balloons (Foreground Layer)
    this.balloons.forEach((balloon, idx) => {
      if (!balloon.alive || balloon.popping) return;
      
      this.ctx.save();
      this.ctx.translate(balloon.x, balloon.y);
      
      // Apply neon glowing effects in Night Mode
      if (this.isNightMode) {
        this.ctx.shadowBlur = 18;
        this.ctx.shadowColor = balloon.color;
      }
      
      // Standard Balloon Body (egg shape drawing)
      this.ctx.fillStyle = balloon.color;
      this.ctx.beginPath();
      this.ctx.moveTo(0, balloon.radius);
      // Left curve
      this.ctx.bezierCurveTo(
        -balloon.radius * 1.25, -balloon.radius * 0.5,
        -balloon.radius * 1.1, -balloon.radius * 1.2,
        0, -balloon.radius * 1.2
      );
      // Right curve
      this.ctx.bezierCurveTo(
        balloon.radius * 1.1, -balloon.radius * 1.2,
        balloon.radius * 1.25, -balloon.radius * 0.5,
        0, balloon.radius
      );
      this.ctx.fill();
      
      // Balloon Squeezed base tie (triangle at bottom)
      this.ctx.beginPath();
      this.ctx.moveTo(0, balloon.radius - 2);
      this.ctx.lineTo(-6, balloon.radius + 6);
      this.ctx.lineTo(6, balloon.radius + 6);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Balloon String
      this.ctx.shadowBlur = 0; // Disable glow for string
      this.ctx.strokeStyle = this.isNightMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(12, 74, 110, 0.5)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, balloon.radius + 6);
      // S-curve string trailing down
      this.ctx.bezierCurveTo(
        -8, balloon.radius + 18,
        8, balloon.radius + 30,
        0, balloon.radius + 45
      );
      this.ctx.stroke();

      // Highlight gloss sheen (3D bubble effect)
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      this.ctx.beginPath();
      this.ctx.ellipse(
        -balloon.radius * 0.35, -balloon.radius * 0.6,
        balloon.radius * 0.22, balloon.radius * 0.35,
        Math.PI / 6, 0, Math.PI * 2
      );
      this.ctx.fill();

      this.ctx.restore();

      // 6. Draw active indicator above active balloon
      if (idx === this.activeBalloonIdx && this.balloons.length > 1) {
        this.ctx.save();
        this.ctx.translate(balloon.x, balloon.y - balloon.radius - 25);
        
        // Bounce indicator arrow up and down
        const bounce = Math.sin(performance.now() / 150) * 4;
        
        this.ctx.fillStyle = balloon.color;
        if (this.isNightMode) {
          this.ctx.shadowBlur = 8;
          this.ctx.shadowColor = balloon.color;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, bounce + 10);
        this.ctx.lineTo(-8, bounce);
        this.ctx.lineTo(8, bounce);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
      }
    });

    // 7. Draw Particles (Pop shreds & score texts)
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      
      if (p.type === 'shred') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        // Tiny triangular rubber shreds
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.x - p.size, p.y + p.size);
        this.ctx.lineTo(p.x + p.size * 0.5, p.y + p.size * 1.5);
        this.ctx.closePath();
        this.ctx.fill();
        
      } else if (p.type === 'text') {
        this.ctx.fillStyle = p.color;
        this.ctx.font = 'bold 18px var(--font-family)';
        this.ctx.textAlign = 'center';
        
        if (this.isNightMode) {
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = p.color;
        }
        
        this.ctx.fillText(p.text, p.x, p.y);
      }
      this.ctx.restore();
    });
  }
}

// Instantiate game on load
window.addEventListener('load', () => {
  const game = new GameEngine();
  window.game = game;
});
