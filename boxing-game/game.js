// ========== Game State ==========
const state = {
  playerHP: 100,
  enemyHP: 100,
  score: 0,
  combo: 0,
  maxCombo: 0,
  timeLeft: 60,
  isDefending: false,
  critCooldown: 0,
  critMaxCooldown: 5, // 5 seconds
  punchCooldown: 0, // Player punch cooldown (ms)
  punchCooldownMax: 350, // 350ms between punches
  gameRunning: false,
  lastPunchTime: 0,
  totalPunches: 0,
  totalHits: 0,
  totalCrits: 0,
  totalDefends: 0,
  enemyActionTimer: null,
  gameTimer: null,
  cooldownTimer: null,
  ai: {
    isDefending: false,
    critCooldown: 0,
    critMaxCooldown: 6,
    lastActionTime: 0,
    playerRecentAttacks: 0,
    playerRecentDefends: 0,
    behaviorWindow: 0,
    feinting: false,
    comboCount: 0,
    rage: false,
    difficulty: 1.0,
    pressureMode: false,
    pressureCount: 0,
    restTimer: 0,
    counterMode: false,
    counterCount: 0
  }
};

// ========== DOM Elements ==========
const elements = {
  startScreen: document.getElementById('start-screen'),
  gameScreen: document.getElementById('game-screen'),
  endScreen: document.getElementById('end-screen'),
  startBtn: document.getElementById('start-btn'),
  restartBtn: document.getElementById('restart-btn'),
  playerHP: document.getElementById('player-hp'),
  enemyHP: document.getElementById('enemy-hp'),
  playerHPText: document.getElementById('player-hp-text'),
  enemyHPText: document.getElementById('enemy-hp-text'),
  timer: document.getElementById('round-timer'),
  score: document.getElementById('score'),
  combo: document.getElementById('combo'),
  playerFighter: document.getElementById('player-fighter'),
  enemyFighter: document.getElementById('enemy-fighter'),
  effectsLayer: document.getElementById('effects-layer'),
  btnLeft: document.getElementById('btn-left'),
  btnRight: document.getElementById('btn-right'),
  btnDefend: document.getElementById('btn-defend'),
  btnCrit: document.getElementById('btn-crit'),
  critCooldownFill: document.getElementById('crit-cooldown-fill'),
  resultEmoji: document.getElementById('result-emoji'),
  resultTitle: document.getElementById('result-title'),
  resultScore: document.getElementById('result-score'),
  resultStats: document.getElementById('result-stats')
};

// ========== Game Functions ==========
function startGame() {
  // Reset state
  state.playerHP = 100;
  state.enemyHP = 100;
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.timeLeft = 60;
  state.isDefending = false;
  state.critCooldown = 0;
  state.punchCooldown = 0;
  state.gameRunning = true;
  state.lastPunchTime = 0;
  state.totalPunches = 0;
  state.totalHits = 0;
  state.totalCrits = 0;
  state.totalDefends = 0;
  state.ai.isDefending = false;
  state.ai.critCooldown = 0;
  state.ai.lastActionTime = 0;
  state.ai.playerRecentAttacks = 0;
  state.ai.playerRecentDefends = 0;
  state.ai.behaviorWindow = 0;
  state.ai.feinting = false;
  state.ai.comboCount = 0;
  state.ai.rage = false;
  state.ai.difficulty = 1.0;
  state.ai.pressureMode = false;
  state.ai.pressureCount = 0;
  state.ai.restTimer = 0;
  state.ai.counterMode = false;
  state.ai.counterCount = 0;

  // Update UI
  updateHP();
  updateScore();
  elements.timer.textContent = '60';
  elements.critCooldownFill.style.width = '100%';
  elements.btnCrit.classList.remove('on-cooldown');

  // Show game screen
  showScreen('game');

  // Start timers
  startGameTimer();
  startCooldownTimer();
  startEnemyAI();
}

