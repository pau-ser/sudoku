// app.js - Versión con anotaciones mejoradas

// Función seed para random determinístico
Math.seedrandom = function(seed) {
  let state = seed;
  Math.random = function() {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
};

class SudokuSolver {
  constructor(board) {
    this.board = board.map(row => [...row]);
    this.solutions = [];
  }

  isValid(row, col, num) {
    for (let x = 0; x < 9; x++) {
      if (this.board[row][x] === num) return false;
      if (this.board[x][col] === num) return false;
    }
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.board[i + startRow][j + startCol] === num) return false;
      }
    }
    return true;
  }

  solve(limitSolutions = false) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (this.isValid(row, col, num)) {
              this.board[row][col] = num;
              if (this.solve(limitSolutions)) {
                if (limitSolutions && this.solutions.length > 1) {
                  this.board[row][col] = 0;
                  return true;
                }
              }
              this.board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    this.solutions.push(this.board.map(row => [...row]));
    return true;
  }

  hasUniqueSolution() {
    this.solutions = [];
    this.solve(true);
    return this.solutions.length === 1;
  }
}

class SudokuGenerator {
  generateComplete(seed = null) {
    if (seed !== null) Math.seedrandom(seed);
    
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    for (let box = 0; box < 9; box += 3) {
      const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          board[box + i][box + j] = nums[idx++];
        }
      }
    }
    const solver = new SudokuSolver(board);
    solver.solve();
    return solver.solutions[0];
  }

  generate(difficulty, seed = null) {
    const settings = {
      easy: { minClues: 40, maxClues: 45 },
      medium: { minClues: 32, maxClues: 35 },
      hard: { minClues: 28, maxClues: 31 },
      expert: { minClues: 24, maxClues: 27 },
      master: { minClues: 22, maxClues: 24 }
    }[difficulty];

    const solution = this.generateComplete(seed);
    const puzzle = solution.map(row => [...row]);
    const positions = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) positions.push([i, j]);
    }
    positions.sort(() => Math.random() - 0.5);
    
    let clues = 81;
    for (const [row, col] of positions) {
      if (clues <= settings.minClues) break;
      const backup = puzzle[row][col];
      puzzle[row][col] = 0;
      const solver = new SudokuSolver(puzzle);
      if (!solver.hasUniqueSolution()) {
        puzzle[row][col] = backup;
        continue;
      }
      clues--;
    }
    return { puzzle, solution, clues };
  }
}

