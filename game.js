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
    this.lifeSaverScreen = document.getElementById('life-saver-screen');
    this.rescueYesBtn = document.getElementById('rescue-yes-btn');
    this.rescueNoBtn = document.getElementById('rescue-no-btn');
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
    this.isAdvancedMode = false;
    this.nightModeTimer = 0;
    this.dayModeTimer = 0;
    this.nightModeUnlocked = false;
    this.distance = 0; // Simulated altitude
    this.magnetTimer = 0;
    this.freezeTimer = 0;
    this.autopilotTimer = 0;
    this.lastAutopilotScore = 0;
    
    // Rain & Rainbow State
    this.rainTimer = 0;
    this.rainbowTimer = 0;
    this.lightningTimer = 0;
    this.lightningFlash = 0;
    this.currentLightningBolt = null;
    this.raindrops = [];
    this.setupRaindrops();
    
    // Game Entities
    this.balloons = [];
    this.activeBalloonIdx = 0;
    this.clouds = [];
    this.hazards = [];
    this.coinBags = [];
    this.powerUps = [];
    this.particles = [];
    this.stars = []; // For night mode
    this.birds = [];
    
    // UFO Boss parameters
    this.ufo = null;
    this.ufoTimer = 0;
    this.ufoWarningActive = false;
    this.ufoWarningTimer = 0;
    this.ufoWarningSirenTimer = 0;
    this.powerUpSpawnTimer = 0;
    this.powerUpQueue = [];
    this.isLoopRunning = false;
    
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

    // Balloon Shop UI bindings & data initialization
    this.shopSidebar = document.getElementById('shop-sidebar');
    this.shopCoinsVal = document.getElementById('shop-coins-val');
    this.shopTabs = document.querySelectorAll('.shop-tab');
    this.shopItemBtns = document.querySelectorAll('.shop-item-btn');
    this.shopCategoryLists = document.querySelectorAll('.shop-category-list');
    
    this.totalCoins = parseInt(localStorage.getItem('sky_shield_total_coins') || '0');
    this.ownedItems = JSON.parse(localStorage.getItem('sky_shield_owned_items') || '["default", "none"]');
    this.equippedSkin = localStorage.getItem('sky_shield_equipped_skin') || 'default';
    this.equippedTrail = localStorage.getItem('sky_shield_equipped_trail') || 'none';
    this.equippedAttachment = localStorage.getItem('sky_shield_equipped_attach') || 'none';
    
    this.trailParticles = [];
    this.trailSpawnTimer = 0;
    this.turboTimer = 0;
    this.lastCelebrationMilestone = 0;
    this.hasPlayedCelebrationMusic = false;
    this.celebrationTimer = 0;
    
    this.isShopOpen = false;
    this.initShop();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    window.audioManager.stopMusic();
    window.audioManager.stopUFOHum();
    this.pauseScreen.classList.remove('hidden');
    this.mobileControls.classList.add('hidden');
    this.pauseBtn.classList.add('hidden-control');
    if (this.shopSidebar) {
      this.shopSidebar.classList.add('hidden');
    }
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
    this.pauseBtn.classList.remove('hidden-control');
    if (this.shopSidebar) {
      this.shopSidebar.classList.remove('hidden');
    }
    this.lastTime = performance.now(); // Reset lastTime to prevent dt jump
    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      requestAnimationFrame((t) => this.loop(t));
    }
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

  // Initialize shop functionality and DOM bindings
  initShop() {
    if (!this.shopSidebar) return;

    // 1. Tab switching logic
    this.shopTabs.forEach(tab => {
      tab.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.shopTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const category = tab.dataset.category;
        this.shopCategoryLists.forEach(list => {
          if (list.id === `category-${category}`) {
            list.classList.remove('hidden');
          } else {
            list.classList.add('hidden');
          }
        });
      });
    });

    // 2. Item purchase/equip logic
    const shopItemCards = document.querySelectorAll('.shop-item-card');
    shopItemCards.forEach(card => {
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const btn = card.querySelector('.shop-item-btn');
        if (btn) {
          const itemId = btn.dataset.id;
          const category = btn.dataset.category || 'skins';
          this.buyOrEquipItem(itemId, category);
        }
      });
    });

    // 3. Hover and mobile touch/click toggle logic
    const setShopOpen = (isOpen) => {
      this.isShopOpen = isOpen;
      if (isOpen) {
        this.shopSidebar.classList.add('expanded');
      } else {
        this.shopSidebar.classList.remove('expanded');
      }
    };

    this.shopSidebar.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') {
        setShopOpen(true);
      }
    });

    this.shopSidebar.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') {
        setShopOpen(false);
      }
    });

    this.shopSidebar.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); // Prevent canvas dragging
      if (e.pointerType === 'touch') {
        setShopOpen(true);
      }
    });

    document.addEventListener('pointerdown', (e) => {
      if (this.isShopOpen && !this.shopSidebar.contains(e.target)) {
        setShopOpen(false);
      }
    });

    this.updateShopUI();
  }

  // Update classes, text, and active states of shop item buttons
  updateShopUI() {
    if (!this.shopItemBtns) return;
    
    // Pricing configurations matching implementation plan
    const prices = {
      // Skins
      'skin_gold': 1000,
      'skin_steam': 600,
      'skin_cyber': 800,
      'skin_kitty': 500,
      // Trails
      'trail_rainbow': 400,
      'trail_stars': 300,
      'trail_rocket': 400,
      // Attachments
      'attach_propeller': 350,
      'attach_tassel': 200,
      'attach_ring': 500
    };

    this.shopItemBtns.forEach(btn => {
      const itemId = btn.dataset.id;
      const parentCard = btn.parentElement;
      const priceSpan = parentCard ? parentCard.querySelector('.item-price') : null;
      
      // Reset classes
      btn.classList.remove('active', 'owned-buy', 'disabled-buy');
      if (parentCard) parentCard.classList.remove('active');

      // Check if equipped
      const isEquipped = (this.equippedSkin === itemId || this.equippedTrail === itemId || this.equippedAttachment === itemId);
      const isOwned = this.ownedItems.includes(itemId) || itemId === 'default' || itemId === 'none';
      
      if (isEquipped) {
        btn.classList.add('active');
        if (parentCard) parentCard.classList.add('active');
        btn.innerText = 'Equipped';
        if (priceSpan) priceSpan.style.display = 'none'; // Hide price on card when equipped
      } else if (isOwned) {
        btn.classList.add('owned-buy');
        btn.innerText = 'Equip';
        if (priceSpan) priceSpan.style.display = 'none'; // Hide price on card when owned
      } else {
        // Unowned, show price
        const price = prices[itemId] || 0;
        btn.innerText = 'Equip';
        
        if (priceSpan) {
          priceSpan.style.display = 'block';
          priceSpan.innerText = itemId === 'default' || itemId === 'none' ? 'Free' : `${price} 🪙`;
        }
        
        const combinedCoins = this.totalCoins + this.coins;
        if (combinedCoins < price) {
          btn.classList.add('disabled-buy');
        }
      }
    });

    // Also sync standard coin indicators
    if (this.shopCoinsVal) {
      this.shopCoinsVal.innerText = this.totalCoins + this.coins;
    }
    if (this.coinVal) {
      this.coinVal.innerText = this.coins;
    }
  }

  // Business logic to buy or equip items
  buyOrEquipItem(itemId, category) {
    // Pricing configuration
    const prices = {
      'skin_gold': 1000,
      'skin_steam': 600,
      'skin_cyber': 800,
      'skin_kitty': 500,
      'trail_rainbow': 400,
      'trail_stars': 300,
      'trail_rocket': 400,
      'attach_propeller': 350,
      'attach_tassel': 200,
      'attach_ring': 500
    };

    const isOwned = this.ownedItems.includes(itemId) || itemId === 'default' || itemId === 'none';

    if (isOwned) {
      // Equip the item
      if (category === 'skins') {
        this.equippedSkin = itemId;
        localStorage.setItem('sky_shield_equipped_skin', this.equippedSkin);
      } else if (category === 'trails') {
        this.equippedTrail = itemId;
        localStorage.setItem('sky_shield_equipped_trail', this.equippedTrail);
      } else if (category === 'decos') {
        this.equippedAttachment = itemId;
        localStorage.setItem('sky_shield_equipped_attach', this.equippedAttachment);
      }
      
      window.audioManager.playPowerUpCollect(); // Play equip sound
    } else {
      // Try to buy the item
      const price = prices[itemId] || 0;
      const combinedCoins = this.totalCoins + this.coins;
      if (combinedCoins >= price) {
        if (this.totalCoins >= price) {
          this.totalCoins -= price;
        } else {
          const remainder = price - this.totalCoins;
          this.totalCoins = 0;
          this.coins -= remainder;
        }
        this.ownedItems.push(itemId);
        
        // Save state
        localStorage.setItem('sky_shield_total_coins', this.totalCoins.toString());
        localStorage.setItem('sky_shield_owned_items', JSON.stringify(this.ownedItems));
        
        // Auto-equip upon purchase
        if (category === 'skins') {
          this.equippedSkin = itemId;
          localStorage.setItem('sky_shield_equipped_skin', this.equippedSkin);
        } else if (category === 'trails') {
          this.equippedTrail = itemId;
          localStorage.setItem('sky_shield_equipped_trail', this.equippedTrail);
        } else if (category === 'decos') {
          this.equippedAttachment = itemId;
          localStorage.setItem('sky_shield_equipped_attach', this.equippedAttachment);
        }
        
        // Play purchase success sound
        window.audioManager.playPowerUpCollect();
      } else {
        // Can't afford, play warning sound
        window.audioManager.playUFOWarning();

        // Visual feedback: flash coins counter red and shake the container
        const coinsDisplay = document.querySelector('.shop-coins-display');
        const coinsVal = document.getElementById('shop-coins-val');
        if (coinsDisplay && coinsVal) {
          // Reset any existing animation
          coinsDisplay.classList.remove('shake-animation');
          void coinsDisplay.offsetWidth; // Trigger reflow to restart animation
          coinsDisplay.classList.add('shake-animation');
          
          coinsVal.classList.add('flash-red');
          
          setTimeout(() => {
            coinsDisplay.classList.remove('shake-animation');
            coinsVal.classList.remove('flash-red');
          }, 450);
        }
      }
    }

    this.updateShopUI();
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
    this.rescueYesBtn.addEventListener('click', () => this.reviveGame());
    this.rescueNoBtn.addEventListener('click', () => this.confirmGiveUp());
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
    window.audioManager.setRainMode(false);
    window.audioManager.setTurboMode(false);
    window.audioManager.setCelebrationMode(false);
    window.audioManager.startMusic();
    this.pauseBtn.classList.remove('hidden-control');
    
    // Reset Game parameters
    this.score = 0;
    this.coins = 0;
    this.scorePenalty = 0;
    this.isNightMode = false;
    this.isAdvancedMode = false;
    document.getElementById('game-container').classList.remove('advanced-mode');
    this.nightModeTimer = 0;
    this.dayModeTimer = 0;
    this.nightModeUnlocked = false;
    this.distance = 0;
    this.magnetTimer = 0;
    this.freezeTimer = 0;
    this.autopilotTimer = 0;
    this.turboTimer = 0;
    this.lastCelebrationMilestone = 0;
    this.hasPlayedCelebrationMusic = false;
    this.celebrationTimer = 0;
    this.lastAutopilotScore = 0;
    this.rainTimer = 0;
    this.rainbowTimer = 0;
    this.lightningTimer = 0;
    this.lightningFlash = 0;
    this.currentLightningBolt = null;
    this.setupRaindrops();
    this.level = 1;
    this.balloons = [];
    this.hazards = [];
    this.coinBags = [];
    this.powerUps = [];
    this.particles = [];
    this.clouds = [];
    this.birds = [];
    this.activeBalloonIdx = 0;
    
    // Reset UFO boss
    this.ufo = null;
    this.ufoTimer = 0;
    this.powerUpSpawnTimer = 9.0; // Spawns first power-up in 4 seconds!
    this.powerUpQueue = [];
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
      popTime: 0,
      hasShield: false
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
    if (this.lifeSaverScreen) {
      this.lifeSaverScreen.classList.add('hidden');
    }
    this.isShopOpen = false;
    if (this.shopSidebar) {
      this.shopSidebar.classList.remove('expanded');
    }
    // We do NOT hide the shopSidebar here, as it acts as a sliding shelf during gameplay
    this.hud.classList.remove('hidden');
    
    if (this.isTouchDevice) {
      this.mobileControls.classList.remove('hidden');
    }
    this.activeIndicator.classList.add('hidden');
    
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    
    // Kickstart game animation loop
    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      requestAnimationFrame((t) => this.loop(t));
    }
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
      popTime: 0,
      hasShield: false
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
    if (this.state !== 'PLAYING' && this.state !== 'PAUSED' && this.state !== 'REVIVE_PROMPT' && this.state !== 'CELEBRATION') {
      this.isLoopRunning = false;
      return;
    }
    
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    if (this.state === 'PLAYING' || this.state === 'REVIVE_PROMPT' || this.state === 'CELEBRATION') {
      // Pause updates if the accessories shop is open during gameplay
      if (this.state === 'PLAYING' && this.isShopOpen) {
        // Just draw the paused state, do not update physics/hazards/scrolling
      } else {
        this.update(dt);
      }
    }
    this.draw();
    
    requestAnimationFrame((t) => this.loop(t));
  }

  // Update Game Logic
  update(dt) {
    if (this.state === 'REVIVE_PROMPT') {
      this.rescueCountdownVal -= dt;
      const countInt = Math.ceil(this.rescueCountdownVal);
      const countdownElem = document.getElementById('rescue-countdown');
      if (countdownElem) {
        countdownElem.innerText = Math.max(0, countInt).toString();
      }
      if (this.rescueCountdownVal <= 0) {
        this.confirmGiveUp();
      }
      return;
    }

    if (this.state === 'CELEBRATION') {
      const targetX = this.virtualWidth / 2;
      const targetY = this.virtualHeight / 2;
      
      // Update birds carousel orbit
      this.birds.forEach(bird => {
        bird.orbitAngle = (bird.orbitAngle || 0) + (bird.orbitSpeed || 2.0) * dt;
        bird.x = targetX + Math.cos(bird.orbitAngle) * bird.orbitRadius;
        bird.y = targetY + Math.sin(bird.orbitAngle) * bird.orbitRadius;
        bird.elapsedTime += dt;
        bird.direction = -Math.sin(bird.orbitAngle) >= 0 ? 1 : -1;
      });
      
      // Interpolate active balloon position and size to 5x center
      const activeBalloon = this.balloons[this.activeBalloonIdx];
      if (activeBalloon && activeBalloon.alive) {
        activeBalloon.x += (targetX - activeBalloon.x) * 0.08;
        activeBalloon.y += (targetY - activeBalloon.y) * 0.08;
        activeBalloon.radius += (26 * 5 - activeBalloon.radius) * 0.08;
        
        // Trigger BGM exactly when balloon has arrived in the middle of the screen
        const dist = Math.hypot(activeBalloon.x - targetX, activeBalloon.y - targetY);
        if (dist < 15 && !this.hasPlayedCelebrationMusic) {
          this.hasPlayedCelebrationMusic = true;
          if (window.audioManager) {
            window.audioManager.setCelebrationMode(true);
          }
        }
      }
      
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0) {
        this.state = 'PLAYING';
        this.birds = []; // Clear celebration birds
        if (activeBalloon) {
          activeBalloon.radius = 26; // Reset size back to normal
        }
        if (window.audioManager) {
          window.audioManager.setCelebrationMode(false);
        }
      }
      return;
    }

    // Trigger Celebration cutscene on multiples of 5000 (5000, 10000, 15000...)
    const currentMilestone = Math.floor(this.score / 5000) * 5000;
    if (currentMilestone > 0 && currentMilestone > this.lastCelebrationMilestone) {
      this.lastCelebrationMilestone = currentMilestone;
      this.state = 'CELEBRATION';
      this.celebrationTimer = 10.0;
      this.hasPlayedCelebrationMusic = false;
      this.hazards = [];
      this.coinBags = [];
      this.powerUps = [];
      this.birds = [];
      
      const targetX = this.virtualWidth / 2;
      const targetY = this.virtualHeight / 2;
      
      // Spawn 6 celebrating orbiting birds
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        this.birds.push({
          orbitAngle: angle,
          orbitRadius: 180 + Math.random() * 30, // concentric orbits further out to clear 5x balloon (radius 130)
          orbitSpeed: 1.8 + Math.random() * 0.5,
          x: targetX + Math.cos(angle) * 190,
          y: targetY + Math.sin(angle) * 190,
          vx: 0,
          vy: 0,
          direction: -Math.sin(angle) >= 0 ? 1 : -1,
          elapsedTime: Math.random() * Math.PI,
          dropX: -100, // disable dropping poop
          hasPooped: true
        });
      }
    }

    // Decrement power-up active timers
    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    }
    if (this.freezeTimer > 0) {
      this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    }
    if (this.autopilotTimer > 0) {
      this.autopilotTimer = Math.max(0, this.autopilotTimer - dt);
    }
    if (this.turboTimer > 0) {
      this.turboTimer = Math.max(0, this.turboTimer - dt);
      if (this.turboTimer === 0) {
        if (window.audioManager) {
          window.audioManager.setTurboMode(false);
        }
      }
    }
    
    // Decrement rain and rainbow timers
    if (this.rainTimer > 0) {
      const prevRain = this.rainTimer;
      this.rainTimer = Math.max(0, this.rainTimer - dt);
      if (this.rainTimer === 0 && prevRain > 0) {
        // Storm ended, start the 20-second rainbow!
        this.rainbowTimer = 20.0;
        this.revertToDayMode(); // Force-transition back to Day Mode (bright sky)
        if (window.audioManager) {
          window.audioManager.setRainMode(false);
        }
      }
    }
    if (this.rainbowTimer > 0) {
      this.rainbowTimer = Math.max(0, this.rainbowTimer - dt);
    }

    const envDt = dt * (this.freezeTimer > 0 ? 0.5 : 1.0) * (this.turboTimer > 0 ? 3.0 : 1.0);

    // Update Raindrops and Lightning during rain phase
    if (this.rainTimer > 0) {
      this.raindrops.forEach(drop => {
        drop.y += drop.speed * envDt;
        drop.x += -90 * envDt; // Wind drift to left
        if (drop.y > this.virtualHeight) {
          drop.y = -drop.length;
          drop.x = Math.random() * this.virtualWidth;
        }
      });

      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = Math.random() * 4 + 3; // strike every 3 to 7 seconds
        this.lightningFlash = 0.22;
        this.currentLightningBolt = this.generateLightningBolt();
        window.audioManager.playThunder();
      }
    }

    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt);
    }

    // Set scrollSpeed (2X during autopilot)
    const baseSpeed = this.isNightMode ? 160 : 120;
    this.scrollSpeed = this.autopilotTimer > 0 ? baseSpeed * 2 : baseSpeed;

    // 1. Update Altitudes & Distance Score (minus any poop penalties)
    this.distance += this.scrollSpeed * envDt;
    this.score = Math.max(0, Math.floor(this.distance / 10) + this.coins * 5 - this.scorePenalty);
    
    // Trigger Autopilot is now managed as a falling power-up, so we only track milestones for level transitions.
    this.lastAutopilotScore = this.score;
    
    // Update Score Board UI
    this.scoreVal.innerText = this.score;
    this.coinVal.innerText = this.coins;

    // Check Advanced Mode thresholds
    if (this.score >= 15000 && this.score < 18000) {
      if (!this.isAdvancedMode) {
        this.isAdvancedMode = true;
        document.getElementById('game-container').classList.add('advanced-mode');
        // Clear existing hazards and birds to start fresh
        this.hazards = [];
        this.birds = [];
      }
    } else if (this.isAdvancedMode && this.score >= 18000) {
      this.isAdvancedMode = false;
      document.getElementById('game-container').classList.remove('advanced-mode');
      // Revert back to default mode (day mode)
      this.revertToDayMode();
      // Clear advanced hazards
      this.hazards = [];
    }

    // Handle Day/Night Mode cycles (suspended during advanced mode)
    if (!this.isAdvancedMode) {
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
            this.triggerLifeSaverPrompt();
          }
        }
        return;
      }
      
      if (idx === this.activeBalloonIdx) {
        if (this.autopilotTimer > 0) {
          this.steerAutopilot(balloon, dt);
        } else {
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
        }
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
    this.spawnTimers.cloud += envDt;
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
    this.spawnTimers.coin += envDt;
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

    // Spawn Power-Ups (More active 13s spawning cycle)
    this.powerUpSpawnTimer += envDt;
    if (this.powerUpSpawnTimer > 13.0) {
      this.powerUpSpawnTimer = 0;
      
      // Cycle through power-up types to guarantee variety and easy testing
      if (!this.powerUpQueue || this.powerUpQueue.length === 0) {
        this.powerUpQueue = ['storm', 'shield', 'magnet', 'freeze', 'autopilot', 'turbo'];
        // Shuffle queue
        for (let i = this.powerUpQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.powerUpQueue[i], this.powerUpQueue[j]] = [this.powerUpQueue[j], this.powerUpQueue[i]];
        }
      }
      
      let type = this.powerUpQueue.pop();
      if (this.turboTimer > 0) {
        // While turbo is active, skip storm (rain) and autopilot
        let attempts = 0;
        while ((type === 'storm' || type === 'autopilot') && attempts < 10) {
          this.powerUpQueue.unshift(type); // push to bottom of the queue
          type = this.powerUpQueue.pop();
          attempts++;
        }
      }
      
      this.powerUps.push({
        type: type,
        x: 40 + Math.random() * (this.virtualWidth - 80),
        y: -40,
        vy: 100,
        size: 16
      });
    }

    // Spawn Hazards (Poop, Debris, Asteroids) - Disabled when UFO is present
    this.spawnTimers.hazard += envDt;
    const hazardSpawnInterval = this.isAdvancedMode ? 0.8 : (this.isNightMode ? 0.9 : 1.5); // Faster spawning at night/advanced level
    if (this.spawnTimers.hazard > hazardSpawnInterval) {
      this.spawnTimers.hazard = 0;
      
      // Stop regular hazard spawning when UFO is active or warning is active
      if (this.ufo === null && !this.ufoWarningActive) {
        const randType = Math.random();
        let type = 'poop';
        let vy = 150;
        let vx = 0;
        
        // Difficulty splits
        if (this.isAdvancedMode) {
          const rand = Math.random();
          if (rand > 0.5) {
            type = 'fireball';
            vy = 280 + Math.random() * 60;
            vx = (Math.random() - 0.5) * 60;
          } else {
            type = 'ghost';
            vy = 120 + Math.random() * 40;
            vx = 0;
          }
        } else if (this.isNightMode) {
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
          window.audioManager.playBirdSquawk(); // Squawk when flying in
        } else {
          this.hazards.push({
            type: type,
            x: type === 'asteroid' ? (vx > 0 ? -20 : this.virtualWidth + 20) : (30 + Math.random() * (this.virtualWidth - 60)),
            y: -40,
            vx: vx,
            vy: vy,
            size: type === 'debris' ? 10.5 : (type === 'fireball' ? 13.0 : (type === 'ghost' ? 15.0 : 17.6)),
            waveOffset: Math.random() * Math.PI * 2,
            angle: 0
          });
        }
      }
    }

    // 4. Update Clouds
    this.clouds.forEach(c => c.y += (this.scrollSpeed + c.speed) * envDt);
    this.clouds = this.clouds.filter(c => c.y < this.virtualHeight + 100);

    // 5. Update Coin Bags
    this.coinBags.forEach(bag => {
      if (this.magnetTimer > 0 || this.turboTimer > 0) {
        const activeBalloon = this.balloons[this.activeBalloonIdx];
        if (activeBalloon && activeBalloon.alive && !activeBalloon.popping) {
          const dx = activeBalloon.x - bag.x;
          const dy = activeBalloon.y - bag.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 250) {
            const pullSpeed = 450 * (1 - dist / 250) + 50;
            const angle = Math.atan2(dy, dx);
            bag.x += Math.cos(angle) * pullSpeed * envDt;
            bag.y += Math.sin(angle) * pullSpeed * envDt;
          } else {
            bag.y += bag.vy * envDt;
          }
        } else {
          bag.y += bag.vy * envDt;
        }
      } else {
        bag.y += bag.vy * envDt;
      }
    });
    
    // Check Coin Collisions (Safe backwards loop to handle splice)
    for (let i = this.coinBags.length - 1; i >= 0; i--) {
      const bag = this.coinBags[i];
      let collected = false;
      for (let j = 0; j < this.balloons.length; j++) {
        const balloon = this.balloons[j];
        if (!balloon.alive || balloon.popping) continue;
        
        const dist = Math.hypot(balloon.x - bag.x, balloon.y - bag.y);
        if (dist < balloon.radius + bag.size) {
          this.coins += bag.value;
          window.audioManager.playCoin(bag.value);
          this.spawnCoinSpark(bag.x, bag.y, `+${bag.value}`, balloon.color);
          this.coinBags.splice(i, 1);
          collected = true;
          break;
        }
      }
      if (collected) continue;
    }
    this.coinBags = this.coinBags.filter(b => b.y < this.virtualHeight + 50);

    // 5.5 Update Birds
    this.birds.forEach(bird => {
      bird.x += bird.vx * envDt;
      bird.elapsedTime += envDt;
      
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
          size: 8.0,
          waveOffset: Math.random() * Math.PI * 2,
          angle: 0
        });
      }
    });
    this.birds = this.birds.filter(b => b.direction > 0 ? b.x < this.virtualWidth + 60 : b.x > -60);

    // 6. Update Hazards
    this.hazards.forEach(h => {
      if (this.turboTimer > 0) {
        const activeBalloon = this.balloons[this.activeBalloonIdx];
        if (activeBalloon && activeBalloon.alive && !activeBalloon.popping) {
          const dx = h.x - activeBalloon.x;
          const dy = h.y - activeBalloon.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 200 && dist > 1) {
            const pushForce = 350 * (1 - dist / 200);
            const angle = Math.atan2(dy, dx);
            h.x += Math.cos(angle) * pushForce * envDt;
            h.y += Math.sin(angle) * pushForce * envDt;
          }
        }
      }
      if (h.type === 'poop') {
        // Zig-zag wave motion
        h.waveOffset += 4 * envDt;
        h.x += Math.sin(h.waveOffset) * 70 * envDt;
      } else if (h.type === 'ghost') {
        // Gentle swaying float
        h.waveOffset += 2.5 * envDt;
        h.x += Math.sin(h.waveOffset) * 65 * envDt;
      } else if (h.type === 'fireball') {
        if (!h.trail) h.trail = [];
        h.trail.push({ x: h.x, y: h.y });
        if (h.trail.length > 8) {
          h.trail.shift();
        }
      }
      h.x += h.vx * envDt;
      h.y += h.vy * envDt;
      h.angle += 2 * envDt; // Rotate asteroids, debris, fireballs
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
          if (this.autopilotTimer > 0) {
            // Autopilot blocks all damage/pop and destroys/deflects regular hazards!
            // Let's spawn green tech sparkles and destroy the hazard
            this.spawnSparkles(hazard.x, hazard.y, '#10b981', 12, 4, 150);
            this.hazards.splice(i, 1);
            hazardRemoved = true;
            break;
          }

          if (balloon.hasShield) {
            // Shield absorbs the collision!
            balloon.hasShield = false;
            window.audioManager.playShieldBreak();
            this.spawnSparkles(hazard.x, hazard.y, '#00f0ff', 15, 5, 200);
            this.hazards.splice(i, 1);
            hazardRemoved = true;
            break;
          }

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

    // 6.2 Update Power-Ups
    this.powerUps.forEach(p => {
      p.y += p.vy * envDt;
    });

    // Check Power-Up Collisions (Safe backwards loop)
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      let collected = false;
      for (let j = 0; j < this.balloons.length; j++) {
        const balloon = this.balloons[j];
        if (!balloon.alive || balloon.popping) continue;

        const dist = Math.hypot(balloon.x - p.x, balloon.y - p.y);
        if (dist < balloon.radius + p.size) {
          window.audioManager.playPowerUpCollect();

          if (p.type === 'shield') {
            balloon.hasShield = true;
            this.spawnCoinSpark(p.x, p.y, 'SHIELD', '#00f0ff');
            this.spawnSparkles(p.x, p.y, '#00f0ff', 12, 4, 150);
          } else if (p.type === 'magnet') {
            this.magnetTimer = 8.0;
            this.spawnCoinSpark(p.x, p.y, 'MAGNET', '#ffeb3b');
            this.spawnSparkles(p.x, p.y, '#ffeb3b', 12, 4, 150);
          } else if (p.type === 'freeze') {
            this.freezeTimer = 6.0;
            this.spawnCoinSpark(p.x, p.y, 'SLOW-MO', '#e040fb');
            this.spawnSparkles(p.x, p.y, '#e040fb', 12, 4, 150);
          } else if (p.type === 'storm') {
            this.rainTimer = 30.0;
            this.rainbowTimer = 0.0; // Reset active rainbow if storm is re-collected
            this.lightningTimer = Math.random() * 3 + 2;
            if (window.audioManager) {
              window.audioManager.setRainMode(true);
              window.audioManager.playRainCollect();
              window.audioManager.playThunder();
            }
            this.spawnCoinSpark(p.x, p.y, 'STORM!', '#94a3b8');
            this.spawnSparkles(p.x, p.y, '#00f0ff', 12, 4, 150);
          } else if (p.type === 'autopilot') {
            this.autopilotTimer = 15.0;
            if (window.audioManager) {
              window.audioManager.playAutopilotActivate();
            }
            this.spawnCoinSpark(p.x, p.y, 'AUTO-PILOT!', '#22c55e');
            this.spawnSparkles(p.x, p.y, '#22c55e', 12, 4, 150);
          } else if (p.type === 'turbo') {
            this.turboTimer = 15.0;
            if (window.audioManager) {
              window.audioManager.playTurboActivate();
              window.audioManager.setTurboMode(true);
            }
            this.spawnCoinSpark(p.x, p.y, 'TURBO!', '#ef4444');
            this.spawnSparkles(p.x, p.y, '#ef4444', 16, 5, 200);
          }

          this.powerUps.splice(i, 1);
          collected = true;
          break;
        }
      }
      if (collected) continue;
    }
    this.powerUps = this.powerUps.filter(p => p.y < this.virtualHeight + 50);

    // 7. Update Particles
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
    });
    this.particles = this.particles.filter(p => p.alpha > 0);

    // Update and spawn equipped cosmetic trail particles
    if (this.equippedTrail !== 'none') {
      this.trailSpawnTimer += dt;
      if (this.trailSpawnTimer >= 0.05) {
        this.trailSpawnTimer = 0;
        this.balloons.forEach(balloon => {
          if (!balloon.alive || balloon.popping) return;
          
          if (this.equippedTrail === 'trail_rainbow') {
            const hue = (performance.now() / 15) % 360;
            const color = `hsla(${hue}, 90%, 65%, 1.0)`;
            this.particles.push({
              type: 'sparkle',
              x: balloon.x,
              y: balloon.y + balloon.radius + 6,
              vx: (Math.random() - 0.5) * 20,
              vy: 70 + Math.random() * 30,
              size: 5 + Math.random() * 4,
              color: color,
              alpha: 1.0,
              decay: 1.4
            });
          } else if (this.equippedTrail === 'trail_stars') {
            this.particles.push({
              type: 'trail_star',
              x: balloon.x + (Math.random() - 0.5) * 16,
              y: balloon.y + balloon.radius + 8,
              vx: (Math.random() - 0.5) * 15,
              vy: 50 + Math.random() * 30,
              size: 4 + Math.random() * 4,
              color: '#ffeb3b',
              alpha: 1.0,
              decay: 1.2
            });
          } else if (this.equippedTrail === 'trail_rocket') {
            // Hot orange fire spark
            this.particles.push({
              type: 'sparkle',
              x: balloon.x,
              y: balloon.y + balloon.radius + 6,
              vx: (Math.random() - 0.5) * 28,
              vy: 160 + Math.random() * 60,
              size: 2 + Math.random() * 3,
              color: Math.random() > 0.45 ? '#ff5252' : '#ffeb3b',
              alpha: 1.0,
              decay: 3.0
            });
            // Smoke puff
            if (Math.random() > 0.35) {
              this.particles.push({
                type: 'smoke',
                x: balloon.x + (Math.random() - 0.5) * 8,
                y: balloon.y + balloon.radius + 10,
                vx: (Math.random() - 0.5) * 10,
                vy: 40 + Math.random() * 20,
                size: 5 + Math.random() * 6,
                color: this.isNightMode ? 'rgba(71, 85, 105, 0.45)' : 'rgba(203, 213, 225, 0.45)',
                alpha: 0.8,
                decay: 1.5
              });
            }
          }
        });
      }
    }

    // 6.5 Update UFO Boss
    if (this.ufo === null && !this.ufoWarningActive) {
      this.ufoTimer += envDt;
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
      u.stateTimer += envDt;

      if (u.state === 'ENTERING') {
        u.y += 120 * envDt;
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
          u.x += dx * 1.5 * envDt;
        }
        
        // Spurt out random light bombs
        u.shootTimer += envDt;
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
        u.y -= 250 * envDt;
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

  // Pre-allocate raindrop particles
  setupRaindrops() {
    this.raindrops = [];
    for (let i = 0; i < 60; i++) {
      this.raindrops.push({
        x: Math.random() * this.virtualWidth,
        y: Math.random() * this.virtualHeight,
        speed: 400 + Math.random() * 200,
        length: 15 + Math.random() * 15
      });
    }
  }

  // Generate a random branching lightning bolt structure
  generateLightningBolt() {
    const startX = Math.random() * this.virtualWidth;
    const segments = [];
    let currentX = startX;
    let currentY = 0;
    
    while (currentY < this.virtualHeight - 100) {
      const nextY = currentY + 30 + Math.random() * 40;
      const nextX = currentX + (Math.random() - 0.5) * 50;
      segments.push({ x1: currentX, y1: currentY, x2: nextX, y2: nextY });
      
      // 15% chance to create a branching side fork
      if (Math.random() < 0.15) {
        let branchX = nextX;
        let branchY = nextY;
        for (let j = 0; j < 3; j++) {
          const bY = branchY + 20 + Math.random() * 20;
          const bX = branchX + (Math.random() > 0.5 ? 15 : -15) + (Math.random() - 0.5) * 10;
          segments.push({ x1: branchX, y1: branchY, x2: bX, y2: bY });
          branchX = bX;
          branchY = bY;
        }
      }
      
      currentX = nextX;
      currentY = nextY;
    }
    return segments;
  }

  // Autopilot steering behavior: dodges hazards and collects coins automatically
  steerAutopilot(balloon, dt) {
    let targetX = this.virtualWidth / 2;
    let targetY = this.virtualHeight - 180;
    
    // Find closest hazard (only count hazards that are active and on screen)
    let closestHazard = null;
    let minHazardDist = Infinity;
    this.hazards.forEach(h => {
      // Don't dodge if hazard is far above/below
      if (h.y > balloon.y + 100) return;
      const dist = Math.hypot(balloon.x - h.x, balloon.y - h.y);
      if (dist < minHazardDist) {
        minHazardDist = dist;
        closestHazard = h;
      }
    });
    
    // Find closest coin bag
    let closestCoin = null;
    let minCoinDist = Infinity;
    this.coinBags.forEach(c => {
      const dist = Math.hypot(balloon.x - c.x, balloon.y - c.y);
      if (dist < minCoinDist) {
        minCoinDist = dist;
        closestCoin = c;
      }
    });

    // Dodge if hazard is close (within 160px)
    if (closestHazard && minHazardDist < 160) {
      const dx = balloon.x - closestHazard.x;
      const dy = balloon.y - closestHazard.y;
      
      // Determine escape target
      // If hazard is to the right, escape left. If left, escape right.
      const escapeX = dx > 0 ? 1 : -1;
      const escapeY = dy > 0 ? 0.5 : -0.5; // escape vertically too
      
      targetX = balloon.x + escapeX * 120;
      targetY = balloon.y + escapeY * 80;
      
      // If we are pushing past screens edge, force target back inward
      if (targetX < 40) targetX = 80;
      if (targetX > this.virtualWidth - 40) targetX = this.virtualWidth - 80;
    } 
    // Otherwise steer to coin bag
    else if (closestCoin) {
      targetX = closestCoin.x;
      targetY = closestCoin.y;
    } 
    // Drift back to comfortable center-bottom
    else {
      targetX = this.virtualWidth / 2;
      targetY = this.virtualHeight - 180;
    }
    
    // Smooth navigation towards target
    const speed = 420; // Fast bot movement speed (420px/s)
    const dx = targetX - balloon.x;
    const dy = targetY - balloon.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 3) {
      balloon.x += (dx / dist) * speed * dt;
      balloon.y += (dy / dist) * speed * dt;
    }
    
    // Clamp inside virtual boundaries
    balloon.x = Math.max(balloon.radius, Math.min(this.virtualWidth - balloon.radius, balloon.x));
    balloon.y = Math.max(balloon.radius + 100, Math.min(this.virtualHeight - balloon.radius - 50, balloon.y));
  }

  // Visual circular sparkles when collecting powerups or shield breaking
  spawnSparkles(x, y, color, count = 10, sizeMax = 4, speedMax = 120) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * speedMax;
      this.particles.push({
        type: 'sparkle',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * sizeMax,
        color: color,
        alpha: 1.0,
        decay: 1.5 + Math.random() * 2.0
      });
    }
  }

  // Draw a rounded rectangle path
  drawRoundedRect(x, y, w, h, r) {
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
  }

  triggerLifeSaverPrompt() {
    this.state = 'REVIVE_PROMPT';
    window.audioManager.stopMusic();
    window.audioManager.stopUFOHum();
    
    // Clear keyboard inputs so player doesn't move or swap balloons
    this.keys = {};
    
    // Set up UI values
    const coinsVal = document.getElementById('rescue-coins-val');
    if (coinsVal) {
      coinsVal.innerText = this.coins;
    }
    
    if (this.rescueYesBtn) {
      if (this.coins >= 300) {
        this.rescueYesBtn.disabled = false;
        this.rescueYesBtn.innerText = 'Yes, Revive (300 Coins)';
      } else {
        this.rescueYesBtn.disabled = true;
        this.rescueYesBtn.innerText = 'Need 300 Coins';
      }
    }

    // Reset countdown timer
    this.rescueCountdownVal = 10.0;
    const countdownElem = document.getElementById('rescue-countdown');
    if (countdownElem) {
      countdownElem.innerText = '10';
    }

    // Show prompt screen, hide HUD
    this.hud.classList.add('hidden');
    this.mobileControls.classList.add('hidden');
    this.pauseBtn.classList.add('hidden-control');
    if (this.shopSidebar) {
      this.shopSidebar.classList.add('hidden');
    }
    if (this.lifeSaverScreen) {
      this.lifeSaverScreen.classList.remove('hidden');
    }
    
    // Play warning alert SFX
    window.audioManager.playUFOWarning();
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    window.audioManager.stopMusic();
    window.audioManager.stopUFOHum();
    window.audioManager.setRainMode(false);
    
    // Save high score to storage
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('sky_shield_highscore', this.highScore.toString());
      this.highScoreVal.innerText = this.highScore;
    }

    // Save collected coins to total purse
    this.totalCoins += this.coins;
    localStorage.setItem('sky_shield_total_coins', this.totalCoins.toString());
    
    // Update shop UI to reflect updated coins balance
    this.updateShopUI();
    
    // Set UI Screen Stats
    this.finalScore.innerText = this.score;
    this.finalCoins.innerText = this.coins;
    
    // Show GameOver Screen and Shop
    this.hud.classList.add('hidden');
    this.mobileControls.classList.add('hidden');
    this.pauseBtn.classList.add('hidden-control');
    this.gameOverScreen.classList.remove('hidden');
    if (this.shopSidebar) {
      this.shopSidebar.classList.remove('hidden');
    }
  }

  reviveGame() {
    if (this.state !== 'REVIVE_PROMPT') return;
    if (this.coins < 300) return;

    // Deduct revive cost
    this.coins -= 300;
    if (this.coinVal) {
      this.coinVal.innerText = this.coins;
    }
    
    // Reset balloons: revive active balloons, center them, and add temporary invulnerability shield
    const centerX = this.virtualWidth / 2;
    const centerY = this.virtualHeight - 150;
    
    this.balloons.forEach((balloon, idx) => {
      balloon.alive = true;
      balloon.popping = false;
      balloon.popTime = 0;
      balloon.hasShield = true; // Temporary protection shield!
      
      if (this.balloons.length > 1) {
        balloon.x = idx === 0 ? centerX - 35 : centerX + 35;
      } else {
        balloon.x = centerX;
      }
      balloon.y = centerY;
    });

    if (this.balloons.length === 0) {
      this.balloons.push({
        x: centerX,
        y: centerY,
        radius: 26,
        color: '#ff5252',
        glowColor: 'rgba(255, 82, 82, 0.4)',
        name: 'Red',
        alive: true,
        floatOffset: 0,
        floatSpeed: 1.5,
        popping: false,
        popTime: 0,
        hasShield: true
      });
    }

    // Clear immediate on-screen falling hazards to give the player a safe window
    this.hazards = this.hazards.filter(h => h.y > this.virtualHeight * 0.55 || h.y < 0);
    this.birds = []; // Clear birds to prevent instant poop drops

    // Return to playing state
    this.state = 'PLAYING';
    this.lastTime = performance.now(); // Reset lastTime to prevent dt jump
    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      requestAnimationFrame((t) => this.loop(t));
    }
    
    // Hide life saver screen and show HUD controls
    if (this.lifeSaverScreen) {
      this.lifeSaverScreen.classList.add('hidden');
    }
    this.hud.classList.remove('hidden');
    this.pauseBtn.classList.remove('hidden-control');
    if (this.isTouchDevice) {
      this.mobileControls.classList.remove('hidden');
    }
    if (this.shopSidebar) {
      this.shopSidebar.classList.remove('hidden');
    }

    // Resume BGM and play pickup sound
    window.audioManager.startMusic();
    window.audioManager.playPowerUpCollect();
  }

  confirmGiveUp() {
    if (this.state !== 'REVIVE_PROMPT') return;
    
    // Hide Life Saver Screen
    if (this.lifeSaverScreen) {
      this.lifeSaverScreen.classList.add('hidden');
    }
    
    // Transition to the actual Game Over state
    this.triggerGameOver();
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

    // 2.2 Draw Rainbow in Background (fades in and out over 20 seconds)
    if (this.rainbowTimer > 0) {
      this.ctx.save();
      
      // Calculate smooth fade-in (first 2 seconds) and fade-out (last 3 seconds)
      const fadeIn = Math.min(1.0, (20.0 - this.rainbowTimer) / 2.0);
      const fadeOut = Math.min(1.0, this.rainbowTimer / 3.0);
      const rainbowOpacity = 0.35 * fadeIn * fadeOut;
      
      const centerX = this.virtualWidth / 2;
      const centerY = this.virtualHeight * 0.85; // arch center near bottom
      const baseRadius = 240;
      
      // Rainbow colors: Red, Orange, Yellow, Green, Blue, Indigo, Violet
      const colors = [
        'rgba(239, 68, 68, ',   // Red
        'rgba(249, 115, 22, ',   // Orange
        'rgba(234, 179, 8, ',    // Yellow
        'rgba(34, 197, 94, ',    // Green
        'rgba(59, 130, 246, ',   // Blue
        'rgba(99, 102, 241, ',   // Indigo
        'rgba(168, 85, 247, '    // Violet
      ];
      
      // Soft feathered effect (glow) so lines merge beautifully together
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
      
      colors.forEach((colorPrefix, idx) => {
        const r = baseRadius - idx * 6; // slightly wider spacing to avoid overlap blending issues
        
        // Linear gradient horizontally across the arch radius to fade out left/right ends
        const grad = this.ctx.createLinearGradient(centerX - r, centerY, centerX + r, centerY);
        grad.addColorStop(0, colorPrefix + '0)'); // completely transparent at left end
        grad.addColorStop(0.2, colorPrefix + rainbowOpacity + ')'); // fully visible in center-left
        grad.addColorStop(0.8, colorPrefix + rainbowOpacity + ')'); // fully visible in center-right
        grad.addColorStop(1, colorPrefix + '0)'); // completely transparent at right end
        
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, r, Math.PI, 0, false);
        this.ctx.stroke();
      });
      this.ctx.restore();
    }

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

    // 3.8 Draw Power-Ups
    this.powerUps.forEach(p => {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      
      // Floating bounce effect
      const bounce = Math.sin(performance.now() / 150) * 3;
      this.ctx.translate(0, bounce);
      
      // Select colors based on type
      let glowColor, mainColor;
      if (p.type === 'shield') {
        glowColor = 'rgba(0, 240, 255, 0.4)';
        mainColor = '#00f0ff';
      } else if (p.type === 'magnet') {
        glowColor = 'rgba(255, 235, 59, 0.4)';
        mainColor = '#ffeb3b';
      } else if (p.type === 'freeze') {
        glowColor = 'rgba(156, 39, 176, 0.4)';
        mainColor = '#e040fb';
      } else if (p.type === 'storm') {
        glowColor = 'rgba(0, 240, 255, 0.4)';
        mainColor = '#94a3b8';
      } else if (p.type === 'autopilot') {
        glowColor = 'rgba(34, 197, 94, 0.4)';
        mainColor = '#22c55e';
      } else if (p.type === 'turbo') {
        glowColor = 'rgba(239, 68, 68, 0.4)';
        mainColor = '#ef4444';
      }
      
      // Draw outer glowing bubble container
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = mainColor;
      
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // Dark glassy base
      this.ctx.strokeStyle = mainColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      
      // Disable shadow for internal drawings to keep them crisp
      this.ctx.shadowBlur = 0;
      
      if (p.type === 'shield') {
        // Draw Crest/Shield shape inside
        this.ctx.fillStyle = mainColor;
        this.ctx.beginPath();
        // Shield path
        this.ctx.moveTo(0, -p.size * 0.5);
        this.ctx.lineTo(p.size * 0.4, -p.size * 0.5);
        this.ctx.quadraticCurveTo(p.size * 0.45, p.size * 0.1, 0, p.size * 0.6);
        this.ctx.quadraticCurveTo(-p.size * 0.45, p.size * 0.1, -p.size * 0.4, -p.size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Inner detail line
        this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size * 0.35);
        this.ctx.lineTo(p.size * 0.25, -p.size * 0.35);
        this.ctx.quadraticCurveTo(p.size * 0.28, p.size * 0.05, 0, p.size * 0.42);
        this.ctx.quadraticCurveTo(-p.size * 0.28, p.size * 0.05, -p.size * 0.25, -p.size * 0.35);
        this.ctx.closePath();
        this.ctx.stroke();
        
      } else if (p.type === 'magnet') {
        // Draw U-shaped magnet
        this.ctx.save();
        this.ctx.lineWidth = 5;
        this.ctx.lineCap = 'butt';
        
        // Draw red U-shape
        this.ctx.strokeStyle = '#ef4444'; // Red body
        this.ctx.beginPath();
        this.ctx.arc(0, 2, p.size * 0.4, 0, Math.PI, false);
        // Extend tips upwards
        this.ctx.lineTo(-p.size * 0.4, -p.size * 0.2);
        this.ctx.moveTo(p.size * 0.4, 2);
        this.ctx.lineTo(p.size * 0.4, -p.size * 0.2);
        this.ctx.stroke();
        
        // Draw silver tips at the end of the U
        this.ctx.strokeStyle = '#e2e8f0'; // Silver/white tips
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(-p.size * 0.4, -p.size * 0.2);
        this.ctx.lineTo(-p.size * 0.4, -p.size * 0.45);
        this.ctx.moveTo(p.size * 0.4, -p.size * 0.2);
        this.ctx.lineTo(p.size * 0.4, -p.size * 0.45);
        this.ctx.stroke();
        
        this.ctx.restore();
        
      } else if (p.type === 'freeze') {
        // Draw Clock face
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        
        // Clock circle outline
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Hour and minute hands
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, -p.size * 0.4); // 12 o'clock hand
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(p.size * 0.3, p.size * 0.15); // 4 o'clock hand
        this.ctx.stroke();
      } else if (p.type === 'storm') {
        // Draw Storm Cloud inside
        this.ctx.fillStyle = '#cbd5e1'; // light slate grey
        this.ctx.beginPath();
        this.ctx.arc(-4, 1, 7, 0, Math.PI * 2);
        this.ctx.arc(3, -2, 8, 0, Math.PI * 2);
        this.ctx.arc(8, 2, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw little cyan lightning bolt sticking out of bottom of the cloud
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.lineWidth = 1.8;
        this.ctx.beginPath();
        this.ctx.moveTo(1, 2);
        this.ctx.lineTo(-3, 8);
        this.ctx.lineTo(2, 8);
        this.ctx.lineTo(-1, 14);
        this.ctx.stroke();
      } else if (p.type === 'autopilot') {
        // Draw a cute green robot head / android symbol
        this.ctx.fillStyle = '#22c55e';
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 1.5;

        // Head box
        this.ctx.beginPath();
        this.ctx.roundRect(-p.size * 0.45, -p.size * 0.3, p.size * 0.9, p.size * 0.6, 3);
        this.ctx.fill();

        // Eyes (black dots or holes)
        this.ctx.fillStyle = '#0f172a'; // glassy background dark color
        this.ctx.beginPath();
        this.ctx.arc(-p.size * 0.2, -p.size * 0.05, 1.8, 0, Math.PI * 2);
        this.ctx.arc(p.size * 0.2, -p.size * 0.05, 1.8, 0, Math.PI * 2);
        this.ctx.fill();

        // Antennas
        this.ctx.beginPath();
        this.ctx.moveTo(-p.size * 0.25, -p.size * 0.3);
        this.ctx.lineTo(-p.size * 0.38, -p.size * 0.55);
        this.ctx.moveTo(p.size * 0.25, -p.size * 0.3);
        this.ctx.lineTo(p.size * 0.38, -p.size * 0.55);
        this.ctx.stroke();
      } else if (p.type === 'turbo') {
        // Draw a glowing red/orange lightning bolt
        this.ctx.fillStyle = '#f97316';
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(p.size * 0.1, -p.size * 0.55);
        this.ctx.lineTo(-p.size * 0.35, p.size * 0.05);
        this.ctx.lineTo(0, p.size * 0.05);
        this.ctx.lineTo(-p.size * 0.15, p.size * 0.55);
        this.ctx.lineTo(p.size * 0.35, -p.size * 0.05);
        this.ctx.lineTo(p.size * 0.05, -p.size * 0.05);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      }
      
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
        // Spikey Metallic Chrome Plated Ball
        const size = h.size;
        const sphereRadius = size * 0.85;
        const spikeLength = size * 1.5;
        const spikeBaseWidth = size * 0.22;

        // Shadow/glow properties
        if (this.isNightMode) {
          this.ctx.shadowBlur = 12;
          this.ctx.shadowColor = '#00f0ff';
        } else {
          this.ctx.shadowBlur = 4;
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        }

        // Draw 8 metallic spikes radiating from the center
        this.ctx.save();
        for (let i = 0; i < 8; i++) {
          // Light side of the spike (left)
          this.ctx.fillStyle = this.isNightMode ? '#cbd5e1' : '#f1f5f9';
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(-spikeBaseWidth, 0);
          this.ctx.lineTo(0, -spikeLength);
          this.ctx.closePath();
          this.ctx.fill();

          // Dark side of the spike (right)
          this.ctx.fillStyle = this.isNightMode ? '#1e293b' : '#475569';
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(spikeBaseWidth, 0);
          this.ctx.lineTo(0, -spikeLength);
          this.ctx.closePath();
          this.ctx.fill();

          // Outline spike to give clean definition
          this.ctx.strokeStyle = this.isNightMode ? '#00f0ff' : '#0f172a';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(-spikeBaseWidth, 0);
          this.ctx.lineTo(0, -spikeLength);
          this.ctx.lineTo(spikeBaseWidth, 0);
          this.ctx.stroke();

          // Rotate for the next spike (45 degrees)
          this.ctx.rotate(Math.PI / 4);
        }
        this.ctx.restore();

        // Draw the central chrome sphere
        const chromeGrd = this.ctx.createLinearGradient(
          -sphereRadius, -sphereRadius,
          sphereRadius, sphereRadius
        );
        // Premium chrome stops simulating reflection of sky and ground with a horizon line
        chromeGrd.addColorStop(0.0, '#ffffff'); // Specular highlight
        chromeGrd.addColorStop(0.15, '#e2e8f0'); // Bright silver (sky reflection)
        chromeGrd.addColorStop(0.44, '#94a3b8'); // Medium silver
        chromeGrd.addColorStop(0.48, '#334155'); // Dark horizon line top boundary
        chromeGrd.addColorStop(0.52, '#0f172a'); // Very dark horizon line bottom boundary
        chromeGrd.addColorStop(0.56, '#1e293b'); // Horizon shadow
        chromeGrd.addColorStop(0.75, '#cbd5e1'); // Ground reflection
        chromeGrd.addColorStop(1.0, '#475569'); // Metallic base shadow

        this.ctx.fillStyle = chromeGrd;
        this.ctx.strokeStyle = this.isNightMode ? '#00f0ff' : '#334155';
        this.ctx.lineWidth = 1.5;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, sphereRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Add 3D Glossy highlight overlay on top-left of the sphere
        const highlightGrd = this.ctx.createRadialGradient(
          -sphereRadius * 0.35, -sphereRadius * 0.35, 0,
          -sphereRadius * 0.35, -sphereRadius * 0.35, sphereRadius * 0.5
        );
        highlightGrd.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        highlightGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = highlightGrd;
        this.ctx.beginPath();
        this.ctx.arc(-sphereRadius * 0.35, -sphereRadius * 0.35, sphereRadius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
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
      } else if (h.type === 'fireball') {
        // Fireball hot plasma core
        const radGrd = this.ctx.createRadialGradient(-h.size * 0.25, -h.size * 0.25, 1, 0, 0, h.size);
        radGrd.addColorStop(0, '#ffffff'); // White hot core
        radGrd.addColorStop(0.25, '#fef08a'); // Yellow inner
        radGrd.addColorStop(0.55, '#f97316'); // Orange
        radGrd.addColorStop(0.85, '#dc2626'); // Red
        radGrd.addColorStop(1, 'rgba(220, 38, 38, 0)'); // Fade boundary

        this.ctx.fillStyle = radGrd;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#f97316';

        this.ctx.beginPath();
        this.ctx.arc(0, 0, h.size, 0, Math.PI * 2);
        this.ctx.fill();

      } else if (h.type === 'ghost') {
        // Scary ghost (face upright)
        this.ctx.rotate(-h.angle);

        // Body gradient
        const ghostGrd = this.ctx.createLinearGradient(0, -h.size, 0, h.size);
        ghostGrd.addColorStop(0, 'rgba(248, 250, 252, 0.95)'); // Pale white head
        ghostGrd.addColorStop(0.55, 'rgba(186, 230, 253, 0.7)'); // Ethereal cyan body
        ghostGrd.addColorStop(1, 'rgba(167, 139, 250, 0)'); // Fade tail

        this.ctx.fillStyle = ghostGrd;
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = 'rgba(0, 240, 255, 0.55)';

        // Draw ghost body path
        this.ctx.beginPath();
        this.ctx.moveTo(0, -h.size);
        // Head and arms
        this.ctx.bezierCurveTo(h.size * 0.7, -h.size, h.size * 0.8, -h.size * 0.3, h.size * 0.8, 0);
        this.ctx.bezierCurveTo(h.size * 1.1, h.size * 0.15, h.size * 1.1, h.size * 0.4, h.size * 0.7, h.size * 0.4);
        
        // Swaying bottom sheet
        const wave = Math.sin(performance.now() / 150 + h.waveOffset) * 4.5;
        this.ctx.lineTo(h.size * 0.5, h.size + wave);
        this.ctx.quadraticCurveTo(h.size * 0.25, h.size - 4 + wave, 0, h.size + wave);
        this.ctx.quadraticCurveTo(-h.size * 0.25, h.size - 4 + wave, -h.size * 0.5, h.size + wave);
        
        this.ctx.lineTo(-h.size * 0.7, h.size * 0.4);
        this.ctx.bezierCurveTo(-h.size * 1.1, h.size * 0.4, -h.size * 1.1, h.size * 0.15, -h.size * 0.8, 0);
        this.ctx.bezierCurveTo(-h.size * 0.8, -h.size * 0.3, -h.size * 0.7, -h.size, 0, -h.size);
        this.ctx.closePath();
        this.ctx.fill();

        // Glowing red eyes
        this.ctx.fillStyle = '#ef4444';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(-h.size * 0.22, -h.size * 0.35, h.size * 0.11, 0, Math.PI * 2);
        this.ctx.arc(h.size * 0.22, -h.size * 0.35, h.size * 0.11, 0, Math.PI * 2);
        this.ctx.fill();

        // Mouth (open scary scream)
        this.ctx.fillStyle = '#0f172a';
        this.ctx.shadowBlur = 0; // Clear eye glow
        this.ctx.save();
        this.ctx.scale(0.7, 1);
        this.ctx.beginPath();
        this.ctx.arc(0, -h.size * 0.05, h.size * 0.18, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
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
      else if (h.type === 'fireball') {
        if (h.trail && h.trail.length > 0) {
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'destination-over';
          
          h.trail.forEach((pt, index) => {
            const opacity = (index + 1) / h.trail.length * 0.55;
            const radius = h.size * (0.3 + 0.7 * (index + 1) / h.trail.length);
            
            // Fire colors: red -> orange -> yellow
            let color;
            if (index < h.trail.length / 3) {
              color = `rgba(239, 68, 68, ${opacity})`;
            } else if (index < h.trail.length * 2 / 3) {
              color = `rgba(249, 115, 22, ${opacity})`;
            } else {
              color = `rgba(253, 224, 71, ${opacity})`;
            }
            
            this.ctx.fillStyle = color;
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = 'rgba(249, 115, 22, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
          });
          
          this.ctx.restore();
        }
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

    this.balloons.forEach((balloon, idx) => {
      if (!balloon.alive || balloon.popping) return;
      
      // During celebration, only draw the active balloon
      if (this.state === 'CELEBRATION' && idx !== this.activeBalloonIdx) return;
      
      this.ctx.save();
      this.ctx.translate(balloon.x, balloon.y);
      
      // Draw Sun Rays and Soft Halo in CELEBRATION state
      if (this.state === 'CELEBRATION') {
        this.ctx.save();
        const haloGrad = this.ctx.createRadialGradient(0, 0, balloon.radius * 0.2, 0, 0, balloon.radius * 2.8);
        haloGrad.addColorStop(0, 'rgba(255, 235, 59, 0.6)');
        haloGrad.addColorStop(0.3, 'rgba(255, 215, 0, 0.35)');
        haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0.0)');
        this.ctx.fillStyle = haloGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, balloon.radius * 2.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw rotating sun rays oozing out of the balloon
        const numRays = 12;
        const maxRayLen = balloon.radius * 2.5;
        const angleStep = (Math.PI * 2) / numRays;
        const currentRotate = (performance.now() / 1500) % (Math.PI * 2);
        
        this.ctx.strokeStyle = 'rgba(255, 235, 59, 0.45)';
        this.ctx.lineWidth = balloon.radius * 0.05;
        this.ctx.lineCap = 'round';
        
        for (let i = 0; i < numRays; i++) {
          const rayAngle = i * angleStep + currentRotate;
          const startRadius = balloon.radius * 0.9;
          this.ctx.beginPath();
          this.ctx.moveTo(Math.cos(rayAngle) * startRadius, Math.sin(rayAngle) * startRadius);
          this.ctx.lineTo(Math.cos(rayAngle) * maxRayLen, Math.sin(rayAngle) * maxRayLen);
          this.ctx.stroke();
        }
        this.ctx.restore();
      }
      
      // Apply neon glowing effects in Night Mode (or override shadow if custom skin)
      if (this.isNightMode) {
        this.ctx.shadowBlur = 18;
        this.ctx.shadowColor = this.equippedSkin === 'skin_gold' ? '#ffd700' : (this.equippedSkin === 'skin_cyber' ? '#00f0ff' : balloon.color);
      }
      
      // Determine balloon body fill style
      if (this.state === 'CELEBRATION') {
        const grad = this.ctx.createRadialGradient(-balloon.radius * 0.3, -balloon.radius * 0.3, balloon.radius * 0.1, 0, 0, balloon.radius);
        grad.addColorStop(0, '#fff7c2');
        grad.addColorStop(0.4, '#ffd700');
        grad.addColorStop(1, '#b59310');
        this.ctx.fillStyle = grad;
      } else if (this.equippedSkin === 'skin_gold') {
        const grad = this.ctx.createRadialGradient(-balloon.radius * 0.3, -balloon.radius * 0.3, balloon.radius * 0.1, 0, 0, balloon.radius);
        grad.addColorStop(0, '#fff7c2');
        grad.addColorStop(0.4, '#ffd700');
        grad.addColorStop(1, '#b59310');
        this.ctx.fillStyle = grad;
      } else if (this.equippedSkin === 'skin_steam') {
        const grad = this.ctx.createRadialGradient(-balloon.radius * 0.3, -balloon.radius * 0.3, balloon.radius * 0.1, 0, 0, balloon.radius);
        grad.addColorStop(0, '#e2e8f0');
        grad.addColorStop(0.5, '#64748b');
        grad.addColorStop(1, '#334155');
        this.ctx.fillStyle = grad;
      } else if (this.equippedSkin === 'skin_cyber') {
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'; // dark glass
      } else {
        // Default standard skin
        this.ctx.fillStyle = balloon.color;
      }
      
      // Draw Kitty ears if Kitty Skin
      if (this.equippedSkin === 'skin_kitty') {
        this.ctx.fillStyle = balloon.color;
        this.ctx.beginPath();
        // Left Ear
        this.ctx.moveTo(-balloon.radius * 0.7, -balloon.radius * 0.95);
        this.ctx.lineTo(-balloon.radius * 0.9, -balloon.radius * 1.4);
        this.ctx.lineTo(-balloon.radius * 0.3, -balloon.radius * 1.15);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Right Ear
        this.ctx.beginPath();
        this.ctx.moveTo(balloon.radius * 0.7, -balloon.radius * 0.95);
        this.ctx.lineTo(balloon.radius * 0.9, -balloon.radius * 1.4);
        this.ctx.lineTo(balloon.radius * 0.3, -balloon.radius * 1.15);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Pink inner ears
        this.ctx.fillStyle = '#ff9ebb';
        this.ctx.beginPath();
        this.ctx.moveTo(-balloon.radius * 0.65, -balloon.radius * 1.02);
        this.ctx.lineTo(-balloon.radius * 0.8, -balloon.radius * 1.35);
        this.ctx.lineTo(-balloon.radius * 0.4, -balloon.radius * 1.13);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(balloon.radius * 0.65, -balloon.radius * 1.02);
        this.ctx.lineTo(balloon.radius * 0.8, -balloon.radius * 1.35);
        this.ctx.lineTo(balloon.radius * 0.4, -balloon.radius * 1.13);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Reset color to draw main body
        this.ctx.fillStyle = balloon.color;
      }

      // Draw Main Balloon Body (egg shape path)
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
      
      // Cyber Neon Outlining
      if (this.equippedSkin === 'skin_cyber') {
        this.ctx.strokeStyle = balloon.color;
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
      }

      // Draw Balloon Squeezed base tie (triangle at bottom)
      this.ctx.fillStyle = (this.equippedSkin === 'skin_gold' || this.state === 'CELEBRATION') ? '#ffd700' : (this.equippedSkin === 'skin_steam' ? '#64748b' : (this.equippedSkin === 'skin_cyber' ? 'rgba(15, 23, 42, 0.95)' : balloon.color));
      this.ctx.beginPath();
      this.ctx.moveTo(0, balloon.radius - 2);
      this.ctx.lineTo(-balloon.radius * 0.23, balloon.radius + balloon.radius * 0.23);
      this.ctx.lineTo(balloon.radius * 0.23, balloon.radius + balloon.radius * 0.23);
      this.ctx.closePath();
      this.ctx.fill();
      if (this.equippedSkin === 'skin_cyber') {
        this.ctx.strokeStyle = balloon.color;
        this.ctx.lineWidth = 2.0;
        this.ctx.stroke();
      }

      // Draw details for custom skins
      if (this.equippedSkin === 'skin_gold' || this.state === 'CELEBRATION') {
        // Draw Gold Crown
        const cy = -balloon.radius * 1.25;
        const r = balloon.radius;
        this.ctx.fillStyle = '#ffd700';
        this.ctx.strokeStyle = '#b59310';
        this.ctx.lineWidth = r * 0.05;
        this.ctx.beginPath();
        this.ctx.moveTo(-r * 0.38, cy);
        this.ctx.lineTo(-r * 0.46, cy - r * 0.31);
        this.ctx.lineTo(-r * 0.19, cy - r * 0.12);
        this.ctx.lineTo(0, cy - r * 0.38);
        this.ctx.lineTo(r * 0.19, cy - r * 0.12);
        this.ctx.lineTo(r * 0.46, cy - r * 0.31);
        this.ctx.lineTo(r * 0.38, cy);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#ff3b30'; // Gem
        this.ctx.beginPath();
        this.ctx.arc(0, cy - r * 0.12, r * 0.08, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Celebration Text on the Balloon Body
        if (this.state === 'CELEBRATION') {
          this.ctx.save();
          this.ctx.fillStyle = '#1e1b4b'; // Dark blue/indigo for crisp contrast on gold
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          
          const fontSizeMain = Math.max(16, Math.round(r * 0.22)); // Large font for the score digit
          this.ctx.font = `extrabold ${fontSizeMain}px var(--font-family)`;
          this.ctx.fillText(this.lastCelebrationMilestone.toString(), 0, 0);
          
          this.ctx.restore();
        }
      } else if (this.equippedSkin === 'skin_steam') {
        // Draw copper rivets
        this.ctx.fillStyle = '#b45309';
        this.ctx.strokeStyle = '#78350f';
        this.ctx.lineWidth = 0.8;
        const rivetRadius = 2.0;
        const angles = [Math.PI * 0.2, Math.PI * 0.45, Math.PI * 0.65, Math.PI * 1.35, Math.PI * 1.55, Math.PI * 1.8];
        angles.forEach(a => {
          const rx = Math.cos(a) * balloon.radius * 0.82;
          const ry = Math.sin(a) * balloon.radius * 0.82;
          this.ctx.beginPath();
          this.ctx.arc(rx, ry, rivetRadius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        });
        
        // Copper exhaust pipe on the right side
        const px = balloon.radius * 0.82;
        const py = balloon.radius * 0.35;
        this.ctx.fillStyle = '#d97706';
        this.ctx.fillRect(px, py - 4, 8, 8);
        this.ctx.strokeStyle = '#78350f';
        this.ctx.lineWidth = 1.0;
        this.ctx.strokeRect(px, py - 4, 8, 8);
        
        this.ctx.fillStyle = '#b45309';
        this.ctx.fillRect(px + 6, py - 6, 3, 12);
        
        // Spawn small steam/smoke puff from exhaust on random cycles
        if (Math.random() > 0.86) {
          this.particles.push({
            type: 'smoke',
            x: balloon.x + px + 10,
            y: balloon.y + py,
            vx: 15 + Math.random() * 10,
            vy: -10 - Math.random() * 20,
            size: 2 + Math.random() * 3,
            color: 'rgba(203, 213, 225, 0.35)',
            alpha: 0.6,
            decay: 2.0
          });
        }
      } else if (this.equippedSkin === 'skin_cyber') {
        // Draw circuit paths
        this.ctx.strokeStyle = balloon.color;
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -balloon.radius * 0.95);
        this.ctx.lineTo(0, balloon.radius * 0.25);
        this.ctx.lineTo(-balloon.radius * 0.45, balloon.radius * 0.65);
        this.ctx.moveTo(0, -balloon.radius * 0.35);
        this.ctx.lineTo(balloon.radius * 0.45, -balloon.radius * 0.15);
        this.ctx.lineTo(balloon.radius * 0.45, balloon.radius * 0.35);
        this.ctx.stroke();
        
        // Glowing nodes
        this.ctx.fillStyle = '#ffffff';
        const nodes = [
          {x: 0, y: -balloon.radius * 0.95},
          {x: -balloon.radius * 0.45, y: balloon.radius * 0.65},
          {x: balloon.radius * 0.45, y: balloon.radius * 0.35}
        ];
        nodes.forEach(n => {
          this.ctx.beginPath();
          this.ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
          this.ctx.fill();
        });
      } else if (this.equippedSkin === 'skin_kitty') {
        // Eyes
        this.ctx.fillStyle = '#0f172a';
        this.ctx.beginPath();
        this.ctx.arc(-balloon.radius * 0.28, -balloon.radius * 0.35, 2.5, 0, Math.PI * 2);
        this.ctx.arc(balloon.radius * 0.28, -balloon.radius * 0.35, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Nose
        this.ctx.fillStyle = '#ff9ebb';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -balloon.radius * 0.15);
        this.ctx.lineTo(-2.5, -balloon.radius * 0.22);
        this.ctx.lineTo(2.5, -balloon.radius * 0.22);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Whiskers
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.moveTo(-balloon.radius * 0.35, -balloon.radius * 0.15);
        this.ctx.lineTo(-balloon.radius * 0.75, -balloon.radius * 0.22);
        this.ctx.moveTo(-balloon.radius * 0.35, -balloon.radius * 0.1);
        this.ctx.lineTo(-balloon.radius * 0.75, -balloon.radius * 0.1);
        this.ctx.moveTo(balloon.radius * 0.35, -balloon.radius * 0.15);
        this.ctx.lineTo(balloon.radius * 0.75, -balloon.radius * 0.22);
        this.ctx.moveTo(balloon.radius * 0.35, -balloon.radius * 0.1);
        this.ctx.lineTo(balloon.radius * 0.75, -balloon.radius * 0.1);
        this.ctx.stroke();
        
        // Swaying Tail
        this.ctx.save();
        const tailSway = Math.sin(performance.now() / 150) * 8;
        this.ctx.strokeStyle = balloon.color;
        this.ctx.lineWidth = 5.0;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(balloon.radius * 0.4, balloon.radius - 2);
        this.ctx.quadraticCurveTo(
          balloon.radius * 0.75 + tailSway, balloon.radius + 15,
          balloon.radius * 0.55 + tailSway * 1.5, balloon.radius + 28
        );
        this.ctx.stroke();
        
        this.ctx.strokeStyle = '#ff9ebb';
        this.ctx.lineWidth = 5.0;
        this.ctx.beginPath();
        this.ctx.moveTo(balloon.radius * 0.55 + tailSway * 1.5, balloon.radius + 26);
        this.ctx.lineTo(balloon.radius * 0.55 + tailSway * 1.5, balloon.radius + 28);
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Draw Balloon String or Custom Tassel
      this.ctx.shadowBlur = 0; // Disable glow
      if (this.equippedAttachment === 'attach_tassel') {
        const tasselSway = Math.sin(performance.now() / 150) * 6;
        this.ctx.strokeStyle = '#fbbf24'; // Gold Braided cord
        this.ctx.lineWidth = 2.2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, balloon.radius + 6);
        this.ctx.quadraticCurveTo(tasselSway, balloon.radius + 22, tasselSway * 1.5, balloon.radius + 36);
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#b45309'; // Bead
        this.ctx.beginPath();
        this.ctx.arc(tasselSway * 1.5, balloon.radius + 36, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ef4444'; // Red tassels
        this.ctx.beginPath();
        this.ctx.moveTo(tasselSway * 1.5 - 3, balloon.radius + 38);
        this.ctx.lineTo(tasselSway * 1.5 + 3, balloon.radius + 38);
        this.ctx.lineTo(tasselSway * 1.5 + 7, balloon.radius + 56);
        this.ctx.lineTo(tasselSway * 1.5 - 7, balloon.radius + 56);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Standard String
        this.ctx.strokeStyle = this.isNightMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(12, 74, 110, 0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, balloon.radius + 6);
        this.ctx.bezierCurveTo(
          -8, balloon.radius + 18,
          8, balloon.radius + 30,
          0, balloon.radius + 45
        );
        this.ctx.stroke();
      }

      // Highlight gloss sheen (3D bubble effect, not drawn for cyber glass skin)
      if (this.equippedSkin !== 'skin_cyber') {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.beginPath();
        this.ctx.ellipse(
          -balloon.radius * 0.35, -balloon.radius * 0.6,
          balloon.radius * 0.22, balloon.radius * 0.35,
          Math.PI / 6, 0, Math.PI * 2
        );
        this.ctx.fill();
      }

      // Draw Propeller Hat Attachment
      if (this.equippedAttachment === 'attach_propeller') {
        const capY = -balloon.radius * 1.22;
        this.ctx.fillStyle = '#fbbf24'; // Yellow cap
        this.ctx.beginPath();
        this.ctx.arc(0, capY, 8, Math.PI, 0);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 2.0;
        this.ctx.beginPath();
        this.ctx.moveTo(0, capY - 3);
        this.ctx.lineTo(0, capY - 11);
        this.ctx.stroke();
        
        const spinAngle = performance.now() / 40;
        const bladeLen = 14;
        const bx = Math.cos(spinAngle) * bladeLen;
        const by = Math.sin(spinAngle) * 2.5;
        this.ctx.strokeStyle = '#ef4444'; // Red blades
        this.ctx.lineWidth = 3.5;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(-bx, capY - 11 - by);
        this.ctx.lineTo(bx, capY - 11 + by);
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#1e293b';
        this.ctx.beginPath();
        this.ctx.arc(0, capY - 11, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Draw Shield Core Ring Attachment
      if (this.equippedAttachment === 'attach_ring') {
        this.ctx.save();
        this.ctx.rotate(Math.PI / 12); // tilt
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
        this.ctx.lineWidth = 3.5;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -balloon.radius * 0.1, balloon.radius * 1.45, balloon.radius * 0.38, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw moving orbit bead
        const beadTime = performance.now() / 280;
        const bx = Math.cos(beadTime) * balloon.radius * 1.45;
        const by = Math.sin(beadTime) * balloon.radius * 0.38;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(bx, by - balloon.radius * 0.1, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Draw Shield Bubble if active
      if (balloon.hasShield) {
        this.ctx.save();
        // Breathing animation using performance.now()
        const pulse = 1.0 + Math.sin(performance.now() / 150) * 0.06;
        const shieldRadius = balloon.radius * 1.5 * pulse;
        
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
        this.ctx.lineWidth = 3.5;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00f0ff';
        
        this.ctx.beginPath();
        // Center of the balloon is roughly at (0, -balloon.radius * 0.1)
        this.ctx.arc(0, -balloon.radius * 0.1, shieldRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw a light cyan radial fill
        const gradient = this.ctx.createRadialGradient(0, -balloon.radius * 0.1, shieldRadius * 0.4, 0, -balloon.radius * 0.1, shieldRadius);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0.18)');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.restore();
      }

      // Draw Autopilot Target-Lock Rings
      if (idx === this.activeBalloonIdx && this.autopilotTimer > 0 && this.state !== 'CELEBRATION') {
        this.ctx.save();
        const now = performance.now();
        const pulse = Math.sin(now / 100) * 3;
        
        this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#10b981';
        
        const centerY = -balloon.radius * 0.1;
        const rad = balloon.radius * 1.5 + pulse;
        
        this.ctx.beginPath();
        this.ctx.arc(0, centerY, rad, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.lineWidth = 1.8;
        this.ctx.beginPath();
        // vertical top
        this.ctx.moveTo(0, centerY - rad - 8);
        this.ctx.lineTo(0, centerY - rad + 3);
        // vertical bottom
        this.ctx.moveTo(0, centerY + rad + 8);
        this.ctx.lineTo(0, centerY + rad - 3);
        // horizontal left
        this.ctx.moveTo(-rad - 8, centerY);
        this.ctx.lineTo(-rad + 3, centerY);
        // horizontal right
        this.ctx.moveTo(rad + 8, centerY);
        this.ctx.lineTo(rad - 3, centerY);
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#10b981';
        this.ctx.beginPath();
        this.ctx.arc(0, centerY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
      }

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
      } else if (p.type === 'sparkle') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'trail_star') {
        this.ctx.fillStyle = p.color;
        if (this.isNightMode) {
          this.ctx.shadowBlur = 8;
          this.ctx.shadowColor = p.color;
        }
        const s = p.size;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y - s);
        this.ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
        this.ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s);
        this.ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
        this.ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      } else if (p.type === 'smoke') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // 7.5 Draw Storm Rainy Day Overlay, Raindrops, and Lightning Bolts
    if (this.rainTimer > 0) {
      this.ctx.save();
      // Calculate smooth fade-in and fade-out (3 seconds fade duration)
      const fadeVal = Math.min(1.0, this.rainTimer / 3.0) * (this.rainTimer > 27.0 ? (30.0 - this.rainTimer) / 3.0 : 1.0);
      
      // Stormy dark grey background sky tint
      this.ctx.fillStyle = `rgba(30, 41, 59, ${0.45 * fadeVal})`;
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      
      // Draw Raindrops
      this.ctx.strokeStyle = `rgba(186, 230, 253, ${0.45 * fadeVal})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.lineCap = 'round';
      this.raindrops.forEach(drop => {
        this.ctx.beginPath();
        this.ctx.moveTo(drop.x, drop.y);
        // Draw raindrop falling diagonally (using -4px X offset representing wind)
        this.ctx.lineTo(drop.x - 4, drop.y + drop.length);
        this.ctx.stroke();
      });
      this.ctx.restore();
      
      // Draw Lightning Bolt and screen flash
      if (this.lightningFlash > 0 && this.currentLightningBolt) {
        this.ctx.save();
        // Screen flash
        const flashOpacity = 0.35 * (this.lightningFlash / 0.22);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
        
        // Lightning bolt line
        this.ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)';
        this.ctx.lineWidth = 3.0;
        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = '#00f0ff';
        
        this.ctx.beginPath();
        this.currentLightningBolt.forEach(seg => {
          this.ctx.moveTo(seg.x1, seg.y1);
          this.ctx.lineTo(seg.x2, seg.y2);
        });
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 8. Draw Active Power-Up Indicators & Overlays
    let timerY = 95; // Starting Y coordinate below the HUD
    
    // Magnet Timer Pill
    if (this.magnetTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      this.ctx.strokeStyle = 'rgba(255, 235, 59, 0.75)';
      this.ctx.lineWidth = 1.8;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#ffeb3b';
      
      this.ctx.beginPath();
      this.drawRoundedRect(15, timerY, 145, 26, 13);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#ffeb3b';
      this.ctx.font = 'bold 12px var(--font-family)';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🧲 MAGNET', 26, timerY + 13);
      
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${this.magnetTimer.toFixed(1)}s`, 147, timerY + 13);
      this.ctx.restore();
      
      timerY += 34;
    }
    
    // Time Warp / Slow-Mo Timer Pill
    if (this.freezeTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      this.ctx.strokeStyle = 'rgba(156, 39, 176, 0.75)';
      this.ctx.lineWidth = 1.8;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#e040fb';
      
      this.ctx.beginPath();
      this.drawRoundedRect(15, timerY, 145, 26, 13);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#e040fb';
      this.ctx.font = 'bold 12px var(--font-family)';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      const pulseEmoji = Math.sin(performance.now() / 150) > 0 ? '⏳' : '⌛';
      this.ctx.fillText(`${pulseEmoji} SLOW-MO`, 26, timerY + 13);
      
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${this.freezeTimer.toFixed(1)}s`, 147, timerY + 13);
      this.ctx.restore();
      
      timerY += 34;
    }

    // Turbo Timer Pill
    if (this.turboTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      this.ctx.lineWidth = 1.8;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#ef4444';
      
      this.ctx.beginPath();
      this.drawRoundedRect(15, timerY, 145, 26, 13);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#ef4444';
      this.ctx.font = 'bold 12px var(--font-family)';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      
      const blink = Math.floor(performance.now() / 150) % 2 === 0;
      const emoji = blink ? '🚀' : '🔥';
      this.ctx.fillText(`${emoji} TURBO`, 26, timerY + 13);
      
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${this.turboTimer.toFixed(1)}s`, 147, timerY + 13);
      this.ctx.restore();
      
      timerY += 34;
    }
    
    // Time Warp subtle screen overlay
    if (this.freezeTimer > 0 && this.state !== 'CELEBRATION') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(156, 39, 176, 0.08)';
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      this.ctx.restore();
    }

    // Autopilot Timer Pill (Centered status display)
    if (this.autopilotTimer > 0 && this.state !== 'CELEBRATION') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
      this.ctx.lineWidth = 1.8;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#10b981';
      
      this.ctx.beginPath();
      this.drawRoundedRect(this.virtualWidth / 2 - 80, 95, 160, 26, 13);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#10b981';
      this.ctx.font = 'bold 12px var(--font-family)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      const blink = Math.floor(performance.now() / 250) % 2 === 0;
      const text = blink ? '🤖 AUTO-PILOT ON' : '🤖 AUTO-PILOT   ';
      this.ctx.fillText(`${text} ${this.autopilotTimer.toFixed(1)}s`, this.virtualWidth / 2, 108);
      this.ctx.restore();
    }

    // Autopilot subtle screen overlay & tech matrix lines
    if (this.autopilotTimer > 0 && this.state !== 'CELEBRATION') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
      this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      
      // Horizontal tech scanning lines
      this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.07)';
      this.ctx.lineWidth = 1.0;
      for (let y = 0; y < this.virtualHeight; y += 16) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.virtualWidth, y);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }
  }
}

// Instantiate game on load
window.addEventListener('load', () => {
  const game = new GameEngine();
  window.game = game;
});