function endGame(playerWon) {
  state.gameRunning = false;
  clearAllTimers();

  // Calculate accuracy
  const accuracy = state.totalPunches > 0 
    ? Math.round((state.totalHits / state.totalPunches) * 100) 
    : 0;

  // Update result screen
  if (playerWon) {
    elements.resultEmoji.textContent = '🏆';
    elements.resultTitle.textContent = '胜利！';
    elements.resultTitle.style.color = '#ffd700';
  } else {
    elements.resultEmoji.textContent = '😢';
    elements.resultTitle.textContent = '失败...';
    elements.resultTitle.style.color = '#ff6b6b';
  }

  elements.resultScore.textContent = `得分: ${state.score}`;
  elements.resultStats.innerHTML = `
    最高连击: ${state.maxCombo}<br>
    命中率: ${accuracy}%<br>
    暴击次数: ${state.totalCrits}<br>
    防御次数: ${state.totalDefends}
  `;

  showScreen('end');
}

function showScreen(screen) {
  elements.startScreen.classList.remove('active');
  elements.gameScreen.classList.remove('active');
  elements.endScreen.classList.remove('active');

  if (screen === 'start') elements.startScreen.classList.add('active');
  if (screen === 'game') elements.gameScreen.classList.add('active');
  if (screen === 'end') elements.endScreen.classList.add('active');
}

// ========== HP & Score ==========
function updateHP() {
  elements.playerHP.style.width = `${state.playerHP}%`;
  elements.enemyHP.style.width = `${state.enemyHP}%`;
  elements.playerHPText.textContent = Math.max(0, state.playerHP);
  elements.enemyHPText.textContent = Math.max(0, state.enemyHP);

  // Color change based on HP
  if (state.playerHP <= 30) {
    elements.playerHP.style.background = 'linear-gradient(90deg, #f44336, #e91e63)';
  }
  if (state.enemyHP <= 30) {
    elements.enemyHP.style.background = 'linear-gradient(90deg, #f44336, #e91e63)';
  }
}

function updateScore() {
  elements.score.textContent = state.score;
  elements.combo.textContent = state.combo;
}

// ========== Timers ==========
function startGameTimer() {
  state.gameTimer = setInterval(() => {
    if (!state.gameRunning) return;
    
    state.timeLeft--;
    elements.timer.textContent = state.timeLeft;

    if (state.timeLeft <= 10) {
      elements.timer.style.color = '#ff4444';
    }

    if (state.timeLeft <= 0) {
      // Time's up - whoever has more HP wins
      if (state.playerHP > state.enemyHP) {
        endGame(true);
      } else if (state.playerHP < state.enemyHP) {
        endGame(false);
      } else {
        // Tie - player loses (or could be a draw)
        endGame(false);
      }
    }
  }, 1000);
}

function startCooldownTimer() {
  state.cooldownTimer = setInterval(() => {
    if (!state.gameRunning) return;

    if (state.critCooldown > 0) {
      state.critCooldown -= 0.1;
      const percent = (1 - state.critCooldown / state.critMaxCooldown) * 100;
      elements.critCooldownFill.style.width = `${percent}%`;

      if (state.critCooldown <= 0) {
        elements.btnCrit.classList.remove('on-cooldown');
      }
    }

    // AI crit cooldown
    if (state.ai.critCooldown > 0) {
      state.ai.critCooldown -= 0.1;
    }

    // AI difficulty increases over time (1.0 -> 2.0 over 60 seconds)
    state.ai.difficulty = Math.min(2.0, 1.0 + (60 - state.timeLeft) / 60);

    // Decay player behavior window every 5 seconds
    state.ai.behaviorWindow += 0.1;
    if (state.ai.behaviorWindow >= 5) {
      state.ai.playerRecentAttacks = Math.floor(state.ai.playerRecentAttacks / 2);
      state.ai.playerRecentDefends = Math.floor(state.ai.playerRecentDefends / 2);
      state.ai.behaviorWindow = 0;
    }
  }, 100);
}

function clearAllTimers() {
  if (state.gameTimer) clearInterval(state.gameTimer);
  if (state.cooldownTimer) clearInterval(state.cooldownTimer);
  if (state.enemyActionTimer) clearInterval(state.enemyActionTimer);
}