// Sistema de sonidos mejorado
class SoundSystem {
  constructor() {
    this.enabled = JSON.parse(localStorage.getItem('sudoku-sound') || 'true');
    this.audioContext = null;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(frequency, duration, type = 'sine') {
    if (!this.enabled) return;
    this.init();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  click() { this.playTone(800, 0.05); }
  input() { this.playTone(600, 0.1); }
  error() { this.playTone(200, 0.2, 'sawtooth'); }
  hint() { this.playTone(1000, 0.15); }
  tick() { this.playTone(1200, 0.03); }
  note() { this.playTone(900, 0.08); } // Nuevo sonido para notas
  complete() {
    this.playTone(523, 0.15);
    setTimeout(() => this.playTone(659, 0.15), 150);
    setTimeout(() => this.playTone(784, 0.3), 300);
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sudoku-sound', JSON.stringify(this.enabled));
  }
}

// Estado del juego
const gameState = {
  currentPuzzle: null,
  userBoard: null,
  selectedCell: null,
  timer: 0,
  mistakes: 0,
  hintsUsed: 0,
  difficulty: 'medium',
  timerInterval: null,
  theme: localStorage.getItem('sudoku-theme') || 'dark',
  moveHistory: [],
  notes: {}, // Para modo notas - ahora mejorado
  notesMode: false,
  autoCheck: JSON.parse(localStorage.getItem('sudoku-autocheck') || 'true'),
  expertMode: false,
  timeAttackMode: false,
  timeAttackLimit: 600,
  stats: JSON.parse(localStorage.getItem('sudoku-stats') || '{"gamesWon":0,"bestTime":"--:--","streak":0,"totalTime":0,"byDifficulty":{}}'),
  savedGames: JSON.parse(localStorage.getItem('sudoku-saved') || '[]'),
  dailyChallenge: JSON.parse(localStorage.getItem('sudoku-daily') || 'null'),
  leaderboard: JSON.parse(localStorage.getItem('sudoku-leaderboard') || '[]'),
  progressData: JSON.parse(localStorage.getItem('sudoku-progress') || '{"dates":[],"times":[],"accuracies":[]}'),
  customColors: JSON.parse(localStorage.getItem('sudoku-colors') || '{"given":"#f3f4f6","selected":"#93c5fd","user":"#ffffff","error":"#fecaca"}'),
  sound: new SoundSystem()
};

// Temas
const themes = {
  dark: {
    bg: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  light: {
    bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
    cardBg: 'rgba(255,255,255,0.9)',
    text: '#1e293b',
    menuBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  forest: {
    bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  sunset: {
    bg: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
  },
  ocean: {
    bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
  }
};

// Utilidades
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function saveStats() {
  localStorage.setItem('sudoku-stats', JSON.stringify(gameState.stats));
}

function saveToLeaderboard() {
  const entry = {
    id: Date.now(),
    difficulty: gameState.difficulty,
    time: gameState.timer,
    mistakes: gameState.mistakes,
    hintsUsed: gameState.hintsUsed,
    date: new Date().toLocaleDateString()
  };
  
  gameState.leaderboard.push(entry);
  gameState.leaderboard.sort((a, b) => a.time - b.time);
  gameState.leaderboard = gameState.leaderboard.slice(0, 10);
  localStorage.setItem('sudoku-leaderboard', JSON.stringify(gameState.leaderboard));
}

function saveProgress() {
  const today = new Date().toLocaleDateString();
  const accuracy = gameState.userBoard.flat().filter(c => c !== 0).length > 0 ?
    Math.round((1 - gameState.mistakes / gameState.userBoard.flat().filter(c => c !== 0).length) * 100) : 100;
  
  gameState.progressData.dates.push(today);
  gameState.progressData.times.push(gameState.timer);
  gameState.progressData.accuracies.push(accuracy);
  
  if (gameState.progressData.dates.length > 30) {
    gameState.progressData.dates.shift();
    gameState.progressData.times.shift();
    gameState.progressData.accuracies.shift();
  }
  
  localStorage.setItem('sudoku-progress', JSON.stringify(gameState.progressData));
}

function saveGame() {
  if (!gameState.currentPuzzle) return;
  
  const saved = {
    id: Date.now(),
    puzzle: gameState.currentPuzzle,
    userBoard: gameState.userBoard,
    difficulty: gameState.difficulty,
    timer: gameState.timer,
    mistakes: gameState.mistakes,
    hintsUsed: gameState.hintsUsed,
    date: new Date().toLocaleString(),
    moveHistory: gameState.moveHistory,
    notes: Object.fromEntries(
      Object.entries(gameState.notes).map(([k, v]) => [k, Array.from(v)])
    ),
    expertMode: gameState.expertMode,
    timeAttackMode: gameState.timeAttackMode
  };
  
  gameState.savedGames.unshift(saved);
  gameState.savedGames = gameState.savedGames.slice(0, 5);
  localStorage.setItem('sudoku-saved', JSON.stringify(gameState.savedGames));
  gameState.sound.hint();
  showNotification('✅ Partida guardada');
}

function loadGame(id) {
  const saved = gameState.savedGames.find(g => g.id === id);
  if (!saved) return;
  
  gameState.currentPuzzle = saved.puzzle;
  gameState.userBoard = saved.userBoard;
  gameState.difficulty = saved.difficulty;
  gameState.timer = saved.timer;
  gameState.mistakes = saved.mistakes;
  gameState.hintsUsed = saved.hintsUsed;
  gameState.moveHistory = saved.moveHistory || [];
  gameState.notes = {};
  if (saved.notes) {
    Object.entries(saved.notes).forEach(([k, v]) => {
      gameState.notes[k] = new Set(v);
    });
  }
  gameState.expertMode = saved.expertMode || false;
  gameState.timeAttackMode = saved.timeAttackMode || false;
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    if (gameState.timeAttackMode && gameState.timer >= gameState.timeAttackLimit) {
      clearInterval(gameState.timerInterval);
      showTimeUpScreen();
      return;
    }
    gameState.timer++;
    if (gameState.timer % 60 === 0) gameState.sound.tick();
    updateTimer();
  }, 1000);
  
  gameState.sound.click();
  renderGame();
}

function getDailyChallenge() {
  const today = new Date().toDateString();
  
  if (gameState.dailyChallenge && gameState.dailyChallenge.date === today) {
    return gameState.dailyChallenge;
  }
  
  const seedValue = new Date().getFullYear() * 10000 + 
                    (new Date().getMonth() + 1) * 100 + 
                    new Date().getDate();
  
  const generator = new SudokuGenerator();
  const puzzle = generator.generate('hard', seedValue);
  
  const daily = {
    date: today,
    puzzle: puzzle,
    completed: false,
    time: null,
    mistakes: null
  };
  
  gameState.dailyChallenge = daily;
  localStorage.setItem('sudoku-daily', JSON.stringify(daily));
  return daily;
}

function toggleTheme() {
  const themeKeys = Object.keys(themes);
  const currentIndex = themeKeys.indexOf(gameState.theme);
  const nextIndex = (currentIndex + 1) % themeKeys.length;
  gameState.theme = themeKeys[nextIndex];
  localStorage.setItem('sudoku-theme', gameState.theme);
  
  if (gameState.currentPuzzle) {
    renderGame();
  } else {
    renderMenu();
  }
}

function toggleNotesMode() {
  gameState.notesMode = !gameState.notesMode;
  gameState.sound.click();
  showNotification(gameState.notesMode ? '📝 Modo Anotaciones: ON' : '✏️ Modo Normal: ON');
  renderGame();
}

function clearAllNotes() {
  if (confirm('¿Borrar todas las anotaciones?')) {
    gameState.notes = {};
    gameState.sound.click();
    showNotification('🗑️ Anotaciones borradas');
    renderGame();
  }
}

function clearCellNotes() {
  if (!gameState.selectedCell) {
    showNotification('Selecciona una celda primero');
    return;
  }
  const [row, col] = gameState.selectedCell;
  const key = `${row}-${col}`;
  if (gameState.notes[key]) {
    delete gameState.notes[key];
    gameState.sound.click();
    showNotification('🗑️ Anotaciones borradas de la celda');
    renderBoard();
  }
}

function autoFillNotes() {
  let filled = 0;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (gameState.userBoard[i][j] === 0 && gameState.currentPuzzle.puzzle[i][j] === 0) {
        const key = `${i}-${j}`;
        const candidates = getCandidates(i, j);
        if (candidates.length > 0) {
          gameState.notes[key] = new Set(candidates);
          filled++;
        }
      }
    }
  }
  gameState.sound.hint();
  showNotification(`✨ ${filled} celdas con anotaciones automáticas`);
  renderGame();
}

function getCandidates(row, col) {
  const candidates = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidMove(row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

function isValidMove(row, col, num) {
  // Verificar fila
  for (let j = 0; j < 9; j++) {
    if (gameState.userBoard[row][j] === num) return false;
  }
  
  // Verificar columna
  for (let i = 0; i < 9; i++) {
    if (gameState.userBoard[i][col] === num) return false;
  }
  
  // Verificar cuadro 3x3
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if (gameState.userBoard[i][j] === num) return false;
    }
  }
  
  return true;
}

function showNotification(message) {
  const notif = document.createElement('div');
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

function showTimeUpScreen() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 600px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; border: 1px solid rgba(255,255,255,0.2); text-align: center;">
        <div style="font-size: 120px; margin-bottom: 30px;">⏰</div>
        <h1 style="font-size: 48px; font-weight: bold; color: white; margin: 0 0 20px 0;">¡Tiempo agotado!</h1>
        <div style="font-size: 24px; color: rgba(255,255,255,0.9); margin-bottom: 40px;">No completaste el sudoku a tiempo</div>
        
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <button onclick="startNewGame('${gameState.difficulty}', false, true)" style="
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
          ">⏱️ Intentar de nuevo</button>
          <button onclick="renderMenu()" style="
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
          ">🏠 Menú principal</button>
        </div>
      </div>
    </div>
  `;
}

// Funciones del juego
function startNewGame(difficulty, isDailyChallenge = false, isTimeAttack = false, isExpert = false) {
  gameState.difficulty = difficulty;
  gameState.timeAttackMode = isTimeAttack;
  gameState.expertMode = isExpert;
  
  if (isDailyChallenge) {
    const daily = getDailyChallenge();
    if (daily.completed) {
      showNotification('Ya completaste el reto diario 🎉');
      return;
    }
    gameState.currentPuzzle = daily.puzzle;
  } else {
    const generator = new SudokuGenerator();
    gameState.currentPuzzle = generator.generate(difficulty);
  }
  
  gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
  gameState.selectedCell = null;
  gameState.timer = 0;
  gameState.mistakes = 0;
  gameState.hintsUsed = 0;
  gameState.moveHistory = [];
  gameState.notes = {};
  gameState.notesMode = false;
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    if (gameState.timeAttackMode && gameState.timer >= gameState.timeAttackLimit) {
      clearInterval(gameState.timerInterval);
      showTimeUpScreen();
      return;
    }
    gameState.timer++;
    if (gameState.timer % 60 === 0) gameState.sound.tick();
    updateTimer();
  }, 1000);
  
  gameState.sound.click();
  renderGame();
}

function selectCell(row, col) {
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  gameState.selectedCell = [row, col];
  gameState.sound.click();
  renderBoard();
}

function inputNumber(num) {
  if (!gameState.selectedCell) {
    showNotification('❌ Selecciona una celda primero');
    return;
  }
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  
  const key = `${row}-${col}`;
  
  if (gameState.notesMode) {
    // Modo anotaciones
    if (!gameState.notes[key]) gameState.notes[key] = new Set();
    
    if (gameState.notes[key].has(num)) {
      gameState.notes[key].delete(num);
    } else {
      gameState.notes[key].add(num);
    }
    
    // Si no quedan notas, eliminar la entrada
    if (gameState.notes[key].size === 0) {
      delete gameState.notes[key];
    }
    
    gameState.sound.note();
    renderBoard();
    return;
  }
  
  // Modo normal - entrada de número
  if (!gameState.expertMode) {
    gameState.moveHistory.push({
      row,
      col,
      oldValue: gameState.userBoard[row][col],
      newValue: num,
      oldNotes: gameState.notes[key] ? new Set(gameState.notes[key]) : null
    });
  }
  
  // Si ya hay un número, borrarlo (toggle)
  if (gameState.userBoard[row][col] === num) {
    gameState.userBoard[row][col] = 0;
    gameState.sound.click();
  } else {
    gameState.userBoard[row][col] = num;
    
    // Limpiar anotaciones de esta celda al ingresar un número
    if (gameState.notes[key]) delete gameState.notes[key];
    
    // Verificar si es correcto
    if (num !== gameState.currentPuzzle.solution[row][col]) {
      gameState.mistakes++;
      gameState.sound.error();
      updateMistakes();
    } else {
      gameState.sound.input();
      // Limpiar anotaciones relacionadas en fila, columna y cuadro
      cleanRelatedNotes(row, col, num);
    }
  }
  
  renderBoard();
  checkWin();
}

function cleanRelatedNotes(row, col, num) {
  // Limpiar el número de las anotaciones en la fila, columna y cuadro
  for (let i = 0; i < 9; i++) {
    // Fila
    const rowKey = `${row}-${i}`;
    if (gameState.notes[rowKey]) {
      gameState.notes[rowKey].delete(num);
      if (gameState.notes[rowKey].size === 0) delete gameState.notes[rowKey];
    }
    
    // Columna
    const colKey = `${i}-${col}`;
    if (gameState.notes[colKey]) {
      gameState.notes[colKey].delete(num);
      if (gameState.notes[colKey].size === 0) delete gameState.notes[colKey];
    }
  }
  
  // Cuadro 3x3
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      const boxKey = `${i}-${j}`;
      if (gameState.notes[boxKey]) {
        gameState.notes[boxKey].delete(num);
        if (gameState.notes[boxKey].size === 0) delete gameState.notes[boxKey];
      }
    }
  }
}

function checkWin() {
  const isComplete = gameState.userBoard.every((row, i) => 
    row.every((cell, j) => cell === gameState.currentPuzzle.solution[i][j])
  );
  
  if (isComplete) {
    clearInterval(gameState.timerInterval);
    gameState.stats.gamesWon++;
    gameState.stats.streak++;
    gameState.stats.totalTime += gameState.timer;
    
    if (!gameState.stats.byDifficulty[gameState.difficulty]) {
      gameState.stats.byDifficulty[gameState.difficulty] = { won: 0, bestTime: null };
    }
    gameState.stats.byDifficulty[gameState.difficulty].won++;
    
    const diffBest = gameState.stats.byDifficulty[gameState.difficulty].bestTime;
    if (!diffBest || gameState.timer < diffBest) {
      gameState.stats.byDifficulty[gameState.difficulty].bestTime = gameState.timer;
    }
    
    if (gameState.stats.bestTime === '--:--') {
      gameState.stats.bestTime = formatTime(gameState.timer);
    } else {
      const currentBest = parseInt(gameState.stats.bestTime.split(':')[0]) * 60 + 
                         parseInt(gameState.stats.bestTime.split(':')[1]);
      if (gameState.timer < currentBest) {
        gameState.stats.bestTime = formatTime(gameState.timer);
      }
    }
    
    if (gameState.dailyChallenge && gameState.dailyChallenge.date === new Date().toDateString()) {
      if (!gameState.dailyChallenge.completed) {
        gameState.dailyChallenge.completed = true;
        gameState.dailyChallenge.time = gameState.timer;
        gameState.dailyChallenge.mistakes = gameState.mistakes;
        localStorage.setItem('sudoku-daily', JSON.stringify(gameState.dailyChallenge));
      }
    }
    
    saveStats();
    saveToLeaderboard();
    saveProgress();
    gameState.sound.complete();
    showWinScreen();
  }
}

function getHint() {
  if (gameState.expertMode) {
    showNotification('❌ Pistas deshabilitadas en modo experto');
    return;
  }
  
  if (!gameState.selectedCell) {
    showNotification('❌ Selecciona una celda primero');
    return;
  }
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) {
    showNotification('❌ Esta celda ya tiene un valor fijo');
    return;
  }
  
  gameState.userBoard[row][col] = gameState.currentPuzzle.solution[row][col];
  
  // Limpiar anotaciones de esta celda
  const key = `${row}-${col}`;
  if (gameState.notes[key]) delete gameState.notes[key];
  
  // Limpiar anotaciones relacionadas
  cleanRelatedNotes(row, col, gameState.currentPuzzle.solution[row][col]);
  
  gameState.hintsUsed++;
  gameState.sound.hint();
  renderBoard();
  updateHints();
  checkWin();
}

function undoMove() {
  if (gameState.expertMode) {
    showNotification('❌ Deshacer deshabilitado en modo experto');
    return;
  }
  
  if (gameState.moveHistory.length === 0) {
    showNotification('❌ No hay movimientos para deshacer');
    return;
  }
  
  const lastMove = gameState.moveHistory.pop();
  gameState.userBoard[lastMove.row][lastMove.col] = lastMove.oldValue;
  
  if (lastMove.oldNotes) {
    gameState.notes[`${lastMove.row}-${lastMove.col}`] = lastMove.oldNotes;
  } else {
    delete gameState.notes[`${lastMove.row}-${lastMove.col}`];
  }
  
  gameState.sound.click();
  renderBoard();
}

function findConflicts() {
  const conflicts = [];
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const val = gameState.userBoard[i][j];
      if (val === 0 || gameState.currentPuzzle.puzzle[i][j] !== 0) continue;
      
      // Verificar fila
      for (let k = 0; k < 9; k++) {
        if (k !== j && gameState.userBoard[i][k] === val) {
          conflicts.push([i, j]);
          break;
        }
      }
      
      // Verificar columna
      for (let k = 0; k < 9; k++) {
        if (k !== i && gameState.userBoard[k][j] === val) {
          if (!conflicts.find(c => c[0] === i && c[1] === j)) {
            conflicts.push([i, j]);
          }
          break;
        }
      }
      
      // Verificar cuadro
      const boxRow = Math.floor(i / 3) * 3;
      const boxCol = Math.floor(j / 3) * 3;
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          if ((r !== i || c !== j) && gameState.userBoard[r][c] === val) {
            if (!conflicts.find(co => co[0] === i && co[1] === j)) {
              conflicts.push([i, j]);
            }
            break;
          }
        }
      }
    }
  }
  
  return conflicts;
}

// Manejo de teclado
document.addEventListener('keydown', (e) => {
  if (!gameState.currentPuzzle) return;
  
  if (e.key >= '1' && e.key <= '9') {
    inputNumber(parseInt(e.key));
  }
  
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    if (gameState.notesMode && gameState.selectedCell) {
      clearCellNotes();
    } else {
      inputNumber(0);
    }
  }
  
  if (gameState.selectedCell) {
    const [row, col] = gameState.selectedCell;
    let newRow = row;
    let newCol = col;
    
    if (e.key === 'ArrowUp' && row > 0) newRow--;
    if (e.key === 'ArrowDown' && row < 8) newRow++;
    if (e.key === 'ArrowLeft' && col > 0) newCol--;
    if (e.key === 'ArrowRight' && col < 8) newCol++;
    
    if (newRow !== row || newCol !== col) {
      selectCell(newRow, newCol);
    }
  }
  
  if (e.ctrlKey && e.key === 'z' && !gameState.expertMode) {
    e.preventDefault();
    undoMove();
  }
  
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveGame();
  }
  
  if ((e.key === 'h' || e.key === 'H') && !gameState.expertMode) {
    getHint();
  }
  
  if (e.key === 'n' || e.key === 'N') {
    toggleNotesMode();
  }
  
  if (e.key === 'a' || e.key === 'A') {
    autoFillNotes();
  }
  
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    clearAllNotes();
  }
});

// CSS para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-30px); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  ::-webkit-scrollbar {
    width: 10px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(102,126,234,0.5);
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(102,126,234,0.8);
  }
`;
document.head.appendChild(style);

// Funciones de renderizado
function renderMenu() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.menuBg}; padding: 20px; overflow-y: scroll; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; overflow-y: auto;">
        <div style="text-align: center; margin-bottom: 50px;">
          <h1 style="font-size: 64px; font-weight: bold; color: white; margin: 0 0 15px 0; letter-spacing: -2px;">SUDOKU PRO</h1>
          <p style="font-size: 20px; color: rgba(255,255,255,0.9);">Lógica pura. Solución única garantizada.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-bottom: 30px;">
          <!-- Nueva Partida -->
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">🎮 Nueva Partida</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button onclick="startNewGame('hard', true)" style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                🏆 Reto Diario
              </button>
              ${['easy', 'medium', 'hard', 'expert', 'master'].map(diff => `
                <button onclick="startNewGame('${diff}')" style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 15px 20px;
                  border: none;
                  border-radius: 12px;
                  font-size: 15px;
                  font-weight: bold;
                  cursor: pointer;
                  transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                  ${diff === 'easy' ? '⭐ Fácil' : ''}
                  ${diff === 'medium' ? '⭐⭐ Medio' : ''}
                  ${diff === 'hard' ? '⭐⭐⭐ Difícil' : ''}
                  ${diff === 'expert' ? '⭐⭐⭐⭐ Experto' : ''}
                  ${diff === 'master' ? '⭐⭐⭐⭐⭐ Maestro' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Modos Especiales -->
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">⚡ Modos Especiales</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button onclick="startNewGame('medium', false, true)" style="
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                ⏱️ Contrarreloj (10 min)
              </button>
              <button onclick="startNewGame('hard', false, false, true)" style="
                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                💪 Modo Experto
              </button>
              <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                <strong>Experto:</strong> Sin pistas ni deshacer
              </div>
            </div>
          </div>

          <!-- Estadísticas -->
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">📊 Estadísticas</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; text-align: center;">
                <div style="font-size: 36px; font-weight: bold; color: white;">${gameState.stats.gamesWon}</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 12px;">Completados</div>
              </div>
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 15px; text-align: center;">
                <div style="font-size: 36px; font-weight: bold; color: white;">${gameState.stats.bestTime}</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 12px;">Mejor tiempo</div>
              </div>
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 15px; text-align: center; grid-column: span 2;">
                <div style="font-size: 36px; font-weight: bold; color: white;">${gameState.stats.streak} 🔥</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 12px;">Racha actual</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        ${gameState.leaderboard.length > 0 ? `
        <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 30px;">
          <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">🏆 Top 10 Mejores Tiempos</h2>
          <div style="display: grid; gap: 10px;">
            ${gameState.leaderboard.map((entry, idx) => `
              <div style="background: rgba(255,255,255,0.05); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="font-size: 24px; font-weight: bold; color: ${idx < 3 ? '#fbbf24' : 'rgba(255,255,255,0.6)'};">
                    ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div style="color: white;">
                    <div style="font-weight: bold; font-size: 16px;">${entry.difficulty.toUpperCase()}</div>
                    <div style="font-size: 13px; opacity: 0.8;">${entry.date}</div>
                  </div>
                </div>
                <div style="text-align: right; color: white;">
                  <div style="font-size: 20px; font-weight: bold;">${formatTime(entry.time)}</div>
                  <div style="font-size: 12px; opacity: 0.8;">${entry.mistakes} errores • ${entry.hintsUsed} pistas</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Partidas Guardadas y Gráfico -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          ${gameState.savedGames.length > 0 ? `
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">💾 Partidas Guardadas</h2>
            <div style="display: grid; gap: 12px;">
              ${gameState.savedGames.map(game => `
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                  <div style="color: white;">
                    <div style="font-weight: bold; font-size: 15px;">${game.difficulty.toUpperCase()} ${game.expertMode ? '💪' : ''} ${game.timeAttackMode ? '⏱️' : ''}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${game.date.split(',')[0]} • ${formatTime(game.timer)}</div>
                  </div>
                  <button onclick="loadGame(${game.id})" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 13px;
                    cursor: pointer;
                  ">Cargar</button>
                </div>
              `).join('')}
            </div>
          </div>
          ` : '<div></div>'}

          <!-- Gráfico de Progreso -->
          ${gameState.progressData.dates.length > 0 ? `
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">📈 Progreso (Últimos ${gameState.progressData.dates.length} juegos)</h2>
            <div style="color: white;">
              <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">Tiempo promedio</div>
                <div style="font-size: 32px; font-weight: bold;">
                  ${formatTime(Math.floor(gameState.progressData.times.reduce((a,b) => a+b, 0) / gameState.progressData.times.length))}
                </div>
              </div>
              <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">Precisión promedio</div>
                <div style="font-size: 32px; font-weight: bold;">
                  ${Math.round(gameState.progressData.accuracies.reduce((a,b) => a+b, 0) / gameState.progressData.accuracies.length)}%
                </div>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                <div style="font-size: 13px; opacity: 0.8; margin-bottom: 10px;">Evolución de tiempos</div>
                <div style="display: flex; align-items: flex-end; gap: 3px; height: 80px;">
                  ${gameState.progressData.times.slice(-10).map(time => {
                    const maxTime = Math.max(...gameState.progressData.times.slice(-10));
                    const height = (time / maxTime) * 100;
                    return `<div style="flex: 1; background: linear-gradient(to top, #10b981, #059669); border-radius: 3px 3px 0 0; height: ${height}%;" title="${formatTime(time)}"></div>`;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
          ` : '<div></div>'}
        </div>

        <!-- Configuración y Atajos -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">⚙️ Configuración</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button onclick="toggleTheme()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span>🎨 Tema</span>
                <span style="opacity: 0.8;">${gameState.theme}</span>
              </button>
              <button onclick="gameState.sound.toggle(); renderMenu();" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span>${gameState.sound.enabled ? '🔊' : '🔇'} Sonido</span>
                <span style="opacity: 0.8;">${gameState.sound.enabled ? 'Activado' : 'Desactivado'}</span>
              </button>
              <button onclick="gameState.autoCheck = !gameState.autoCheck; localStorage.setItem('sudoku-autocheck', JSON.stringify(gameState.autoCheck)); renderMenu();" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span>🔍 Auto-verificar</span>
                <span style="opacity: 0.8;">${gameState.autoCheck ? 'Activado' : 'Desactivado'}</span>
              </button>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">⌨️ Atajos de Teclado</h2>
            <div style="color: white; font-size: 14px; line-height: 2;">
              <div><strong>1-9:</strong> Ingresar números</div>
              <div><strong>N:</strong> Modo anotaciones</div>
              <div><strong>A:</strong> Auto-llenar anotaciones</div>
              <div><strong>Delete:</strong> Borrar celda/notas</div>
              <div><strong>Ctrl+D:</strong> Borrar todas las notas</div>
              <div><strong>H:</strong> Pista</div>
              <div><strong>Ctrl+Z:</strong> Deshacer</div>
              <div><strong>Ctrl+S:</strong> Guardar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGame() {
  const theme = themes[gameState.theme];
  const conflicts = gameState.autoCheck ? findConflicts() : [];
  const timeLeft = gameState.timeAttackMode ? gameState.timeAttackLimit - gameState.timer : 0;
  const timeWarning = gameState.timeAttackMode && timeLeft < 60;
  
  const totalNotes = Object.keys(gameState.notes).length;
  
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 10px; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: 1fr 280px; gap: 15px; height: 100%;">
          <!-- Columna izquierda -->
          <div style="display: flex; flex-direction: column; gap: 15px; overflow-y: auto; height: fit-content; max-height: 100%;">
            <!-- Tablero -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 12px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); border: none; padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 18px;">🏠</button>
                  <div style="color: ${theme.text};">
                    <div style="font-size: 20px; font-weight: bold; text-transform: uppercase;">
                      ${gameState.difficulty} 
                      ${gameState.expertMode ? '💪' : ''} 
                      ${gameState.timeAttackMode ? '⏱️' : ''}
                    </div>
                    <div style="font-size: 12px; opacity: 0.8;">${gameState.currentPuzzle.clues} pistas • ${gameState.moveHistory.length} movimientos</div>
                  </div>
                </div>
                <div style="text-align: right; color: ${theme.text};">
                  <div id="timer" style="font-size: 36px; font-weight: bold; ${timeWarning ? 'color: #ef4444; animation: pulse 1s infinite;' : ''}">${gameState.timeAttackMode ? formatTime(timeLeft) : formatTime(gameState.timer)}</div>
                  <div id="mistakes" style="font-size: 12px; opacity: 0.8;">Errores: ${gameState.mistakes}</div>
                </div>
              </div>
              <div style="display: flex; justify-content: center;">
                <div id="board"></div>
              </div>
            </div>

            <!-- Controles de Anotaciones -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                <h3 style="font-size: 18px; font-weight: bold; color: ${theme.text}; margin: 0;">📝 Anotaciones</h3>
                <div style="color: ${theme.text}; font-size: 13px; opacity: 0.8;">${totalNotes} celdas con notas</div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                <button onclick="toggleNotesMode()" style="
                  background: ${gameState.notesMode ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(139,92,246,0.3)'};
                  color: white;
                  padding: 12px;
                  border: none;
                  border-radius: 10px;
                  font-size: 14px;
                  font-weight: bold;
                  cursor: pointer;
                  transition: all 0.2s;
                  border: ${gameState.notesMode ? '2px solid #a78bfa' : '2px solid transparent'};
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                  ${gameState.notesMode ? '✓ Modo Notas ON' : '○ Modo Normal'}
                </button>
                <button onclick="autoFillNotes()" style="
                  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                  color: white;
                  padding: 12px;
                  border: none;
                  border-radius: 10px;
                  font-size: 13px;
                  font-weight: bold;
                  cursor: pointer;
                " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                  ✨ Auto-llenar [A]
                </button>
                <button onclick="clearCellNotes()" style="
                  background: rgba(239,68,68,0.7);
                  color: white;
                  padding: 12px;
                  border: none;
                  border-radius: 10px;
                  font-size: 13px;
                  font-weight: bold;
                  cursor: pointer;
                ">🗑️ Borrar celda</button>
                <button onclick="clearCellNotes()" style="
                  background: rgba(239,68,68,0.7);
                  color: white;
                  padding: 12px;
                  border: none;
                  border-radius: 10px;
                  font-size: 13px;
                  font-weight: bold;
                  cursor: pointer;
                ">🗑️ Borrar celda</button>
                <button onclick="clearAllNotes()" style="
                  background: rgba(239,68,68,0.5);
                  color: white;
                  padding: 12px;
                  border: none;
                  border-radius: 10px;
                  font-size: 13px;
                  font-weight: bold;
                  cursor: pointer;
                ">🗑️ Borrar todas</button>
              </div>
              <div style="background: rgba(139,92,246,0.1); padding: 12px; border-radius: 10px; color: ${theme.text}; font-size: 12px; line-height: 1.5;">
                <strong>💡 Consejo:</strong> Usa el modo anotaciones para marcar candidatos posibles. Las notas se limpian automáticamente al ingresar un número correcto.
              </div>
            </div>

            <!-- Controles principales -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                ${!gameState.expertMode ? `
                <button onclick="undoMove()" style="background: rgba(249,115,22,0.8); color: white; padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer;">↶ Deshacer</button>
                <button onclick="getHint()" style="background: rgba(234,179,8,0.8); color: white; padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer;">💡 Pista (<span id="hints">${gameState.hintsUsed}</span>)</button>
                ` : '<div></div><div></div>'}
                <button onclick="saveGame()" style="background: rgba(16,185,129,0.8); color: white; padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer;">💾 Guardar</button>
              </div>
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                ${[1,2,3,4,5,6,7,8,9].map(num => `
                  <button onclick="inputNumber(${num})" style="
                    background: rgba(102, 126, 234, 0.8); 
                    color: white; 
                    padding: 16px; 
                    border: none; 
                    border-radius: 10px; 
                    font-size: 20px; 
                    font-weight: bold; 
                    cursor: pointer; 
                    transition: transform 0.1s;
                  " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">${num}</button>
                `).join('')}
                <button onclick="inputNumber(0)" style="background: rgba(239,68,68,0.8); color: white; padding: 16px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">✕</button>
              </div>
            </div>
          </div>

          <!-- Columna derecha: Información -->
          <div style="display: flex; flex-direction: column; gap: 15px; overflow-y: auto; max-height: calc(100vh - 20px);">
            <!-- Progreso -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="font-size: 16px; font-weight: bold; color: ${theme.text}; margin-bottom: 12px;">📊 Progreso</h3>
              <div style="background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 10px;">
                <div style="color: ${theme.text}; font-size: 12px; margin-bottom: 4px;">Racha actual</div>
                <div style="font-size: 28px; font-weight: bold; color: ${theme.text};">${gameState.stats.streak} 🔥</div>
              </div>
              <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 10px;">
                <div style="color: ${theme.text}; font-size: 12px; margin-bottom: 4px;">Completado</div>
                <div style="font-size: 28px; font-weight: bold; color: ${theme.text};">
                  ${Math.round((gameState.userBoard.flat().filter(c => c !== 0).length / 81) * 100)}%
                </div>
              </div>
              ${conflicts.length > 0 ? `
              <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 10px; text-align: center;">
                <div style="color: #ef4444; font-size: 12px; margin-bottom: 4px;">⚠️ Conflictos</div>
                <div style="font-size: 28px; font-weight: bold; color: #ef4444;">${conflicts.length}</div>
              </div>
              ` : ''}
            </div>
            
            <!-- Opciones -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="font-size: 16px; font-weight: bold; color: ${theme.text}; margin-bottom: 12px;">⚙️ Opciones</h3>
              <button onclick="toggleTheme()" style="
                background: rgba(102, 126, 234, 0.2);
                color: ${theme.text};
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
                margin-bottom: 8px;
              ">🎨 Cambiar tema</button>
              <button onclick="gameState.sound.toggle(); renderGame();" style="
                background: rgba(102, 126, 234, 0.2);
                color: ${theme.text};
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
              ">${gameState.sound.enabled ? '🔊' : '🔇'} ${gameState.sound.enabled ? 'Silenciar' : 'Activar'}</button>
            </div>

            <!-- Técnicas -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="font-size: 16px; font-weight: bold; color: ${theme.text}; margin-bottom: 12px;">🎯 Técnicas</h3>
              <div style="color: ${theme.text}; font-size: 12px; line-height: 1.5; opacity: 0.9;">
                <p style="margin: 0 0 8px 0;"><strong>Naked Single:</strong> Una celda con un solo candidato.</p>
                <p style="margin: 0 0 8px 0;"><strong>Hidden Single:</strong> Número que solo cabe en una celda.</p>
                <p style="margin: 0;"><strong>Eliminación:</strong> Descarta por fila, columna y cuadro.</p>
              </div>
            </div>

            <!-- Atajos -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="font-size: 16px; font-weight: bold; color: ${theme.text}; margin-bottom: 12px;">⌨️ Atajos</h3>
              <div style="color: ${theme.text}; font-size: 11px; line-height: 1.6; opacity: 0.9;">
                <div><strong>N:</strong> Modo notas</div>
                <div><strong>A:</strong> Auto-llenar</div>
                <div><strong>Delete:</strong> Borrar</div>
                <div><strong>Ctrl+D:</strong> Borrar todas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  renderBoard(conflicts);
}

function renderBoard(conflicts = []) {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;
  
  let html = '<div style="display: inline-block; background: #1f2937; padding: 4px; border-radius: 15px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">';
  
  for (let i = 0; i < 9; i++) {
    html += '<div style="display: flex;">';
    for (let j = 0; j < 9; j++) {
      const isGiven = gameState.currentPuzzle.puzzle[i][j] !== 0;
      const isSelected = gameState.selectedCell && gameState.selectedCell[0] === i && gameState.selectedCell[1] === j;
      const userValue = gameState.userBoard[i][j];
      const displayValue = isGiven ? gameState.currentPuzzle.puzzle[i][j] : userValue;
      const key = `${i}-${j}`;
      const notes = gameState.notes[key];
      const hasConflict = conflicts.some(c => c[0] === i && c[1] === j);
      
      const isError = !isGiven && userValue !== 0 && userValue !== gameState.currentPuzzle.solution[i][j];
      
      let bgColor = gameState.customColors.user;
      if (isSelected) bgColor = gameState.customColors.selected;
      else if (isGiven) bgColor = gameState.customColors.given;
      else if (isError || hasConflict) bgColor = gameState.customColors.error;
      
      let textColor = isGiven ? '#1f2937' : ((isError || hasConflict) ? '#dc2626' : '#2563eb');
      let borderRight = (j % 3 === 2 && j !== 8) ? '3px solid #1f2937' : '1px solid #d1d5db';
      let borderBottom = (i % 3 === 2 && i !== 8) ? '3px solid #1f2937' : '1px solid #d1d5db';
      
      // Renderizar contenido de la celda
      let cellContent = '';
      if (displayValue) {
        cellContent = displayValue;
      } else if (notes && notes.size > 0) {
        // Mostrar notas en una cuadrícula 3x3
        const notesArray = Array.from(notes).sort();
        cellContent = `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; width: 100%; height: 100%; padding: 2px;">
            ${[1,2,3,4,5,6,7,8,9].map(n => 
              `<div style="font-size: 9px; color: #6b7280; display: flex; align-items: center; justify-content: center;">
                ${notesArray.includes(n) ? n : ''}
              </div>`
            ).join('')}
          </div>
        `;
      }
      
      html += `
        <div onclick="selectCell(${i}, ${j})" style="
          width: 45px;
          height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${displayValue ? '18px' : '8px'};
          font-weight: ${displayValue ? 'bold' : 'normal'};
          background: ${bgColor};
          color: ${textColor};
          border-right: ${borderRight};
          border-bottom: ${borderBottom};
          cursor: ${isGiven ? 'default' : 'pointer'};
          transition: all 0.15s;
          ${isSelected ? 'box-shadow: inset 0 0 0 3px #3b82f6;' : ''}
          position: relative;
        ">
          ${cellContent}
        </div>
      `;
    }
    html += '</div>';
  }
  html += '</div>';
  boardEl.innerHTML = html;
}

function updateTimer() {
  const timerEl = document.getElementById('timer');
  if (timerEl) {
    if (gameState.timeAttackMode) {
      const timeLeft = gameState.timeAttackLimit - gameState.timer;
      timerEl.textContent = formatTime(timeLeft);
    } else {
      timerEl.textContent = formatTime(gameState.timer);
    }
  }
}

function updateMistakes() {
  const mistakesEl = document.getElementById('mistakes');
  if (mistakesEl) mistakesEl.textContent = `Errores: ${gameState.mistakes}`;
}

function updateHints() {
  const hintsEl = document.getElementById('hints');
  if (hintsEl) hintsEl.textContent = gameState.hintsUsed;
}

function showWinScreen() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  const avgTime = gameState.stats.gamesWon > 0 ? 
    formatTime(Math.floor(gameState.stats.totalTime / gameState.stats.gamesWon)) : '--:--';
  
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #059669 0%, #047857 100%); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 800px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; border: 1px solid rgba(255,255,255,0.2); text-align: center;">
        <div style="font-size: 120px; margin-bottom: 30px; animation: bounce 1s;">🏆</div>
        <h1 style="font-size: 60px; font-weight: bold; color: white; margin: 0 0 20px 0;">¡Victoria!</h1>
        <div style="font-size: 32px; color: rgba(255,255,255,0.9); margin-bottom: 50px;">Sudoku completado</div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${formatTime(gameState.timer)}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Tiempo</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.mistakes}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Errores</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.hintsUsed}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Pistas</div>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px; margin-bottom: 40px;">
          <h3 style="color: white; font-size: 24px; margin-bottom: 20px;">📊 Tus estadísticas</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; color: white;">
            <div>
              <div style="font-size: 28px; font-weight: bold;">${gameState.stats.gamesWon}</div>
              <div style="font-size: 14px; opacity: 0.8;">Juegos ganados</div>
            </div>
            <div>
              <div style="font-size: 28px; font-weight: bold;">${gameState.stats.bestTime}</div>
              <div style="font-size: 14px; opacity: 0.8;">Mejor tiempo</div>
            </div>
            <div>
              <div style="font-size: 28px; font-weight: bold;">${avgTime}</div>
              <div style="font-size: 14px; opacity: 0.8;">Tiempo promedio</div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 15px;">
          <button onclick="startNewGame('${gameState.difficulty}')" style="
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🎮 Jugar de nuevo (${gameState.difficulty.toUpperCase()})</button>
          <button onclick="renderMenu()" style="
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏠 Menú principal</button>
        </div>
      </div>
    </div>
    <style>
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-30px); }
      }
    </style>
  `;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
});