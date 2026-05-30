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
  gameRunning: false,
  lastPunchTime: 0,
  totalPunches: 0,
  totalHits: 0,
  totalCrits: 0,
  totalDefends: 0,
  enemyActionTimer: null,
  gameTimer: null,
  cooldownTimer: null
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
  state.gameRunning = true;
  state.lastPunchTime = 0;
  state.totalPunches = 0;
  state.totalHits = 0;
  state.totalCrits = 0;
  state.totalDefends = 0;

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
  
  state.totalPunches++;
  const now = Date.now();
  
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
  let lastAction = 0;
  
  state.enemyActionTimer = setInterval(() => {
    if (!state.gameRunning) return;

    const now = Date.now();
    const timeSinceLastAction = now - lastAction;
    
    // Enemy attacks every 800-1500ms
    if (timeSinceLastAction < 800) return;

    const action = Math.random();
    
    if (action < 0.7) {
      // Attack
      enemyAttack();
      lastAction = now;
    } else if (action < 0.85) {
      // Defend briefly
      enemyDefend();
      lastAction = now - 400; // Shorter cooldown for defend
    }
    // Sometimes do nothing (feint)
  }, 200);
}

function enemyAttack() {
  // Animate enemy
  const side = Math.random() < 0.5 ? 'left' : 'right';
  elements.enemyFighter.classList.add(`punching-${side}`);
  
  setTimeout(() => {
    elements.enemyFighter.classList.remove(`punching-${side}`);
    
    // Deal damage after animation
    const baseDamage = 10 + Math.floor(Math.random() * 8);
    dealDamageToPlayer(baseDamage);
  }, 150);
}

function enemyDefend() {
  elements.enemyFighter.classList.add('defending');
  setTimeout(() => {
    elements.enemyFighter.classList.remove('defending');
  }, 500);
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