// ========== Player Actions ==========
function punch(side) {
  if (!state.gameRunning) return;
  
  // Punch cooldown - can't spam attacks
  const now = Date.now();
  if (now - state.lastPunchTime < state.punchCooldownMax) return;
  
  state.totalPunches++;
  state.ai.playerRecentAttacks++;
  
  // Check combo timing (within 1 second)
  if (now - state.lastPunchTime < 1000) {
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  } else {
    state.combo = 1;
  }
  state.lastPunchTime = now;

  // Animate player
  elements.playerFighter.classList.add(`punching-${side}`);
  setTimeout(() => {
    elements.playerFighter.classList.remove(`punching-${side}`);
  }, 150);

  // Calculate hit chance (85% base, +5% per combo up to 95%)
  const hitChance = Math.min(95, 85 + state.combo * 5);
  const hit = Math.random() * 100 < hitChance;

  if (hit) {
    state.totalHits++;
    const damage = 8 + Math.floor(Math.random() * 5) + state.combo;
    dealDamageToEnemy(damage, false);
    updateScore();
  } else {
    // Miss
    showEffect('💨', 'effect', 50, 30);
  }
}

function criticalHit() {
  if (!state.gameRunning) return;
  if (state.critCooldown > 0) return;

  state.critCooldown = state.critMaxCooldown;
  elements.btnCrit.classList.add('on-cooldown');
  state.totalPunches++;
  state.totalHits++;
  state.totalCrits++;

  // Animate player
  elements.playerFighter.classList.add('punching-crit');
  setTimeout(() => {
    elements.playerFighter.classList.remove('punching-crit');
  }, 300);

  // Critical damage (double + bonus)
  const damage = 25 + Math.floor(Math.random() * 10);
  dealDamageToEnemy(damage, true);
  
  // Reset combo
  state.combo = 0;
  updateScore();
}

function startDefend() {
  if (!state.gameRunning) return;
  state.isDefending = true;
  state.totalDefends++;
  state.ai.playerRecentDefends++;
  elements.btnDefend.classList.add('defending-active');
  elements.playerFighter.classList.add('defending');
}

function stopDefend() {
  state.isDefending = false;
  elements.btnDefend.classList.remove('defending-active');
  elements.playerFighter.classList.remove('defending');
}

// ========== Damage & Effects ==========
function dealDamageToEnemy(damage, isCrit) {
  if (state.ai.isDefending) {
    damage = Math.floor(damage * 0.3);
    showEffect('🛡️', 'effect-defend', 70, 50);
  }
  state.enemyHP = Math.max(0, state.enemyHP - damage);
  updateHP();

  // Score
  state.score += damage * (isCrit ? 2 : 1) + state.combo * 2;

  // Effects
  if (isCrit) {
    showEffect('💥', 'effect-crit', 70, 40);
    showEffect(`-${damage}⚡`, 'effect-crit', 70, 60);
    showStarBurst(70, 50);
    flashScreen('crit-flash');
    elements.enemyFighter.classList.add('crit-hit');
  } else {
    showEffect('⭐', 'effect', 70, 40);
    showEffect(`-${damage}`, 'effect-damage', 70, 60);
    elements.enemyFighter.classList.add('hit');
  }

  setTimeout(() => {
    elements.enemyFighter.classList.remove('hit', 'crit-hit');
  }, 300);

  // Check win
  if (state.enemyHP <= 0) {
    state.score += 500; // Win bonus
    endGame(true);
  }
}

function dealDamageToPlayer(damage) {
  let actualDamage = damage;
  
  if (state.isDefending) {
    actualDamage = Math.floor(damage * 0.3); // 70% damage reduction
    showEffect('🛡️', 'effect-defend', 30, 50);
  }

  state.playerHP = Math.max(0, state.playerHP - actualDamage);
  updateHP();

  // Reset combo when hit
  state.combo = 0;
  updateScore();

  // Effects
  if (!state.isDefending) {
    showEffect('💫', 'effect', 30, 40);
    showEffect(`-${actualDamage}`, 'effect-damage', 30, 60);
    flashScreen('hit-flash');
    elements.playerFighter.classList.add('hit');
    setTimeout(() => {
      elements.playerFighter.classList.remove('hit');
    }, 300);
  }

  // Check lose
  if (state.playerHP <= 0) {
    endGame(false);
  }
}

function showEffect(content, className, xPercent, yPercent) {
  const effect = document.createElement('div');
  effect.className = `effect ${className}`;
  effect.textContent = content;
  effect.style.left = `${xPercent}%`;
  effect.style.top = `${yPercent}%`;
  elements.effectsLayer.appendChild(effect);

  setTimeout(() => effect.remove(), 800);
}

function showStarBurst(xPercent, yPercent) {
  const burst = document.createElement('div');
  burst.className = 'star-burst';
  burst.style.left = `${xPercent}%`;
  burst.style.top = `${yPercent}%`;

  const stars = ['⭐', '✨', '💫', '🌟'];
  for (let i = 0; i < 6; i++) {
    const star = document.createElement('span');
    star.className = 'star-particle';
    star.textContent = stars[Math.floor(Math.random() * stars.length)];
    const angle = (i / 6) * Math.PI * 2;
    const distance = 40 + Math.random() * 30;
    star.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    star.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
    star.style.animation = `starFly 0.6s ease-out forwards`;
    star.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
    burst.appendChild(star);
  }

  elements.effectsLayer.appendChild(burst);
  setTimeout(() => burst.remove(), 600);
}

function flashScreen(className) {
  const flash = document.createElement('div');
  flash.className = `screen-flash ${className}`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 150);
}

// ========== Enemy AI ==========
function startEnemyAI() {
  state.enemyActionTimer = setInterval(() => {
    if (!state.gameRunning) return;

    const now = Date.now();
    const ai = state.ai;
    const elapsed = 60 - state.timeLeft;

    // Update rage mode
    ai.rage = state.enemyHP <= 30;

    // Rest timer (after pressure)
    if (ai.restTimer > 0) {
      ai.restTimer -= 0.15;
      return;
    }

    // Difficulty curve: 1.0 -> 2.5 over 60 seconds
    ai.difficulty = Math.min(2.5, 1.0 + elapsed / 40);

    // Base attack interval: gets faster with difficulty and rage
    let baseInterval = 600 - (ai.difficulty - 1) * 150; // 600ms -> 225ms
    if (ai.rage) baseInterval *= 0.5; // Rage = double speed
    baseInterval = Math.max(200, baseInterval);

    const timeSinceLastAction = now - ai.lastActionTime;
    if (timeSinceLastAction < baseInterval) return;

    // ===== Pressure Mode: AI goes all-out attack =====
    if (ai.pressureMode) {
      ai.pressureCount--;
      enemyAttack();
      ai.lastActionTime = now;
      if (ai.pressureCount <= 0) {
        ai.pressureMode = false;
        ai.restTimer = 1.5; // Rest after pressure
      }
      return;
    }

    // ===== Counter Mode: after being hit hard, counter-attack =====
    if (ai.counterMode) {
      ai.counterCount--;
      enemyAttack();
      ai.lastActionTime = now;
      if (ai.counterCount <= 0) {
        ai.counterMode = false;
      }
      return;
    }

    // ===== AI Decision Making =====
    const playerAggro = ai.playerRecentAttacks >= 3;
    const playerTurtling = ai.playerRecentDefends >= 2 && ai.playerRecentAttacks <= 1;
    const canCrit = ai.critCooldown <= 0;

    // Random roll for action
    let roll = Math.random() * 100;

    // Player is aggressive -> defend more and counter
    if (playerAggro) {
      if (roll < 35) {
        // Defend and counter
        enemySmartDefend(800);
        ai.lastActionTime = now - baseInterval * 0.3;
        // Schedule counter after defend
        setTimeout(() => {
          if (state.gameRunning) {
            ai.counterMode = true;
            ai.counterCount = 2;
          }
        }, 600);
        return;
      }
      roll -= 35;
    }

    // Player is turtling -> pressure attack
    if (playerTurtling && roll < 40) {
      ai.pressureMode = true;
      ai.pressureCount = 4;
      ai.lastActionTime = now;
      return;
    }

    // Random pressure burst (every ~8 seconds)
    if (Math.random() < 0.03 * ai.difficulty) {
      ai.pressureMode = true;
      ai.pressureCount = 3 + Math.floor(Math.random() * 3); // 3-5 attacks
      if (ai.rage) ai.pressureCount += 2;
      ai.lastActionTime = now;
      return;
    }

    // AI crit attack
    if (canCrit && roll < (ai.rage ? 25 : 15)) {
      enemyCritAttack();
      ai.critCooldown = ai.critMaxCooldown;
      ai.lastActionTime = now;
      return;
    }

    // AI combo (2-3 quick hits)
    if (roll < (ai.rage ? 50 : 35)) {
      enemyCombo(2 + (ai.rage ? 1 : 0));
      ai.lastActionTime = now;
      return;
    }

    // Smart defend
    if (roll < 50) {
      enemySmartDefend(600 + Math.random() * 400);
      ai.lastActionTime = now - baseInterval * 0.3;
      return;
    }

    // Normal attack
    enemyAttack();
    ai.lastActionTime = now;
  }, 150);
}

function enemyAttack() {
  const side = Math.random() < 0.5 ? 'left' : 'right';
  elements.enemyFighter.classList.add(`punching-${side}`);

  setTimeout(() => {
    elements.enemyFighter.classList.remove(`punching-${side}`);
    let baseDamage = 10 + Math.floor(Math.random() * 6);
    // Difficulty and rage scaling
    baseDamage = Math.floor(baseDamage * (1 + (state.ai.difficulty - 1) * 0.3));
    if (state.ai.rage) baseDamage = Math.floor(baseDamage * 1.5);
    dealDamageToPlayer(baseDamage);
  }, 150);
}

function enemyCritAttack() {
  elements.enemyFighter.classList.add('punching-crit');
  showEffect('⚠️', 'effect-crit', 50, 20);

  setTimeout(() => {
    elements.enemyFighter.classList.remove('punching-crit');
    let damage = 22 + Math.floor(Math.random() * 8);
    if (state.ai.rage) damage = Math.floor(damage * 1.5);
    dealDamageToPlayer(damage);
    showEffect('💥', 'effect-crit', 30, 40);
    showEffect(`-${damage}⚡`, 'effect-crit', 30, 60);
    flashScreen('crit-flash');
  }, 200);
}

function enemyCombo(count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (!state.gameRunning) return;
      const side = i % 2 === 0 ? 'left' : 'right';
      elements.enemyFighter.classList.add(`punching-${side}`);
      setTimeout(() => {
        elements.enemyFighter.classList.remove(`punching-${side}`);
        let damage = 6 + Math.floor(Math.random() * 4); // lighter per hit but many
        if (state.ai.rage) damage = Math.floor(damage * 1.4);
        dealDamageToPlayer(damage);
      }, 120);
    }, i * 350); // 350ms between each punch
  }
}

function enemySmartDefend(duration) {
  state.ai.isDefending = true;
  elements.enemyFighter.classList.add('defending');
  showEffect('🛡️', 'effect-defend', 70, 30);
  setTimeout(() => {
    state.ai.isDefending = false;
    elements.enemyFighter.classList.remove('defending');
  }, duration);
}

// Keep old enemyDefend for compatibility
function enemyDefend() {
  enemySmartDefend(500);
}

// ========== Event Listeners ==========
elements.startBtn.addEventListener('click', startGame);
elements.restartBtn.addEventListener('click', startGame);

// Punch buttons
elements.btnLeft.addEventListener('click', () => punch('left'));
elements.btnRight.addEventListener('click', () => punch('right'));

// Crit button
elements.btnCrit.addEventListener('click', criticalHit);

// Defend button (touch events for hold)
elements.btnDefend.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startDefend();
});

elements.btnDefend.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopDefend();
});

elements.btnDefend.addEventListener('touchcancel', stopDefend);

// Mouse events for desktop testing
elements.btnDefend.addEventListener('mousedown', startDefend);
elements.btnDefend.addEventListener('mouseup', stopDefend);
elements.btnDefend.addEventListener('mouseleave', stopDefend);

// Prevent context menu on long press
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Keyboard controls for desktop
document.addEventListener('keydown', (e) => {
  if (!state.gameRunning) {
    if (e.key === 'Enter' || e.key === ' ') {
      startGame();
    }
    return;
  }

  switch(e.key.toLowerCase()) {
    case 'a':
    case 'arrowleft':
      punch('left');
      break;
    case 'd':
    case 'arrowright':
      punch('right');
      break;
    case 's':
    case 'arrowdown':
      startDefend();
      break;
    case 'w':
    case 'arrowup':
    case ' ':
      criticalHit();
      break;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') {
    stopDefend();
  }
});

// ========== Initialize ==========
showScreen('start');
